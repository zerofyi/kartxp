<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Account extends Model
{
    // Keeping this false as your schema doesn't have $table->timestamps() here
    public $timestamps = false;

    protected $fillable = ['name', 'type', 'is_active'];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function journalLines(): HasMany
    {
        return $this->hasMany(JournalLine::class);
    }
}
