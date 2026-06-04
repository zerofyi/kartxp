<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockBatch extends Model
{
    protected $fillable = [
        'product_variant_id',
        'warehouse_id',
        'batch_no',
        'expiry_date',
        'purchase_item_id',
        'received_quantity',
        'available_quantity',
    ];

    protected $casts = [
        'expiry_date' => 'date',
        'received_quantity' => 'integer',
        'available_quantity' => 'integer',
    ];

    public function productVariant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function purchaseItem(): BelongsTo
    {
        return $this->belongsTo(PurchaseItem::class);
    }
}
