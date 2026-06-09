<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    protected $fillable = [
        'order_id',
        'customer_id',
        'vendor_id',
        'amount',
        'method',
        'type',
        'reference_no',
        'gateway',
        'transaction_id',
        'gateway_order_id',
        'status',
        'payload',
    ];

    protected $casts = [
        'amount'  => 'decimal:2',
        'payload' => 'array',
    ];

    // -----------------------------------------------------------------------
    // Relationships
    // -----------------------------------------------------------------------

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class);
    }
}
