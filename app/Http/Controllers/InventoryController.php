<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\ProductVariant;
use App\Models\StockAdjustment;
use App\Models\StockAdjustmentItem;
use App\Models\StockBatch;
use App\Models\StockLedger;
use App\Models\StockSnapshot;
use App\Models\Warehouse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
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
     * Printable A4 stock report for the single active warehouse node context.
     *
     * Filters: all | in_stock | out_of_stock (same snapshot logic as index()).
     * Exactly six columns on paper: #, Details, Qty, Purchase Rate,
     * Wholesale Rate, Retail Rate. Wholesale rate is the variant's
     * min_selling_price — the price the POS charges for wholesale sales.
     */
    public function printStock(Request $request): Response
    {
        $warehouseId = $this->currentWarehouseId();

        $filter = $request->input('stock', 'all');
        if (!in_array($filter, ['all', 'in_stock', 'out_of_stock'], true)) {
            $filter = 'all';
        }

        $query = ProductVariant::query()
            ->with([
                'product:id,name',
                'stockSnapshots' => fn($q) => $q->where('warehouse_id', $warehouseId),
                'stockBatches' => fn($q) => $q->where('warehouse_id', $warehouseId)
                    ->with('purchaseItem.purchase:id,purchase_date'),
            ])
            ->where('status', true);

        if ($filter === 'in_stock') {
            $query->whereHas('stockSnapshots', fn($q) => $q->where('warehouse_id', $warehouseId)->where('available_quantity', '>', 0));
        } elseif ($filter === 'out_of_stock') {
            $query->whereDoesntHave('stockSnapshots', fn($q) => $q->where('warehouse_id', $warehouseId)->where('available_quantity', '>', 0));
        }

        $query->join('products', 'product_variants.product_id', '=', 'products.id')
            ->orderBy('products.name', 'asc')
            ->orderBy('product_variants.variant_name', 'asc')
            ->select('product_variants.*');

        $rows = $query->get()->map(function ($variant) {
            $snapshot = $variant->stockSnapshots->first();
            $batches = $variant->stockBatches;

            // Batches only exist for confirmed purchases, so the latest batch
            // purchase date is the latest confirmed purchase date.
            $lastPurchaseDate = $batches
                ->map(fn($b) => $b->purchaseItem?->purchase?->purchase_date)
                ->filter()
                ->max();

            return [
                'id'                 => $variant->id,
                'name'               => $variant->product->name ?? 'Deleted Product',
                'variant_name'       => $variant->variant_name,
                'total_batches'      => $batches->count(),
                'available_batches'  => $batches->where('available_quantity', '>', 0)->count(),
                'last_purchase_date' => $lastPurchaseDate ? $lastPurchaseDate->format('Y-m-d') : null,
                'available_quantity' => (int) ($snapshot->available_quantity ?? 0),
                'purchase_rate'      => (float) $variant->cost_price,
                'wholesale_rate'     => (float) $variant->min_selling_price,
                'retail_rate'        => (float) $variant->selling_price,
            ];
        });

        // ── Filter tab counts — always computed across ALL active variants ──

        $activeVariantIds = ProductVariant::where('status', true)->pluck('id');

        $inStockIds = StockSnapshot::where('warehouse_id', $warehouseId)
            ->whereIn('product_variant_id', $activeVariantIds)
            ->where('available_quantity', '>', 0)
            ->pluck('product_variant_id');

        return Inertia::render('Warehouse/StockPrint', [
            'rows'          => $rows,
            'warehouseName' => Auth::user()->ownedWarehouse()->value('warehouses.name') ?? 'KartXP',
            'filter'        => $filter,
            'counts'        => [
                'all'          => $activeVariantIds->count(),
                'in_stock'     => $inStockIds->unique()->count(),
                'out_of_stock' => $activeVariantIds->diff($inStockIds)->count(),
            ],
            'printedAt'     => now()->format('d M Y, h:i A'),
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



    public function createAdjustment()
    {
        return Inertia::render('Warehouse/StockAdjustment/Create');
    }

    /**
     * Fast search / barcode scan lookup endpoint for mobile interface.
     */
    public function lookup(Request $request): JsonResponse
    {
        $query = trim($request->input('q', ''));

        if (empty($query)) {
            return response()->json(['data' => []]);
        }

        $warehouseId = $this->currentWarehouseId();

        $variants = ProductVariant::query()
            ->with([
                'product:id,name,category_id',
                'product.category:id,name',
                'unit:id,name,symbol',
                'barcodes:id,product_variant_id,barcode,is_primary',
                'stockSnapshots' => fn($q) => $q->where('warehouse_id', $warehouseId),
            ])
            ->where('status', true)
            ->where(function ($q) use ($query) {
                $q->where('sku', 'like', "%{$query}%")
                ->orWhere('variant_name', 'like', "%{$query}%")
                ->orWhereHas('product', fn($inner) => $inner->where('name', 'like', "%{$query}%"))
                ->orWhereHas('barcodes', fn($inner) => $inner->where('barcode', $query));
            })
            ->limit(15)
            ->get()
            ->map(function ($variant) use ($warehouseId) {
                $snapshot = $variant->stockSnapshots->first();
                $available = $snapshot ? (int) $snapshot->available_quantity : 0;
                $reserved = $snapshot ? (int) $snapshot->reserved_quantity : 0;

                $batches = StockBatch::where('product_variant_id', $variant->id)
                    ->where('warehouse_id', $warehouseId)
                    ->where('available_quantity', '>', 0)
                    ->orderBy('expiry_date', 'asc')
                    ->get(['id', 'batch_no', 'available_quantity', 'expiry_date']);

                return [
                    'id'                 => $variant->id,
                    'product_name'       => $variant->product->name ?? 'Unknown',
                    'variant_name'       => $variant->variant_name,
                    'sku'                => $variant->sku,
                    'category_name'      => $variant->product->category->name ?? 'Unassigned',
                    'unit_symbol'        => $variant->unit->symbol ?? 'pcs',
                    'cost_price'         => (float) $variant->cost_price,
                    'total_available'    => $available,
                    'total_reserved'     => $reserved,
                    'primary_barcode'    => $variant->barcodes->firstWhere('is_primary', true)->barcode ?? $variant->barcodes->first()->barcode ?? null,
                    'batches'            => $batches,
                ];
            });

        return response()->json(['data' => $variants]);
    }


    /**
     * Adjust stock quantities under a pessimistic row lock with complete audit trail.
     */
    public function adjustStock(Request $request): RedirectResponse
    {
        $warehouseId = $this->currentWarehouseId();

        $validated = $request->validate([
            'product_variant_id' => ['required', 'exists:product_variants,id'],
            'adjustment_type'    => ['required', 'in:increase,decrease'],
            'quantity'           => ['required', 'integer', 'min:1'],
            'reason'             => ['required', 'string', 'max:255'],
            'batch_id'           => [
                'required',
                Rule::exists('stock_batches', 'id')->where(function ($query) use ($request, $warehouseId) {
                    $query->where('warehouse_id', $warehouseId)
                        ->where('product_variant_id', $request->input('product_variant_id'));
                }),
            ],
        ], [
            'batch_id.required' => 'Please select an active stock batch to apply this adjustment.',
        ]);

        DB::transaction(function () use ($validated, $warehouseId) {
            $isIncrease = $validated['adjustment_type'] === 'increase';
            $movementType = $isIncrease ? 'IN' : 'OUT';
            $qty = (int) $validated['quantity'];

            // 1. Lock Batch first
            $batch = StockBatch::where('id', $validated['batch_id'])
                ->where('warehouse_id', $warehouseId)
                ->where('product_variant_id', $validated['product_variant_id'])
                ->lockForUpdate()
                ->firstOrFail();

            // 2. Validate sufficiency on batch
            if (!$isIncrease && $batch->available_quantity < $qty) {
                throw ValidationException::withMessages([
                    'quantity' => "Insufficient batch stock. Current batch available: {$batch->available_quantity} Units.",
                ]);
            }

            // 3. Lock StockSnapshot
            $snapshot = StockSnapshot::where('product_variant_id', $validated['product_variant_id'])
                ->where('warehouse_id', $warehouseId)
                ->lockForUpdate()
                ->first();

            if (!$snapshot) {
                if (!$isIncrease) {
                    throw ValidationException::withMessages([
                        'quantity' => 'Cannot decrease stock: No snapshot record found.',
                    ]);
                }
                $snapshot = StockSnapshot::create([
                    'product_variant_id' => $validated['product_variant_id'],
                    'warehouse_id'       => $warehouseId,
                    'available_quantity' => 0,
                    'reserved_quantity'  => 0,
                ]);
            }

            if (!$isIncrease && $snapshot->available_quantity < $qty) {
                throw ValidationException::withMessages([
                    'quantity' => "Insufficient warehouse snapshot stock. Current available: {$snapshot->available_quantity} Units.",
                ]);
            }

            // 4. Create Header Document
            $adjustment = StockAdjustment::create([
                'warehouse_id' => $warehouseId,
                'reason'       => $validated['reason'],
                'created_by'   => Auth::id(),
            ]);

            // 5. Create Line Item Document
            $adjustmentItem = StockAdjustmentItem::create([
                'stock_adjustment_id' => $adjustment->id,
                'product_variant_id'  => $validated['product_variant_id'],
                'batch_id'            => $batch->id,
                'quantity'            => $qty,
                'adjustment_type'     => $validated['adjustment_type'],
            ]);

            // 6. Record in Ledger
            StockLedger::create([
                'product_variant_id' => $validated['product_variant_id'],
                'warehouse_id'       => $warehouseId,
                'batch_id'           => $batch->id,
                'movement_type'      => $movementType,
                'quantity'           => $qty,
                'source_type'        => StockAdjustmentItem::class,
                'source_id'          => $adjustmentItem->id,
                'remarks'            => $validated['reason'],
            ]);

            // 7. Update Balances
            if ($isIncrease) {
                $snapshot->increment('available_quantity', $qty);
                $batch->increment('available_quantity', $qty);
            } else {
                $snapshot->decrement('available_quantity', $qty);
                $batch->decrement('available_quantity', $qty);
            }
        });

        return back()->with('success', 'Stock adjustment applied successfully.');
    }
}
