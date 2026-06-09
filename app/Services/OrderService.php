<?php

namespace App\Services;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderStatusLog;
use App\Models\StockSnapshot;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OrderService
{
    public function __construct(
        private readonly StockService $stockService,
    ) {}

    /**
     * Create an order from a cart (online checkout flow).
     */
    public function createFromCart(Cart $cart, array $data, User $user): Order
    {
        return DB::transaction(function () use ($cart, $data, $user) {
            $items = $cart->items()->with(['variant.product.taxCategory', 'variant.stockSnapshot'])->get();

            if ($items->isEmpty()) {
                throw new \InvalidArgumentException('Cart is empty.');
            }

            // Calculate totals
            $subtotal = $items->sum(fn ($i) => $i->unit_price * $i->quantity);
            $tax      = $items->sum(function ($i) {
                $rate = $i->variant->product->taxCategory->tax_percent ?? 0;

                return ($i->unit_price * $i->quantity) * ($rate / 100);
            });
            $couponDiscount  = $data['coupon_discount'] ?? 0;
            $shippingCharge  = $data['shipping_charge'] ?? 0;
            $totalAmount     = $subtotal + $tax + $shippingCharge - $couponDiscount;

            $order = Order::create([
                'order_number'       => $this->generateOrderNumber(),
                'order_channel'      => 'online',
                'customer_id'        => $data['customer_id'],
                'warehouse_id'       => $data['warehouse_id'] ?? null,
                'status'             => 'pending',
                'payment_status'     => 'pending',
                'payment_method'     => $data['payment_method'] ?? 'phonepe',
                'address_id'         => $data['address_id'] ?? null,
                'address_snapshot'   => $data['address_snapshot'] ?? null,
                'coupon_id'          => $data['coupon_id'] ?? null,
                'coupon_discount'    => $couponDiscount,
                'shipping_charge'    => $shippingCharge,
                'subtotal'           => $subtotal,
                'tax_amount'         => $tax,
                'discount_amount'    => 0,
                'total_amount'       => max(0, $totalAmount),
                'created_by'         => $user->id,
                'notes'              => $data['notes'] ?? null,
            ]);

            foreach ($items as $item) {
                $variant = $item->variant;
                $product = $variant->product;
                $taxRate = $product->taxCategory->tax_percent ?? 0;

                OrderItem::create([
                    'order_id'           => $order->id,
                    'product_variant_id' => $variant->id,
                    'quantity'           => $item->quantity,
                    'price'              => $item->unit_price,
                    'discount'           => 0,
                    'tax_percent'        => $taxRate,
                    'total'              => $item->unit_price * $item->quantity,
                    'product_snapshot'   => [
                        'product_id'   => $product->id,
                        'product_name' => $product->name,
                        'variant_id'   => $variant->id,
                        'variant_name' => $variant->variant_name,
                        'sku'          => $variant->sku,
                        'image'        => $product->images()->where('is_primary', true)->value('image_path'),
                        'mrp'          => $variant->mrp,
                        'price'        => $item->unit_price,
                    ],
                ]);

                // Reserve stock
                if ($data['warehouse_id'] ?? null) {
                    $this->stockService->reserve($variant->id, $data['warehouse_id'], $order->id, $item->quantity);
                }
            }

            // Log initial status
            $this->logStatusChange($order, null, 'pending', $user, 'Order created');

            return $order->fresh();
        });
    }

    /**
     * Create an order from POS (direct sale).
     */
    public function createFromPos(array $items, array $data, User $user): Order
    {
        return DB::transaction(function () use ($items, $data, $user) {
            $subtotal = 0;
            $taxTotal = 0;

            $order = Order::create([
                'order_number'    => $this->generateOrderNumber(),
                'order_channel'   => 'pos',
                'customer_id'     => $data['customer_id'] ?? null,
                'warehouse_id'    => $data['warehouse_id'] ?? null,
                'status'          => 'completed',
                'payment_status'  => 'paid',
                'payment_method'  => $data['payment_method'] ?? 'cash',
                'discount_amount' => $data['discount_amount'] ?? 0,
                'subtotal'        => 0,
                'tax_amount'      => 0,
                'total_amount'    => 0,
                'created_by'      => $user->id,
                'notes'           => $data['notes'] ?? null,
            ]);

            foreach ($items as $item) {
                $price    = $item['price'];
                $qty      = $item['quantity'];
                $discount = $item['discount'] ?? 0;
                $taxRate  = $item['tax_percent'] ?? 0;
                $taxAmt   = ($price - $discount) * $qty * ($taxRate / 100);

                OrderItem::create([
                    'order_id'           => $order->id,
                    'product_variant_id' => $item['variant_id'],
                    'quantity'           => $qty,
                    'price'              => $price,
                    'discount'           => $discount,
                    'tax_percent'        => $taxRate,
                    'total'              => ($price - $discount) * $qty,
                ]);

                $subtotal += ($price - $discount) * $qty;
                $taxTotal += $taxAmt;

                if ($data['warehouse_id'] ?? null) {
                    $this->stockService->deduct($item['variant_id'], $data['warehouse_id'], $qty, 'order', $order->id);
                }
            }

            $order->update([
                'subtotal'     => $subtotal,
                'tax_amount'   => $taxTotal,
                'total_amount' => $subtotal + $taxTotal - ($data['discount_amount'] ?? 0),
            ]);

            $this->logStatusChange($order, null, 'completed', $user, 'POS sale completed');

            return $order->fresh();
        });
    }

    /**
     * Transition an order to a new status with validation.
     */
    public function transitionStatus(Order $order, string $newStatus, User $user, ?string $note = null): Order
    {
        $allowed = $this->allowedTransitions($order->status);

        if (! in_array($newStatus, $allowed)) {
            throw new \InvalidArgumentException("Cannot transition from '{$order->status}' to '{$newStatus}'.");
        }

        DB::transaction(function () use ($order, $newStatus, $user, $note) {
            $from = $order->status;
            $order->update(['status' => $newStatus]);

            if ($newStatus === 'delivered') {
                $order->update(['delivered_at' => Carbon::now()]);
            }
            if ($newStatus === 'cancelled') {
                $order->update(['cancelled_at' => Carbon::now(), 'cancellation_reason' => $note]);
            }

            $this->logStatusChange($order, $from, $newStatus, $user, $note);
        });

        return $order->fresh();
    }

    /**
     * Cancel an order (releases reservations, triggers refund if paid).
     */
    public function cancel(Order $order, User $user, string $reason): Order
    {
        return DB::transaction(function () use ($order, $user, $reason) {
            // Release stock reservations
            foreach ($order->items as $item) {
                if ($order->warehouse_id) {
                    $this->stockService->release($item->product_variant_id, $order->warehouse_id, $order->id);
                }
            }

            $from = $order->status;
            $order->update([
                'status'              => 'cancelled',
                'cancelled_at'        => Carbon::now(),
                'cancellation_reason' => $reason,
            ]);

            $this->logStatusChange($order, $from, 'cancelled', $user, $reason);

            return $order->fresh();
        });
    }

    /**
     * Get status transition timeline.
     */
    public function getStatusTimeline(Order $order): array
    {
        return $order->statusLogs()
            ->orderBy('created_at')
            ->get()
            ->map(fn ($log) => [
                'from'       => $log->from_status,
                'to'         => $log->to_status,
                'note'       => $log->note,
                'changed_by' => $log->changedBy?->name,
                'at'         => $log->created_at?->toISOString(),
            ])
            ->toArray();
    }

    public function generateOrderNumber(): string
    {
        $date  = Carbon::now()->format('Ymd');
        $rand  = str_pad((string) random_int(0, 99999), 5, '0', STR_PAD_LEFT);

        return "GB-{$date}-{$rand}";
    }

    private function logStatusChange(Order $order, ?string $from, string $to, User $user, ?string $note): void
    {
        OrderStatusLog::create([
            'order_id'   => $order->id,
            'from_status' => $from,
            'to_status'  => $to,
            'note'       => $note,
            'changed_by' => $user->id,
        ]);
    }

    private function allowedTransitions(string $current): array
    {
        return match ($current) {
            'pending'    => ['confirmed', 'cancelled'],
            'confirmed'  => ['processing', 'cancelled'],
            'processing' => ['packed', 'cancelled'],
            'packed'     => ['dispatched', 'cancelled'],
            'dispatched' => ['delivered', 'cancelled'],
            'delivered'  => [],
            'cancelled'  => [],
            'completed'  => [],
            default      => [],
        };
    }
}
