<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DailySalesSummary extends Model
{
    public $incrementing = false;
    public $timestamps   = false;

    protected $primaryKey = null;

    protected $fillable = [
        'date',
        'warehouse_id',
        'total_sales',
        'total_orders',
        'total_tax',
    ];

    protected $casts = [
        'date'         => 'date',
        'total_sales'  => 'decimal:2',
        'total_orders' => 'integer',
        'total_tax'    => 'decimal:2',
    ];

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }
}
