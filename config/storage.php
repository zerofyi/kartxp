<?php
// config/image_storage.php

return [
    /*
    |--------------------------------------------------------------------------
    | Default Storage Disk
    |--------------------------------------------------------------------------
    | The default disk where images will be stored. 'public' is recommended
    | over 'public_html' for standard Laravel configurations.
    */
    'disk' => env('IMAGE_STORAGE_DISK', 'public'),

    /*
    |--------------------------------------------------------------------------
    | Maximum File Size
    |--------------------------------------------------------------------------
    | Maximum default allowed size per image file in Kilobytes.
    */
    'max_size_kb' => env('IMAGE_STORAGE_MAX_KB', 2048),

    /*
    |--------------------------------------------------------------------------
    | Globally Allowed MIME Types
    |--------------------------------------------------------------------------
    | The master allowlist of media types. Callers can narrow this list down
    | using the service parameters, but they can never bypass it.
    */
    'allowed_mime' => [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/bmp',
        'image/svg+xml',
    ],
];
