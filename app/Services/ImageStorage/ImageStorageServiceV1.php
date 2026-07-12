<?php

declare(strict_types=1);

namespace App\Services\ImageStorage;

use App\Services\ImageStorage\StoredImageResult;
use App\Services\ImageStorage\ImageStorageException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

/**
 * Stores, replaces, and deletes images on any Laravel filesystem disk.
 *
 * Responsibilities:
 *   • Validate MIME type against a caller-supplied or config-driven allowlist
 *   • Validate file size
 *   • Detect double-extension attacks  (shell.php.jpg)
 *   • Detect MIME-spoofing via magic-byte inspection
 *   • Sanitize folder paths against path-traversal
 *   • Store the file and return a typed DTO
 *   • Log every operation (structured, Monolog-compatible)
 *
 * ─── Typical usage ────────────────────────────────────────────────────────────
 *
 *   // Allow anything in the configured allowlist:
 *   $result = $imageStorage->upload($file, $slug, 'products');
 *
 *   // Restrict to a specific subset for this call:
 *   $result = $imageStorage->upload($file, $slug, 'avatars', allowedTypes: ['image/jpeg', 'image/png']);
 *
 *   // SVG-only upload:
 *   $result = $imageStorage->upload($file, $slug, 'icons', allowedTypes: ['image/svg+xml']);
 *
 *   // Persist the path, not the URL:
 *   $model->update(['image_path' => $result->path]);
 *
 * ─── Config (config/storage.php) ───────────────────────────────────────
 *
 *   'disk'         => env('IMAGE_STORAGE_DISK', 'public'),
 *   'max_size_kb'  => env('IMAGE_STORAGE_MAX_KB', 2048),
 *   'allowed_mime' => ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'],
 */
final class ImageStorageServiceV1
{
    // -------------------------------------------------------------------------
    // MIME → file magic bytes (first 12 bytes of a valid file)
    // SVG is XML text — no binary signature, handled separately.
    // -------------------------------------------------------------------------
    private const MAGIC_BYTES = [
        'image/jpeg' => ["\xFF\xD8\xFF"],
        'image/png'  => ["\x89PNG\r\n\x1A\n"],
        'image/gif'  => ["GIF87a", "GIF89a"],
        'image/webp' => ['RIFF'],   // full check: bytes 0-3 == RIFF, bytes 8-11 == WEBP
        'image/bmp'  => ["BM"],
    ];

    private const DANGEROUS_EXTENSIONS = [
        'php', 'php3', 'php4', 'php5', 'php7', 'phtml', 'phar',
        'asp', 'aspx', 'jsp', 'jspx',
        'cgi', 'pl', 'py', 'rb', 'sh', 'bash',
        'exe', 'bat', 'cmd', 'com', 'msi',
        'htaccess', 'htpasswd',
    ];

    // -------------------------------------------------------------------------
    // Resolved config (once, at construction time)
    // -------------------------------------------------------------------------
    private readonly array  $configuredAllowedMime;
    private readonly int    $defaultMaxSizeKb;
    private readonly string $defaultDisk;

    public function __construct()
    {
        $this->configuredAllowedMime = config('storage.allowed_mime', [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'image/bmp',
            'image/svg+xml',
        ]);

        $this->defaultMaxSizeKb = (int) config('storage.max_size_kb', 2048);
        $this->defaultDisk      = (string) config('storage.disk', 'public');
    }

    // =========================================================================
    // Public API
    // =========================================================================

    /**
     * Store a new image.
     *
     * @param  UploadedFile   $file          The validated file from the request.
     * @param  string         $slug          Human-readable prefix for the filename.
     * @param  string         $folder        Destination folder on disk, e.g. "Category/images".
     * @param  int|null       $maxSizeKb     Override max allowed size in KB (null = use config).
     * @param  string|null    $disk          Override storage disk (null = use config).
     * @param  string[]|null  $allowedTypes  Restrict to a MIME subset, e.g. ['image/svg+xml'].
     *                                       null = use the full configured allowlist.
     *
     * @return StoredImageResult
     *
     * @throws ImageStorageException  On validation or storage failure.
     */
    public function upload(
        UploadedFile $file,
        string       $slug,
        string       $folder,
        ?int         $maxSizeKb    = null,
        ?string      $disk         = null,
        ?array       $allowedTypes = null,
    ): StoredImageResult {
        $maxSizeKb    = $maxSizeKb ?? $this->defaultMaxSizeKb;
        $disk         = $disk      ?? $this->defaultDisk;
        $allowedTypes = $this->resolveAllowedTypes($allowedTypes);

        $this->validate($file, $maxSizeKb, $allowedTypes);

        $folder   = $this->sanitizeFolder($folder);
        $filename = $this->buildFilename($slug, $file);

        return $this->store($file, $folder, $filename, $disk);
    }

