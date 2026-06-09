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
}
