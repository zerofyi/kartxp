<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

class Coupon extends Model
{
    protected $fillable = ['warehouse_id', 'code', 'name', 'type', 'value', 'min_order_amount', 'max_discount', 'usage_limit', 'used_count', 'per_user_limit', 'applicable_to', 'applicable_ids', 'starts_at', 'ends_at', 'is_active'];

    protected $casts = [
        'value'          => 'decimal:2',
        'min_order'      => 'decimal:2',
        'max_discount'   => 'decimal:2',
        'usage_limit'    => 'integer',
        'used_count'     => 'integer',
        'per_user_limit' => 'integer',
        'is_active'      => 'boolean',
        'starts_at'      => 'datetime',
        'ends_at'        => 'datetime',
        'applicable_ids' => 'array',
    ];

    // -----------------------------------------------------------------------
    // Relationships
    // -----------------------------------------------------------------------

    public function usages(): HasMany
    {
        return $this->hasMany(CouponUsage::class);
    }

    // -----------------------------------------------------------------------
    // Scopes
    // -----------------------------------------------------------------------

    public function scopeActive(Builder $query): Builder
    {
        $now = Carbon::now();

        return $query->where('is_active', true)
                     ->where(function (Builder $q) use ($now): void {
                         $q->whereNull('starts_at')->orWhere('starts_at', '<=', $now);
                     })
                     ->where(function (Builder $q) use ($now): void {
                         $q->whereNull('ends_at')->orWhere('ends_at', '>=', $now);
                     });
    }

    // -----------------------------------------------------------------------
    // Business logic
    // -----------------------------------------------------------------------

    /**
     * Validate the coupon for a given order and user.
     *
     * @return array{valid: bool, message: string, discount: float}
     */
    public function isValidForOrder(Order $order, User $user): array
    {
        $now = Carbon::now();

        // Check active flag
        if (! $this->is_active) {
            return ['valid' => false, 'message' => 'This coupon is not active.', 'discount' => 0.0];
        }

        // Check date range
        if ($this->starts_at && $now->lt($this->starts_at)) {
            return ['valid' => false, 'message' => 'This coupon is not yet valid.', 'discount' => 0.0];
        }

        if ($this->ends_at && $now->gt($this->ends_at)) {
            return ['valid' => false, 'message' => 'This coupon has expired.', 'discount' => 0.0];
        }

        // Check global usage limit
        if ($this->usage_limit !== null && $this->used_count >= $this->usage_limit) {
            return ['valid' => false, 'message' => 'This coupon has reached its usage limit.', 'discount' => 0.0];
        }

        // Check per-user usage
        if ($this->per_user_limit !== null) {
            $userUsageCount = $this->usages()->where('user_id', $user->id)->count();
            if ($userUsageCount >= $this->per_user_limit) {
                return ['valid' => false, 'message' => 'You have already used this coupon the maximum number of times.', 'discount' => 0.0];
            }
        }

        // Check minimum order value
        $orderSubtotal = (float) $order->subtotal;
        if ($this->min_order !== null && $orderSubtotal < (float) $this->min_order) {
            return [
                'valid'    => false,
                'message'  => 'Your order does not meet the minimum amount of ৳' . number_format((float) $this->min_order, 2) . ' required for this coupon.',
                'discount' => 0.0,
            ];
        }

        // Calculate discount
        $discount = match ($this->type) {
            'percentage' => $orderSubtotal * ((float) $this->value / 100),
            'fixed'      => (float) $this->value,
            default      => 0.0,
        };

        // Apply max discount cap
        if ($this->max_discount !== null) {
            $discount = min($discount, (float) $this->max_discount);
        }

        return ['valid' => true, 'message' => 'Coupon applied successfully.', 'discount' => round($discount, 2)];
    }
}
