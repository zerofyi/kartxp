<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Settings are stored per-warehouse (null = global).
     * The unique constraint on [key, warehouse_id] enforces
     * that each key can only appear once per warehouse scope.
     */
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('key');
            $table->text('value')->nullable();
            $table->foreignId('warehouse_id')
                  ->nullable()
                  ->constrained('warehouses')
                  ->nullOnDelete();
            $table->string('group')->default('general');
            $table->timestamps();

            // Composite unique: one value per key per warehouse (or global if warehouse_id is null)
            $table->unique(['key', 'warehouse_id'], 'settings_key_warehouse_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
