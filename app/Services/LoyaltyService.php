<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\LoyaltyTransaction;
use App\Models\Order;
use App\Models\User;
use App\Models\Setting;
use Illuminate\Support\Facades\DB;

class LoyaltyService
{
    /**
     * Earn points for a completed order.
     */
    public function earn(Customer $customer, Order $order, int $points, ?User $createdBy = null): LoyaltyTransaction
    {
        return DB::transaction(function () use ($customer, $order, $points, $createdBy) {
            $balanceBefore = $customer->loyalty_points;
            $balanceAfter  = $balanceBefore + $points;

            $customer->update(['loyalty_points' => $balanceAfter]);

            return LoyaltyTransaction::create([
                'customer_id'   => $customer->id,
                'order_id'      => $order->id,
                'type'          => 'earned',
                'points'        => $points,
                'balance_after' => $balanceAfter,
                'note'          => "Earned for order #{$order->order_number}",
                'created_by'    => $createdBy?->id,
            ]);
        });
    }

    /**
     * Redeem points (validates sufficient balance).
     */
    public function redeem(Customer $customer, int $points, ?Order $order = null, ?User $createdBy = null): LoyaltyTransaction
    {
        return DB::transaction(function () use ($customer, $points, $order, $createdBy) {
            if ($customer->loyalty_points < $points) {
                throw new \RuntimeException("Insufficient loyalty points. Balance: {$customer->loyalty_points}");
            }

            $balanceBefore = $customer->loyalty_points;
            $balanceAfter  = $balanceBefore - $points;

            $customer->update(['loyalty_points' => $balanceAfter]);

            return LoyaltyTransaction::create([
                'customer_id'   => $customer->id,
                'order_id'      => $order?->id,
                'type'          => 'redeemed',
                'points'        => -$points,
                'balance_after' => $balanceAfter,
                'note'          => $order ? "Redeemed for order #{$order->order_number}" : 'Points redeemed',
                'created_by'    => $createdBy?->id,
            ]);
        });
    }

    /**
     * Manual adjustment (add or subtract).
     */
    public function adjust(Customer $customer, int $points, string $note, User $createdBy): LoyaltyTransaction
    {
        return DB::transaction(function () use ($customer, $points, $note, $createdBy) {
            $balanceBefore = $customer->loyalty_points;
            $balanceAfter  = max(0, $balanceBefore + $points);

            $customer->update(['loyalty_points' => $balanceAfter]);

            return LoyaltyTransaction::create([
                'customer_id'   => $customer->id,
                'type'          => 'adjusted',
                'points'        => $points,
                'balance_after' => $balanceAfter,
                'note'          => $note,
                'created_by'    => $createdBy->id,
            ]);
        });
    }

    /**
     * Expire points.
     */
    public function expire(Customer $customer, int $points, string $note): LoyaltyTransaction
    {
        return DB::transaction(function () use ($customer, $points, $note) {
            $balanceBefore = $customer->loyalty_points;
            $balanceAfter  = max(0, $balanceBefore - $points);

            $customer->update(['loyalty_points' => $balanceAfter]);

            return LoyaltyTransaction::create([
                'customer_id'   => $customer->id,
                'type'          => 'expired',
                'points'        => -$points,
                'balance_after' => $balanceAfter,
                'note'          => $note,
            ]);
        });
    }

    /**
     * Get current loyalty balance.
     */
    public function getBalance(Customer $customer): int
    {
        return $customer->loyalty_points;
    }

    /**
     * Calculate how many points can be earned for a given order amount.
     * Default: 1 point per ₹10 spent (configurable via settings).
     */
    public function calculateEarnable(float $orderAmount): int
    {
        $pointsPerRupee = (float) Setting::get('loyalty.points_per_rupee_spent', '0.1');

        return (int) floor($orderAmount * $pointsPerRupee);
    }
}
