<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Adds warehouse association and additional metadata columns to purchases:
     *  - warehouse_id    : Links the purchase to the receiving warehouse (nullable FK -> warehouses).
     *                      Nullable so existing purchase records remain intact without a
     *                      mandatory warehouse assignment.
     *  - notes           : Free-text internal notes for the purchase (e.g. supplier instructions,
     *                      quality remarks). (nullable)
     *  - discount_amount : Purchase-level discount applied by the vendor (default 0.00).
     *                      Defaults to zero so existing purchase financials are unchanged.
     */
    public function up(): void
    {
        Schema::table('purchases', function (Blueprint $table) {
            // Receiving warehouse — nullable for backwards compatibility with existing records
            $table->foreignId('warehouse_id')
                ->nullable()
                ->after('vendor_id')
                ->constrained('warehouses')
                ->nullOnDelete();

            // Internal notes / remarks for this purchase order
            $table->text('notes')->nullable()->after('status');

            // Vendor-level discount applied to the purchase total
            $table->decimal('discount_amount', 10, 2)->default(0)->after('notes');
        });
    }

    /**
     * Reverse the migrations.
     *
     * Drops the FK constraint before dropping the warehouse_id column,
     * then drops the remaining columns.
     */
    public function down(): void
    {
        Schema::table('purchases', function (Blueprint $table) {
            $table->dropForeign(['warehouse_id']);
            $table->dropColumn(['warehouse_id', 'notes', 'discount_amount']);
        });
    }
};
