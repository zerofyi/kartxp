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
        Schema::create('purchase_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_variant_id')->constrained();
            $table->integer('quantity');
            $table->decimal('cost_price', 10, 2);
            $table->decimal('min_selling_price', 10, 2);
            $table->decimal('selling_price', 10, 2);
            $table->decimal('mrp', 10, 2);
            $table->foreignId('tax_id')->constrained('tax_categories');
            $table->string('batch_no');
            $table->date('expiry_date')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_items');
    }
};
