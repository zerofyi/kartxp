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
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, TwoFactorAuthenticatable, HasApiTokens, SoftDeletes, HasRoles;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
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

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at'       => 'datetime',
            'phone_verified_at'       => 'datetime',
            'last_login_at'           => 'datetime',
            'password'                => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            //'status'                  => 'boolean',
        ];
    }

    // -----------------------------------------------------------------------
    // Relationships
    // -----------------------------------------------------------------------

    public function devices(): HasMany
    {
        return $this->hasMany(UserDevice::class);
    }

    public function warehouseUsers(): HasMany
    {
        return $this->hasMany(WarehouseUser::class);
    }

    public function currentWarehouse(): ?Warehouse
    {
        return $this->warehouses()->first();
    }

    /**
     * Warehouses this user belongs to.
     */
    public function warehouses(): BelongsToMany
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

    public function customer(): HasOne
    {
        return $this->hasOne(Customer::class);
    }

    public function addresses(): HasMany
    {
        return $this->hasMany(Address::class);
    }

    // -----------------------------------------------------------------------
    // Scopes
    // -----------------------------------------------------------------------

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', true);
    }

    public function scopeByRole(Builder $query, string $role): Builder
    {
        return $query->role($role);
    }
}
