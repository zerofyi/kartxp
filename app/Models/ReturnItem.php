<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReturnItem extends Model
{
    /**
     * The table associated with the model.
     */
    protected $table = 'return_items';

    protected $fillable = ['return_id', 'order_item_id', 'quantity', 'condition', 'restock'];

    protected $casts = [
        'quantity' => 'integer',
        'restock'  => 'boolean',
    ];

    // -----------------------------------------------------------------------
    // Relationships
    // -----------------------------------------------------------------------

    public function returnRequest(): BelongsTo
    {
        return $this->belongsTo(ReturnRequest::class, 'return_request_id');
    }

    public function orderItem(): BelongsTo
    {
        return $this->belongsTo(OrderItem::class);
    }
}
