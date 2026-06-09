<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $today     = today();
        $thisMonth = now()->startOfMonth();

        // Revenue by day for the last 30 days (for chart)
        $chartData = Order::where('payment_status', 'paid')
            ->where('created_at', '>=', now()->subDays(29)->startOfDay())
            ->selectRaw('DATE(created_at) as date, SUM(total_amount) as revenue, COUNT(*) as orders')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Top-selling products this month (via order_items → product_variants → products)
        $topProducts = DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->join('product_variants', 'product_variants.id', '=', 'order_items.product_variant_id')
            ->join('products', 'products.id', '=', 'product_variants.product_id')
            ->where('orders.created_at', '>=', $thisMonth)
            ->where('orders.payment_status', 'paid')
            ->select(
                'products.id',
                'products.name',
                DB::raw('SUM(order_items.quantity) as total_sold'),
                DB::raw('SUM(order_items.quantity * order_items.price) as revenue')
            )
            ->groupBy('products.id', 'products.name')
            ->orderByDesc('total_sold')
            ->limit(5)
            ->get();

        // Recent orders
        $recentOrders = Order::with(['customer:id,name,phone', 'warehouse:id,name'])
            ->latest()
            ->limit(10)
            ->get(['id', 'order_number', 'customer_id', 'warehouse_id', 'status', 'payment_status', 'total_amount', 'created_at']);

        // Low stock count using stock_snapshots (correct approach)
        $lowStockAlerts = ProductVariant::whereHas('stockSnapshot', fn ($q) =>
            $q->whereColumn('available_quantity', '<=', 'product_variants.stock_alert_qty')
        )->count();

        $stats = [
            'total_users'      => User::count(),
            'total_orders'     => Order::count(),
            'total_revenue'    => Order::where('payment_status', 'paid')->sum('total_amount'),
            'total_products'   => Product::count(),
            'total_warehouses' => Warehouse::count(),
            'total_customers'  => Customer::count(),
            'today_orders'     => Order::whereDate('created_at', $today)->count(),
            'today_revenue'    => Order::where('payment_status', 'paid')
                                       ->whereDate('created_at', $today)
                                       ->sum('total_amount'),
            'month_orders'     => Order::where('created_at', '>=', $thisMonth)->count(),
            'month_revenue'    => Order::where('payment_status', 'paid')
                                       ->where('created_at', '>=', $thisMonth)
                                       ->sum('total_amount'),
            'pending_orders'   => Order::where('status', 'pending')->count(),
            'processing_orders' => Order::whereIn('status', ['confirmed', 'processing', 'packed'])->count(),
            'dispatched_orders' => Order::where('status', 'dispatched')->count(),
            'delivered_orders' => Order::where('status', 'delivered')->whereDate('created_at', $today)->count(),
            'cancelled_orders' => Order::where('status', 'cancelled')->whereDate('created_at', $today)->count(),
            'low_stock_alerts' => $lowStockAlerts,
        ];

        return Inertia::render('Admin/Dashboard', [
            'stats'         => $stats,
            'chart_data'    => $chartData,
            'recent_orders' => $recentOrders,
            'top_products'  => $topProducts,
            'warehouses'    => Warehouse::get(['id', 'name', 'is_active']),
        ]);
    }
}
