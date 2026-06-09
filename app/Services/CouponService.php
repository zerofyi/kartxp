<?php

namespace App\Services;

use App\Models\Coupon;
use App\Models\CouponUsage;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class CouponService
{
    /**
     * Validate a coupon code for a given order amount and user.
     * Returns ['valid', 'message', 'coupon', 'discount'].
     */
    public function validate(string $code, float $orderAmount, User $user, ?int $warehouseId = null): array
    {
        $coupon = Coupon::where('code', strtoupper(trim($code)))
            ->where('is_active', true)
            ->first();

        if (! $coupon) {
            return ['valid' => false, 'message' => 'Invalid coupon code.', 'coupon' => null, 'discount' => 0];
        }

        // Date validity
        if ($coupon->starts_at && $coupon->starts_at->gt(Carbon::now())) {
            return ['valid' => false, 'message' => 'Coupon is not yet active.', 'coupon' => $coupon, 'discount' => 0];
        }

        if ($coupon->ends_at && $coupon->ends_at->lt(Carbon::now())) {
            return ['valid' => false, 'message' => 'Coupon has expired.', 'coupon' => $coupon, 'discount' => 0];
        }

        // Minimum order amount
        if ($orderAmount < $coupon->min_order_amount) {
            return [
                'valid'   => false,
                'message' => "Minimum order amount of ₹{$coupon->min_order_amount} required.",
                'coupon'  => $coupon,
                'discount' => 0,
            ];
        }

        // Global usage limit
        if ($coupon->usage_limit !== null && $coupon->used_count >= $coupon->usage_limit) {
            return ['valid' => false, 'message' => 'Coupon usage limit reached.', 'coupon' => $coupon, 'discount' => 0];
        }

        // Per-user limit
        if (! $this->checkUserLimit($coupon, $user)) {
            return ['valid' => false, 'message' => "You have already used this coupon {$coupon->per_user_limit} time(s).", 'coupon' => $coupon, 'discount' => 0];
        }

        // Warehouse scope
        if ($coupon->warehouse_id && $coupon->warehouse_id !== $warehouseId) {
            return ['valid' => false, 'message' => 'Coupon not valid for this store.', 'coupon' => $coupon, 'discount' => 0];
        }

        $discount = $this->calculateDiscount($coupon, $orderAmount);

        return ['valid' => true, 'message' => 'Coupon applied successfully.', 'coupon' => $coupon, 'discount' => $discount];
    }

    /**
     * Apply coupon to a confirmed order — records usage and updates counts.
     */
    public function apply(Coupon $coupon, Order $order, User $user): float
    {
        $discount = $this->calculateDiscount($coupon, $order->subtotal);

        DB::transaction(function () use ($coupon, $order, $user, $discount) {
            CouponUsage::create([
                'coupon_id'       => $coupon->id,
                'user_id'         => $user->id,
                'order_id'        => $order->id,
                'discount_given'  => $discount,
                'used_at'         => Carbon::now(),
            ]);

            $coupon->increment('used_count');
        });

        return $discount;
    }

    /**
     * Calculate the discount amount for given order amount.
     */
    public function calculateDiscount(Coupon $coupon, float $orderAmount, array $cartItems = []): float
    {
        $discount = match ($coupon->type) {
            'percent'       => $orderAmount * ($coupon->value / 100),
            'flat'          => $coupon->value,
            'free_shipping' => 0, // Handled separately in checkout
            default         => 0,
        };

        // Apply max_discount cap for percentage coupons
        if ($coupon->max_discount && $discount > $coupon->max_discount) {
            $discount = $coupon->max_discount;
        }

        return round(min($discount, $orderAmount), 2);
    }

    /**
     * Check if user has not exceeded their per-user usage limit.
     */
    public function checkUserLimit(Coupon $coupon, User $user): bool
    {
        $usedCount = CouponUsage::where('coupon_id', $coupon->id)
            ->where('user_id', $user->id)
            ->count();

        return $usedCount < $coupon->per_user_limit;
    }
}
