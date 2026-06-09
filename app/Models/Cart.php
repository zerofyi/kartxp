<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Cart extends Model
{
    protected $fillable = [
        'user_id',
        'session_id',
        'warehouse_id',
        'expires_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
    ];

    // -----------------------------------------------------------------------
    // Relationships
    // -----------------------------------------------------------------------

    public function items(): HasMany
    {
        return $this->hasMany(CartItem::class);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // -----------------------------------------------------------------------
    // Computed attributes
    // -----------------------------------------------------------------------

    /**
     * Compute the cart total from loaded items.
     * Eager-load items before accessing this attribute for efficiency.
     */
    public function getTotalAttribute(): float
    {
        return $this->items->sum(fn (CartItem $item): float => (float) $item->unit_price * $item->quantity);
    }
}
