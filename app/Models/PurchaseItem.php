<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PurchaseItem extends Model
{
    protected $fillable = [
        'purchase_id',
        'product_variant_id',
        'quantity',
        'cost_price',
        'min_selling_price',
        'selling_price',
        'mrp',
        'tax_id',
        'batch_no',
        'expiry_date',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'cost_price' => 'decimal:2',
        'min_selling_price' => 'decimal:2',
        'selling_price' => 'decimal:2',
        'mrp' => 'decimal:2',
        'expiry_date' => 'date',
    ];

    public function purchase(): BelongsTo
    {
        return $this->belongsTo(Purchase::class);
    }

    public function productVariant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class);
    }

    public function stockBatches(): HasMany
    {
        return $this->hasMany(StockBatch::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class, 'product_variant_id', 'product_variant_id');
    }

    public function taxCategory(): BelongsTo
    {
        return $this->belongsTo(TaxCategory::class, 'tax_id');
    }

}
