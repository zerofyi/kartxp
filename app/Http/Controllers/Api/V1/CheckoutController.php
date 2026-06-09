<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Models\Order;
use App\Models\ShippingZone;
use App\Services\CartService;
use App\Services\CouponService;
use App\Services\OrderService;
use App\Services\PhonePeService;
use App\Services\StockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CheckoutController extends Controller
{
    public function __construct(
        private readonly CartService $cartService,
        private readonly CouponService $couponService,
        private readonly OrderService $orderService,
        private readonly PhonePeService $phonePeService,
        private readonly StockService $stockService,
    ) {}

    /**
     * POST /api/v1/checkout/validate
     * Validate cart + address + coupon, return price breakdown
     */
    public function validateCheckout(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'address_id'  => 'required|exists:addresses,id',
            'coupon_code' => 'nullable|string',
        ]);

        $user     = $request->user();
        $cart     = $this->cartService->getOrCreate($user->id, null);
        $items    = $cart->items()->with('variant')->get();

        if ($items->isEmpty()) {
            return response()->json(['success' => false, 'message' => 'Cart is empty.'], 422);
        }

        // Check stock availability
        $outOfStock = [];
        foreach ($items as $item) {
            if ($cart->warehouse_id) {
                $available = $this->stockService->getAvailable($item->product_variant_id, $cart->warehouse_id);
                if ($available < $item->quantity) {
                    $outOfStock[] = $item->variant->variant_name ?? "Variant #{$item->product_variant_id}";
                }
            }
        }

        if (! empty($outOfStock)) {
            return response()->json([
                'success' => false,
                'message' => 'Some items are out of stock: ' . implode(', ', $outOfStock),
                'data'    => ['out_of_stock' => $outOfStock],
            ], 422);
        }

        $totals = $this->cartService->getTotal($cart);

        // Shipping
        $address       = \App\Models\Address::find($validated['address_id']);
        $shippingCharge = $this->calculateShipping($address, $cart->warehouse_id, $totals['subtotal']);

        // Coupon discount
        $couponDiscount = 0;
        $couponId       = null;
        if ($validated['coupon_code'] ?? null) {
            $result = $this->couponService->validate($validated['coupon_code'], $totals['subtotal'], $user, $cart->warehouse_id);
            if ($result['valid']) {
                $couponDiscount = $result['discount'];
                $couponId       = $result['coupon']->id;
            }
        }

        $total = max(0, $totals['subtotal'] + $totals['tax'] + $shippingCharge - $couponDiscount);

        return response()->json([
            'success' => true,
            'data'    => [
                'subtotal'        => $totals['subtotal'],
                'tax'             => $totals['tax'],
                'shipping_charge' => $shippingCharge,
                'coupon_discount' => $couponDiscount,
                'coupon_id'       => $couponId,
                'total'           => round($total, 2),
                'item_count'      => $totals['item_count'],
            ],
        ]);
    }

    /**
     * POST /api/v1/checkout/initiate
     * Full checkout flow: create order → reserve stock → initiate payment
     */
    public function initiate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'address_id'     => 'required|exists:addresses,id',
            'coupon_code'    => 'nullable|string',
            'payment_method' => 'required|in:phonepe,cod,upi,wallet',
            'notes'          => 'nullable|string|max:500',
        ]);

        $user     = $request->user();
        $customer = $user->customer;

        if (! $customer) {
            return response()->json(['success' => false, 'message' => 'Customer profile not found.'], 422);
        }

        $cart = $this->cartService->getOrCreate($user->id, null);

        if ($cart->items()->count() === 0) {
            return response()->json(['success' => false, 'message' => 'Cart is empty.'], 422);
        }

        $address        = \App\Models\Address::findOrFail($validated['address_id']);
        $totals         = $this->cartService->getTotal($cart);
        $shippingCharge = $this->calculateShipping($address, $cart->warehouse_id, $totals['subtotal']);

        $couponDiscount = 0;
        $couponId       = null;
        $coupon         = null;

        if ($validated['coupon_code'] ?? null) {
            $result = $this->couponService->validate($validated['coupon_code'], $totals['subtotal'], $user, $cart->warehouse_id);
            if ($result['valid']) {
                $couponDiscount = $result['discount'];
                $couponId       = $result['coupon']->id;
                $coupon         = $result['coupon'];
            }
        }

        try {
            $order = DB::transaction(function () use ($cart, $customer, $user, $address, $couponId, $couponDiscount, $shippingCharge, $validated) {
                return $this->orderService->createFromCart($cart, [
                    'customer_id'     => $customer->id,
                    'warehouse_id'    => $cart->warehouse_id,
                    'address_id'      => $address->id,
                    'address_snapshot' => [
                        'name'    => $address->name,
                        'phone'   => $address->phone,
                        'line1'   => $address->line1,
                        'line2'   => $address->line2,
                        'city'    => $address->city,
                        'state'   => $address->state,
                        'pincode' => $address->pincode,
                    ],
                    'payment_method'  => $validated['payment_method'],
                    'coupon_id'       => $couponId,
                    'coupon_discount' => $couponDiscount,
                    'shipping_charge' => $shippingCharge,
                    'notes'           => $validated['notes'] ?? null,
                ], $user);
            });

            // Apply coupon usage record
            if ($coupon) {
                $this->couponService->apply($coupon, $order, $user);
            }

            // Initiate PhonePe payment
            if ($validated['payment_method'] === 'phonepe') {
                $paymentResult = $this->phonePeService->initiatePayment($order, $user->mobile);

                if (! $paymentResult['success']) {
                    return response()->json(['success' => false, 'message' => $paymentResult['message']], 422);
                }

                // Clear cart
                $this->cartService->clear($cart);

                return response()->json([
                    'success' => true,
                    'data'    => [
                        'order_id'       => $order->id,
                        'order_number'   => $order->order_number,
                        'payment_url'    => $paymentResult['payment_url'],
                        'transaction_id' => $paymentResult['transaction_id'],
                        'total'          => $order->total_amount,
                    ],
                    'message' => 'Order created. Proceed to payment.',
                ]);
            }

            // COD
            $order->update(['payment_status' => 'pending', 'status' => 'confirmed']);
            $this->cartService->clear($cart);

            return response()->json([
                'success' => true,
                'data'    => [
                    'order_id'     => $order->id,
                    'order_number' => $order->order_number,
                    'total'        => $order->total_amount,
                ],
                'message' => 'Order placed successfully.',
            ], 201);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * GET /api/v1/checkout/success/{order}
     */
    public function success(Request $request, Order $order): JsonResponse
    {
        if ($order->customer_id !== $request->user()->customer?->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 403);
        }

        $order->load(['items.variant.product', 'payments']);

        return response()->json(['success' => true, 'data' => $order]);
    }

    private function calculateShipping(?\App\Models\Address $address, ?int $warehouseId, float $subtotal): float
    {
        if (! $address || ! $warehouseId) {
            return 0;
        }

        $zone = ShippingZone::where('warehouse_id', $warehouseId)
            ->where('is_active', true)
            ->get()
            ->first(fn ($z) => $z->coversAddress($address->pincode));

        if (! $zone) {
            return 0;
        }

        if ($zone->free_above && $subtotal >= $zone->free_above) {
            return 0;
        }

        return $zone->charge ?? 0;
    }
}
