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
        Schema::create('daily_sales_summaries', function (Blueprint $table) {
            $table->date('date')->primary();
            $table->foreignId('warehouse_id')->constrained();
            $table->decimal('total_sales', 12, 2);
            $table->integer('total_orders');
            $table->decimal('total_tax', 12, 2);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('daily_sales_summaries');
    }
};
