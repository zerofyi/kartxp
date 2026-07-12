<?php

declare(strict_types=1);

namespace App\Services\ImageStorage;

use App\Services\ImageStorage\StoredImageResult;
use App\Services\ImageStorage\ImageStorageException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Imagick\Driver as ImagickDriver;
use Intervention\Image\Encoders\WebpEncoder; // <-- Explicit v4 Encoder Contract
use Throwable;

/**
 * Stores, replaces, and deletes images on any Laravel filesystem disk.
 *
 * Version: Laravel v13.x & Intervention Image v4.1.5 (Imagick Engine)
 * Architecture: All structural image assets are normalized to WebP format via discrete Encoders.
 * Convention: Directory names use UPPERCASE first letters (e.g., "Products/Variants")[cite: 1].
 */
final class ImageStorageService
{
    private const MAGIC_BYTES = [
        'image/jpeg' => ["\xFF\xD8\xFF"],
        'image/png'  => ["\x89PNG\r\n\x1A\n"],
        'image/gif'  => ["GIF87a", "GIF89a"],
        'image/webp' => ['RIFF'],
        'image/bmp'  => ["BM"],
    ];

    private const DANGEROUS_EXTENSIONS = [
        'php', 'php3', 'php4', 'php5', 'php7', 'phtml', 'phar',
        'asp', 'aspx', 'jsp', 'jspx',
        'cgi', 'pl', 'py', 'rb', 'sh', 'bash',
        'exe', 'bat', 'cmd', 'com', 'msi',
        'htaccess', 'htpasswd',
    ];

    private readonly array  $configuredAllowedMime;
    private readonly int    $defaultMaxSizeKb;
    private readonly string $defaultDisk;
    private readonly ImageManager $manager;

    public function __construct()
    {
        $this->configuredAllowedMime = config('storage.allowed_mime', [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml',
        ]);
        $this->defaultMaxSizeKb = (int) config('storage.max_size_kb', 2048);
        $this->defaultDisk      = (string) config('storage.disk', 'public');

        // Single shared instance to eliminate memory allocation overhead inside loops
        $this->manager = new ImageManager(new ImagickDriver());
    }

    /**
     * Store a new image, normalizing both Master and Thumbnail assets to clean WebP.
     *
     * @param  UploadedFile  $file          The raw validated file object.
     * @param  string        $slug          Filename base prefix.
     * @param  string        $folder        Target base folder name (e.g. "Products/Variants")[cite: 1].
     * @param  bool          $generateThumb Toggle to trigger dynamic thumbnail processing.
     */
    public function upload(
        UploadedFile $file,
        string       $slug,
        string       $folder,
        ?int         $maxSizeKb     = null,
        ?string      $disk          = null,
        ?array       $allowedTypes  = null,
        bool         $generateThumb = false
    ): StoredImageResult {
        $maxSizeKb    = $maxSizeKb ?? $this->defaultMaxSizeKb;
        $disk         = $disk      ?? $this->defaultDisk;
        $allowedTypes = $this->resolveAllowedTypes($allowedTypes);

        $this->validate($file, $maxSizeKb, $allowedTypes);

        $folder   = $this->sanitizeFolder($folder);
        $filename = $this->buildFilename($slug, $file);

        // 1. Process and save the Master copy as an optimized WebP
        $result = $this->storeAsWebp($file, $folder, $filename, $disk);

        // 2. Process and save the unified global thumbnail mirror layout if requested
        if ($generateThumb && $file->getMimeType() !== 'image/svg+xml') {
            try {
                $this->generateThumbnailOnDisk($file->getRealPath(), $folder, $result->filename, $disk);
            } catch (Throwable $e) {
                Log::error('ImageStorageService: Thumbnail generation failed during upload', [
                    'folder' => $folder, 'file' => $result->filename, 'error' => $e->getMessage()
                ]);
            }
        }

        return $result;
    }

    /**
     * Internal Core Engine: Resizes and stores thumbnail variants proportionally using the v4 WebpEncoder driver.
     */
    private function generateThumbnailOnDisk(string $sourcePath, string $folder, string $filename, string $disk): void
    {
        // Global Thumbnails workspace mapping pattern
        $thumbnailFolder = $this->sanitizeFolder("Thumbnails/{$folder}");
        $thumbnailPath   = "{$thumbnailFolder}/{$filename}";

        // scaleDown() proportionally handles boundary thresholds without clipping or unwanted padding
        $encodedThumbnail = $this->manager->decodePath($sourcePath)
            ->scaleDown(width: 200, height: 200)
            ->encode(new WebpEncoder(quality: 75));

        Storage::disk($disk)->put($thumbnailPath, (string) $encodedThumbnail);

        Log::info('ImageStorageService: Global Thumbnail written successfully', [
            'path' => $thumbnailPath, 'disk' => $disk
        ]);
    }

