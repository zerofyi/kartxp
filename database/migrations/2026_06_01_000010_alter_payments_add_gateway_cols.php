<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Adds online payment gateway tracking columns to the payments table:
     *  - gateway          : Name of the payment gateway used (e.g. "razorpay", "stripe") (nullable)
     *  - transaction_id   : Unique transaction / payment ID returned by the gateway (nullable, unique)
     *  - status           : Payment lifecycle state with enum values (default 'success' ensures
     *                       all existing rows — which represent completed POS payments — remain valid)
     *  - payload          : Raw JSON webhook / response payload from the gateway (nullable)
     *  - gateway_order_id : Gateway-side order ID, distinct from our internal order_id (nullable)
     *
     * IMPORTANT — status default:
     *   Existing rows represent cash/card POS payments that were already accepted, so defaulting
     *   to 'success' is semantically correct. New online payment records should be created with
     *   status='pending' explicitly and updated via webhook handlers.
     */
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            // Gateway identifier string (razorpay, stripe, cashfree, etc.)
            $table->string('gateway')->nullable()->after('reference_no');

            // Gateway-generated transaction ID — unique constraint enforces idempotency
            $table->string('transaction_id')->nullable()->unique()->after('gateway');

            // Payment lifecycle: existing POS payments default to 'success'
            $table->enum('status', ['pending', 'success', 'failed', 'refunded'])
                ->default('success')
                ->after('transaction_id');

            // Raw gateway callback / webhook payload for debugging and reconciliation
            $table->json('payload')->nullable()->after('status');

            // Gateway order ID (e.g. Razorpay order_id) for cross-referencing
            $table->string('gateway_order_id')->nullable()->after('payload');
        });
    }

    /**
     * Reverse the migrations.
     *
     * Drops the unique constraint on transaction_id before dropping columns,
     * then drops all added columns.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            // Drop the unique index on transaction_id before removing the column
            $table->dropUnique(['transaction_id']);

            $table->dropColumn([
                'gateway',
                'transaction_id',
                'status',
                'payload',
                'gateway_order_id',
            ]);
        });
    }
};
