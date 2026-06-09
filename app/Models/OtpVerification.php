<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

class OtpVerification extends Model
{
    protected $fillable = [
        'identifier',
        'otp',
        'type',
        'expires_at',
        'verified_at',
        'attempts',
        'sent_at',
        'ip_address',
    ];

    protected $casts = [
        'expires_at'  => 'datetime',
        'verified_at' => 'datetime',
        'sent_at'     => 'datetime',
        'attempts'    => 'integer',
    ];

    // -----------------------------------------------------------------------
    // Scopes
    // -----------------------------------------------------------------------

    /**
     * Scope to records that have not expired and have not been verified.
     */
    public function scopeValid(Builder $query): Builder
    {
        return $query->where('expires_at', '>', Carbon::now())
                     ->whereNull('verified_at');
    }

    // -----------------------------------------------------------------------
    // Helper methods
    // -----------------------------------------------------------------------

    /**
     * Determine whether the OTP has expired.
     */
    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    /**
     * Determine whether the OTP has already been verified.
     */
    public function isVerified(): bool
    {
        return $this->verified_at !== null;
    }
}
