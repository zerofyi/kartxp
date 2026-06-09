<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShippingZone extends Model
{
    protected $fillable = ['warehouse_id', 'name', 'pincodes', 'radius_km', 'charge', 'free_above', 'is_active'];

    protected $casts = [
        'pincodes'  => 'array',
        'charge'    => 'decimal:2',
        'free_above' => 'decimal:2',
        'radius_km' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    // -----------------------------------------------------------------------
    // Relationships
    // -----------------------------------------------------------------------

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    // -----------------------------------------------------------------------
    // Scopes
    // -----------------------------------------------------------------------

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    // -----------------------------------------------------------------------
    // Business logic
    // -----------------------------------------------------------------------

    /**
     * Determine whether this shipping zone covers the given pincode.
     *
     * @param  string $pincode
     * @return bool
     */
    public function coversAddress(string $pincode): bool
    {
        $pincodes = $this->pincodes;

        if (empty($pincodes) || ! is_array($pincodes)) {
            return false;
        }

        return in_array($pincode, $pincodes, strict: true);
    }
}
