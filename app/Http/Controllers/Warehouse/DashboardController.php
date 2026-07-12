<?php

namespace App\Http\Controllers\Warehouse;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Delivery;
use App\Models\Order;
use App\Models\ProductVariant;
use App\Models\StockBatch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;

class DashboardController extends Controller
{
    private const EXPIRY_WINDOWS = [7, 14, 30, 60];

    public function index(Request $request): Response
    {
        $warehouse = Auth::user()->ownedWarehouse;
        $warehouseId = $warehouse?->id ?? 0;

        $expiryDays = (int) $request->query('expiry_days', 30);
        if (!in_array($expiryDays, self::EXPIRY_WINDOWS, true)) {
            $expiryDays = 30;
        }

        $topPeriod = $request->query('top_period', 'month');
        $topMetric = $request->query('top_metric', 'revenue');

        return Inertia::render('Warehouse/Dashboard', [
            'expiry_days'    => $expiryDays,
            'expiry_windows' => self::EXPIRY_WINDOWS,
            'filters'        => [
                'top_period' => $topPeriod,
                'top_metric' => $topMetric,
            ],

            'stats'             => Inertia::defer(fn() => $this->getStats($warehouseId)),
            'recent_orders'     => Inertia::defer(fn() => $this->getRecentOrders($warehouseId)),
            'near_expiry_stock' => Inertia::defer(fn() => $this->getNearExpiryStock($warehouseId, $expiryDays)),
            'top_products'      => Inertia::defer(fn() => $this->getTopProducts($warehouseId, $topPeriod, $topMetric)),

            'revenue_chart'     => Inertia::defer(fn() =>
                Cache::remember("wh_{$warehouseId}_chart_trend", 86400, fn() => $this->getRevenueChart($warehouseId))
            ),
        ]);
    }

    public function clearCache(): RedirectResponse
    {
        $warehouseId = Auth::user()->ownedWarehouse?->id ?? 0;
        Cache::forget("wh_{$warehouseId}_chart_trend");

        return back();
    }

    private function getStats(int $warehouseId): array
    {
        $today          = now()->toDateString();
        $monthStart     = now()->startOfMonth()->toDateString();
        $lastMonthStart = now()->subMonth()->startOfMonth()->toDateString();
        $lastMonthEnd   = now()->subMonth()->endOfMonth()->toDateTimeString();

        $revenueStats = Order::query()
            ->where('warehouse_id', $warehouseId)
            ->whereRaw('LOWER(payment_status) = ?', ['paid'])
            ->selectRaw("
                SUM(CASE WHEN DATE(created_at) = ? THEN total_amount ELSE 0 END) AS today_revenue,
                SUM(CASE WHEN DATE(created_at) >= ? THEN total_amount ELSE 0 END) AS month_revenue,
                SUM(CASE WHEN DATE(created_at) BETWEEN ? AND ? THEN total_amount ELSE 0 END) AS last_month_revenue
            ", [$today, $monthStart, $lastMonthStart, $lastMonthEnd])
            ->first();

        $revenueStatsP = Order::query()
            ->where('warehouse_id', $warehouseId)
            ->whereRaw('LOWER(payment_status) = ?', ['pending'])
            ->selectRaw("
                SUM(CASE WHEN DATE(created_at) = ? THEN total_amount ELSE 0 END) AS today_revenue,
                SUM(CASE WHEN DATE(created_at) >= ? THEN total_amount ELSE 0 END) AS month_revenue,
                SUM(CASE WHEN DATE(created_at) BETWEEN ? AND ? THEN total_amount ELSE 0 END) AS last_month_revenue
            ", [$today, $monthStart, $lastMonthStart, $lastMonthEnd])
            ->first();

        $orderStats = Order::query()
            ->where('warehouse_id', $warehouseId)
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
            ", [
                $today, $monthStart, $monthStart, $today, $monthStart, $today,
                $lastMonthStart, $lastMonthEnd, $lastMonthStart, $lastMonthEnd, $lastMonthStart, $lastMonthEnd
            ])->first();

        $lowStockCount = ProductVariant::whereHas('stockSnapshot', function ($q) use ($warehouseId) {
            $q->where('warehouse_id', $warehouseId)
              ->whereColumn('available_quantity', '<=', 'product_variants.stock_alert_qty');
        })->count();

        $expiredCount = StockBatch::where('warehouse_id', $warehouseId)
            ->where('available_quantity', '>', 0)
            ->where('expiry_date', '<', $today)
            ->count();

        $nearExpiryCount = StockBatch::where('warehouse_id', $warehouseId)
            ->where('available_quantity', '>', 0)
            ->whereBetween('expiry_date', [$today, now()->addDays(30)->toDateString()])
            ->count();

        $pendingDeliveries = Delivery::whereHas('order', fn($q) => $q->where('warehouse_id', $warehouseId))
            ->whereIn('status', ['pending', 'out_for_delivery'])
            ->count();

        return [
            'today_revenue'          => (float)($revenueStats->today_revenue ?? 0),
            'month_revenue'          => (float)($revenueStats->month_revenue ?? 0),
            'revenue_growth'         => $this->growth($revenueStats->last_month_revenue ?? 0, $revenueStats->month_revenue ?? 0),
            'today_revenue_pending'  => (float)($revenueStatsP->today_revenue ?? 0),
            'month_revenue_pending'  => (float)($revenueStatsP->month_revenue ?? 0),
            'revenue_growth_pending' => $this->growth($revenueStatsP->last_month_revenue ?? 0, $revenueStatsP->month_revenue ?? 0),
            'today_orders'           => (int)($orderStats->today_orders ?? 0),
            'month_orders'           => (int)($orderStats->month_orders ?? 0),
            'orders_growth'          => $this->growth($orderStats->last_month_orders ?? 0, $orderStats->month_orders ?? 0),
            'today_online'           => (int)($orderStats->today_online ?? 0),
            'month_online'           => (int)($orderStats->month_online ?? 0),
            'online_growth'          => $this->growth($orderStats->last_online ?? 0, $orderStats->month_online ?? 0),
            'today_pos'              => (int)($orderStats->today_pos ?? 0),
            'month_pos'              => (int)($orderStats->month_pos ?? 0),
            'pos_growth'             => $this->growth($orderStats->last_pos ?? 0, $orderStats->month_pos ?? 0),
            'low_stock'              => $lowStockCount,
            'near_expiry'            => $nearExpiryCount,
            'expired_count'          => $expiredCount,
            'pending_deliveries'     => $pendingDeliveries,
            'today_customers'        => Customer::whereDate('created_at', $today)->count(),
            'month_customers'        => Customer::where('created_at', '>=', $monthStart)->count(),
        ];
    }

