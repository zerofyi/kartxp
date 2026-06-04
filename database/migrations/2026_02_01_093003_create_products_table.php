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
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('product_code')->unique();
            $table->text('description')->nullable();
            $table->foreignId('category_id')->constrained();
            $table->foreignId('brand_id')->nullable()->constrained();
            $table->foreignId('tax_category_id')->constrained();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_returnable')->default(true);
            $table->timestamps();
        });

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
