<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItem extends Model
{
    protected $fillable = [
        'order_id',
        'product_variant_id',
        'quantity',
        'price',
        'discount',
        'tax_percent',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'price' => 'decimal:2',
        'discount' => 'decimal:2',
        'tax_percent' => 'decimal:2',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function productVariant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class);
    }

    public function getSubtotalAttribute(): float
    {
        return $this->quantity * $this->price;
    }

    public function getTaxAmountAttribute(): float
    {
        return (($this->subtotal - $this->discount) * $this->tax_percent) / 100;
    }

    public function getTotalAttribute(): float
    {
        return $this->subtotal - $this->discount + $this->tax_amount;
    }
}
