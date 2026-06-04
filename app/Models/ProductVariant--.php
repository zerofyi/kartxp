<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class ProductVariant extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'variant_name',
        'sku',
        'unit_id',
        'net_quantity',
        'mrp',
        'selling_price',
        'cost_price',
        'min_selling_price',
        'status',
    ];

    protected $casts = [
        'net_quantity' => 'decimal:2',
        'mrp' => 'decimal:2',
        'selling_price' => 'decimal:2',
        'cost_price' => 'decimal:2',
        'min_selling_price' => 'decimal:2',
        'status' => 'boolean',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function stockSnapshots(): HasMany
    {
        return $this->hasMany(StockSnapshot::class);
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function barcodes(): HasMany
    {
        return $this->hasMany(Barcode::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class);
    }

    public function attributeValues(): BelongsToMany
    {
        return $this->belongsToMany(AttributeValue::class, 'product_variant_attributes');
    }
}
