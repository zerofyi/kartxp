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
        Schema::create('product_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('variant_name');
            $table->string('sku')->unique();
            $table->foreignId('unit_id')->constrained();
            $table->decimal('net_quantity', 10, 2)->nullable();
            $table->decimal('mrp', 10, 2);
            $table->decimal('selling_price', 10, 2);
            $table->decimal('cost_price', 10, 2)->default(0);
            $table->decimal('min_selling_price', 10, 2)->nullable();
            $table->boolean('status')->default(true);
            $table->timestamps();
        });

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_variants');
    }
};
