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
        Schema::create('barcode_print_jobs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('warehouse_id')
                  ->constrained('warehouses')
                  ->cascadeOnDelete();
            $table->foreignId('product_variant_id')
                  ->constrained('product_variants')
                  ->cascadeOnDelete();
            $table->integer('quantity')->default(1);
            $table->string('template')->default('default');
            $table->enum('status', ['queued', 'printing', 'printed', 'cancelled'])
                  ->default('queued');
            $table->foreignId('created_by')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();
            $table->timestamp('printed_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('barcode_print_jobs');
    }
};
