<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Warehouse;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    /**
     * Report hub landing page.
     */
    public function index(): Response
    {
        $summary = [
            'total_revenue'  => Order::where('payment_status', 'paid')->sum('total_amount'),
            'total_orders'   => Order::count(),
            'total_customers' => Customer::count(),
            'total_products' => Product::count(),
            'this_month_revenue' => Order::where('payment_status', 'paid')
                                         ->where('created_at', '>=', now()->startOfMonth())
                                         ->sum('total_amount'),
            'this_month_orders' => Order::where('created_at', '>=', now()->startOfMonth())->count(),
        ];

        return Inertia::render('Admin/Reports/Index', [
            'summary' => $summary,
        ]);
    }

    /**
     * Sales report: orders grouped by date range with channel breakdown.
     */
    public function salesReport(Request $request): Response
    {
        $request->validate([
            'date_from'    => ['nullable', 'date'],
            'date_to'      => ['nullable', 'date', 'after_or_equal:date_from'],
            'warehouse_id' => ['nullable', 'exists:warehouses,id'],
            'group_by'     => ['nullable', 'string', 'in:day,week,month'],
        ]);

        $dateFrom     = $request->date_from ?? now()->subDays(29)->toDateString();
        $dateTo       = $request->date_to ?? now()->toDateString();
        $groupBy      = $request->group_by ?? 'day';
        $warehouseId  = $request->warehouse_id;

        $dateFormat = match ($groupBy) {
            'week'  => '%Y-%u',
            'month' => '%Y-%m',
            default => '%Y-%m-%d',
        };

        $sales = Order::when($warehouseId, fn ($q, $wid) => $q->where('warehouse_id', $wid))
            ->whereDate('created_at', '>=', $dateFrom)
            ->whereDate('created_at', '<=', $dateTo)
            ->selectRaw("DATE_FORMAT(created_at, '{$dateFormat}') as period,
                         COUNT(*) as total_orders,
                         SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) as revenue,
                         SUM(CASE WHEN order_channel = 'online' THEN 1 ELSE 0 END) as online_orders,
                         SUM(CASE WHEN order_channel = 'pos' THEN 1 ELSE 0 END) as pos_orders,
                         SUM(discount_amount) as total_discount,
                         SUM(tax_amount) as total_tax,
                         SUM(shipping_charge) as total_shipping")
            ->groupBy('period')
            ->orderBy('period')
            ->get();

        $warehouses = Warehouse::orderBy('name')->get(['id', 'name']);

        return Inertia::render('Admin/Reports/Sales', [
            'sales'      => $sales,
            'warehouses' => $warehouses,
            'filters'    => $request->only(['date_from', 'date_to', 'warehouse_id', 'group_by']),
            'totals'     => [
                'orders'    => $sales->sum('total_orders'),
                'revenue'   => $sales->sum('revenue'),
                'discount'  => $sales->sum('total_discount'),
                'tax'       => $sales->sum('total_tax'),
                'shipping'  => $sales->sum('total_shipping'),
            ],
        ]);
    }

    /**
     * Revenue report: detailed breakdown by payment method and channel.
     */
    public function revenueReport(Request $request): Response
    {
        $request->validate([
            'date_from'    => ['nullable', 'date'],
            'date_to'      => ['nullable', 'date'],
            'warehouse_id' => ['nullable', 'exists:warehouses,id'],
        ]);

        $dateFrom    = $request->date_from ?? now()->startOfMonth()->toDateString();
        $dateTo      = $request->date_to ?? now()->toDateString();
        $warehouseId = $request->warehouse_id;

        $baseQuery = Order::where('payment_status', 'paid')
            ->when($warehouseId, fn ($q, $wid) => $q->where('warehouse_id', $wid))
            ->whereDate('created_at', '>=', $dateFrom)
            ->whereDate('created_at', '<=', $dateTo);

        $byPaymentMethod = (clone $baseQuery)
            ->selectRaw('payment_method, COUNT(*) as orders, SUM(total_amount) as revenue')
            ->groupBy('payment_method')
            ->get();

        $byWarehouse = Order::where('payment_status', 'paid')
            ->when($warehouseId, fn ($q, $wid) => $q->where('warehouse_id', $wid))
            ->whereDate('created_at', '>=', $dateFrom)
            ->whereDate('created_at', '<=', $dateTo)
            ->selectRaw('warehouse_id, COUNT(*) as orders, SUM(total_amount) as revenue')
            ->groupBy('warehouse_id')
            ->with('warehouse:id,name')
            ->get();

        $dailyRevenue = (clone $baseQuery)
            ->selectRaw("DATE(created_at) as date, SUM(total_amount) as revenue, COUNT(*) as orders")
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $warehouses = Warehouse::orderBy('name')->get(['id', 'name']);

        return Inertia::render('Admin/Reports/Revenue', [
            'byPaymentMethod' => $byPaymentMethod,
            'byWarehouse'     => $byWarehouse,
            'dailyRevenue'    => $dailyRevenue,
            'warehouses'      => $warehouses,
            'filters'         => $request->only(['date_from', 'date_to', 'warehouse_id']),
            'totalRevenue'    => $dailyRevenue->sum('revenue'),
        ]);
    }

    /**
     * Inventory report: stock levels from stock_snapshots, low-stock alerts, top movers.
     */
    public function inventoryReport(Request $request): Response
    {
        $warehouseId = $request->query('warehouse_id');

        // Low-stock variants from stock_snapshots
        $lowStock = ProductVariant::with(['product:id,name,category_id', 'product.category:id,name'])
            ->whereHas('stockSnapshot', fn ($q) =>
                $q->when($warehouseId, fn ($q) => $q->where('warehouse_id', $warehouseId))
                  ->whereColumn('available_quantity', '<=', 'product_variants.stock_alert_qty')
            )
            ->where('is_active', true)
            ->paginate(30)
            ->withQueryString();

        // Top moving products (last 30 days)
        $topMovers = DB::table('stock_ledgers')
            ->join('product_variants', 'product_variants.id', '=', 'stock_ledgers.product_variant_id')
            ->join('products', 'products.id', '=', 'product_variants.product_id')
            ->where('movement_type', 'OUT')
            ->when($warehouseId, fn ($q) => $q->where('stock_ledgers.warehouse_id', $warehouseId))
            ->where('stock_ledgers.created_at', '>=', now()->subDays(30))
            ->select('products.name', DB::raw('SUM(ABS(stock_ledgers.quantity)) as qty_moved'))
            ->groupBy('products.id', 'products.name')
            ->orderByDesc('qty_moved')
            ->limit(10)
            ->get();

        $warehouses = Warehouse::orderBy('name')->get(['id', 'name']);

        $summary = [
            'total_products'  => Product::count(),
            'total_variants'  => ProductVariant::count(),
            'low_stock_count' => ProductVariant::whereHas('stockSnapshot', fn ($q) =>
                $q->when($warehouseId, fn ($q) => $q->where('warehouse_id', $warehouseId))
                  ->whereColumn('available_quantity', '<=', 'product_variants.stock_alert_qty')
            )->count(),
            'out_of_stock'    => ProductVariant::whereHas('stockSnapshot', fn ($q) =>
                $q->when($warehouseId, fn ($q) => $q->where('warehouse_id', $warehouseId))
                  ->where('available_quantity', '<=', 0)
            )->count(),
        ];

        return Inertia::render('Admin/Reports/Inventory', compact('lowStock', 'topMovers', 'warehouses', 'summary', 'warehouseId'));
    }


    /**
     * Customer report: top customers by spend and order frequency.
     */
    public function customerReport(Request $request): Response
    {
        $request->validate([
            'date_from' => ['nullable', 'date'],
            'date_to'   => ['nullable', 'date'],
            'sort_by'   => ['nullable', 'string', 'in:total_spent,order_count,loyalty_points'],
        ]);

        $dateFrom = $request->date_from ?? now()->subDays(89)->toDateString();
        $dateTo   = $request->date_to ?? now()->toDateString();
        $sortBy   = $request->sort_by ?? 'total_spent';

        $customers = Customer::withCount([
                'orders as order_count' => fn ($q) => $q->whereDate('created_at', '>=', $dateFrom)
                                                         ->whereDate('created_at', '<=', $dateTo),
            ])
            ->withSum([
                'orders as period_revenue' => fn ($q) => $q->where('payment_status', 'paid')
                                                             ->whereDate('created_at', '>=', $dateFrom)
                                                             ->whereDate('created_at', '<=', $dateTo),
            ], 'total_amount')
            ->with('user:id,name,email,status')
            ->orderByDesc($sortBy === 'order_count' ? 'order_count' : ($sortBy === 'loyalty_points' ? 'loyalty_points' : 'total_spent'))
            ->paginate(30)
            ->withQueryString();

        $newCustomers = Customer::whereDate('created_at', '>=', $dateFrom)
                                ->whereDate('created_at', '<=', $dateTo)
                                ->count();

        return Inertia::render('Admin/Reports/Customers', [
            'customers'    => $customers,
            'newCustomers' => $newCustomers,
            'filters'      => $request->only(['date_from', 'date_to', 'sort_by']),
        ]);
    }

    /**
     * Export a report as CSV.
     */
    public function export(Request $request): StreamedResponse
    {
        $request->validate([
            'type'      => ['required', 'string', 'in:sales,revenue,inventory,customers'],
            'date_from' => ['nullable', 'date'],
            'date_to'   => ['nullable', 'date'],
        ]);

        $type     = $request->type;
        $dateFrom = $request->date_from ?? now()->subDays(29)->toDateString();
        $dateTo   = $request->date_to ?? now()->toDateString();

        $headers = [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"report_{$type}_" . now()->format('Ymd_His') . '.csv"',
        ];

        $callback = match ($type) {
            'sales' => $this->salesExportCallback($dateFrom, $dateTo),
            'revenue' => $this->revenueExportCallback($dateFrom, $dateTo),
            'inventory' => $this->inventoryExportCallback(),
            'customers' => $this->customerExportCallback($dateFrom, $dateTo),
            default => fn () => null,
        };

        return response()->stream($callback, 200, $headers);
    }

    // =========================================================================
    // Private export helpers
    // =========================================================================

    private function salesExportCallback(string $dateFrom, string $dateTo): \Closure
    {
        return function () use ($dateFrom, $dateTo) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Order #', 'Customer', 'Channel', 'Status', 'Payment', 'Total', 'Date']);

            Order::with('customer')
                ->whereDate('created_at', '>=', $dateFrom)
                ->whereDate('created_at', '<=', $dateTo)
                ->orderBy('created_at')
                ->chunk(500, function ($orders) use ($handle) {
                    foreach ($orders as $order) {
                        fputcsv($handle, [
                            $order->order_number,
                            $order->customer?->name ?? 'Guest',
                            $order->order_channel,
                            $order->status,
                            $order->payment_status,
                            $order->total_amount,
                            $order->created_at->format('Y-m-d H:i:s'),
                        ]);
                    }
                });

            fclose($handle);
        };
    }

    private function revenueExportCallback(string $dateFrom, string $dateTo): \Closure
    {
        return function () use ($dateFrom, $dateTo) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Date', 'Orders', 'Revenue', 'Discount', 'Tax', 'Shipping']);

            Order::where('payment_status', 'paid')
                ->whereDate('created_at', '>=', $dateFrom)
                ->whereDate('created_at', '<=', $dateTo)
                ->selectRaw("DATE(created_at) as date, COUNT(*) as orders, SUM(total_amount) as revenue,
                             SUM(discount_amount) as discount, SUM(tax_amount) as tax, SUM(shipping_charge) as shipping")
                ->groupBy('date')
                ->orderBy('date')
                ->each(function ($row) use ($handle) {
                    fputcsv($handle, [$row->date, $row->orders, $row->revenue, $row->discount, $row->tax, $row->shipping]);
                });

            fclose($handle);
        };
    }

    private function inventoryExportCallback(): \Closure
    {
        return function () {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Variant ID', 'SKU', 'Product', 'Category', 'Selling Price', 'Stock Alert Qty', 'Status']);

            ProductVariant::with(['product.category'])
                ->orderBy('id')
                ->chunk(500, function ($variants) use ($handle) {
                    foreach ($variants as $v) {
                        fputcsv($handle, [
                            $v->id,
                            $v->sku,
                            $v->product?->name ?? 'N/A',
                            $v->product?->category?->name ?? 'N/A',
                            $v->selling_price,
                            $v->stock_alert_qty,
                            $v->is_active ? 'Active' : 'Inactive',
                        ]);
                    }
                });

            fclose($handle);
        };
    }


    private function customerExportCallback(string $dateFrom, string $dateTo): \Closure
    {
        return function () use ($dateFrom, $dateTo) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['ID', 'Name', 'Phone', 'Email', 'Total Spent', 'Loyalty Points', 'Orders', 'Registered']);

            Customer::with('user')
                ->orderByDesc('total_spent')
                ->chunk(500, function ($customers) use ($handle, $dateFrom, $dateTo) {
                    foreach ($customers as $c) {
                        fputcsv($handle, [
                            $c->id,
                            $c->name,
                            $c->phone,
                            $c->email,
                            $c->total_spent,
                            $c->loyalty_points,
                            $c->orders()->whereDate('created_at', '>=', $dateFrom)->whereDate('created_at', '<=', $dateTo)->count(),
                            $c->created_at->format('Y-m-d'),
                        ]);
                    }
                });

            fclose($handle);
        };
    }
}
