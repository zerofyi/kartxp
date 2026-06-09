<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PriceHistory extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'product_variant_id',
        'mrp',
        'selling_price',
        'cost_price',
        'effective_from',
        'created_by',
    ];

    protected $casts = [
        'mrp'            => 'decimal:2',
        'selling_price'  => 'decimal:2',
        'cost_price'     => 'decimal:2',
        'effective_from' => 'datetime',
    ];

    public function productVariant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
