<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Services\OtpService;
use App\Services\SmsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use App\Models\User;

class OtpController extends Controller
{
    public function __construct(
        private readonly OtpService $otpService,
        private readonly SmsService $smsService,
    ) {}

    /**
     * POST /api/v1/auth/otp/send
     * Rate-limited: 3 per 10 minutes per phone
     */
    public function send(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'phone' => 'required|string',
            'type'  => 'required|in:register,login,reset,phone_change',
        ]);

        $key = "otp_send:{$validated['phone']}";

        if (RateLimiter::tooManyAttempts($key, 3)) {
            $seconds = RateLimiter::availableIn($key);

            return response()->json([
                'success' => false,
                'message' => "Too many OTP requests. Try again in {$seconds} seconds.",
            ], 429);
        }

        RateLimiter::hit($key, 600); // 10 minutes

        if ($this->otpService->isOnCooldown($validated['phone'], $validated['type'])) {
            $remaining = $this->otpService->cooldownSecondsRemaining($validated['phone'], $validated['type']);

            return response()->json([
                'success' => false,
                'message' => "Please wait {$remaining} seconds before resending.",
                'retry_after' => $remaining,
            ], 429);
        }

        $otp = $this->otpService->generate($validated['phone'], $validated['type']);
        $this->smsService->sendOtp($validated['phone'], $otp);

        return response()->json(['success' => true, 'message' => 'OTP sent successfully.']);
    }

    /**
     * POST /api/v1/auth/otp/verify
     */
    public function verify(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'phone' => 'required|string',
            'otp'   => 'required|string|size:6',
            'type'  => 'required|in:register,login,reset,phone_change',
        ]);

        $verified = $this->otpService->verify($validated['phone'], $validated['type'], $validated['otp']);

        if (! $verified) {
            return response()->json(['success' => false, 'message' => 'Invalid or expired OTP.'], 422);
        }

        // Mark phone as verified on user if this is a register/login OTP
        if (in_array($validated['type'], ['register', 'login', 'phone_change'])) {
            User::where('mobile', $validated['phone'])
                ->whereNull('phone_verified_at')
                ->update(['phone_verified_at' => now()]);
        }

        return response()->json(['success' => true, 'message' => 'OTP verified.', 'data' => ['verified' => true]]);
    }

    /**
     * POST /api/v1/auth/otp/resend
     */
    public function resend(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'phone' => 'required|string',
            'type'  => 'required|in:register,login,reset,phone_change',
        ]);

        return $this->send($request);
    }
}
