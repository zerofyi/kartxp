<?php

namespace App\Http\Controllers\Warehouse;

use App\Http\Controllers\Controller;
use App\Models\ProductVariant;
use App\Models\StockLedger;
use App\Services\StockService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class InventoryController extends Controller
{
    public function __construct(private readonly StockService $stockService) {}

    private function warehouseId(): int
    {
        return Auth::user()->currentWarehouse()->value('warehouses.id');
    }

    /**
     * POST /warehouse/inventory-v2/stock-count
     * Batch stock count (physical count overrides ledger balance)
     */
    public function stockCount(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'counts'                    => 'required|array|min:1',
            'counts.*.product_variant_id' => 'required|exists:product_variants,id',
            'counts.*.physical_count'   => 'required|integer|min:0',
        ]);

        $warehouseId = $this->warehouseId();

        DB::transaction(function () use ($validated, $warehouseId) {
            foreach ($validated['counts'] as $item) {
                $this->stockService->applyPhysicalCount(
                    $item['product_variant_id'],
                    $warehouseId,
                    $item['physical_count'],
                    Auth::id()
                );
            }
        });

        return back()->with('success', count($validated['counts']) . ' items updated via stock count.');
    }

    /**
     * GET /warehouse/inventory-v2/low-stock-report
     */
    public function lowStockReport(): Response
    {
        $warehouseId = $this->warehouseId();

        $variants = ProductVariant::with(['product:id,name,category_id', 'stockSnapshot'])
            ->whereHas('stockSnapshot', fn ($q) => $q->where('warehouse_id', $warehouseId)->whereColumn('available_quantity', '<=', 'product_variants.stock_alert_qty'))
            ->where('is_active', true)
            ->get();

        return Inertia::render('Warehouse/Inventory/LowStock', compact('variants'));
    }

    /**
     * GET /warehouse/inventory-v2/expiring-report
     */
    public function expiringReport(Request $request): Response
    {
        $warehouseId = $this->warehouseId();
        $days        = (int) $request->query('days', 30);

        $batches = \App\Models\StockBatch::where('warehouse_id', $warehouseId)
            ->where('remaining_qty', '>', 0)
            ->whereNotNull('expiry_date')
            ->where('expiry_date', '<=', now()->addDays($days))
            ->with('variant.product:id,name')
            ->orderBy('expiry_date')
            ->get();

        return Inertia::render('Warehouse/Inventory/Expiring', compact('batches', 'days'));
    }

    /**
     * GET /warehouse/inventory-v2/dead-stock-report
     * Products with stock but no sales in the last 30/60/90 days
     */
    public function deadStockReport(Request $request): Response
    {
        $warehouseId = $this->warehouseId();
        $days        = (int) $request->query('days', 60);

        $variants = ProductVariant::with(['product:id,name', 'stockSnapshot'])
            ->whereHas('stockSnapshot', fn ($q) =>
                $q->where('warehouse_id', $warehouseId)->where('available_quantity', '>', 0)
            )
            ->whereDoesntHave('orderItems', fn ($q) =>
                $q->whereHas('order', fn ($o) =>
                    $o->where('created_at', '>=', now()->subDays($days))
                )
            )
            ->get();

        return Inertia::render('Warehouse/Inventory/DeadStock', compact('variants', 'days'));
    }

    /**
     * GET /warehouse/inventory-v2/ledger
     */
    public function ledger(Request $request): Response
    {
        $warehouseId = $this->warehouseId();

        $ledger = StockLedger::where('warehouse_id', $warehouseId)
            ->with(['variant.product:id,name'])
            ->when($request->input('variant_id'), fn ($q, $v) => $q->where('product_variant_id', $v))
            ->when($request->input('movement_type'), fn ($q, $t) => $q->where('movement_type', $t))
            ->when($request->input('from'), fn ($q, $d) => $q->where('created_at', '>=', $d))
            ->when($request->input('to'), fn ($q, $d) => $q->where('created_at', '<=', $d . ' 23:59:59'))
            ->orderByDesc('created_at')
            ->paginate(50)
            ->withQueryString();

        return Inertia::render('Warehouse/Inventory/Ledger', [
            'ledger'  => $ledger,
            'filters' => $request->only(['variant_id', 'movement_type', 'from', 'to']),
        ]);
    }
}
