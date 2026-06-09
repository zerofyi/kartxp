<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\OtpService;
use App\Services\SmsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class PasswordController extends Controller
{
    public function __construct(
        private readonly OtpService $otpService,
        private readonly SmsService $smsService,
    ) {}

    /**
     * POST /api/v1/auth/forgot-password
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $validated = $request->validate(['phone' => 'required|string|exists:users,mobile']);

        $otp = $this->otpService->generate($validated['phone'], 'reset');
        $this->smsService->sendOtp($validated['phone'], $otp);

        return response()->json(['success' => true, 'message' => 'OTP sent to your registered phone number.']);
    }

    /**
     * POST /api/v1/auth/reset-password
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'phone'                 => 'required|string|exists:users,mobile',
            'otp'                   => 'required|string|size:6',
            'password'              => ['required', Password::min(8), 'confirmed'],
        ]);

        if (! $this->otpService->verify($validated['phone'], 'reset', $validated['otp'])) {
            return response()->json(['success' => false, 'message' => 'Invalid or expired OTP.'], 422);
        }

        $user = User::where('mobile', $validated['phone'])->firstOrFail();
        $user->update(['password' => Hash::make($validated['password'])]);
        $user->tokens()->delete(); // Revoke all existing tokens

        return response()->json(['success' => true, 'message' => 'Password reset successfully. Please log in again.']);
    }

    /**
     * PUT /api/v1/auth/change-password (authenticated)
     */
    public function changePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => 'required|string',
            'password'         => ['required', Password::min(8), 'confirmed'],
        ]);

        $user = $request->user();

        if (! Hash::check($validated['current_password'], $user->password)) {
            return response()->json(['success' => false, 'message' => 'Current password is incorrect.'], 422);
        }

        $user->update(['password' => Hash::make($validated['password'])]);
        // Keep current token, revoke all others
        $user->tokens()->where('id', '!=', $request->user()->currentAccessToken()->id)->delete();

        return response()->json(['success' => true, 'message' => 'Password changed successfully.']);
    }
}
