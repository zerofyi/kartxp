<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    protected $fillable = ['name', 'parent_id', 'sort_order', 'status'];

    // Get the parent category
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'parent_id');
    }

    // Get subcategories
    public function children(): HasMany
    {
        return $this->hasMany(Category::class, 'parent_id')->orderBy('sort_order');
    }

    /**
     * Get all descendants recursively.
     */
    public function descendants(): HasMany
    {
        return $this->children()->with('descendants');
    }

    /**
     * Scope a query to only include active categories.
     */
    public function scopeActive($query)
    {
        return $query->where('status', true);
    }

    /**
     * Scope a query to only include parent categories.
     */
    public function scopeParents($query)
    {
        return $query->whereNull('parent_id');
    }

    /**
     * Get products in this category (uncomment when you have products table)
     */
    // public function products(): HasMany
    // {
    //     return $this->hasMany(Product::class);
    // }
}
