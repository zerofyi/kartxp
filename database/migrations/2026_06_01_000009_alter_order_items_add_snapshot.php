<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Adds immutability and denormalised total support to order_items:
     *  - product_snapshot : JSON copy of the product/variant details captured at order time.
     *                       Allows the order to be rendered even if the product is later
     *                       edited, archived or deleted. (nullable)
     *  - total            : Denormalised line total (quantity × price − discount + tax).
     *                       Nullable so existing rows are not affected; should be
     *                       back-filled by a data migration / seeder before being relied on.
     *
     * Both columns are nullable to avoid breaking existing order_item rows.
     */
    public function up(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            // Frozen product/variant record at the time the order was placed
            $table->json('product_snapshot')->nullable()->after('tax_percent');

            // Pre-calculated line total — avoids recalculating on every render
            $table->decimal('total', 10, 2)->nullable()->after('product_snapshot');
        });
    }

    /**
     * Reverse the migrations.
     *
     * Drops the two columns added by this migration.
     */
    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn(['product_snapshot', 'total']);
        });
    }
};
