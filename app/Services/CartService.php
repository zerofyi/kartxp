<?php

namespace App\Services;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Coupon;
use App\Models\StockSnapshot;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class CartService
{
    public function __construct(
        private readonly CouponService $couponService,
        private readonly StockService $stockService,
    ) {}

    /**
     * Get an existing cart or create a new one.
     */
    public function getOrCreate(?int $userId, ?string $sessionId, ?int $warehouseId = null): Cart
    {
        $query = Cart::query();

        if ($userId) {
            $query->where('user_id', $userId);
        } elseif ($sessionId) {
            $query->where('session_id', $sessionId)->whereNull('user_id');
        } else {
            throw new \InvalidArgumentException('Either user_id or session_id is required.');
        }

        $cart = $query->where(function ($q) {
            $q->whereNull('expires_at')->orWhere('expires_at', '>', Carbon::now());
        })->first();

        if (! $cart) {
            $cart = Cart::create([
                'user_id'      => $userId,
                'session_id'   => $sessionId,
                'warehouse_id' => $warehouseId,
                'expires_at'   => $userId ? null : Carbon::now()->addDays(7),
            ]);
        }

        return $cart;
    }

    /**
     * Add an item to the cart. Checks stock availability.
     */
    public function addItem(Cart $cart, int $variantId, int $qty): CartItem
    {
        // Validate stock
        $warehouseId = $cart->warehouse_id;
        if ($warehouseId) {
            $available = $this->stockService->getAvailable($variantId, $warehouseId);
            $existing  = $cart->items()->where('product_variant_id', $variantId)->value('quantity') ?? 0;

            if ($available < ($existing + $qty)) {
                throw new \RuntimeException("Insufficient stock. Only {$available} units available.");
            }
        }

        $variant   = DB::table('product_variants')->where('id', $variantId)->first();
        $unitPrice = $variant->selling_price ?? 0;

        $existing = CartItem::where('cart_id', $cart->id)
            ->where('product_variant_id', $variantId)
            ->first();

        if ($existing) {
            $existing->update(['quantity' => $existing->quantity + $qty]);

            return $existing->fresh();
        }

        return CartItem::create([
            'cart_id'            => $cart->id,
            'product_variant_id' => $variantId,
            'quantity'           => $qty,
            'unit_price'         => $unitPrice,
        ]);
    }

    /**
     * Update item quantity.
     */
    public function updateItem(CartItem $item, int $qty): CartItem
    {
        if ($qty <= 0) {
            $this->removeItem($item);

            return $item;
        }

        $cart        = $item->cart;
        $warehouseId = $cart->warehouse_id;

        if ($warehouseId) {
            $available = $this->stockService->getAvailable($item->product_variant_id, $warehouseId);
            if ($available < $qty) {
                throw new \RuntimeException("Insufficient stock. Only {$available} units available.");
            }
        }

        $item->update(['quantity' => $qty]);

        return $item->fresh();
    }

    /**
     * Remove an item from the cart.
     */
    public function removeItem(CartItem $item): void
    {
        $item->delete();
    }

    /**
     * Clear all items from the cart.
     */
    public function clear(Cart $cart): void
    {
        $cart->items()->delete();
        // Clear coupon from session (coupon not stored in DB on cart)
        session()->forget(["cart.{$cart->id}.coupon_id", "cart.{$cart->id}.coupon_discount"]);
    }


    /**
     * Apply a coupon code to the cart.
     */
    public function applyCoupon(Cart $cart, string $code, User $user): array
    {
        $totals = $this->getTotal($cart);
        $result = $this->couponService->validate($code, $totals['subtotal'], $user, $cart->warehouse_id);

        if (! $result['valid']) {
            return ['applied' => false, 'discount' => 0, 'message' => $result['message']];
        }

        $coupon   = $result['coupon'];
        $discount = $result['discount'];

        // Store coupon on cart session (not DB yet — applied at checkout)
        session(["cart.{$cart->id}.coupon_id" => $coupon->id]);
        session(["cart.{$cart->id}.coupon_discount" => $discount]);

        return [
            'applied'      => true,
            'discount'     => $discount,
            'coupon_code'  => $coupon->code,
            'coupon_name'  => $coupon->name,
            'message'      => "Coupon '{$coupon->code}' applied! You save ₹{$discount}.",
        ];
    }

    /**
     * Remove applied coupon from cart.
     */
    public function removeCoupon(Cart $cart): void
    {
        session()->forget(["cart.{$cart->id}.coupon_id", "cart.{$cart->id}.coupon_discount"]);
    }

    /**
     * Merge a guest cart into an authenticated user's cart.
     */
    public function merge(string $sessionId, int $userId): Cart
    {
        return DB::transaction(function () use ($sessionId, $userId) {
            $guestCart = Cart::where('session_id', $sessionId)->whereNull('user_id')->first();
            $userCart  = $this->getOrCreate($userId, null);

            if (! $guestCart) {
                return $userCart;
            }

            foreach ($guestCart->items as $guestItem) {
                $existing = CartItem::where('cart_id', $userCart->id)
                    ->where('product_variant_id', $guestItem->product_variant_id)
                    ->first();

                if ($existing) {
                    $existing->increment('quantity', $guestItem->quantity);
                } else {
                    CartItem::create([
                        'cart_id'            => $userCart->id,
                        'product_variant_id' => $guestItem->product_variant_id,
                        'quantity'           => $guestItem->quantity,
                        'unit_price'         => $guestItem->unit_price,
                    ]);
                }
            }

            $guestCart->items()->delete();
            $guestCart->delete();

            return $userCart->fresh();
        });
    }

    /**
     * Calculate cart totals.
     */
    public function getTotal(Cart $cart): array
    {
        $items    = $cart->items()->with('variant.product.taxCategory')->get();
        $subtotal = 0;
        $tax      = 0;

        foreach ($items as $item) {
            $lineTotal = $item->unit_price * $item->quantity;
            $taxRate   = $item->variant->product->taxCategory->tax_percent ?? 0;
            $subtotal += $lineTotal;
            $tax      += $lineTotal * ($taxRate / 100);
        }

        $couponDiscount = session("cart.{$cart->id}.coupon_discount", 0);
        $shipping       = 0; // Calculated at checkout based on address
        $total          = max(0, $subtotal + $tax + $shipping - $couponDiscount);

        return [
            'subtotal'        => round($subtotal, 2),
            'tax'             => round($tax, 2),
            'shipping'        => $shipping,
            'coupon_discount' => round($couponDiscount, 2),
            'coupon_id'       => session("cart.{$cart->id}.coupon_id"),
            'total'           => round($total, 2),
            'item_count'      => $items->sum('quantity'),
        ];
    }
}
