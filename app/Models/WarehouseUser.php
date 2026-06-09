<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WarehouseUser extends Model
{
    protected $fillable = [
        'warehouse_id',
        'user_id',
        'role',
        'is_active',
        'joined_at',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'joined_at' => 'datetime',
    ];

    /**
     * Get the warehouse node context linked to this record.
     */
    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    /**
     * Get the system user account profile identity records.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get all historical and active delivery manifests mapped to this operator context.
     * Maps local user_id value to foreign agent_id references within deliveries schema.
     */
    public function deliveries(): HasMany
    {
        return $this->hasMany(Delivery::class, 'agent_id', 'user_id');
    }
}
