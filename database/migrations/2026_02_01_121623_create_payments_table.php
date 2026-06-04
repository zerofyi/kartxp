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
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->nullable()->constrained();
            $table->foreignId('customer_id')->nullable()->constrained();
            $table->foreignId('vendor_id')->nullable()->constrained();
            $table->decimal('amount', 12, 2);
            $table->enum('method', ['cash','card','upi','bank']);
            $table->enum('type', ['receipt','payment','refund']);
            $table->string('reference_no')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