    private function getRevenueChart(int $warehouseId): array
    {
        $rows = Order::where('warehouse_id', $warehouseId)
            ->where('created_at', '>=', now()->subMonths(5)->startOfMonth())
            ->selectRaw("
                DATE_FORMAT(created_at, '%Y-%m') AS month,
                SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) AS revenue,
                COUNT(*) AS orders,
                COUNT(CASE WHEN order_channel = 'online' THEN 1 END) AS online_orders,
                COUNT(CASE WHEN order_channel = 'pos' THEN 1 END) AS pos_orders
            ")
            ->groupByRaw("DATE_FORMAT(created_at, '%Y-%m')")
            ->orderBy('month')
            ->get()
            ->keyBy('month');

        $chart = [];
        for ($i = 5; $i >= 0; $i--) {
            $key = now()->subMonths($i)->format('Y-m');
            $row = $rows->get($key);
            $chart[] = [
                'month'         => now()->subMonths($i)->format('M Y'),
                'revenue'       => (float)($row->revenue ?? 0),
                'orders'        => (int)($row->orders ?? 0),
                'online_orders' => (int)($row->online_orders ?? 0),
                'pos_orders'    => (int)($row->pos_orders ?? 0),
            ];
        }
        return $chart;
    }

    private function getRecentOrders(int $warehouseId): \Illuminate\Support\Collection
    {
        return Order::with('customer:id,name,phone')
            ->where('warehouse_id', $warehouseId)
            ->latest()
            ->limit(8)
            ->get(['id', 'order_number', 'order_channel', 'status', 'payment_status', 'payment_method', 'total_amount', 'customer_id', 'created_at']);
    }

    private function getNearExpiryStock(int $warehouseId, int $days): \Illuminate\Support\Collection
    {
        return StockBatch::with(['productVariant:id,product_id,variant_name,sku', 'productVariant.product:id,name'])
            ->where('warehouse_id', $warehouseId)
            ->where('available_quantity', '>', 0)
            ->whereBetween('expiry_date', [now()->toDateString(), now()->addDays($days)->toDateString()])
            ->orderBy('expiry_date')
            ->limit(15)
            ->get(['id', 'product_variant_id', 'warehouse_id', 'batch_no', 'expiry_date', 'available_quantity']);
    }

    private function getTopProducts(int $warehouseId, string $period, string $metric): \Illuminate\Support\Collection
    {
        $dateThreshold = match ($period) {
            'month'  => now()->startOfMonth(),
            'past_3' => now()->subMonths(3)->startOfDay(),
            'past_6' => now()->subMonths(6)->startOfDay(),
            'all'    => null,
            default  => now()->startOfMonth()
        };

        return DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->join('product_variants', 'product_variants.id', '=', 'order_items.product_variant_id')
            ->join('products', 'products.id', '=', 'product_variants.product_id')
            ->where('orders.warehouse_id', $warehouseId)
            ->where('orders.payment_status', 'paid')
            ->when($dateThreshold, fn($q) => $q->where('orders.created_at', '>=', $dateThreshold))
            ->selectRaw('
                product_variants.id AS variant_id,
                products.name,
                product_variants.sku,
                SUM(order_items.quantity) AS total_qty,
                SUM(order_items.quantity * order_items.price) AS total_revenue
            ')
            ->groupBy('product_variants.id', 'products.name', 'product_variants.sku')
            ->orderByDesc($metric === 'units' ? 'total_qty' : 'total_revenue')
            ->limit(5)
            ->get();
    }

    private function growth(float|int $previous, float|int $current): float
    {
        if ($previous <= 0) {
            return $current > 0 ? 100.0 : 0.0;
        }
        return round((($current - $previous) / $previous) * 100, 1);
    }
}
