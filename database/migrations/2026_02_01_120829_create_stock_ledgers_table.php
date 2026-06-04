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
        Schema::create('stock_ledgers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_variant_id')->constrained();
            $table->foreignId('warehouse_id')->constrained();
            $table->foreignId('batch_id')->nullable()->constrained('stock_batches');
            $table->enum('movement_type', [
                'IN','OUT','RESERVED','RELEASED',
                'ADJUSTMENT','DAMAGE','RETURN_IN','RETURN_OUT'
            ]);
            $table->integer('quantity');
            $table->string('source_type');
            $table->unsignedBigInteger('source_id');
            $table->text('remarks')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_ledgers');
    }
};
