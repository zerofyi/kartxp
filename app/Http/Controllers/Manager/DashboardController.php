<?php

namespace App\Http\Controllers\Manager;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\WarehouseUser;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $user        = Auth::user();
        $warehouseId = $this->getWarehouseId($user->id);

        $today = now()->toDateString();
        $weekStart = now()->startOfWeek()->toDateString();
        $lastWeekStart = now()->subWeek()->startOfWeek()->toDateString();
        $lastWeekEnd = now()->subWeek()->endOfWeek()->toDateString();

        $stats = [
            'today_revenue' => Order::when($warehouseId, fn($q) => $q->where('warehouse_id', $warehouseId))
                ->whereDate('created_at', $today)
                ->whereIn('payment_status', ['paid', 'success'])
                ->sum('total_amount'),

            'today_orders' => Order::when($warehouseId, fn($q) => $q->where('warehouse_id', $warehouseId))
                ->whereDate('created_at', $today)
                ->count(),

            'week_revenue' => Order::when($warehouseId, fn($q) => $q->where('warehouse_id', $warehouseId))
                ->whereBetween('created_at', [$weekStart . ' 00:00:00', now()])
                ->whereIn('payment_status', ['paid', 'success'])
                ->sum('total_amount'),

            'last_week_revenue' => Order::when($warehouseId, fn($q) => $q->where('warehouse_id', $warehouseId))
                ->whereBetween('created_at', [$lastWeekStart . ' 00:00:00', $lastWeekEnd . ' 23:59:59'])
                ->whereIn('payment_status', ['paid', 'success'])
                ->sum('total_amount'),

            'low_stock_alerts' => DB::table('stock_snapshots')
                ->join('product_variants', 'stock_snapshots.product_variant_id', '=', 'product_variants.id')
                ->when($warehouseId, fn($q) => $q->where('stock_snapshots.warehouse_id', $warehouseId))
                ->whereColumn('stock_snapshots.available_quantity', '<=', 'product_variants.stock_alert_qty')
                ->count(),

            'staff_count' => WarehouseUser::when($warehouseId, fn($q) => $q->where('warehouse_id', $warehouseId))
                ->where('is_active', true)
                ->count(),
        ];

        $topProducts = DB::table('order_items')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->join('product_variants', 'order_items.product_variant_id', '=', 'product_variants.id')
            ->join('products', 'product_variants.product_id', '=', 'products.id')
            ->when($warehouseId, fn($q) => $q->where('orders.warehouse_id', $warehouseId))
            ->whereBetween('orders.created_at', [$weekStart . ' 00:00:00', now()])
            ->groupBy('products.id', 'products.name')
            ->orderByDesc('total_qty')
            ->limit(5)
            ->selectRaw('products.name, SUM(order_items.quantity) as qty_sold, SUM(order_items.total) as revenue')
            ->get();

        return Inertia::render('Manager/Dashboard', [
            'stats'        => $stats,
            'top_products' => $topProducts,
        ]);
    }

    private function getWarehouseId(int $userId): ?int
    {
        return WarehouseUser::where('user_id', $userId)->value('warehouse_id');
    }
}
