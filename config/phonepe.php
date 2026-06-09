<?php

return [

    /*
    |--------------------------------------------------------------------------
    | PhonePe Merchant Credentials
    |--------------------------------------------------------------------------
    |
    | Your PhonePe merchant ID and salt key obtained from the PhonePe
    | merchant dashboard. Keep these values secret.
    |
    */

    'merchant_id' => env('PHONEPE_MERCHANT_ID', ''),

    'salt_key' => env('PHONEPE_SALT_KEY', ''),

    'salt_index' => env('PHONEPE_SALT_INDEX', 1),

    /*
    |--------------------------------------------------------------------------
    | PhonePe Environment
    |--------------------------------------------------------------------------
    |
    | Determines which PhonePe environment to use. Accepted values are
    | "sandbox" (preprod) or "production". This controls the base_url below.
    |
    */

    'env' => env('PHONEPE_ENV', 'sandbox'),

    /*
    |--------------------------------------------------------------------------
    | PhonePe API Base URL
    |--------------------------------------------------------------------------
    |
    | Automatically switches between sandbox and production endpoints based on
    | the PHONEPE_ENV value. Do not override this directly in .env.
    |
    */

    'base_url' => env('PHONEPE_ENV', 'sandbox') === 'production'
        ? 'https://api.phonepe.com/apis/hermes'
        : 'https://api-preprod.phonepe.com/apis/pg-sandbox',

    /*
    |--------------------------------------------------------------------------
    | Callback & Redirect URLs
    |--------------------------------------------------------------------------
    |
    | callback_url : PhonePe server-to-server webhook endpoint.
    | redirect_url : Browser redirect after payment completion.
    |
    */

    'callback_url' => env('APP_URL') . '/api/v1/payments/phonepe/callback',

    'redirect_url' => env('APP_URL') . '/api/v1/payments/phonepe/redirect',

    /*
    |--------------------------------------------------------------------------
    | Allowed PhonePe Server IPs
    |--------------------------------------------------------------------------
    |
    | These IP ranges are used by the VerifyPhonePeWebhook middleware to
    | whitelist incoming webhook requests. CIDR notation is supported.
    |
    */

    'allowed_ips' => [
        '203.94.241.0/24',   // PhonePe production IPs
        '103.127.112.0/22',  // PhonePe production IPs
        '127.0.0.1',         // localhost for local testing
    ],

];
