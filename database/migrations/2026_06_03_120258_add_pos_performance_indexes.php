<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * POS Performance Indexes
 *
 * Run: php artisan migrate
 *
 * These indexes are the single biggest lever for POS speed under load.
 * Each one maps to a hot query path in SalesController.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── product_variants ──────────────────────────────────────────────────
        // Hot path: WHERE status = true (loadProducts)
        Schema::table('product_variants', function (Blueprint $table) {
            if (!$this->indexExists('product_variants', 'idx_pv_status')) {
                $table->index(['status'], 'idx_pv_status');
            }
            if (!$this->indexExists('product_variants', 'idx_pv_product_id')) {
                $table->index(['product_id'], 'idx_pv_product_id');
            }
        });

        // ── stock_snapshots ───────────────────────────────────────────────────
        // Hot path: WHERE product_variant_id IN (...) AND warehouse_id = ?
        Schema::table('stock_snapshots', function (Blueprint $table) {
            if (!$this->indexExists('stock_snapshots', 'idx_ss_variant_warehouse')) {
                $table->index(['product_variant_id', 'warehouse_id'], 'idx_ss_variant_warehouse');
            }
        });

        // ── stock_batches ─────────────────────────────────────────────────────
        // Hot path: WHERE product_variant_id IN (...) AND warehouse_id = ? AND available_quantity > 0
        //           ORDER BY expiry_date, created_at   (FIFO)
        Schema::table('stock_batches', function (Blueprint $table) {
            if (!$this->indexExists('stock_batches', 'idx_sb_fifo')) {
                $table->index(
                    ['product_variant_id', 'warehouse_id', 'available_quantity', 'expiry_date', 'created_at'],
                    'idx_sb_fifo'
                );
            }
        });

        // ── stock_ledger ──────────────────────────────────────────────────────
        // Fast look-up by variant + warehouse for reporting
        Schema::table('stock_ledgers', function (Blueprint $table) {
            if (!$this->indexExists('stock_ledgers', 'idx_sl_variant_warehouse')) {
                $table->index(['product_variant_id', 'warehouse_id'], 'idx_sl_variant_warehouse');
            }
            if (!$this->indexExists('stock_ledgers', 'idx_sl_source')) {
                $table->index(['source_type', 'source_id'], 'idx_sl_source');
            }
        });

        // ── orders ────────────────────────────────────────────────────────────
        // Order number generation: WHERE DATE(created_at) = CURDATE()
        Schema::table('orders', function (Blueprint $table) {
            if (!$this->indexExists('orders', 'idx_orders_created_at')) {
                $table->index(['created_at'], 'idx_orders_created_at');
            }
            if (!$this->indexExists('orders', 'idx_orders_customer')) {
                $table->index(['customer_id'], 'idx_orders_customer');
            }
        });

        // ── order_items ───────────────────────────────────────────────────────
        Schema::table('order_items', function (Blueprint $table) {
            if (!$this->indexExists('order_items', 'idx_oi_order')) {
                $table->index(['order_id'], 'idx_oi_order');
            }
            if (!$this->indexExists('order_items', 'idx_oi_variant')) {
                $table->index(['product_variant_id'], 'idx_oi_variant');
            }
        });

        // ── barcodes ──────────────────────────────────────────────────────────
        // Sub-query in loadProducts: WHERE product_variant_id = ? AND is_primary = 1
        Schema::table('barcodes', function (Blueprint $table) {
            if (!$this->indexExists('barcodes', 'idx_barcodes_variant_primary')) {
                $table->index(['product_variant_id', 'is_primary'], 'idx_barcodes_variant_primary');
            }
            // Also speed up barcode scan look-ups
            if (!$this->indexExists('barcodes', 'idx_barcodes_barcode')) {
                $table->index(['barcode'], 'idx_barcodes_barcode');
            }
        });

        // ── customers ────────────────────────────────────────────────────────
        // firstOrCreate by phone
        Schema::table('customers', function (Blueprint $table) {
            if (!$this->indexExists('customers', 'idx_customers_phone')) {
                $table->index(['phone'], 'idx_customers_phone');
            }
        });

        // ── warehouses ────────────────────────────────────────────────────────
        Schema::table('warehouses', function (Blueprint $table) {
            if (!$this->indexExists('warehouses', 'idx_warehouses_user')) {
                $table->index(['user_id'], 'idx_warehouses_user');
            }
        });
    }

    public function down(): void
    {
        $drops = [
            'product_variants' => ['idx_pv_status', 'idx_pv_product_id'],
            'stock_snapshots'  => ['idx_ss_variant_warehouse'],
            'stock_batches'    => ['idx_sb_fifo'],
            'stock_ledgers'    => ['idx_sl_variant_warehouse', 'idx_sl_source'],
            'orders'           => ['idx_orders_created_at', 'idx_orders_customer'],
            'order_items'      => ['idx_oi_order', 'idx_oi_variant'],
            'barcodes'         => ['idx_barcodes_variant_primary', 'idx_barcodes_barcode'],
            'customers'        => ['idx_customers_phone'],
            'warehouses'       => ['idx_warehouses_user'],
        ];

        foreach ($drops as $table => $indexes) {
            Schema::table($table, function (Blueprint $t) use ($indexes) {
                foreach ($indexes as $idx) {
                    try { $t->dropIndex($idx); } catch (\Throwable) {}
                }
            });
        }
    }

    private function indexExists(string $table, string $index): bool
    {
        return collect(\DB::select("SHOW INDEX FROM `{$table}`"))
            ->contains('Key_name', $index);
    }
};
