<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SmsService
{
    private string $provider;

    public function __construct()
    {
        $this->provider = config('services.sms.provider', env('SMS_PROVIDER', 'fast2sms'));
    }

    /**
     * Send a plain text SMS message.
     */
    public function send(string $phone, string $message): bool
    {
        try {
            return match ($this->provider) {
                'msg91'    => $this->sendViaMSG91($phone, $message),
                'fast2sms' => $this->sendViaFast2SMS($phone, $message),
                default    => $this->logOnly($phone, $message),
            };
        } catch (\Throwable $e) {
            Log::error('SMS send failed', [
                'provider' => $this->provider,
                'phone'    => $phone,
                'error'    => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Send OTP via SMS.
     */
    public function sendOtp(string $phone, string $otp): bool
    {
        $appName = config('app.name', 'GhorerBazar');
        $message = "{$otp} is your {$appName} verification code. Valid for 10 minutes. Do not share with anyone.";

        // MSG91 has template-based OTP — use template if configured
        if ($this->provider === 'msg91' && env('MSG91_OTP_TEMPLATE_ID')) {
            return $this->sendViaMSG91Otp($phone, $otp);
        }

        return $this->send($phone, $message);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Drivers
    // ─────────────────────────────────────────────────────────────────────────

    private function sendViaMSG91(string $phone, string $message): bool
    {
        $authKey  = env('MSG91_AUTH_KEY');
        $senderId = env('MSG91_SENDER_ID', 'GHRBZR');

        if (! $authKey) {
            return $this->logOnly($phone, $message);
        }

        $phone = $this->normalizeIndianPhone($phone);

        $response = Http::withHeaders([
            'authkey'      => $authKey,
            'content-type' => 'application/json',
        ])->post('https://api.msg91.com/api/v5/flow/', [
            'template_id' => env('MSG91_OTP_TEMPLATE_ID', ''),
            'sender'      => $senderId,
            'short_url'   => '0',
            'mobiles'     => $phone,
            'VAR1'        => $message,
        ]);

        return $response->successful() && ($response->json('type') === 'success');
    }

    private function sendViaMSG91Otp(string $phone, string $otp): bool
    {
        $authKey    = env('MSG91_AUTH_KEY');
        $templateId = env('MSG91_OTP_TEMPLATE_ID');
        $senderId   = env('MSG91_SENDER_ID', 'GHRBZR');

        if (! $authKey || ! $templateId) {
            return $this->logOnly($phone, "OTP: {$otp}");
        }

        $phone = $this->normalizeIndianPhone($phone);

        $response = Http::withHeaders([
            'authkey'      => $authKey,
            'content-type' => 'application/json',
        ])->post('https://api.msg91.com/api/v5/flow/', [
            'template_id' => $templateId,
            'sender'      => $senderId,
            'short_url'   => '0',
            'mobiles'     => $phone,
            'OTP'         => $otp,
        ]);

        return $response->successful();
    }

    private function sendViaFast2SMS(string $phone, string $message): bool
    {
        $apiKey = env('FAST2SMS_API_KEY');

        if (! $apiKey) {
            return $this->logOnly($phone, $message);
        }

        $phone = preg_replace('/^\+91/', '', $phone);

        $response = Http::withHeaders([
            'authorization' => $apiKey,
        ])->get('https://www.fast2sms.com/dev/bulkV2', [
            'authorization' => $apiKey,
            'variables_values' => $message,
            'route'            => 'q',
            'numbers'          => $phone,
        ]);

        Log::info('Fast2SMS response', ['phone' => $phone, 'response' => $response->body()]);

        return $response->successful() && ($response->json('return') === true);
    }

    private function logOnly(string $phone, string $message): bool
    {
        Log::info('SMS (log-only mode)', ['phone' => $phone, 'message' => $message]);

        return true; // Return true so dev flow continues
    }

    private function normalizeIndianPhone(string $phone): string
    {
        $phone = preg_replace('/[^0-9]/', '', $phone);
        if (strlen($phone) === 10) {
            $phone = '91' . $phone;
        }

        return $phone;
    }
}
