<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Warehouse extends Model
{
    protected $fillable = [
        'name',
        'address',
        'location',
        'user_id',
    ];

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

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
