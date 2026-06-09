<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Retrieve the existing index names for a given table as a Collection.
     */
    private function existingIndexes(string $table): \Illuminate\Support\Collection
    {
        return collect(DB::select('SHOW INDEX FROM `' . $table . '`'))
            ->pluck('Key_name');
    }

    /**
     * Run the migrations.
     *
     * Adds performance indexes to existing tables.
     * Every index addition is guarded with an existence check so the migration
     * is fully idempotent and safe to re-run on a live database.
     */
    public function up(): void
    {
        // ----------------------------------------------------------------
        // orders
        // ----------------------------------------------------------------
        $ordersIndexes = $this->existingIndexes('orders');

        if (! $ordersIndexes->contains('orders_customer_id_index')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->index('customer_id', 'orders_customer_id_index');
            });
        }

        if (! $ordersIndexes->contains('orders_status_index')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->index('status', 'orders_status_index');
            });
        }

        if (! $ordersIndexes->contains('orders_created_at_index')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->index('created_at', 'orders_created_at_index');
            });
        }

        if (! $ordersIndexes->contains('orders_warehouse_id_status_index')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->index(['warehouse_id', 'status'], 'orders_warehouse_id_status_index');
            });
        }

        // ----------------------------------------------------------------
        // order_items
        // ----------------------------------------------------------------
        $orderItemsIndexes = $this->existingIndexes('order_items');

        if (! $orderItemsIndexes->contains('order_items_product_variant_id_index')) {
            Schema::table('order_items', function (Blueprint $table) {
                $table->index('product_variant_id', 'order_items_product_variant_id_index');
            });
        }

        // ----------------------------------------------------------------
        // products
        // ----------------------------------------------------------------
        $productsIndexes = $this->existingIndexes('products');

        if (! $productsIndexes->contains('products_slug_index')) {
            Schema::table('products', function (Blueprint $table) {
                $table->index('slug', 'products_slug_index');
            });
        }

        if (! $productsIndexes->contains('products_is_active_index')) {
            Schema::table('products', function (Blueprint $table) {
                $table->index('is_active', 'products_is_active_index');
            });
        }

        if (! $productsIndexes->contains('products_is_featured_is_active_index')) {
            Schema::table('products', function (Blueprint $table) {
                $table->index(['is_featured', 'is_active'], 'products_is_featured_is_active_index');
            });
        }

        if (! $productsIndexes->contains('products_is_trending_is_active_index')) {
            Schema::table('products', function (Blueprint $table) {
                $table->index(['is_trending', 'is_active'], 'products_is_trending_is_active_index');
            });
        }

        if (! $productsIndexes->contains('products_is_best_seller_is_active_index')) {
            Schema::table('products', function (Blueprint $table) {
                $table->index(['is_best_seller', 'is_active'], 'products_is_best_seller_is_active_index');
            });
        }

        // ----------------------------------------------------------------
        // product_variants
        // ----------------------------------------------------------------
        $variantIndexes = $this->existingIndexes('product_variants');

        if (! $variantIndexes->contains('product_variants_sku_index')) {
            Schema::table('product_variants', function (Blueprint $table) {
                $table->index('sku', 'product_variants_sku_index');
            });
        }

        if (! $variantIndexes->contains('product_variants_status_index')) {
            Schema::table('product_variants', function (Blueprint $table) {
                $table->index('status', 'product_variants_status_index');
            });
        }

        // ----------------------------------------------------------------
        // customers
        // ----------------------------------------------------------------
        $customerIndexes = $this->existingIndexes('customers');

        if (! $customerIndexes->contains('customers_phone_index')) {
            Schema::table('customers', function (Blueprint $table) {
                $table->index('phone', 'customers_phone_index');
            });
        }

        if (! $customerIndexes->contains('customers_user_id_index')) {
            Schema::table('customers', function (Blueprint $table) {
                $table->index('user_id', 'customers_user_id_index');
            });
        }

        // ----------------------------------------------------------------
        // payments
        // ----------------------------------------------------------------
        $paymentIndexes = $this->existingIndexes('payments');

        if (! $paymentIndexes->contains('payments_order_id_index')) {
            Schema::table('payments', function (Blueprint $table) {
                $table->index('order_id', 'payments_order_id_index');
            });
        }

        if (! $paymentIndexes->contains('payments_status_index')) {
            Schema::table('payments', function (Blueprint $table) {
                $table->index('status', 'payments_status_index');
            });
        }

        if (! $paymentIndexes->contains('payments_transaction_id_index')) {
            Schema::table('payments', function (Blueprint $table) {
                $table->index('transaction_id', 'payments_transaction_id_index');
            });
        }

        // ----------------------------------------------------------------
        // stock_ledgers
        // ----------------------------------------------------------------
        $ledgerIndexes = $this->existingIndexes('stock_ledgers');

        if (! $ledgerIndexes->contains('stock_ledgers_created_at_index')) {
            Schema::table('stock_ledgers', function (Blueprint $table) {
                $table->index('created_at', 'stock_ledgers_created_at_index');
            });
        }

        if (! $ledgerIndexes->contains('stock_ledgers_variant_warehouse_movement_index')) {
            Schema::table('stock_ledgers', function (Blueprint $table) {
                $table->index(
                    ['product_variant_id', 'warehouse_id', 'movement_type'],
                    'stock_ledgers_variant_warehouse_movement_index'
                );
            });
        }
    }


    /**
     * Reverse the migrations.
     *
     * Drops all performance indexes added in up() if they exist.
     */
    public function down(): void
    {
        // ----------------------------------------------------------------
        // orders
        // ----------------------------------------------------------------
        $ordersIndexes = $this->existingIndexes('orders');

        Schema::table('orders', function (Blueprint $table) use ($ordersIndexes) {
            if ($ordersIndexes->contains('orders_customer_id_index')) {
                $table->dropIndex('orders_customer_id_index');
            }
            if ($ordersIndexes->contains('orders_status_index')) {
                $table->dropIndex('orders_status_index');
            }
            if ($ordersIndexes->contains('orders_created_at_index')) {
                $table->dropIndex('orders_created_at_index');
            }
            if ($ordersIndexes->contains('orders_warehouse_id_status_index')) {
                $table->dropIndex('orders_warehouse_id_status_index');
            }
        });

        // ----------------------------------------------------------------
        // order_items
        // ----------------------------------------------------------------
        $orderItemsIndexes = $this->existingIndexes('order_items');

        Schema::table('order_items', function (Blueprint $table) use ($orderItemsIndexes) {
            if ($orderItemsIndexes->contains('order_items_product_variant_id_index')) {
                $table->dropIndex('order_items_product_variant_id_index');
            }
        });

        // ----------------------------------------------------------------
        // products
        // ----------------------------------------------------------------
        $productsIndexes = $this->existingIndexes('products');

        Schema::table('products', function (Blueprint $table) use ($productsIndexes) {
            if ($productsIndexes->contains('products_slug_index')) {
                $table->dropIndex('products_slug_index');
            }
            if ($productsIndexes->contains('products_is_active_index')) {
                $table->dropIndex('products_is_active_index');
            }
            if ($productsIndexes->contains('products_is_featured_is_active_index')) {
                $table->dropIndex('products_is_featured_is_active_index');
            }
            if ($productsIndexes->contains('products_is_trending_is_active_index')) {
                $table->dropIndex('products_is_trending_is_active_index');
            }
            if ($productsIndexes->contains('products_is_best_seller_is_active_index')) {
                $table->dropIndex('products_is_best_seller_is_active_index');
            }
        });

        // ----------------------------------------------------------------
        // product_variants
        // ----------------------------------------------------------------
        $variantIndexes = $this->existingIndexes('product_variants');

        Schema::table('product_variants', function (Blueprint $table) use ($variantIndexes) {
            if ($variantIndexes->contains('product_variants_sku_index')) {
                $table->dropIndex('product_variants_sku_index');
            }
            if ($variantIndexes->contains('product_variants_status_index')) {
                $table->dropIndex('product_variants_status_index');
            }
        });

        // ----------------------------------------------------------------
        // customers
        // ----------------------------------------------------------------
        $customerIndexes = $this->existingIndexes('customers');

        Schema::table('customers', function (Blueprint $table) use ($customerIndexes) {
            if ($customerIndexes->contains('customers_phone_index')) {
                $table->dropIndex('customers_phone_index');
            }
            if ($customerIndexes->contains('customers_user_id_index')) {
                $table->dropIndex('customers_user_id_index');
            }
        });

        // ----------------------------------------------------------------
        // payments
        // ----------------------------------------------------------------
        $paymentIndexes = $this->existingIndexes('payments');

        Schema::table('payments', function (Blueprint $table) use ($paymentIndexes) {
            if ($paymentIndexes->contains('payments_order_id_index')) {
                $table->dropIndex('payments_order_id_index');
            }
            if ($paymentIndexes->contains('payments_status_index')) {
                $table->dropIndex('payments_status_index');
            }
            if ($paymentIndexes->contains('payments_transaction_id_index')) {
                $table->dropIndex('payments_transaction_id_index');
            }
        });

        // ----------------------------------------------------------------
        // stock_ledgers
        // ----------------------------------------------------------------
        $ledgerIndexes = $this->existingIndexes('stock_ledgers');

        Schema::table('stock_ledgers', function (Blueprint $table) use ($ledgerIndexes) {
            if ($ledgerIndexes->contains('stock_ledgers_created_at_index')) {
                $table->dropIndex('stock_ledgers_created_at_index');
            }
            if ($ledgerIndexes->contains('stock_ledgers_variant_warehouse_movement_index')) {
                $table->dropIndex('stock_ledgers_variant_warehouse_movement_index');
            }
        });
    }
};
