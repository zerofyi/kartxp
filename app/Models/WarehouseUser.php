<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WarehouseUser extends Model
{
    protected $table = 'warehouse_users';

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

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Pulls historical deliveries handled by this staff worker.
     */
    public function deliveries(): HasMany
    {
        return $this->hasMany(Delivery::class, 'agent_id', 'user_id');
    }
}
