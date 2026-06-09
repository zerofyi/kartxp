<?php

namespace App\Http\Controllers\Staff;

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
        $warehouseId = WarehouseUser::where('user_id', $user->id)->value('warehouse_id');
        $today       = now()->toDateString();

        // Stats shaped to match Staff/Dashboard.tsx component expectations
        $stats = [
            'pos_sales_today' => Order::when($warehouseId, fn($q) => $q->where('warehouse_id', $warehouseId))
                ->whereDate('created_at', $today)
                ->whereNull('customer_id') // POS (walk-in) orders
                ->count(),

            'revenue_today' => Order::when($warehouseId, fn($q) => $q->where('warehouse_id', $warehouseId))
                ->whereDate('created_at', $today)
                ->whereIn('payment_status', ['paid', 'success'])
                ->sum('total_amount'),

            'orders_to_pack' => Order::when($warehouseId, fn($q) => $q->where('warehouse_id', $warehouseId))
                ->whereIn('status', ['confirmed', 'processing'])
                ->count(),

            'low_stock_items' => DB::table('stock_snapshots')
                ->join('product_variants', 'stock_snapshots.product_variant_id', '=', 'product_variants.id')
                ->when($warehouseId, fn($q) => $q->where('stock_snapshots.warehouse_id', $warehouseId))
                ->whereColumn('stock_snapshots.available_quantity', '<=', 'product_variants.stock_alert_qty')
                ->count(),
        ];

        // Orders to pack (confirmed + processing) for the table
        $ordersToPack = Order::with(['customer:id,name'])
            ->when($warehouseId, fn($q) => $q->where('warehouse_id', $warehouseId))
            ->whereIn('status', ['confirmed', 'processing'])
            ->withCount('items')
            ->latest()
            ->limit(20)
            ->get(['id', 'order_number', 'customer_id', 'status', 'created_at']);

        return Inertia::render('Staff/Dashboard', [
            'stats'          => $stats,
            'orders_to_pack' => $ordersToPack,
        ]);
    }
}
