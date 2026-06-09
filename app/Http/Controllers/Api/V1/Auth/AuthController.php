<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\User;
use App\Models\UserDevice;
use App\Services\OtpService;
use App\Services\SmsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    public function __construct(
        private readonly OtpService $otpService,
        private readonly SmsService $smsService,
    ) {}

    /**
     * POST /api/v1/auth/register
     */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'     => 'required|string|max:255',
            'phone'    => 'required|string|unique:users,mobile',
            'email'    => 'nullable|email|unique:users,email',
            'password' => ['required', Password::min(8)],
        ]);

        DB::transaction(function () use ($validated, $request) {
            $user = User::create([
                'name'     => $validated['name'],
                'mobile'   => $validated['phone'],
                'email'    => $validated['email'] ?? null,
                'password' => Hash::make($validated['password']),
                'role'     => 'customer',
                'status'   => 'inactive',
            ]);

            Customer::create([
                'name'    => $user->name,
                'phone'   => $user->mobile,
                'user_id' => $user->id,
                'email'   => $user->email,
            ]);

            // Send OTP
            $otp = $this->otpService->generate($user->mobile, 'register');
            $this->smsService->sendOtp($user->mobile, $otp);
        });

        return response()->json([
            'success' => true,
            'message' => 'Registration successful. OTP sent to your phone.',
        ], 201);
    }

    /**
     * POST /api/v1/auth/login
     */
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'phone'       => 'required|string',
            'password'    => 'required|string',
            'device_id'   => 'nullable|string',
            'device_name' => 'nullable|string',
            'fcm_token'   => 'nullable|string',
        ]);

        $user = User::where('mobile', $validated['phone'])->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            return response()->json(['success' => false, 'message' => 'Invalid phone or password.'], 401);
        }

        if ($user->status !== 'active') {
            return response()->json(['success' => false, 'message' => 'Your account is inactive.'], 403);
        }

        // Update last login
        $user->update(['last_login_at' => now()]);

        // Upsert device record
        if ($validated['device_id'] ?? null) {
            UserDevice::updateOrCreate(
                ['user_id' => $user->id, 'device_id' => $validated['device_id']],
                [
                    'device_name' => $validated['device_name'] ?? 'Unknown',
                    'fcm_token'   => $validated['fcm_token'] ?? null,
                ]
            );
        }

        $token    = $user->createToken($validated['device_name'] ?? 'api-token')->plainTextToken;
        $customer = $user->customer;

        return response()->json([
            'success' => true,
            'data'    => [
                'token'    => $token,
                'user'     => $this->userResource($user),
                'customer' => $customer ? $this->customerResource($customer) : null,
            ],
            'message' => 'Login successful.',
        ]);
    }

    /**
     * POST /api/v1/auth/logout
     */
    public function logout(Request $request): JsonResponse
    {
        $deviceId = $request->input('device_id');

        if ($deviceId) {
            UserDevice::where('user_id', $request->user()->id)
                ->where('device_id', $deviceId)
                ->delete();
        }

        $request->user()->currentAccessToken()->delete();

        return response()->json(['success' => true, 'message' => 'Logged out successfully.']);
    }

    /**
     * GET /api/v1/auth/me
     */
    public function me(Request $request): JsonResponse
    {
        $user     = $request->user()->load('customer');
        $customer = $user->customer;

        $unreadCount = DB::table('notifications')
            ->where('notifiable_id', $user->id)
            ->whereNull('read_at')
            ->count();

        return response()->json([
            'success' => true,
            'data'    => array_merge(
                $this->userResource($user),
                [
                    'customer'              => $customer ? $this->customerResource($customer) : null,
                    'unread_notifications'  => $unreadCount,
                ]
            ),
        ]);
    }

    /**
     * PUT /api/v1/auth/profile
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name'  => 'required|string|max:255',
            'email' => "nullable|email|unique:users,email,{$user->id}",
        ]);

        $user->update($validated);

        if ($user->customer) {
            $user->customer->update(['name' => $validated['name']]);
        }

        return response()->json(['success' => true, 'data' => $this->userResource($user->fresh()), 'message' => 'Profile updated.']);
    }

    /**
     * PUT /api/v1/auth/avatar
     */
    public function updateAvatar(Request $request): JsonResponse
    {
        $request->validate(['avatar' => 'required|image|max:2048']);

        $user = $request->user();
        $path = $request->file('avatar')->store("avatars/{$user->id}", 'public');

        // Delete old avatar
        if ($user->avatar) {
            Storage::disk('public')->delete($user->avatar);
        }

        $user->update(['avatar' => $path]);

        return response()->json([
            'success' => true,
            'data'    => ['avatar_url' => Storage::url($path)],
            'message' => 'Avatar updated.',
        ]);
    }

    /**
     * PUT /api/v1/auth/fcm-token
     */
    public function updateFcmToken(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'fcm_token'   => 'required|string',
            'device_id'   => 'required|string',
            'device_name' => 'nullable|string',
        ]);

        UserDevice::updateOrCreate(
            ['user_id' => $request->user()->id, 'device_id' => $validated['device_id']],
            ['fcm_token' => $validated['fcm_token'], 'device_name' => $validated['device_name'] ?? 'Unknown']
        );

        return response()->json(['success' => true, 'message' => 'FCM token updated.']);
    }

    /**
     * PUT /api/v1/auth/location
     */
    public function updateLocation(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'lat'       => 'required|numeric|between:-90,90',
            'lng'       => 'required|numeric|between:-180,180',
            'device_id' => 'required|string',
        ]);

        UserDevice::where('user_id', $request->user()->id)
            ->where('device_id', $validated['device_id'])
            ->update([
                'location' => DB::raw("ST_GeomFromText('POINT({$validated['lat']} {$validated['lng']})')"),
            ]);

        return response()->json(['success' => true, 'message' => 'Location updated.']);
    }

    /**
     * GET /api/v1/auth/sessions
     */
    public function sessions(Request $request): JsonResponse
    {
        $tokens = $request->user()->tokens()
            ->select('id', 'name', 'last_used_at', 'created_at')
            ->orderByDesc('last_used_at')
            ->get();

        return response()->json(['success' => true, 'data' => $tokens]);
    }

    /**
     * DELETE /api/v1/auth/sessions/{id}
     */
    public function revokeSession(Request $request, int $id): JsonResponse
    {
        $request->user()->tokens()->where('id', $id)->delete();

        return response()->json(['success' => true, 'message' => 'Session revoked.']);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function userResource(User $user): array
    {
        return [
            'id'                => $user->id,
            'name'              => $user->name,
            'email'             => $user->email,
            'mobile'            => $user->mobile,
            'role'              => $user->role,
            'avatar_url'        => $user->avatar ? Storage::url($user->avatar) : null,
            'phone_verified_at' => $user->phone_verified_at?->toISOString(),
            'email_verified_at' => $user->email_verified_at?->toISOString(),
            'created_at'        => $user->created_at?->toISOString(),
        ];
    }

    private function customerResource(Customer $customer): array
    {
        return [
            'id'             => $customer->id,
            'loyalty_points' => $customer->loyalty_points,
            'total_spent'    => $customer->total_spent,
            'credit_limit'   => $customer->credit_limit,
            'is_verified'    => $customer->is_verified,
        ];
    }
}