    /**
     * Maintenance Script: Migrates legacy micro-folders to a flat directory layout,
     * encodes existing masters to WebP via the v4 Encoder, and generates global thumbnails.
     */
    public function migrateAndBuildThumbnail(string $oldRelativePath, string $targetBaseFolder, ?string $disk = null): ?string
    {
        $disk = $disk ?? $this->defaultDisk;

        if (empty($oldRelativePath) || !Storage::disk($disk)->exists($oldRelativePath)) {
            return null;
        }

        $filename = basename($oldRelativePath);
        $rawName  = pathinfo($filename, PATHINFO_FILENAME);
        $targetBaseFolder = $this->sanitizeFolder($targetBaseFolder);

        // Ensure the new master follows the uniform webp signature scheme
        $newFilename     = Str::endsWith(strtolower($filename), '.svg') ? $filename : "{$rawName}.webp";
        $newRelativePath = "{$targetBaseFolder}/{$newFilename}";

        try {
            // Case A: File is already in the right directory but needs WebP processing
            // Case B: File is inside a legacy ID folder structure and needs migration[cite: 1]
            if ($oldRelativePath !== $newRelativePath) {
                if (!Storage::disk($disk)->exists($targetBaseFolder)) {
                    Storage::disk($disk)->makeDirectory($targetBaseFolder);
                }

                if (Str::endsWith(strtolower($filename), '.svg')) {
                    Storage::disk($disk)->move($oldRelativePath, $newRelativePath);
                } else {
                    // Convert master to WebP on-the-fly via v4 WebpEncoder during migration
                    $convertedMaster = $this->manager->decodePath(Storage::disk($disk)->path($oldRelativePath))
                        ->encode(new WebpEncoder(quality: 85));

                    Storage::disk($disk)->put($newRelativePath, (string) $convertedMaster);
                    Storage::disk($disk)->delete($oldRelativePath);
                }
            }

            // Generate the uniform thumbnail variant within the global mirror directory path
            if (!Str::endsWith(strtolower($newFilename), '.svg')) {
                $absoluteSource = Storage::disk($disk)->path($newRelativePath);
                $this->generateThumbnailOnDisk($absoluteSource, $targetBaseFolder, $newFilename, $disk);
            }

            // Remove legacy micro-directories left empty[cite: 1]
            $oldFolder = dirname($oldRelativePath);
            if ($oldFolder !== $targetBaseFolder && count(Storage::disk($disk)->allFiles($oldFolder)) === 0) {
                Storage::disk($disk)->deleteDirectory($oldFolder);
            }

            return $newRelativePath;

        } catch (Throwable $e) {
            Log::error("ImageStorageService: Migration routine processing failure", [
                'path' => $oldRelativePath, 'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    public function replace(
        UploadedFile $file,
        string       $slug,
        string       $folder,
        ?string      $existingPath  = null,
        ?int         $maxSizeKb     = null,
        ?string      $disk          = null,
        ?array       $allowedTypes  = null,
        bool         $generateThumb = false
    ): StoredImageResult {
        $disk   = $disk ?? $this->defaultDisk;
        $result = $this->upload($file, $slug, $folder, $maxSizeKb, $disk, $allowedTypes, $generateThumb);

        if ($existingPath !== null && $existingPath !== '') {
            $this->delete($existingPath, $disk);
        }

        return $result;
    }

    public function delete(string $path, ?string $disk = null): bool
    {
        $disk = $disk ?? $this->defaultDisk;

        try {
            if (! Storage::disk($disk)->exists($path)) {
                return false;
            }

            // Unlink companion thumb out of the global Thumbnails system workspace
            $filename  = basename($path);
            $folder    = dirname($path);
            $thumbPath = $this->sanitizeFolder("Thumbnails/{$folder}/{$filename}");

            if (Storage::disk($disk)->exists($thumbPath)) {
                Storage::disk($disk)->delete($thumbPath);
            }

            return Storage::disk($disk)->delete($path);
        } catch (Throwable $e) {
            Log::warning('ImageStorageService: delete loop validation mismatch', [
                'path' => $path, 'disk' => $disk, 'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    public function url(?string $path, ?string $disk = null): ?string
    {
        if ($path === null || $path === '') {
            return null;
        }
        return Storage::disk($disk ?? $this->defaultDisk)->url($path);
    }

    /**
     * Resolves asset lookups directed specifically toward the global Thumbnails mirror path.
     */
    public function thumbnailUrl(?string $path, ?string $disk = null): ?string
    {
        if ($path === null || $path === '') {
            return null;
        }

        $filename  = basename($path);
        $folder    = dirname($path);
        $thumbPath = $this->sanitizeFolder("Thumbnails/{$folder}/{$filename}");

        $targetPath = Storage::disk($disk ?? $this->defaultDisk)->exists($thumbPath) ? $thumbPath : $path;

        return Storage::disk($disk ?? $this->defaultDisk)->url($targetPath);
    }

    private function validate(UploadedFile $file, int $maxSizeKb, array $allowedTypes): void
    {
        $this->assertMimeAllowed($file, $allowedTypes);
        $this->assertNoDoubleExtension($file);
        $this->assertFileSize($file, $maxSizeKb);

        if ($file->getMimeType() !== 'image/svg+xml') {
            $this->assertMagicBytes($file);
        }
    }

    private function assertMimeAllowed(UploadedFile $file, array $allowed): void
    {
        $mime = $file->getMimeType() ?? '';
        if (! in_array($mime, $allowed, true)) {
            throw ImageStorageException::invalidType($mime, $allowed);
        }
    }

    private function assertNoDoubleExtension(UploadedFile $file): void
    {
        $originalName = $file->getClientOriginalName();
        $innerExt     = strtolower(pathinfo(pathinfo($originalName, PATHINFO_FILENAME), PATHINFO_EXTENSION));

        if ($innerExt !== '' && in_array($innerExt, self::DANGEROUS_EXTENSIONS, true)) {
            throw ImageStorageException::invalidContent("Double-extension attack detected in filename \"{$originalName}\".");
        }
    }

    private function assertFileSize(UploadedFile $file, int $maxSizeKb): void
    {
        $actualKb = $file->getSize() / 1024;
        if ($actualKb > $maxSizeKb) {
            throw ImageStorageException::sizeExceeded($actualKb, $maxSizeKb);
        }
    }

    private function assertMagicBytes(UploadedFile $file): void
    {
        $mime = $file->getMimeType() ?? '';
        if (! array_key_exists($mime, self::MAGIC_BYTES)) {
            return;
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

        if ($mime === 'image/webp') {
            if (! (str_starts_with($header, 'RIFF') && substr($header, 8, 4) === 'WEBP')) {
                throw ImageStorageException::invalidContent('File content does not match declared MIME type "image/webp".');
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
            throw ImageStorageException::invalidContent("File content does not match declared MIME type \"{$mime}\".");
        }
    }

    /**
     * Re-encodes uploaded master files directly into high-fidelity WebP format streams using v4 architecture.
     */
    private function storeAsWebp(UploadedFile $file, string $folder, string $filename, string $disk): StoredImageResult
    {
        if ($file->getMimeType() === 'image/svg+xml') {
            $path = "{$folder}/{$filename}";
            Storage::disk($disk)->putFileAs($folder, $file, $filename);
            return new StoredImageResult($path, Storage::disk($disk)->url($path), $filename, $file->getSize(), 'image/svg+xml', $disk);
        }

        $webpName = pathinfo($filename, PATHINFO_FILENAME) . '.webp';
        $path     = "{$folder}/{$webpName}";

        try {
            $encodedMaster = $this->manager->decodePath($file->getRealPath())
                ->encode(new WebpEncoder(quality: 85));

            Storage::disk($disk)->put($path, (string) $encodedMaster);
        } catch (Throwable $e) {
            Log::error('ImageStorageService: WebP conversion storage error', [
                'path' => $path, 'disk' => $disk, 'error' => $e->getMessage(),
            ]);
            throw ImageStorageException::storageFailed($path, $disk, $e);
        }

        return new StoredImageResult(
            path:     $path,
            url:      Storage::disk($disk)->url($path),
            filename: $webpName,
            size:     (int) Storage::disk($disk)->size($path),
            mime:     'image/webp',
            disk:     $disk,
        );
    }

    private function resolveAllowedTypes(?array $callerTypes): array
    {
        if ($callerTypes === null) {
            return $this->configuredAllowedMime;
        }
        $resolved = array_values(array_intersect($callerTypes, $this->configuredAllowedMime));
        return empty($resolved) ? $this->configuredAllowedMime : $resolved;
    }

    private function sanitizeFolder(string $folder): string
    {
        if (preg_match('#(\.\.[\\/])|([\\/]\.\.)#', $folder)) {
            throw ImageStorageException::invalidContent('Folder path contains a path-traversal sequence.');
        }
        return trim((string) preg_replace('#/+#', '/', $folder), '/');
    }

    private function buildFilename(string $slug, UploadedFile $file): string
    {
        $slug = Str::substr(Str::slug($slug), 0, 80);
        $ulid = (string) Str::ulid();
        $ext  = $this->mimeToExtension($file);
        return "{$slug}_{$ulid}.{$ext}";
    }

    private function mimeToExtension(UploadedFile $file): string
    {
        $map = [
            'image/jpeg' => 'jpg', 'image/png' => 'png', 'image/gif' => 'gif',
            'image/webp' => 'webp', 'image/bmp' => 'bmp', 'image/svg+xml' => 'svg',
        ];
        return $map[$file->getMimeType() ?? ''] ?? strtolower($file->getClientOriginalExtension()) ?: 'jpg';
    }
}
