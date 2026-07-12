<?php

declare(strict_types=1);

namespace App\Services\ImageStorage;

/**
 * Immutable value object returned by every successful ImageStorageService operation.
 *
 * Store $result->path in your database column.
 * Use $result->url  in API responses / Blade / Inertia.
 */
final readonly class StoredImageResult
{
    public function __construct(
        /** Relative path on the storage disk — persist this in the DB.
         *  e.g. "Category/images/my-slug_01HXG3K2FT.jpg"
         */
        public string $path,

        /** Fully-qualified public URL ready to use in <img src="..."> */
        public string $url,

        /** Just the filename — useful for debugging / logging */
        public string $filename,

        /** File size in bytes */
        public int $size,

        /** Detected MIME type, e.g. "image/webp" */
        public string $mime,

        /** Storage disk used, e.g. "public" or "s3" */
        public string $disk,
    ) {}

    /**
     * Serialize to a plain array — useful for JSON responses or model attributes.
     *
     * @return array{path:string, url:string, filename:string, size:int, mime:string, disk:string}
     */
    public function toArray(): array
    {
        return [
            'path'     => $this->path,
            'url'      => $this->url,
            'filename' => $this->filename,
            'size'     => $this->size,
            'mime'     => $this->mime,
            'disk'     => $this->disk,
        ];
    }
}
