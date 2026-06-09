<?php

namespace App\Console\Commands;

use App\Models\OtpVerification;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class CleanExpiredOtps extends Command
{
    protected $signature   = 'app:clean-expired-otps';
    protected $description = 'Delete expired OTP verification records older than 1 hour';

    public function handle(): int
    {
        $deleted = OtpVerification::where(function ($q) {
            $q->where('expires_at', '<', Carbon::now())
              ->orWhere('created_at', '<', Carbon::now()->subHour());
        })->delete();

        $this->info("Cleaned {$deleted} expired OTP records.");

        return self::SUCCESS;
    }
}
