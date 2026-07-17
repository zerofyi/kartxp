<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\Order;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class PosController extends Controller
{
    /**
     * Customer-facing display screen at /warehouse/pos/display.
     * Runs inside the auth middleware group — the cashier must be logged in
     * on the POS machine for this page to load on the second monitor.
     * After load, all updates come via BroadcastChannel (no further requests).
     */
    public function index(): Response
    {
        $warehouse = Auth::user()->ownedWarehouse;

        $warehouseData = $warehouse ? [
            'id'      => $warehouse->id,
            'name'    => $warehouse->name,
            'address' => $warehouse->address,
            'phone'   => $warehouse->phone,
            'gstin'   => $warehouse->gstin,
        ] : [
            'id'      => 0,
            'name'    => config('app.name'),
            'address' => null,
            'phone'   => null,
            'gstin'   => null,
        ];

        $logoBase64 = null;
        if ($warehouse?->logo_path && Storage::disk('public')->exists($warehouse->logo_path)) {
            $fileContent = Storage::disk('public')->get($warehouse->logo_path);
            $mimeType = Storage::disk('public')->mimeType($warehouse->logo_path);
            $logoBase64 = 'data:' . $mimeType . ';base64,' . base64_encode($fileContent);
        }

        $warehouseId = $warehouse?->id;

        $settings = [
            'upi_id'          => Setting::get('upi_id', '', $warehouseId),
            'receipt_footer'  => Setting::get('receipt_footer', 'Thank you for shopping with us!', $warehouseId),
            'welcome_message' => Setting::get('welcome_message', "Welcome! We're glad you're here.", $warehouseId),
        ];

        return Inertia::render('Warehouse/Pos/Display', [
            'warehouse' => $warehouseData,
            'logoUrl'   => $logoBase64,
            'settings'  => $settings,
        ]);
    }

    public function mcard(Request $request)
    {
        $userWarehouse = auth()->user()?->ownedWarehouse;
        if (!$userWarehouse) {
            return redirect()->back()->withErrors(['error' => 'No warehouse assigned to your account.']);
        }

        $warehouseId = $userWarehouse->id;

        // Default strictly: First day of current month to Today (not end of month)
        $startDate = request('start_date') ?: Carbon::now()->startOfMonth()->toDateString();
        $endDate = request('end_date') ?: Carbon::now()->toDateString();

        return inertia('Warehouse/McardRecord', [
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
            'stats' => inertia()->defer(function () use ($warehouseId, $startDate, $endDate) {
                $todayStart = Carbon::today()->toDateTimeString();

                $costSubquery = DB::table('order_items')
                    ->join('product_variants', 'order_items.product_variant_id', '=', 'product_variants.id')
                    ->select('order_id', DB::raw('SUM(product_variants.cost_price * order_items.quantity) as total_cost'))
                    ->groupBy('order_id');

                $statsQuery = Order::where('warehouse_id', $warehouseId)
                    ->where('payment_method', 'mcard')
                    ->where('status', '!=', 'cancelled')
                    ->leftJoinSub($costSubquery, 'costs', 'orders.id', '=', 'costs.order_id')
                    ->select(
                        DB::raw("SUM(orders.total_amount) as total_revenue"),
                        DB::raw("SUM(orders.total_amount - COALESCE(costs.total_cost, 0)) as total_profit"),

                        DB::raw("SUM(CASE WHEN orders.created_at >= '{$todayStart}' THEN orders.total_amount ELSE 0 END) as today_revenue"),
                        DB::raw("SUM(CASE WHEN orders.created_at >= '{$todayStart}' THEN (orders.total_amount - COALESCE(costs.total_cost, 0)) ELSE 0 END) as today_profit")
                    )->first();

                $revenue = (float)($statsQuery->total_revenue ?? 0);
                $profit = (float)($statsQuery->total_profit ?? 0);
                $marginPercent = $revenue > 0 ? ($profit / $revenue) * 100 : 0;

                return [
                    'today' => [
                        'revenue' => (float)($statsQuery->today_revenue ?? 0),
                        'profit' => (float)($statsQuery->today_profit ?? 0),
                    ],
                    'range' => [
                        'revenue' => $revenue,
                        'profit' => $profit,
                        'margin_percent' => round($marginPercent, 1),
                    ]
                ];
            }),
            'orders' => inertia()->defer(function () use ($warehouseId, $startDate, $endDate) {
                $costSubquery = DB::table('order_items')
                    ->join('product_variants', 'order_items.product_variant_id', '=', 'product_variants.id')
                    ->select('order_id', DB::raw('SUM(product_variants.cost_price * order_items.quantity) as total_cost'))
                    ->groupBy('order_id');

                return Order::with(['customer'])
                    ->where('orders.warehouse_id', $warehouseId)
                    ->where('orders.payment_method', 'mcard')
                    ->where('orders.status', '!=', 'cancelled')
                    ->whereBetween('orders.created_at', [
                        Carbon::parse($startDate)->startOfDay(),
                        Carbon::parse($endDate)->endOfDay()
                    ])
                    ->leftJoinSub($costSubquery, 'costs', 'orders.id', '=', 'costs.order_id')
                    ->select('orders.*', DB::raw('(orders.total_amount - COALESCE(costs.total_cost, 0)) as calculated_profit'))
                    ->orderBy('orders.created_at', 'desc')
                    ->paginate(25)
                    ->withQueryString();
            })
        ]);
    }

    public function flushCache()
    {
        Cache::forget('pos_categories');

        $userWarehouse = Auth::user()?->ownedWarehouse;
        if ($userWarehouse) {
            Cache::forget("pos_catalog_w{$userWarehouse->id}");

            return redirect()->back()->with('success', "POS Cache for [{$userWarehouse->name}] cleared successfully.");
        }

        return redirect()->back()->with('success', 'Global POS Category cache cleared.');
    }
}
