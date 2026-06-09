<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Address extends Model
{
    protected $fillable = [
        'user_id',
        'customer_id',
        'label',
        'name',
        'phone',
        'line1',
        'line2',
        'city',
        'state',
        'pincode',
        'country',
        'lat',
        'lng',
        'is_default',
    ];

    protected $casts = [
        'lat'        => 'decimal:8',
        'lng'        => 'decimal:8',
        'is_default' => 'boolean',
    ];

    // -----------------------------------------------------------------------
    // Relationships
    // -----------------------------------------------------------------------

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}
