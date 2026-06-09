<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Warehouse extends Model
{
    protected $fillable = ['name', 'address', 'location', 'phone', 'email', 'logo_path', 'is_active', 'gstin', 'lat', 'lng', 'timezone', 'currency', 'user_id'];

    protected $casts = [
        'is_active' => 'boolean',
        'lat'       => 'decimal:8',
        'lng'       => 'decimal:8',
    ];

    // -----------------------------------------------------------------------
    // Relationships
    // -----------------------------------------------------------------------

    /**
     * Warehouse owner.
     * Uses warehouses.user_id
     */
    public function ownerUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Membership records.
     */
    public function warehouseUsers(): HasMany
    {
        return $this->hasMany(WarehouseUser::class);
    }

    /**
     * All users assigned to this warehouse.
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(
            User::class,
            'warehouse_users',
            'warehouse_id',
            'user_id'
        )
        ->withPivot(['role', 'is_active', 'joined_at'])
        ->withTimestamps();
    }

    /**
     * Owner membership.
     */
    public function owner(): BelongsToMany
    {
        return $this->users()->wherePivot('role', 'owner');
    }

    public function managers(): BelongsToMany
    {
        return $this->users()->wherePivot('role', 'manager');
    }

    public function staff(): BelongsToMany
    {
        return $this->users()->wherePivot('role', 'staff');
    }

    public function agents(): BelongsToMany
    {
        return $this->users()->wherePivot('role', 'delivery_agent');
    }


    public function stockBatches(): HasMany
    {
        return $this->hasMany(StockBatch::class);
    }

    public function stockLedgers(): HasMany
    {
        return $this->hasMany(StockLedger::class);
    }

    public function stockSnapshots(): HasMany
    {
        return $this->hasMany(StockSnapshot::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    public function shippingZones(): HasMany
    {
        return $this->hasMany(ShippingZone::class);
    }

    // -----------------------------------------------------------------------
    // Scopes
    // -----------------------------------------------------------------------

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }
}
