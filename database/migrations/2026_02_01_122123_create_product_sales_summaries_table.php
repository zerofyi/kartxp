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
        Schema::create('product_sales_summaries', function (Blueprint $table) {
            $table->foreignId('product_variant_id')->primary()->constrained();
            $table->integer('total_quantity_sold');
            $table->decimal('total_revenue', 12, 2);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_sales_summaries');
    }
};
