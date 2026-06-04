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
        Schema::create('stock_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_variant_id')->constrained();
            $table->foreignId('warehouse_id')->constrained();
            $table->string('batch_no');
            $table->date('expiry_date')->nullable();
            $table->foreignId('purchase_item_id')->constrained();
            $table->integer('received_quantity');
            $table->integer('available_quantity');
            $table->timestamps();
        });

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_batches');
    }
};
