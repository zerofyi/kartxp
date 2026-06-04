<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Vendor extends Model
{
    protected $fillable = [
        'name',
        'phone',
        'email',
        'gstin',
        'address',
        'user_id',
    ];
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
