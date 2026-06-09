<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeaders
{
    /**
     * Security headers to attach to every HTTP response.
     *
     * These headers harden the application against common browser-based attacks
     * such as XSS, clickjacking, MIME sniffing, and information leakage.
     */
    private const HEADERS = [
        'X-Content-Type-Options'  => 'nosniff',
        'X-Frame-Options'         => 'SAMEORIGIN',
        'X-XSS-Protection'        => '1; mode=block',
        'Referrer-Policy'         => 'strict-origin-when-cross-origin',
        'Permissions-Policy'      => 'camera=(), microphone=(), geolocation=(self)',
        'Content-Security-Policy' => "default-src 'self' http://localhost:5173 http://127.0.0.1:5173 ws://localhost:5173 ws://127.0.0.1:5173; "
            . "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:5173 http://127.0.0.1:5173; "
            . "style-src 'self' 'unsafe-inline' fonts.googleapis.com fonts.bunny.net http://localhost:5173 http://127.0.0.1:5173; "
            . "font-src 'self' fonts.gstatic.com fonts.bunny.net http://localhost:5173 http://127.0.0.1:5173; "
            . "img-src 'self' data: blob: https: http://localhost:5173 http://127.0.0.1:5173; "
            . "connect-src 'self' https: wss: ws://localhost:5173 ws://127.0.0.1:5173 http://localhost:5173 http://127.0.0.1:5173",
    ];

    /**
     * Strict-Transport-Security header value.
     * Only applied on HTTPS connections to avoid breaking local HTTP development.
     */
    private const HSTS = 'max-age=31536000; includeSubDomains';

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // In local development or when Vite HMR is running, CSP often blocks local assets.
        // We bypass strict security headers locally, but enforce them in production.
        if (app()->environment('local') || file_exists(public_path('hot'))) {
            return $response;
        }

        foreach (self::HEADERS as $header => $value) {
            $response->headers->set($header, $value);
        }

        // Only add HSTS on HTTPS to avoid breaking plain HTTP (local dev)
        if ($request->isSecure()) {
            $response->headers->set('Strict-Transport-Security', self::HSTS);
        }

        return $response;
    }
}
