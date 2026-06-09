<?php

namespace App\Http\Controllers\Warehouse;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Delivery;
use App\Models\Order;
use App\Models\ProductVariant;
use App\Models\StockBatch;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Log;

class DashboardController extends Controller
{
    /**
     * Near-expiry warning windows in days.
     */
    private const EXPIRY_WINDOWS = [7, 14, 30, 60];

    public function index(Request $request): Response
    {
        $user        = Auth::user();
        $warehouse = Auth::user()->currentWarehouse();
        $warehouseId = $warehouse->id;

        // Validate expiry window query param (default 30 days)
        $expiryDays = (int) $request->query('expiry_days', 30);
        if (! in_array($expiryDays, self::EXPIRY_WINDOWS, true)) {
            $expiryDays = 30;
        }

        return Inertia::render('Warehouse/Dashboard', [
            'stats'             => $this->getStats($warehouseId),
            'recent_orders'     => $this->getRecentOrders($warehouseId),
            'revenue_chart'     => $this->getRevenueChart($warehouseId),
            'near_expiry_stock' => $this->getNearExpiryStock($warehouseId, $expiryDays),
            'low_stock_items'   => $this->getLowStockItems($warehouseId),
            'top_products'      => $this->getTopProducts($warehouseId),
            'expiry_days'       => $expiryDays,
            'expiry_windows'    => self::EXPIRY_WINDOWS,
        ]);
    }

    // -------------------------------------------------------------------------
    // Stats: Today + Monthly + Growth
    // -------------------------------------------------------------------------