    /**
     * Upload a new file and delete the old one — atomically.
     * The old file is only removed after the new one is successfully written.
     *
     * @param  UploadedFile   $file
     * @param  string         $slug
     * @param  string         $folder
     * @param  string|null    $existingPath  Path of the old file to delete on success.
     * @param  int|null       $maxSizeKb
     * @param  string|null    $disk
     * @param  string[]|null  $allowedTypes
     *
     * @throws ImageStorageException
     */
    public function replace(
        UploadedFile $file,
        string       $slug,
        string       $folder,
        ?string      $existingPath = null,
        ?int         $maxSizeKb    = null,
        ?string      $disk         = null,
        ?array       $allowedTypes = null,
    ): StoredImageResult {
        $disk   = $disk ?? $this->defaultDisk;
        $result = $this->upload($file, $slug, $folder, $maxSizeKb, $disk, $allowedTypes);

        // Delete only after a successful upload — never lose the old file on failure.
        if ($existingPath !== null && $existingPath !== '') {
            $this->delete($existingPath, $disk);
        }

        return $result;
    }

    /**
     * Delete a stored file.
     *
     * Silently returns false if the file does not exist — callers should not
     * need to check existence themselves.
     *
     * @param  string       $path  Relative path as returned by StoredImageResult::$path.
     * @param  string|null  $disk  Storage disk (null = use config default).
     */
    public function delete(string $path, ?string $disk = null): bool
    {
        $disk = $disk ?? $this->defaultDisk;

        try {
            if (! Storage::disk($disk)->exists($path)) {
                return false;
            }

            $deleted = Storage::disk($disk)->delete($path);

            Log::info('ImageStorageService: deleted', compact('path', 'disk'));

            return $deleted;

        } catch (Throwable $e) {
            Log::warning('ImageStorageService: delete failed', [
                'path'  => $path,
                'disk'  => $disk,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Resolve a stored path to a full public URL.
     * Returns null when $path is null or empty (no file stored).
     */
    public function url(?string $path, ?string $disk = null): ?string
    {
        if ($path === null || $path === '') {
            return null;
        }

        return Storage::disk($disk ?? $this->defaultDisk)->url($path);
    }

    // =========================================================================
    // Validation
    // =========================================================================

    /** @throws ImageStorageException */
    private function validate(UploadedFile $file, int $maxSizeKb, array $allowedTypes): void
    {
        $this->assertMimeAllowed($file, $allowedTypes);
        $this->assertNoDoubleExtension($file);
        $this->assertFileSize($file, $maxSizeKb);

        // SVGs are XML — skip binary magic-byte check.
        if ($file->getMimeType() !== 'image/svg+xml') {
            $this->assertMagicBytes($file);
        }
    }

    /** @throws ImageStorageException */
    private function assertMimeAllowed(UploadedFile $file, array $allowed): void
    {
        $mime = $file->getMimeType() ?? '';

        if (! in_array($mime, $allowed, true)) {
            throw ImageStorageException::invalidType($mime, $allowed);
        }
    }

    /** @throws ImageStorageException */
    private function assertNoDoubleExtension(UploadedFile $file): void
    {
        $originalName = $file->getClientOriginalName();
        $innerExt     = strtolower(
            pathinfo(pathinfo($originalName, PATHINFO_FILENAME), PATHINFO_EXTENSION)
        );

        if ($innerExt !== '' && in_array($innerExt, self::DANGEROUS_EXTENSIONS, true)) {
            throw ImageStorageException::invalidContent(
                "Double-extension attack detected in filename \"{$originalName}\"."
            );
        }
    }

    /** @throws ImageStorageException */
    private function assertFileSize(UploadedFile $file, int $maxSizeKb): void
    {
        $actualKb = $file->getSize() / 1024;

        if ($actualKb > $maxSizeKb) {
            throw ImageStorageException::sizeExceeded($actualKb, $maxSizeKb);
        }
    }

    /**
     * Verify magic bytes match the declared MIME.
     * Catches files that have been renamed to bypass MIME detection.
     *
     * @throws ImageStorageException
     */
    private function assertMagicBytes(UploadedFile $file): void
    {
        $mime = $file->getMimeType() ?? '';

        if (! array_key_exists($mime, self::MAGIC_BYTES)) {
            return; // No rule defined for this type — skip.
        }

        $handle = fopen($file->getRealPath(), 'rb');

        if ($handle === false) {
            throw ImageStorageException::invalidContent('Could not open file for inspection.');
        }

        $header = fread($handle, 12);
        fclose($handle);

        if ($header === false || $header === '') {
            throw ImageStorageException::invalidContent('Could not read file header.');
        }

        // WebP has a compound 12-byte signature.
        if ($mime === 'image/webp') {
            if (! (str_starts_with($header, 'RIFF') && substr($header, 8, 4) === 'WEBP')) {
                throw ImageStorageException::invalidContent(
                    'File content does not match declared MIME type "image/webp".'
                );
            }
            return;
        }

        $valid = false;
        foreach (self::MAGIC_BYTES[$mime] as $signature) {
            if (str_starts_with($header, $signature)) {
                $valid = true;
                break;
            }
        }

        if (! $valid) {
            throw ImageStorageException::invalidContent(
                "File content does not match declared MIME type \"{$mime}\"."
            );
        }
    }

    // =========================================================================
    // Storage
    // =========================================================================

    /** @throws ImageStorageException */
    private function store(
        UploadedFile $file,
        string $folder,
        string $filename,
        string $disk,
    ): StoredImageResult {
        $path = "{$folder}/{$filename}";

        try {
            $stored = Storage::disk($disk)->putFileAs($folder, $file, $filename);
        } catch (Throwable $e) {
            Log::error('ImageStorageService: storage exception', [
                'path'  => $path,
                'disk'  => $disk,
                'error' => $e->getMessage(),
            ]);

            throw ImageStorageException::storageFailed($path, $disk, $e);
        }

        if ($stored === false) {
            Log::error('ImageStorageService: putFileAs returned false', compact('path', 'disk'));
            throw ImageStorageException::storageFailed($path, $disk);
        }

        $result = new StoredImageResult(
            path:     $stored,
            url:      Storage::disk($disk)->url($stored),
            filename: $filename,
            size:     $file->getSize(),
            mime:     $file->getMimeType() ?? '',
            disk:     $disk,
        );

        Log::info('ImageStorageService: stored', [
            'path' => $result->path,
            'disk' => $result->disk,
            'size' => $result->size,
            'mime' => $result->mime,
        ]);

        return $result;
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    /**
     * Merge caller-supplied types against the configured allowlist.
     * If the caller passes types that are not in the global list, they are
     * silently filtered out (defense in depth — config is the authority).
     */
    private function resolveAllowedTypes(?array $callerTypes): array
    {
        if ($callerTypes === null) {
            return $this->configuredAllowedMime;
        }

        // Intersect so callers can only narrow, never widen.
        $resolved = array_values(array_intersect($callerTypes, $this->configuredAllowedMime));

        if (empty($resolved)) {
            // Fallback to full list when intersection is empty (misconfiguration safety net).
            return $this->configuredAllowedMime;
        }

        return $resolved;
    }

    /**
     * Strip leading/trailing slashes, collapse double slashes,
     * and block path-traversal sequences.
     *
     * @throws ImageStorageException
     */
    private function sanitizeFolder(string $folder): string
    {
        if (preg_match('#(\.\.[\\/])|([\\/]\.\.)#', $folder)) {
            throw ImageStorageException::invalidContent(
                'Folder path contains a path-traversal sequence.'
            );
        }

        return trim((string) preg_replace('#/+#', '/', $folder), '/');
    }

    /**
     * Build a filesystem-safe, time-sortable filename.
     *
     * Format : {slug}_{ulid}.{ext}
     * Example: my-product_01HXG3K2FTPQR8N5VCZ.webp
     *
     * - Slug is capped at 80 chars to stay within path-length limits.
     * - ULID is monotonically sortable (unlike UUID4) — great for S3/CDN listings.
     * - Extension comes from the detected MIME, not the client filename.
     */
    private function buildFilename(string $slug, UploadedFile $file): string
    {
        $slug = Str::substr(Str::slug($slug), 0, 80);
        $ulid = (string) Str::ulid();
        $ext  = $this->mimeToExtension($file);

        return "{$slug}_{$ulid}.{$ext}";
    }

    /**
     * Derive the file extension from the detected MIME type.
     * Falls back to the client-supplied extension, then "jpg".
     */
    private function mimeToExtension(UploadedFile $file): string
    {
        $map = [
            'image/jpeg'    => 'jpg',
            'image/png'     => 'png',
            'image/gif'     => 'gif',
            'image/webp'    => 'webp',
            'image/bmp'     => 'bmp',
            'image/svg+xml' => 'svg',
        ];

        return $map[$file->getMimeType() ?? '']
            ?? strtolower($file->getClientOriginalExtension())
            ?: 'jpg';
    }
}
