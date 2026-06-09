<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProductVariant extends Model
{
    use HasFactory, SoftDeletes;

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
        'compare_price',
        'stock_alert_qty',
        'weight',
        'status',
    ];

    protected $casts = [
        'net_quantity'      => 'decimal:2',
        'mrp'               => 'decimal:2',
        'selling_price'     => 'decimal:2',
        'cost_price'        => 'decimal:2',
        'min_selling_price' => 'decimal:2',
        'compare_price'     => 'decimal:2',
        'weight'            => 'decimal:3',
        'stock_alert_qty'   => 'integer',
        'status'            => 'boolean',
    ];

    // -----------------------------------------------------------------------
    // Relationships
    // -----------------------------------------------------------------------

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    /**
     * Latest / single stock snapshot for this variant (most recent warehouse snapshot).
     */
    public function stockSnapshot(): HasOne
    {
        return $this->hasOne(StockSnapshot::class)->latestOfMany('updated_at');
    }

    public function stockSnapshots(): HasMany
    {
        return $this->hasMany(StockSnapshot::class);
    }

    public function barcodes(): HasMany
    {
        return $this->hasMany(Barcode::class);
    }

    public function priceHistories(): HasMany
    {
        return $this->hasMany(PriceHistory::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class)->orderBy('sort_order');
    }

    public function primaryImage(): HasOne
    {
        return $this->hasOne(ProductImage::class)->where('is_primary', true);
    }

    public function attributeValues(): BelongsToMany
    {
        return $this->belongsToMany(AttributeValue::class, 'product_variant_attributes');
    }

    public function cartItems(): HasMany
    {
        return $this->hasMany(CartItem::class);
    }

    public function wishlists(): HasMany
    {
        return $this->hasMany(Wishlist::class);
    }

    // -----------------------------------------------------------------------
    // Accessors
    // -----------------------------------------------------------------------

    /**
     * Determine whether the variant's current stock is at or below the alert threshold.
     * Reads from the latest StockSnapshot's quantity_on_hand.
     */
    public function getIsLowStockAttribute(): bool
    {
        if ($this->stock_alert_qty === null) {
            return false;
        }

        $snapshot = $this->stockSnapshot;

        if ($snapshot === null) {
            return false;
        }

        return (int) $snapshot->quantity_on_hand <= (int) $this->stock_alert_qty;
    }

    // -----------------------------------------------------------------------
    // Scopes
    // -----------------------------------------------------------------------

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', true);
    }
}
