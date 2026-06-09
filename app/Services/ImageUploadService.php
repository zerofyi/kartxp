<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

class ImageUploadService
{
    /**
     * Default max file size in bytes (2MB).
     */
    protected const DEFAULT_MAX_SIZE = 2 * 1024 * 1024;

    /**
     * Allowed image MIME types.
     */
    protected array $allowedMimeTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
    ];

    /**
     * Upload an image file to the given folder.
     *
     * @param  UploadedFile  $file       The uploaded file instance.
     * @param  string        $slug       Used as a prefix in the filename.
     * @param  string        $folder     The storage folder (e.g. 'Brand', 'Products').
     * @param  int|null      $maxSize    Max allowed size in bytes. Defaults to 2MB.
     * @param  string        $disk       The filesystem disk to use. Defaults to 'public_html'.
     * @return string|false             The stored file path on success, false on failure.
     */
    public function upload(
        UploadedFile $file,
        string $slug,
        string $folder,
        ?int $maxSize = null,
        string $disk = 'public_html'
    ): string|false {
        try {
            $maxSize ??= self::DEFAULT_MAX_SIZE;

            $this->validate($file, $maxSize);

            $fileName = $this->buildFileName($slug, $file->getClientOriginalExtension());

            return $file->storeAs($folder, $fileName, $disk);

        } catch (\InvalidArgumentException $e) {
            logger()->warning('Image upload validation failed: ' . $e->getMessage());
            return false;

        } catch (\Exception $e) {
            logger()->error('Image upload failed: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Validate the file size and MIME type.
     *
     * @throws \InvalidArgumentException
     */
    protected function validate(UploadedFile $file, int $maxSize): void
    {
        if ($file->getSize() > $maxSize) {
            throw new \InvalidArgumentException(
                "File size ({$file->getSize()} bytes) exceeds the maximum allowed size ({$maxSize} bytes)."
            );
        }

        if (! in_array($file->getMimeType(), $this->allowedMimeTypes, true)) {
            throw new \InvalidArgumentException(
                "File type [{$file->getMimeType()}] is not allowed."
            );
        }
    }

    /**
     * Build a unique filename from the slug and extension.
     */
    protected function buildFileName(string $slug, string $extension): string
    {
        $randomString = Str::random(6);
        $timestamp = now()->format('Ymd_His');
        return "{$slug}-{$timestamp}-{$randomString}.{$extension}";
    }
}
