<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Adds inventory and pricing enhancement columns to product_variants:
     *  - stock_alert_qty  : Minimum quantity before a low-stock alert fires (default 5)
     *  - compare_price    : Original / crossed-out price for discount display (nullable)
     *  - weight           : Physical weight in KG for shipping calculations (nullable)
     *  - deleted_at       : Soft-delete timestamp (nullable)
     *
     * stock_alert_qty defaults to 5 so all existing variants get a sensible alert threshold.
     * compare_price and weight are nullable so existing rows are unaffected.
     */
    public function up(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            // Low-stock threshold; defaults to 5 units for all existing variants
            $table->integer('stock_alert_qty')->default(5)->after('status');

            // Compare / "was" price shown with strikethrough on the storefront
            $table->decimal('compare_price', 10, 2)->nullable()->after('stock_alert_qty');

            // Physical weight in kilograms (for shipping cost calculations)
            $table->decimal('weight', 8, 3)->nullable()->after('compare_price');

            // Soft deletes so discontinued variants are recoverable
            $table->softDeletes()->after('weight');
        });
    }

    /**
     * Reverse the migrations.
     *
     * Drops all columns added by this migration.
     */
    public function down(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropColumn([
                'stock_alert_qty',
                'compare_price',
                'weight',
                'deleted_at',
            ]);
        });
    }
};
