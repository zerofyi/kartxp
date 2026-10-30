<?php

namespace App\Services;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\CouponUsage;
use App\Models\Customer;
use App\Models\DailySalesSummary;
use App\Models\Delivery;
use App\Models\DeliveryAttempt;
use App\Models\Expense;
use App\Models\JournalEntry;
use App\Models\JournalLine;
use App\Models\LoyaltyTransaction;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderStatusLog;
use App\Models\Payment;
use App\Models\ProductSalesSummary;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\ReturnItem;
use App\Models\ReturnRequest;
use App\Models\StockAdjustment;
use App\Models\StockAdjustmentItem;
use App\Models\StockBatch;
use App\Models\StockLedger;
use App\Models\StockReservation;
use App\Models\StockSnapshot;
use App\Models\User;
use App\Services\ImageStorage\ImageStorageService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Fresh start: wipe every record that exists because money, purchases,
 * stock or sales happened, across the whole application, while keeping
 * catalog and customer master data intact.
 *
 * Kept: products, variants, images, categories, brands, attributes, units,
 * tax categories, barcodes, vendors, customers (+ addresses), coupons,
 * shipping zones, banners, warehouses, users, roles, settings, accounts,
 * wishlists, reviews, price histories and the activity log itself.
 *
 * On kept customer records, loyalty_points and total_spent are reset to
 * zero because they are totals of the deleted sales; credit_limit is a
 * setting, not spending, and stays unchanged.
 */
class FreshStartService
{
    /**
     * Tables wiped by a fresh start, in foreign-key-safe order:
     * every child table precedes the table it references.
     *
     * @var array<int, class-string>
     */
    protected array $wipeOrder = [
        DeliveryAttempt::class,
        Delivery::class,
        OrderStatusLog::class,
        ReturnItem::class,
        ReturnRequest::class,
        StockReservation::class,
        CouponUsage::class,
        LoyaltyTransaction::class,
        CartItem::class,
        Cart::class,
        OrderItem::class,
        Payment::class,
        StockAdjustmentItem::class,
        StockAdjustment::class,
        StockLedger::class,
        StockBatch::class,
        StockSnapshot::class,
        PurchaseItem::class,
        Purchase::class,
        Order::class,
        Expense::class,
        JournalLine::class,
        JournalEntry::class,
        DailySalesSummary::class,
        ProductSalesSummary::class,
    ];

    /**
     * The same wipe, grouped for the preview screen.
     *
     * @var array<string, array{label: string, models: array<class-string, string>}>
     */
    protected array $groups = [
        'purchases' => [
            'label' => 'Purchases',
            'models' => [
                Purchase::class => 'Purchase bills',
                PurchaseItem::class => 'Purchase items',
            ],
        ],
        'sales' => [
            'label' => 'Sales',
            'models' => [
                Order::class => 'Orders',
                OrderItem::class => 'Order items',
                OrderStatusLog::class => 'Order status logs',
                Payment::class => 'Payments',
                Delivery::class => 'Deliveries',
                DeliveryAttempt::class => 'Delivery attempts',
                ReturnRequest::class => 'Returns',
                ReturnItem::class => 'Return items',
            ],
        ],
        'stock' => [
            'label' => 'Stock',
            'models' => [
                StockBatch::class => 'Stock batches',
                StockLedger::class => 'Stock ledger entries',
                StockSnapshot::class => 'Stock snapshots',
                StockReservation::class => 'Stock reservations',
                StockAdjustment::class => 'Stock adjustments',
                StockAdjustmentItem::class => 'Stock adjustment items',
            ],
        ],
        'money' => [
            'label' => 'Money & Accounts',
            'models' => [
                Expense::class => 'Expenses',
                JournalEntry::class => 'Journal entries',
                JournalLine::class => 'Journal lines',
            ],
        ],
        'other' => [
            'label' => 'Other Transactions',
            'models' => [
                Cart::class => 'Carts',
                CartItem::class => 'Cart items',
                CouponUsage::class => 'Coupon usages',
                LoyaltyTransaction::class => 'Loyalty transactions',
                DailySalesSummary::class => 'Daily sales summaries',
                ProductSalesSummary::class => 'Product sales summaries',
            ],
        ],
    ];

    public function __construct(
        protected ImageStorageService $imageStorage
    ) {}

    /**
     * Count everything a fresh start would delete, grouped for display.
     *
     * @return array{groups: array<int, array{key: string, label: string, items: array<int, array{key: string, label: string, count: int}>}>, total: int, customers_reset: int}
     */
    public function preview(): array
    {
        $count = fn (string $model): int => DB::table((new $model)->getTable())->count();

        $groups = [];
        $total = 0;

        foreach ($this->groups as $key => $group) {
            $items = [];

            foreach ($group['models'] as $model => $label) {
                $items[] = [
                    'key' => (new $model)->getTable(),
                    'label' => $label,
                    'count' => $count($model),
                ];
                $total += $items[array_key_last($items)]['count'];
            }

            $groups[] = ['key' => $key, 'label' => $group['label'], 'items' => $items];
        }

        return [
            'groups' => $groups,
            'total' => $total,
            'customers_reset' => $this->customersNeedingResetCount(),
        ];
    }

    /**
     * Execute the fresh start inside a single database transaction.
     * Purchase bill images are removed from disk only after the
     * transaction commits, since file deletion cannot roll back.
     *
     * @return array{deleted: array<string, int>, customers_reset: int, total_deleted: int}
     */
    public function execute(User $user): array
    {
        $deleted = [];
        $customersReset = 0;
        $purchaseImages = [];

        DB::transaction(function () use ($user, &$deleted, &$customersReset, &$purchaseImages) {
            $purchaseImages = DB::table((new Purchase)->getTable())
                ->whereNotNull('image_path')
                ->pluck('image_path')
                ->all();

            foreach ($this->wipeOrder as $model) {
                $table = (new $model)->getTable();
                $deleted[$table] = DB::table($table)->count();
                DB::table($table)->delete();
            }

            $customersReset = $this->customersNeedingResetCount();

            DB::table((new Customer)->getTable())
                ->where(fn ($query) => $query->where('loyalty_points', '>', 0)->orWhere('total_spent', '>', 0))
                ->update(['loyalty_points' => 0, 'total_spent' => 0]);

            DB::table('activity_log')->insert([
                'log_name' => 'data-reset',
                'description' => 'Fresh start data reset executed: all money, purchase, stock and sale records deleted.',
                'event' => 'fresh-start-reset',
                'causer_type' => User::class,
                'causer_id' => $user->id,
                'properties' => json_encode(['deleted' => $deleted, 'customers_reset' => $customersReset]),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });

        foreach ($purchaseImages as $path) {
            try {
                $this->imageStorage->delete($path);
            } catch (\Throwable $e) {
                Log::warning('Fresh start: could not delete purchase image', ['path' => $path, 'error' => $e->getMessage()]);
            }
        }

        return [
            'deleted' => $deleted,
            'customers_reset' => $customersReset,
            'total_deleted' => array_sum($deleted),
        ];
    }

    private function customersNeedingResetCount(): int
    {
        return DB::table((new Customer)->getTable())
            ->where(fn ($query) => $query->where('loyalty_points', '>', 0)->orWhere('total_spent', '>', 0))
            ->count();
    }
}
