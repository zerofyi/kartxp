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
        Schema::table('payments', function (Blueprint $table) {
            // Adds 'mcard' to the allowed method values
            $table->enum('method', ['cash', 'card', 'upi', 'bank', 'mcard'])->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            // Reverts back to the original allowed method values
            // Note: Ensure no rows in production use 'mcard' before rolling back!
            $table->enum('method', ['cash', 'card', 'upi', 'bank'])->change();
        });
    }
};