    private function getStats(int|null $warehouseId): array
    {
        // Normalize dates explicitly to strict strings to avoid DateTime midnight traps
        $today          = now()->toDateString();
        $monthStart     = now()->startOfMonth()->toDateString();
        $lastMonthStart = now()->subMonth()->startOfMonth()->toDateString();
        $lastMonthEnd   = now()->subMonth()->endOfMonth()->toDateTimeString(); // Keep full stamp for end-cap

        // 1. Revenue Stats
        $revenueQuery = Order::query()
            ->when($warehouseId, fn($q) => $q->where('warehouse_id', $warehouseId))
            // Verify your test data is actually marked 'paid' (case-insensitive check)
            ->whereRaw('LOWER(payment_status) = ?', ['paid'])
            ->selectRaw("
                SUM(CASE WHEN DATE(created_at) = ? THEN total_amount ELSE 0 END) AS today_revenue,
                SUM(CASE WHEN DATE(created_at) >= ? THEN total_amount ELSE 0 END) AS month_revenue,
                SUM(CASE WHEN DATE(created_at) BETWEEN ? AND ? THEN total_amount ELSE 0 END) AS last_month_revenue
            ");

        $revenueQuery->addBinding([$today, $monthStart, $lastMonthStart, $lastMonthEnd], 'select');
        $revenueStats = $revenueQuery->first();

        // 2. Revenue Stats Pending
        $revenueQueryP = Order::query()
            ->when($warehouseId, fn($q) => $q->where('warehouse_id', $warehouseId))
            // Verify your test data is actually marked 'paid' (case-insensitive check)
            ->whereRaw('LOWER(payment_status) = ?', ['pending'])
            ->selectRaw("
                SUM(CASE WHEN DATE(created_at) = ? THEN total_amount ELSE 0 END) AS today_revenue,
                SUM(CASE WHEN DATE(created_at) >= ? THEN total_amount ELSE 0 END) AS month_revenue,
                SUM(CASE WHEN DATE(created_at) BETWEEN ? AND ? THEN total_amount ELSE 0 END) AS last_month_revenue
            ");

        $revenueQueryP->addBinding([$today, $monthStart, $lastMonthStart, $lastMonthEnd], 'select');
        $revenueStatsP = $revenueQueryP->first();


        // 2. Order Stats
        $orderQuery = Order::query()
            ->when($warehouseId, fn($q) => $q->where('warehouse_id', $warehouseId))
            ->selectRaw("
                COUNT(CASE WHEN DATE(created_at) = ? THEN 1 END) AS today_orders,
                COUNT(CASE WHEN DATE(created_at) >= ? THEN 1 END) AS month_orders,

                COUNT(CASE WHEN LOWER(order_channel) = 'online' AND DATE(created_at) >= ? THEN 1 END) AS month_online,
                COUNT(CASE WHEN LOWER(order_channel) = 'online' AND DATE(created_at) = ? THEN 1 END) AS today_online,

                COUNT(CASE WHEN LOWER(order_channel) = 'pos' AND DATE(created_at) >= ? THEN 1 END) AS month_pos,
                COUNT(CASE WHEN LOWER(order_channel) = 'pos' AND DATE(created_at) = ? THEN 1 END) AS today_pos,

                COUNT(CASE WHEN LOWER(order_channel) = 'online' AND DATE(created_at) BETWEEN ? AND ? THEN 1 END) AS last_online,
                COUNT(CASE WHEN LOWER(order_channel) = 'pos' AND DATE(created_at) BETWEEN ? AND ? THEN 1 END) AS last_pos,
                COUNT(CASE WHEN DATE(created_at) BETWEEN ? AND ? THEN 1 END) AS last_month_orders
            ");

        $orderQuery->addBinding([
            $today,
            $monthStart,
            $monthStart, $today,
            $monthStart, $today,
            $lastMonthStart, $lastMonthEnd,
            $lastMonthStart, $lastMonthEnd,
            $lastMonthStart, $lastMonthEnd,
        ], 'select');
        $orderStats = $orderQuery->first();


        // 3. Keep the remaining counts as they were
        $pendingDeliveries = Delivery::query()
            ->when($warehouseId, fn($q) => $q->whereHas('order', fn($oq) => $oq->where('warehouse_id', $warehouseId)))
            ->whereIn('status', ['pending', 'out_for_delivery'])
            ->count();

        $newCustomersToday = Customer::query()
            ->whereDate('created_at', $today)
            ->count();

        $newCustomersMonth = Customer::query()
            ->where('created_at', '>=', now()->startOfMonth())
            ->count();

        $lowStockCount = $this->getLowStockCount($warehouseId);

        $nearExpiryCount = StockBatch::query()
            ->when($warehouseId, fn($q) => $q->where('warehouse_id', $warehouseId))
            ->where('available_quantity', '>', 0)
            ->whereBetween('expiry_date', [now()->toDateString(), now()->addDays(30)->toDateString()])
            ->count();

        return [
            'today_revenue'      => (float) ($revenueStats->today_revenue ?? 0),
            'month_revenue'      => (float) ($revenueStats->month_revenue ?? 0),
            'revenue_growth'     => $this->growth($revenueStats->last_month_revenue ?? 0, $revenueStats->month_revenue ?? 0),

            'today_revenue_pending'      => (float) ($revenueStatsP->today_revenue ?? 0),
            'month_revenue_pending'      => (float) ($revenueStatsP->month_revenue ?? 0),
            'revenue_growth_pending'     => $this->growth($revenueStatsP->last_month_revenue ?? 0, $revenueStatsP->month_revenue ?? 0),

            'today_orders'       => (int) ($orderStats->today_orders ?? 0),
            'month_orders'       => (int) ($orderStats->month_orders ?? 0),
            'orders_growth'      => $this->growth($orderStats->last_month_orders ?? 0, $orderStats->month_orders ?? 0),

            'today_online'       => (int) ($orderStats->today_online ?? 0),
            'month_online'       => (int) ($orderStats->month_online ?? 0),
            'online_growth'      => $this->growth($orderStats->last_online ?? 0, $orderStats->month_online ?? 0),

            'today_pos'          => (int) ($orderStats->today_pos ?? 0),
            'month_pos'          => (int) ($orderStats->month_pos ?? 0),
            'pos_growth'         => $this->growth($orderStats->last_pos ?? 0, $orderStats->month_pos ?? 0),

            'low_stock'          => $lowStockCount,
            'near_expiry'        => $nearExpiryCount,
            'pending_deliveries' => $pendingDeliveries,
            'today_customers'    => $newCustomersToday,
            'month_customers'    => $newCustomersMonth,
        ];
    }

    // -------------------------------------------------------------------------
    // 6-month Revenue + Orders Chart
    // -------------------------------------------------------------------------

    private function getRevenueChart(int|null $warehouseId): array
    {
        $rows = Order::query()
            ->when($warehouseId, fn($q) => $q->where('warehouse_id', $warehouseId))
            ->where('created_at', '>=', now()->subMonths(5)->startOfMonth())
            ->selectRaw("
                DATE_FORMAT(created_at, '%Y-%m') AS month,
                SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) AS revenue,
                COUNT(*) AS orders,
                COUNT(CASE WHEN order_channel = 'online' THEN 1 END) AS online_orders,
                COUNT(CASE WHEN order_channel = 'pos' THEN 1 END)    AS pos_orders
            ")
            ->groupByRaw("DATE_FORMAT(created_at, '%Y-%m')")
            ->orderBy('month')
            ->get()
            ->keyBy('month');

        // Always return exactly 6 months (fill zeros for missing months)
        $chart = [];
        for ($i = 5; $i >= 0; $i--) {
            $key  = now()->subMonths($i)->format('Y-m');
            $label = now()->subMonths($i)->format('M Y');
            $row  = $rows->get($key);
            $chart[] = [
                'month'         => $label,
                'revenue'       => (float) ($row->revenue ?? 0),
                'orders'        => (int)   ($row->orders ?? 0),
                'online_orders' => (int)   ($row->online_orders ?? 0),
                'pos_orders'    => (int)   ($row->pos_orders ?? 0),
            ];
        }

        return $chart;
    }

    // -------------------------------------------------------------------------
    // Recent Orders (last 8, eager loaded)
    // -------------------------------------------------------------------------

    private function getRecentOrders(int|null $warehouseId): \Illuminate\Support\Collection
    {
        return Order::with('customer:id,name,phone')
            ->when($warehouseId, fn($q) => $q->where('warehouse_id', $warehouseId))
            ->latest()
            ->limit(8)
            ->get(['id', 'order_number', 'order_channel', 'status', 'payment_status', 'payment_method', 'total_amount', 'customer_id', 'created_at']);
    }

    // -------------------------------------------------------------------------
    // Near Expiry Stock
    // -------------------------------------------------------------------------

    private function getNearExpiryStock(int|null $warehouseId, int $days): \Illuminate\Support\Collection
    {
        return StockBatch::with([
            'productVariant:id,product_id,variant_name,sku',
            'productVariant.product:id,name',
        ])
            ->when($warehouseId, fn($q) => $q->where('warehouse_id', $warehouseId))
            ->where('available_quantity', '>', 0)
            ->whereBetween('expiry_date', [now()->toDateString(), now()->addDays($days)->toDateString()])
            ->orderBy('expiry_date')
            ->limit(20)
            ->get(['id', 'product_variant_id', 'warehouse_id', 'batch_no', 'expiry_date', 'available_quantity']);
    }

    // -------------------------------------------------------------------------
    // Low Stock Items (top 10 most critical)
    // -------------------------------------------------------------------------

    private function getLowStockItems(int|null $warehouseId): \Illuminate\Support\Collection
    {
        return ProductVariant::with('product:id,name')
            ->whereHas('stockSnapshot', function ($q) use ($warehouseId) {
                if ($warehouseId) {
                    $q->where('warehouse_id', $warehouseId);
                }
                $q->whereColumn('available_quantity', '<=', 'product_variants.stock_alert_qty');
            })
            ->withSum(['stockSnapshot as available_qty' => function ($q) use ($warehouseId) {
                if ($warehouseId) {
                    $q->where('warehouse_id', $warehouseId);
                }
            }], 'available_quantity')
            ->orderByRaw('available_qty ASC')
            ->limit(10)
            ->get(['id', 'name', 'sku', 'stock_alert_qty', 'product_id']);
    }

    // -------------------------------------------------------------------------
    // Top 5 Products by Revenue (this month)
    // -------------------------------------------------------------------------

    private function getTopProducts(int|null $warehouseId): \Illuminate\Support\Collection
    {
        return DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->join('product_variants', 'product_variants.id', '=', 'order_items.product_variant_id')
            ->join('products', 'products.id', '=', 'product_variants.product_id')
            ->when($warehouseId, fn($q) => $q->where('orders.warehouse_id', $warehouseId))
            ->where('orders.created_at', '>=', now()->startOfMonth())
            ->where('orders.payment_status', 'paid')
            ->selectRaw('
                products.name,
                product_variants.sku,
                SUM(order_items.quantity) AS total_qty,
                SUM(order_items.quantity * order_items.price) AS total_revenue
            ')
            ->groupBy('products.id', 'products.name', 'product_variants.sku')
            ->orderByDesc('total_revenue')
            ->limit(5)
            ->get();
    }

    // -------------------------------------------------------------------------
    // Low Stock Count helper (re-used in stats)
    // -------------------------------------------------------------------------

    private function getLowStockCount(int|null $warehouseId): int
    {
        return ProductVariant::whereHas('stockSnapshot', function ($q) use ($warehouseId) {
            if ($warehouseId) {
                $q->where('warehouse_id', $warehouseId);
            }
            $q->whereColumn('available_quantity', '<=', 'product_variants.stock_alert_qty');
        })->count();
    }

    // -------------------------------------------------------------------------
    // Growth % helper
    // -------------------------------------------------------------------------

    private function growth(float|int $previous, float|int $current): float
    {
        if ($previous <= 0) {
            return $current > 0 ? 100.0 : 0.0;
        }

        return round((($current - $previous) / $previous) * 100, 1);
    }
}
