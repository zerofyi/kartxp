<?php

namespace App\Console\Commands;

use App\Models\Coupon;
use Illuminate\Console\Command;

class ProcessExpiredCoupons extends Command
{
    protected $signature   = 'app:process-expired-coupons';
    protected $description = 'Deactivate coupons that have passed their ends_at date';

    public function handle(): int
    {
        $count = Coupon::where('is_active', true)
            ->whereNotNull('ends_at')
            ->where('ends_at', '<', now())
            ->update(['is_active' => false]);

        $this->info("✅ Deactivated {$count} expired coupons.");

        // Also deactivate fully exhausted coupons
        $exhausted = Coupon::where('is_active', true)
            ->whereNotNull('usage_limit')
            ->whereColumn('used_count', '>=', 'usage_limit')
            ->update(['is_active' => false]);

        $this->info("✅ Deactivated {$exhausted} exhausted coupons.");

        return self::SUCCESS;
    }
}
