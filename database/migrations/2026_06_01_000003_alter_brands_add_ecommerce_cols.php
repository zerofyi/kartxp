<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Adds slug (unique, nullable) and is_active (boolean default true) to brands.
     * The slug is nullable to preserve all existing brand rows without requiring an update.
     * is_active defaults to true so all existing brands remain visible by default.
     */
    public function up(): void
    {
        Schema::table('brands', function (Blueprint $table) {
            // SEO-friendly unique identifier; nullable so existing rows aren't broken
            $table->string('slug')->nullable()->unique()->after('name');

            // Soft toggle to hide/show a brand without deleting it
            $table->boolean('is_active')->default(true)->after('logo_path');
        });
    }

    /**
     * Reverse the migrations.
     *
     * Drops slug and is_active from brands.
     */
    public function down(): void
    {
        Schema::table('brands', function (Blueprint $table) {
            $table->dropUnique(['slug']);
            $table->dropColumn(['slug', 'is_active']);
        });
    }
};
