<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\ProductVariant;
use App\Models\StockBatch;
use App\Models\StockLedger;
use App\Models\StockSnapshot;
use App\Models\Warehouse;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class InventoryController extends Controller
{
    /**
     * Resolve the active warehouse ID context for the authenticated user session.
     */
    private function currentWarehouseId(): int
    {
        return Auth::user()->ownedWarehouse()->value('warehouses.id')
            ?? abort(403, 'Warehouse session context missing or invalid.');
    }

    /**
     * Display a clean listing of inventory for the single active warehouse node context.
     */
    public function index(Request $request): Response
    {
        $warehouseId = $this->currentWarehouseId();

        $query = ProductVariant::query()
            ->with([
                'product:id,name,category_id',
                'product.category:id,name',
                'barcodes:id,product_variant_id,barcode,is_primary',
                'stockSnapshots' => fn($q) => $q->where('warehouse_id', $warehouseId)
            ])
            ->where('status', true);

        // Scan/Enter Search Query Processing
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('sku', 'like', "%{$search}%")
                ->orWhere('variant_name', 'like', "%{$search}%")
                ->orWhereHas('product', fn($inner) => $inner->where('name', 'like', "%{$search}%"))
                ->orWhereHas('barcodes', fn($inner) => $inner->where('barcode', 'like', "%{$search}%"));
            });
        }

        if ($request->filled('category_id') && $request->input('category_id') !== 'all') {
            $query->whereHas('product', fn($q) => $q->where('category_id', $request->input('category_id')));
        }

        if ($request->filled('stock_status')) {
            $status = $request->input('stock_status');
            if ($status === 'out_of_stock') {
                $query->whereDoesntHave('stockSnapshots', fn($q) => $q->where('warehouse_id', $warehouseId)->where('available_quantity', '>', 0));
            } elseif ($status === 'low_stock') {
                $query->whereHas('stockSnapshots', function ($q) use ($warehouseId) {
                    $q->where('warehouse_id', $warehouseId)
                    ->whereRaw('available_quantity <= product_variants.stock_alert_qty');
                });
            } elseif ($status === 'no_barcode') {
                $query->doesntHave('barcodes');
            }
        }

        $sortBy    = $request->input('sort_by', 'name');
        $sortOrder = $request->input('sort_order', 'asc');

        if ($sortBy === 'name') {
            $query->join('products', 'product_variants.product_id', '=', 'products.id')
                ->orderBy('products.name', $sortOrder)
                ->select('product_variants.*');
        } else {
            $query->orderBy($sortBy === 'value' ? 'cost_price' : 'id', $sortOrder);
        }

        $inventoryPaginated = $query->paginate(25)->withQueryString();

        $inventoryPaginated->getCollection()->transform(function ($variant) {
            $snapshot  = $variant->stockSnapshots->first();
            $available = $snapshot ? $snapshot->available_quantity : 0;
            $reserved  = $snapshot ? $snapshot->reserved_quantity : 0;

            return [
                'product_variant_id' => $variant->id,
                'product_name'       => $variant->product->name ?? 'Deleted Product',
                'variant_name'       => $variant->variant_name,
                'sku'                => $variant->sku,
                'category_name'      => $variant->product->category->name ?? 'Unassigned',
                'total_available'    => (int) $available,
                'total_reserved'     => (int) $reserved,
                'reorder_level'      => (int) ($variant->stock_alert_qty ?? 0),
                'cost_price'         => (float) $variant->cost_price,
                'selling_price'      => (float) $variant->selling_price,
                'mrp'                => (float) $variant->mrp,
                'product_barcodes'   => $variant->barcodes->map(fn($b) => [
                    'barcode'    => $b->barcode,
                    'is_primary' => (bool) $b->is_primary,
                ]),
            ];
        });

        // ── Global metrics — always computed across ALL active variants, never from the filtered/paginated query ──

        $activeVariantIds = ProductVariant::where('status', true)->pluck('id');

        $totalProducts = $activeVariantIds->count();

        $variantsWithoutBarcode = ProductVariant::where('status', true)
            ->doesntHave('barcodes')
            ->count();

        // Variants that either have no snapshot in this warehouse, or their snapshot shows 0 available
        $variantsWithStock = StockSnapshot::where('warehouse_id', $warehouseId)
            ->whereIn('product_variant_id', $activeVariantIds)
            ->where('available_quantity', '>', 0)
            ->pluck('product_variant_id');

        $outOfStockCount = $activeVariantIds->diff($variantsWithStock)->count();

        $totalStockValue = StockSnapshot::where('warehouse_id', $warehouseId)
            ->whereIn('product_variant_id', $activeVariantIds)
            ->join('product_variants', 'stock_snapshots.product_variant_id', '=', 'product_variants.id')
            ->selectRaw('SUM(stock_snapshots.available_quantity * product_variants.cost_price) as val')
            ->value('val') ?? 0;

        return Inertia::render('Warehouse/Inventory', [
            'inventory'              => $inventoryPaginated,
            'categories'             => Category::orderBy('name')->get(['id', 'name']),
            'totalProducts'          => (int) $totalProducts,
            'outOfStockCount'        => (int) $outOfStockCount,
            'variantsWithoutBarcode' => (int) $variantsWithoutBarcode,
            'totalStockValue'        => (float) $totalStockValue,
            'filters'                => $request->only(['search', 'category_id', 'stock_status', 'sort_by', 'sort_order']),
        ]);
    }

    /**
     * Display inventory details for a specific product variant within the current active warehouse.
     */
    public function show(ProductVariant $productVariant): Response
    {
        $warehouseId = $this->currentWarehouseId();

        $productVariant->load([
            'product.category',
            'unit',
        ]);

        $productData = [
            'id'            => $productVariant->id,
            'product_name'  => $productVariant->product->name ?? 'Deleted Asset',
            'variant_name'  => $productVariant->variant_name,
            'sku'           => $productVariant->sku,
            'category_name' => $productVariant->product->category->name ?? 'Unassigned',
            'reorder_level' => (int) ($productVariant->stock_alert_qty ?? 0),
            'cost_price'    => (float) $productVariant->cost_price,
            'selling_price' => (float) $productVariant->selling_price,
            'mrp'           => (float) $productVariant->mrp,
        ];

        $snapshot = StockSnapshot::where('product_variant_id', $productVariant->id)
            ->where('warehouse_id', $warehouseId)
            ->first();

        $totalAvailable = $snapshot ? $snapshot->available_quantity : 0;
        $totalReserved = $snapshot ? $snapshot->reserved_quantity : 0;

        $batches = StockBatch::where('product_variant_id', $productVariant->id)
            ->where('warehouse_id', $warehouseId)
            ->with(['purchaseItem.purchase:id,invoice_no,purchase_date'])
            ->orderBy('expiry_date', 'asc')
            ->get()
            ->map(fn($b) => [
                'id'                  => $b->id,
                'batch_no'            => $b->batch_no,
                'expiry_date'         => $b->expiry_date,
                'received_quantity'   => (int) $b->received_quantity,
                'available_quantity'  => (int) $b->available_quantity,
                'purchase_invoice_no' => $b->purchaseItem->purchase->invoice_no ?? 'N/A',
                'purchase_date'       => $b->purchaseItem->purchase->purchase_date ?? null,
            ]);

        $stockMovements = StockLedger::where('product_variant_id', $productVariant->id)
            ->where('warehouse_id', $warehouseId)
            ->with(['batch:id,batch_no'])
            ->orderByDesc('created_at')
            ->limit(50)
            ->get()
            ->map(fn($l) => [
                'id'            => $l->id,
                'movement_type' => $l->movement_type,
                'quantity'      => (int) $l->quantity,
                'batch_no'      => $l->batch->batch_no ?? 'N/A',
                'source_type'   => class_basename($l->source_type),
                'created_at'    => $l->created_at->toIso8601String(),
                'remarks'       => $l->remarks ?? '',
            ]);

        return Inertia::render('Warehouse/InventoryDetails', [
            'product'        => $productData,
            'batches'        => $batches,
            'stockMovements' => $stockMovements,
            'totalAvailable' => (int) $totalAvailable,
            'totalReserved'  => (int) $totalReserved,
        ]);
    }

    /**
     * Display barcode management parameters console console.
     */
    public function barcode(ProductVariant $productVariant): Response
    {
        $productVariant->load(['product', 'barcodes', 'stockSnapshots']);

        return Inertia::render('Warehouse/Barcode', [
            'variant' => [
                'id'            => $productVariant->id,
                'variant_name'  => $productVariant->variant_name,
                'sku'           => $productVariant->sku,
                'selling_price' => (float) $productVariant->selling_price,
                'mrp'           => (float) $productVariant->mrp,
                'product'       => ['name' => $productVariant->product->name ?? 'Deleted Asset'],
                'barcodes'      => $productVariant->barcodes->map(fn($b) => [
                    'id'         => $b->id,
                    'barcode'    => $b->barcode,
                    'is_primary' => (bool) $b->is_primary,
                ]),
            ],
            'stock'   => (int) $productVariant->stockSnapshots->sum('available_quantity'),
        ]);
    }

    /**
     * Print standard thermal barcode sticker configurations.
     */
    public function printBarcode(ProductVariant $productVariant, Request $request): Response
    {
        $validated = $request->validate([
            'barcode'   => 'required|string',
            'qty'       => 'required|integer|min:1',
            'copies'    => 'required|integer|min:1|max:100',
            'size'      => 'required|string|in:40x30,50x30,60x40,30x20,110x30_2up',
            'showName'  => 'required|boolean',
            'showPrice' => 'required|boolean',
            'showSku'   => 'required|boolean',
            'showMRP'   => 'required|boolean',
        ]);

        $productVariant->load('product');

        return Inertia::render('Warehouse/BarcodeLabelPrint', [
            'variant'   => [
                'id'            => $productVariant->id,
                'variant_name'  => $productVariant->variant_name,
                'sku'           => $productVariant->sku,
                'selling_price' => (float) $productVariant->selling_price,
                'mrp'           => (float) $productVariant->mrp,
                'product'       => ['name' => $productVariant->product->name ?? '—'],
            ],
            'barcode'   => $validated['barcode'],
            'qty'       => (int) $validated['qty'],
            'copies'    => (int) $validated['copies'],
            'size'      => $validated['size'],
            'showName'  => (bool) $validated['showName'],
            'showPrice' => (bool) $validated['showPrice'],
            'showSku'   => (bool) $validated['showSku'],
            'showMRP'   => (bool) $validated['showMRP'],
        ]);
    }

    /**
     * Adjust stock quantities under an isolation transaction lock manually.
     */
    public function adjustStock(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'product_variant_id' => 'required|exists:product_variants,id',
            'warehouse_id'       => 'required|exists:warehouses,id',
            'adjustment_type'    => 'required|in:increase,decrease',
            'quantity'           => 'required|integer|min:1',
            'reason'             => 'required|string|max:255',
            'batch_id'           => 'nullable|exists:stock_batches,id',
        ]);

        DB::transaction(function () use ($validated) {
            $movementType = $validated['adjustment_type'] === 'increase' ? 'IN' : 'OUT';
            $qty = $validated['quantity'];

            StockLedger::create([
                'product_variant_id' => $validated['product_variant_id'],
                'warehouse_id'       => $validated['warehouse_id'],
                'batch_id'           => $validated['batch_id'] ?? null,
                'movement_type'      => $movementType,
                'quantity'           => $qty,
                'source_type'        => self::class,
                'source_id'          => Auth::id(),
                'remarks'            => $validated['reason'],
            ]);

            $snapshot = StockSnapshot::firstOrCreate(
                [
                    'product_variant_id' => $validated['product_variant_id'],
                    'warehouse_id'       => $validated['warehouse_id'],
                ],
                ['available_quantity' => 0, 'reserved_quantity' => 0]
            );

            if ($movementType === 'IN') {
                $snapshot->increment('available_quantity', $qty);
            } else {
                $snapshot->decrement('available_quantity', $qty);
            }

            if (!empty($validated['batch_id'])) {
                $batch = StockBatch::findOrFail($validated['batch_id']);
                if ($movementType === 'IN') {
                    $batch->increment('available_quantity', $qty);
                } else {
                    $batch->decrement('available_quantity', $qty);
                }
            }
        });

        return back()->with('success', 'Physical stock metrics adjusted and committed cleanly.');
    }
}
