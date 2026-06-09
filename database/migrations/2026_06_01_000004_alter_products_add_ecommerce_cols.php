<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Adds e-commerce-specific columns to products:
     *  - slug                 : SEO URL identifier (unique, nullable)
     *  - short_description    : Short teaser text for product cards (nullable)
     *  - is_featured          : Flag for featured products carousel (default false)
     *  - is_trending          : Flag for trending section (default false)
     *  - is_best_seller       : Flag for best-seller badge (default false)
     *  - warehouse_id         : Optional warehouse FK for multi-warehouse isolation (nullable)
     *  - meta_title           : SEO meta title (nullable)
     *  - meta_description     : SEO meta description (nullable)
     *  - deleted_at           : Soft-delete timestamp (nullable)
     *
     * All boolean flags default to false so existing products are unaffected.
     * All nullable columns leave existing rows intact.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // SEO slug — nullable so existing products don't immediately break
            $table->string('slug')->nullable()->unique()->after('name');

            // Short marketing description for listing pages
            $table->text('short_description')->nullable()->after('description');

            // Merchandising flags — all default false so existing products aren't promoted unexpectedly
            $table->boolean('is_featured')->default(false)->after('is_returnable');
            $table->boolean('is_trending')->default(false)->after('is_featured');
            $table->boolean('is_best_seller')->default(false)->after('is_trending');

            // Multi-warehouse product scoping
            $table->foreignId('warehouse_id')
                ->nullable()
                ->after('is_best_seller')
                ->constrained('warehouses')
                ->nullOnDelete();

            // SEO metadata
            $table->string('meta_title')->nullable()->after('warehouse_id');
            $table->text('meta_description')->nullable()->after('meta_title');

            // Soft deletes — adds deleted_at column
            $table->softDeletes()->after('meta_description');
        });
    }

    /**
     * Reverse the migrations.
     *
     * Drops the FK constraint first, then drops all added columns.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropForeign(['warehouse_id']);
            $table->dropColumn([
                'slug',
                'short_description',
                'is_featured',
                'is_trending',
                'is_best_seller',
                'warehouse_id',
                'meta_title',
                'meta_description',
                'deleted_at',
            ]);
        });
    }
};
