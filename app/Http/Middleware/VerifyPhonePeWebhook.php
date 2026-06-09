<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class VerifyPhonePeWebhook
{
    /**
     * The PhonePe Pay endpoint path used in the X-VERIFY signature.
     *
     * PhonePe constructs the checksum as:
     *   SHA256(base64(requestBody) + apiEndpoint + saltKey) + '###' + saltIndex
     */
    private const API_ENDPOINT = '/pg/v1/pay';

    /**
     * Handle an incoming request.
     *
     * Performs two security checks:
     *   1. Source IP must be in the configured allowed_ips list (supports CIDR).
     *   2. X-VERIFY header must match the expected SHA256 checksum.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // ──────────────────────────────────────────────────────────────
        // 1. IP Allowlist Check
        // ──────────────────────────────────────────────────────────────
        $clientIp    = $request->ip() ?? '';
        $allowedCidrs = config('phonepe.allowed_ips', []);

        if (! $this->isIpAllowed($clientIp, $allowedCidrs)) {
            Log::warning('PhonePe webhook: IP not in allowlist.', [
                'ip'  => $clientIp,
                'url' => $request->fullUrl(),
            ]);

            return $this->unauthorizedResponse('Forbidden: IP not allowed.');
        }

        // ──────────────────────────────────────────────────────────────
        // 2. X-VERIFY Checksum Verification
        // ──────────────────────────────────────────────────────────────
        $verifyHeader = $request->header('X-VERIFY', '');

        if (! $this->verifyChecksum($request->getContent(), $verifyHeader)) {
            Log::warning('PhonePe webhook: X-VERIFY checksum mismatch.', [
                'ip'             => $clientIp,
                'url'            => $request->fullUrl(),
                'x_verify_given' => $verifyHeader,
            ]);

            return $this->unauthorizedResponse('Forbidden: Invalid checksum.');
        }

        return $next($request);
    }

    // ──────────────────────────────────────────────────────────────────
    // Private Helpers
    // ──────────────────────────────────────────────────────────────────

    /**
     * Check whether the given IP is covered by any entry in the allowed list.
     *
     * Each entry may be a plain IP address or a CIDR range (e.g. 203.94.241.0/24).
     */
    private function isIpAllowed(string $ip, array $allowedCidrs): bool
    {
        foreach ($allowedCidrs as $cidr) {
            if (str_contains($cidr, '/')) {
                if ($this->ipInCidr($ip, $cidr)) {
                    return true;
                }
            } elseif ($ip === $cidr) {
                return true;
            }
        }

        return false;
    }

    /**
     * Determine whether an IPv4 address falls within a CIDR range.
     */
    private function ipInCidr(string $ip, string $cidr): bool
    {
        [$subnet, $prefix] = explode('/', $cidr, 2);

        $ipLong     = ip2long($ip);
        $subnetLong = ip2long($subnet);

        if ($ipLong === false || $subnetLong === false) {
            return false;
        }

        $prefixLen = (int) $prefix;

        if ($prefixLen < 0 || $prefixLen > 32) {
            return false;
        }

        // Build a bitmask: all 1s shifted left by (32 - prefix)
        $mask = $prefixLen === 0
            ? 0
            : (~0 << (32 - $prefixLen)) & 0xFFFFFFFF;

        // Unsigned comparison via sprintf trick on 32-bit PHP builds
        return ($ipLong & $mask) === ($subnetLong & $mask);
    }

    /**
     * Verify the X-VERIFY header against the expected PhonePe checksum.
     *
     * Expected format:
     *   SHA256(base64(requestBody) + '/pg/v1/pay' + saltKey) + '###' + saltIndex
     */
    private function verifyChecksum(string $rawBody, string $verifyHeader): bool
    {
        $saltKey   = (string) config('phonepe.salt_key', '');
        $saltIndex = (string) config('phonepe.salt_index', '1');

        if ($saltKey === '' || $verifyHeader === '') {
            return false;
        }

        // Decode the header: <sha256hash>###<saltIndex>
        $parts = explode('###', $verifyHeader, 2);

        if (count($parts) !== 2) {
            return false;
        }

        [$receivedHash, $receivedIndex] = $parts;

        // Salt index must match
        if ($receivedIndex !== $saltIndex) {
            return false;
        }

        // Reconstruct expected hash
        $base64Body    = base64_encode($rawBody);
        $payloadToHash = $base64Body . self::API_ENDPOINT . $saltKey;
        $expectedHash  = hash('sha256', $payloadToHash);

        // Constant-time comparison to prevent timing attacks
        return hash_equals($expectedHash, $receivedHash);
    }

    /**
     * Build a JSON 401 Unauthorized response.
     */
    private function unauthorizedResponse(string $message): Response
    {
        return response()->json([
            'success' => false,
            'data'    => null,
            'message' => $message,
        ], Response::HTTP_UNAUTHORIZED);
    }
}
