<?php

declare(strict_types=1);

namespace App\Services\ImageStorage;

use RuntimeException;
use Throwable;

/**
 * Thrown by ImageStorageService on any failure.
 *
 * Branch on the integer code — never on the message string:
 *
 *   ImageStorageException::CODE_INVALID_TYPE
 *   ImageStorageException::CODE_SIZE_EXCEEDED
 *   ImageStorageException::CODE_INVALID_CONTENT
 *   ImageStorageException::CODE_STORAGE_FAILURE
 */
final class ImageStorageException extends RuntimeException
{
    public const CODE_INVALID_TYPE    = 1001;
    public const CODE_SIZE_EXCEEDED   = 1002;
    public const CODE_INVALID_CONTENT = 1003;
    public const CODE_STORAGE_FAILURE = 1004;

    public static function invalidType(string $mime, array $allowed): self
    {
        return new self(
            sprintf(
                'Invalid file type "%s". Allowed: %s.',
                $mime,
                implode(', ', $allowed)
            ),
            self::CODE_INVALID_TYPE
        );
    }

    public static function sizeExceeded(float $actualKb, int $maxKb): self
    {
        return new self(
            sprintf(
                'File size (%.2f KB) exceeds the maximum allowed size (%d KB).',
                $actualKb,
                $maxKb
            ),
            self::CODE_SIZE_EXCEEDED
        );
    }

    public static function invalidContent(string $reason): self
    {
        return new self(
            sprintf('File content validation failed: %s', $reason),
            self::CODE_INVALID_CONTENT
        );
    }

    public static function storageFailed(string $path, string $disk, ?Throwable $previous = null): self
    {
        return new self(
            sprintf('Failed to store file at "%s" on disk "%s".', $path, $disk),
            self::CODE_STORAGE_FAILURE,
            $previous
        );
    }
}
