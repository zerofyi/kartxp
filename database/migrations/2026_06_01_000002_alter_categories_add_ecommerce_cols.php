<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Adds slug, image_path, icon_path and warehouse_id (nullable FK -> warehouses)
     * to the categories table. All columns are nullable to not break existing rows.
     */
    public function up(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            // Unique slug for SEO-friendly URLs (nullable so existing rows are unaffected)
            $table->string('slug')->nullable()->unique()->after('name');

            // Image and icon for category display
            $table->string('image_path')->nullable()->after('slug');
            $table->string('icon_path')->nullable()->after('image_path');

            // Optional warehouse scoping — links a category to a specific warehouse
            $table->foreignId('warehouse_id')
                ->nullable()
                ->after('icon_path')
                ->constrained('warehouses')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     *
     * Removes the warehouse_id FK constraint first, then drops all added columns.
     */
    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            // Drop the foreign key constraint before dropping the column
            $table->dropForeign(['warehouse_id']);
            $table->dropColumn(['slug', 'image_path', 'icon_path', 'warehouse_id']);
        });
    }
};
