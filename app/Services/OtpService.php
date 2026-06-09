<?php

namespace App\Services;

use App\Models\OtpVerification;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class OtpService
{
    private const OTP_LENGTH = 6;
    private const OTP_TTL_MINUTES = 10;
    private const MAX_ATTEMPTS = 3;
    private const RESEND_COOLDOWN_SECONDS = 60;

    /**
     * Generate a new OTP for the given identifier and type.
     * Invalidates any existing pending OTPs for same identifier+type.
     */
    public function generate(string $identifier, string $type): string
    {
        // Invalidate previous OTPs
        OtpVerification::where('identifier', $identifier)
            ->where('type', $type)
            ->whereNull('verified_at')
            ->delete();

        $otp = $this->randomOtp();

        OtpVerification::create([
            'identifier'  => $identifier,
            'otp'         => Hash::make($otp),
            'type'        => $type,
            'expires_at'  => Carbon::now()->addMinutes(self::OTP_TTL_MINUTES),
            'verified_at' => null,
            'attempts'    => 0,
            'sent_at'     => Carbon::now(),
            'ip_address'  => request()->ip(),
        ]);

        return $otp;
    }

    /**
     * Verify the provided OTP. Returns true on success.
     * Increments attempt counter; marks verified_at on success.
     */
    public function verify(string $identifier, string $type, string $otp): bool
    {
        /** @var OtpVerification|null $record */
        $record = OtpVerification::where('identifier', $identifier)
            ->where('type', $type)
            ->whereNull('verified_at')
            ->where('expires_at', '>', Carbon::now())
            ->latest()
            ->first();

        if (! $record) {
            return false;
        }

        if ($record->attempts >= self::MAX_ATTEMPTS) {
            return false;
        }

        $record->increment('attempts');

        if (! Hash::check($otp, $record->otp)) {
            return false;
        }

        $record->update(['verified_at' => Carbon::now()]);

        return true;
    }

    /**
     * Check if the identifier is on resend cooldown.
     */
    public function isOnCooldown(string $identifier, string $type): bool
    {
        $record = OtpVerification::where('identifier', $identifier)
            ->where('type', $type)
            ->whereNull('verified_at')
            ->latest()
            ->first();

        if (! $record || ! $record->sent_at) {
            return false;
        }

        return Carbon::now()->diffInSeconds($record->sent_at) < self::RESEND_COOLDOWN_SECONDS;
    }

    /**
     * Seconds remaining in resend cooldown (0 if not on cooldown).
     */
    public function cooldownSecondsRemaining(string $identifier, string $type): int
    {
        $record = OtpVerification::where('identifier', $identifier)
            ->where('type', $type)
            ->whereNull('verified_at')
            ->latest()
            ->first();

        if (! $record || ! $record->sent_at) {
            return 0;
        }

        $elapsed = Carbon::now()->diffInSeconds($record->sent_at);

        return max(0, self::RESEND_COOLDOWN_SECONDS - $elapsed);
    }

    /**
     * Delete expired / old OTP records. Run this on a schedule (hourly).
     */
    public function cleanup(): int
    {
        return OtpVerification::where(function ($q) {
            $q->where('expires_at', '<', Carbon::now())
              ->orWhere('created_at', '<', Carbon::now()->subHour());
        })->delete();
    }

    private function randomOtp(): string
    {
        return str_pad((string) random_int(0, 999999), self::OTP_LENGTH, '0', STR_PAD_LEFT);
    }
}
