<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserDevice;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FcmService
{
    private ?string $serverKey;
    private string  $fcmUrl = 'https://fcm.googleapis.com/fcm/send';

    public function __construct()
    {
        $this->serverKey = env('FCM_SERVER_KEY');
    }

    /**
     * Send FCM notification to all of a user's registered devices.
     */
    public function sendToUser(User $user, array $notification, array $data = []): bool
    {
        $tokens = UserDevice::where('user_id', $user->id)
            ->whereNotNull('fcm_token')
            ->pluck('fcm_token')
            ->toArray();

        if (empty($tokens)) {
            return false;
        }

        $results = $this->sendToMultiple($tokens, $notification, $data);

        return $results['sent'] > 0;
    }

    /**
     * Send to a single FCM token.
     */
    public function sendToDevice(string $fcmToken, array $notification, array $data = []): bool
    {
        if (! $this->serverKey) {
            Log::info('FCM: No server key — skipping', ['notification' => $notification]);

            return true;
        }

        try {
            $response = Http::withHeaders([
                'Authorization' => "key={$this->serverKey}",
                'Content-Type'  => 'application/json',
            ])->timeout(10)->post($this->fcmUrl, [
                'to'           => $fcmToken,
                'notification' => $notification,
                'data'         => $data,
                'priority'     => 'high',
            ]);

            if ($response->successful()) {
                $body = $response->json();
                if (($body['failure'] ?? 0) > 0) {
                    $this->handleTokenError($fcmToken, $body['results'][0] ?? []);

                    return false;
                }

                return true;
            }

            Log::warning('FCM send failed', ['status' => $response->status(), 'body' => $response->body()]);

            return false;
        } catch (\Throwable $e) {
            Log::error('FCM exception', ['error' => $e->getMessage()]);

            return false;
        }
    }

    /**
     * Send to multiple tokens. Returns ['sent' => int, 'failed' => int].
     */
    public function sendToMultiple(array $fcmTokens, array $notification, array $data = []): array
    {
        if (empty($fcmTokens) || ! $this->serverKey) {
            return ['sent' => 0, 'failed' => 0];
        }

        $chunks = array_chunk($fcmTokens, 500); // FCM limit per batch
        $sent   = 0;
        $failed = 0;

        foreach ($chunks as $chunk) {
            try {
                $response = Http::withHeaders([
                    'Authorization' => "key={$this->serverKey}",
                    'Content-Type'  => 'application/json',
                ])->timeout(15)->post($this->fcmUrl, [
                    'registration_ids' => $chunk,
                    'notification'     => $notification,
                    'data'             => $data,
                    'priority'         => 'high',
                ]);

                if ($response->successful()) {
                    $body    = $response->json();
                    $sent   += $body['success'] ?? 0;
                    $failed += $body['failure'] ?? 0;

                    // Remove stale tokens
                    if (isset($body['results'])) {
                        foreach ($body['results'] as $i => $result) {
                            if (isset($result['error']) && in_array($result['error'], ['NotRegistered', 'InvalidRegistration'])) {
                                $this->removeStaleToken($chunk[$i]);
                            }
                        }
                    }
                } else {
                    $failed += count($chunk);
                }
            } catch (\Throwable $e) {
                Log::error('FCM batch send failed', ['error' => $e->getMessage()]);
                $failed += count($chunk);
            }
        }

        return ['sent' => $sent, 'failed' => $failed];
    }

    /**
     * Send to all users matching a given role.
     */
    public function sendToRole(string $role, array $notification, array $data = []): void
    {
        $tokens = UserDevice::whereHas('user', fn ($q) => $q->where('role', $role))
            ->whereNotNull('fcm_token')
            ->pluck('fcm_token')
            ->toArray();

        if (! empty($tokens)) {
            $this->sendToMultiple($tokens, $notification, $data);
        }
    }

    /**
     * Remove a stale/invalid FCM token from all devices.
     */
    public function removeStaleToken(string $token): void
    {
        UserDevice::where('fcm_token', $token)->update(['fcm_token' => null]);
    }

    private function handleTokenError(string $token, array $result): void
    {
        $error = $result['error'] ?? '';
        if (in_array($error, ['NotRegistered', 'InvalidRegistration'])) {
            $this->removeStaleToken($token);
        }
    }
}
