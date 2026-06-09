<?php

/*
|--------------------------------------------------------------------------
| Cross-Origin Resource Sharing (CORS) Configuration
|--------------------------------------------------------------------------
|
| Here you may configure your settings for cross-origin resource sharing
| or "CORS". This determines what cross-origin operations may execute
| in web browsers. You are free to adjust these settings as needed.
|
| Allowed origins are derived from SANCTUM_STATEFUL_DOMAINS plus APP_URL,
| ensuring Sanctum SPA auth works across all registered frontend domains.
|
| To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
|
*/

$appUrl    = env('APP_URL', 'http://localhost');
$stateful  = env('SANCTUM_STATEFUL_DOMAINS', '');

// Parse SANCTUM_STATEFUL_DOMAINS into scheme-prefixed origins
$statefulOrigins = collect(explode(',', $stateful))
    ->map(fn (string $domain): string => trim($domain))
    ->filter()
    ->flatMap(function (string $domain): array {
        // Strip any port or path — keep only the host
        $host = parse_url('https://' . $domain, PHP_URL_HOST) ?? $domain;

        // Localhost variants get both http and https
        if (in_array($host, ['localhost', '127.0.0.1', '::1'], true)) {
            return [
                'http://' . $domain,
                'https://' . $domain,
            ];
        }

        return ['https://' . $domain];
    })
    ->values()
    ->all();

// Merge APP_URL and deduplicate
$allowedOrigins = collect([$appUrl])
    ->merge($statefulOrigins)
    ->unique()
    ->values()
    ->all();

return [

    /*
    |--------------------------------------------------------------------------
    | CORS Paths
    |--------------------------------------------------------------------------
    |
    | Routes that CORS headers will be applied to. The API routes, Sanctum
    | CSRF cookie endpoint, and standard auth endpoints are included.
    |
    */

    'paths' => [
        'api/*',
        'sanctum/csrf-cookie',
        '/login',
        '/logout',
    ],

    /*
    |--------------------------------------------------------------------------
    | Allowed Origins
    |--------------------------------------------------------------------------
    */

    'allowed_origins' => $allowedOrigins,

    /*
    |--------------------------------------------------------------------------
    | Allowed Origins Patterns
    |--------------------------------------------------------------------------
    |
    | You may use regex patterns here if needed. Empty by default — the
    | allowed_origins list above handles all required origins explicitly.
    |
    */

    'allowed_origins_patterns' => [],

    /*
    |--------------------------------------------------------------------------
    | Allowed Methods
    |--------------------------------------------------------------------------
    */

    'allowed_methods' => [
        'GET',
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
        'OPTIONS',
    ],

    /*
    |--------------------------------------------------------------------------
    | Allowed Headers
    |--------------------------------------------------------------------------
    */

    'allowed_headers' => [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'X-XSRF-TOKEN',
    ],

    /*
    |--------------------------------------------------------------------------
    | Exposed Headers
    |--------------------------------------------------------------------------
    |
    | Headers the browser is allowed to read from the response.
    |
    */

    'exposed_headers' => [],

    /*
    |--------------------------------------------------------------------------
    | Max Age
    |--------------------------------------------------------------------------
    |
    | Preflight cache lifetime in seconds. 86400 = 24 hours.
    |
    */

    'max_age' => 86400,

    /*
    |--------------------------------------------------------------------------
    | Supports Credentials
    |--------------------------------------------------------------------------
    |
    | Must be true for Sanctum cookie-based SPA authentication to work.
    |
    */

    'supports_credentials' => true,

];
