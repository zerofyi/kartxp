<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * PREREQUISITES: The `addresses` and `coupons` tables must exist before this migration runs.
     * If they do not yet exist, create those tables first (separate migrations, lower timestamps).
     *
     * Step 1 — extend the `status` enum on the orders table to add fulfillment states.
     *   Original values : pending, confirmed, completed, cancelled
     *   Added values    : processing, packed, dispatched, delivered
     *   MySQL allows extending an ENUM list without a table rebuild (metadata-only change).
     *
     * Step 2 — add new columns for multi-channel / online order support:
     *  - warehouse_id         : Fulfilling warehouse (nullable FK -> warehouses)
     *  - payment_status       : Payment lifecycle state (enum, default pending)
     *  - payment_method       : Human-readable method label, e.g. "Razorpay UPI" (nullable)
     *  - address_id           : FK to stored address record (nullable -> addresses)
     *  - address_snapshot     : JSON copy of delivery address at order time (nullable)
     *  - coupon_id            : Applied coupon (nullable FK -> coupons)
     *  - coupon_discount      : Coupon discount amount captured at order time (default 0)
     *  - shipping_charge      : Shipping fee applied to the order (default 0)
     *  - assigned_agent_id    : Delivery agent (nullable FK -> users)
     *  - delivered_at         : Actual delivery timestamp (nullable)
     *  - notes                : Internal or customer notes (nullable)
     *  - cancelled_at         : Cancellation timestamp (nullable)
     *  - cancellation_reason  : Free-text reason for cancellation (nullable)
     */
    public function up(): void
    {
        // ── Step 1: Extend the status ENUM ────────────────────────────────────────
        DB::statement(
            "ALTER TABLE orders MODIFY COLUMN status
             ENUM('pending','confirmed','completed','cancelled','processing','packed','dispatched','delivered')
             NOT NULL"
        );

        // ── Step 2: Add new columns (idempotent — skip if already present) ─────────
        Schema::table('orders', function (Blueprint $table) {
            if (! Schema::hasColumn('orders', 'warehouse_id')) {
                $table->foreignId('warehouse_id')
                    ->nullable()
                    ->after('order_channel')
                    ->constrained('warehouses')
                    ->nullOnDelete();
            }

            if (! Schema::hasColumn('orders', 'payment_status')) {
                $table->enum('payment_status', ['pending', 'paid', 'failed', 'refunded'])
                    ->default('pending')
                    ->after('status');
            }

            if (! Schema::hasColumn('orders', 'payment_method')) {
                $table->string('payment_method')->nullable()->after('payment_status');
            }

            if (! Schema::hasColumn('orders', 'address_id')) {
                $table->unsignedBigInteger('address_id')->nullable()->after('payment_method');
            }

            if (! Schema::hasColumn('orders', 'address_snapshot')) {
                $table->json('address_snapshot')->nullable()->after('address_id');
            }

            if (! Schema::hasColumn('orders', 'coupon_id')) {
                $table->unsignedBigInteger('coupon_id')->nullable()->after('address_snapshot');
            }

            if (! Schema::hasColumn('orders', 'coupon_discount')) {
                $table->decimal('coupon_discount', 10, 2)->default(0)->after('coupon_id');
            }

            if (! Schema::hasColumn('orders', 'shipping_charge')) {
                $table->decimal('shipping_charge', 10, 2)->default(0)->after('coupon_discount');
            }

            if (! Schema::hasColumn('orders', 'assigned_agent_id')) {
                $table->foreignId('assigned_agent_id')
                    ->nullable()
                    ->after('shipping_charge')
                    ->constrained('users')
                    ->nullOnDelete();
            }

            if (! Schema::hasColumn('orders', 'delivered_at')) {
                $table->timestamp('delivered_at')->nullable()->after('assigned_agent_id');
            }

            if (! Schema::hasColumn('orders', 'cancelled_at')) {
                $table->timestamp('cancelled_at')->nullable()->after('delivered_at');
            }

            if (! Schema::hasColumn('orders', 'notes')) {
                $table->text('notes')->nullable()->after('cancelled_at');
            }

            if (! Schema::hasColumn('orders', 'cancellation_reason')) {
                $table->text('cancellation_reason')->nullable()->after('notes');
            }
        });
    }


    /**
     * Reverse the migrations.
     *
     * Drops all FK constraints before dropping columns, then reverts the status ENUM.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // Drop foreign key constraints before dropping columns
            $table->dropForeign(['warehouse_id']);
            $table->dropForeign(['address_id']);
            $table->dropForeign(['coupon_id']);
            $table->dropForeign(['assigned_agent_id']);

            $table->dropColumn([
                'warehouse_id',
                'payment_status',
                'payment_method',
                'address_id',
                'address_snapshot',
                'coupon_id',
                'coupon_discount',
                'shipping_charge',
                'assigned_agent_id',
                'delivered_at',
                'notes',
                'cancelled_at',
                'cancellation_reason',
            ]);
        });

        // Revert status ENUM to original values
        DB::statement(
            "ALTER TABLE orders MODIFY COLUMN status
             ENUM('pending','confirmed','completed','cancelled')
             NOT NULL"
        );
    }
};
