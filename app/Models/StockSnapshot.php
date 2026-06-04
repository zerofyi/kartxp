<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockSnapshot extends Model
{
    protected $fillable = [
        'product_variant_id',
        'warehouse_id',
        'available_quantity',
        'reserved_quantity',
    ];

    protected $casts = [
        'available_quantity' => 'integer',
        'reserved_quantity' => 'integer',
    ];

    public function productVariant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function getTotalQuantityAttribute(): int
    {
        return $this->available_quantity + $this->reserved_quantity;
    }
}
