<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasFactory, Notifiable, TwoFactorAuthenticatable, HasApiTokens, SoftDeletes, HasRoles;

    protected $fillable = [
        'name',
        'email',
        'password',
        'mobile',
        'role',
        'status',
        'parent_id',
        'last_login_at',
        'avatar',
        'phone_verified_at',
    ];

    protected $hidden = [
        'password',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at'       => 'datetime',
            'phone_verified_at'       => 'datetime',
            'last_login_at'           => 'datetime',
            'password'                => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    // -----------------------------------------------------------------------
    // Relationships
    // -----------------------------------------------------------------------

    /**
     * The exclusive warehouse owned by this user (Strict 1-to-1).
     */
    public function ownedWarehouse(): HasOne
    {
        return $this->hasOne(Warehouse::class, 'user_id');
    }

    /**
     * Warehouses this user is assigned to work at as an employee/staff.
     */
    public function staffWarehouses(): BelongsToMany
    {
        return $this->belongsToMany(
            Warehouse::class,
            'warehouse_users',
            'user_id',
            'warehouse_id'
        )
        ->withPivot(['role', 'is_active', 'joined_at'])
        ->withTimestamps();
    }

    /**
     * Direct relationship to historical or active delivery manifests.
     */
    public function deliveries(): HasMany
    {
        return $this->hasMany(Delivery::class, 'agent_id');
    }

    public function devices(): HasMany
    {
        return $this->hasMany(UserDevice::class);
    }

    public function customer(): HasOne
    {
        return $this->hasOne(Customer::class);
    }

    public function addresses(): HasMany
    {
        return $this->hasMany(Address::class);
    }

    public function warehouseUsers(): HasMany
    {
        return $this->hasMany(WarehouseUser::class, 'user_id');
    }

    // -----------------------------------------------------------------------
    // Scopes
    // -----------------------------------------------------------------------

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active');
    }
}
