<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('return_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('return_id')
                  ->constrained('returns')
                  ->cascadeOnDelete();
            $table->foreignId('order_item_id')
                  ->nullable()
                  ->constrained('order_items')
                  ->nullOnDelete();
            $table->integer('quantity');
            $table->enum('condition', ['good', 'damaged', 'missing']);
            $table->boolean('restock')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('return_items');
    }
};
