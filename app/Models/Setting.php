<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    protected $fillable = [
        'key',
        'value',
        'warehouse_id',
        'group',
    ];

    // -----------------------------------------------------------------------
    // Scopes
    // -----------------------------------------------------------------------

    public function scopeGlobal(Builder $query): Builder
    {
        return $query->whereNull('warehouse_id');
    }

    /**
     * Scope to settings belonging to a specific warehouse.
     * Usage: Setting::forWarehouse(1)->get()
     */
    public function scopeForWarehouse(Builder $query, int $warehouseId): Builder
    {
        return $query->where('warehouse_id', $warehouseId);
    }

    /**
     * Load ALL settings for a warehouse as a key=>value array.
     * Results are cached forever (busted when Setting::set() is called).
     *
     * Use this when you need multiple settings at once (e.g. settings page,
     * POS load) instead of calling Setting::get() per key which fires one
     * query per key even with cache warming.
     *
     * Usage: $map = Setting::allForWarehouse(1);
     *        $map['upi_id'] ?? '';
     */
    public static function allForWarehouse(int $warehouseId): array
    {
        $cacheKey = 'settings:warehouse:' . $warehouseId;

        return Cache::rememberForever($cacheKey, function () use ($warehouseId): array {
            return static::where('warehouse_id', $warehouseId)
                ->pluck('value', 'key')
                ->toArray();
        });
    }

    /**
     * Load ALL global settings (warehouse_id IS NULL) as key=>value array.
     * Usage: $map = Setting::allGlobal();
     */
    public static function allGlobal(): array
    {
        return Cache::rememberForever('settings:global', function (): array {
            return static::whereNull('warehouse_id')
                ->pluck('value', 'key')
                ->toArray();
        });
    }

    // -----------------------------------------------------------------------
    // Static helpers
    // -----------------------------------------------------------------------

    /**
     * Retrieve a setting value by key.
     *
     * @param  string  $key
     * @param  mixed   $default
     * @param  int|null $warehouseId
     * @return mixed
     */
    public static function get(string $key, mixed $default = null, ?int $warehouseId = null): mixed
    {
        $cacheKey = 'setting:' . ($warehouseId ?? 'global') . ':' . $key;

        return Cache::rememberForever($cacheKey, function () use ($key, $default, $warehouseId): mixed {
            $query = static::where('key', $key);

            if ($warehouseId !== null) {
                $query->where('warehouse_id', $warehouseId);
            } else {
                $query->whereNull('warehouse_id');
            }

            $setting = $query->first();

            return $setting ? $setting->value : $default;
        });
    }

    /**
     * Persist a setting value, updating if it already exists.
     *
     * @param  string   $key
     * @param  mixed    $value
     * @param  int|null $warehouseId
     */
    public static function set(string $key, mixed $value, ?int $warehouseId = null): void
    {
        static::updateOrCreate(
            [
                'key'          => $key,
                'warehouse_id' => $warehouseId,
            ],
            ['value' => $value]
        );

        // Bust the cache for this key
        $cacheKey = 'setting:' . ($warehouseId ?? 'global') . ':' . $key;
        Cache::forget($cacheKey);
    }

    protected static function booted(): void
    {
        // A helper to forget the specific cache key
        $clearCache = function ($setting) {
            $warehouseKey = $setting->warehouse_id ?? 'global';
            $cacheKey = "setting:{$warehouseKey}:{$setting->key}";
            Cache::forget($cacheKey);
        };

        // Whenever a setting is updated, saved, or deleted, flush its unique key
        static::saved($clearCache);
        static::deleted($clearCache);
    }
}
