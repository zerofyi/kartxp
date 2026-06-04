<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\ProductVariant;
use App\Models\StockBatch;
use App\Models\StockLedger;
use App\Models\StockSnapshot;
use App\Models\Warehouse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class InventoryController extends Controller
{
    /**
     * Display inventory overview - all products with stock levels
     */
    public function index()
    {
        // Get all product variants with stock information
        $inventory = ProductVariant::with([
            'product:id,name,category_id',
            'product.category:id,name',
            'unit:id,symbol',
            'stockSnapshots.warehouse:id,name,location',
        ])
            ->where('status', true)
            ->get()
            ->map(function ($variant) {
                // Calculate total available and reserved across all warehouses
                $totalAvailable = $variant->stockSnapshots->sum('available_quantity');
                $totalReserved = $variant->stockSnapshots->sum('reserved_quantity');

                // Get warehouse-wise stock
                $warehouseStocks = $variant->stockSnapshots->map(function ($snapshot) {
                    return [
                        'warehouse_id' => $snapshot->warehouse_id,
                        'warehouse_name' => $snapshot->warehouse->name,
                        'available_quantity' => $snapshot->available_quantity,
                        'reserved_quantity' => $snapshot->reserved_quantity,
                    ];
                });

                // Get batches for this variant
                $batches = StockBatch::with('warehouse:id,name')
                    ->where('product_variant_id', $variant->id)
                    ->where('received_quantity', '>', 0)
                    ->get()
                    ->map(function ($batch) {
                        return [
                            'batch_no' => $batch->batch_no,
                            'expiry_date' => $batch->expiry_date,
                            'quantity' => $batch->available_quantity,
                            'warehouse_name' => $batch->warehouse->name,
                        ];
                    });

                return [
                    'product_variant_id' => $variant->id,
                    'product_barcodes' => $variant->barcodes,
                    'product_name' => $variant->product->name,
                    'variant_name' => $variant->variant_name,
                    'sku' => $variant->sku,
                    'category_name' => $variant->product->category->name,
                    'unit_symbol' => $variant->unit->symbol,
                    'total_available' => $totalAvailable,
                    'total_reserved' => $totalReserved,
                    'reorder_level' => $variant->reorder_level ?? 0,
                    'cost_price' => $variant->cost_price,
                    'selling_price' => $variant->selling_price,
                    'mrp' => $variant->mrp,
                    'warehouse_stocks' => $warehouseStocks,
                    'batches' => $batches,
                ];
            });

        $variantsWithoutBarcode = ProductVariant::doesntHave('barcodes')->count();

        // Get all categories and warehouses for filters
        $categories = Category::orderBy('name')->get(['id', 'name']);
        $warehouses = Warehouse::orderBy('name')->get(['id', 'name', 'location']);

        // Calculate summary statistics
        $lowStockCount = $inventory->filter(function ($item) {
            return $item['total_available'] > 0 && $item['total_available'] <= $item['reorder_level'];
        })->count();

        $outOfStockCount = $inventory->filter(function ($item) {
            return $item['total_available'] === 0;
        })->count();

        $totalProducts = $inventory->count();

        $totalStockValue = $inventory->sum(function ($item) {
            return $item['total_available'] * $item['cost_price'];
        });

        return Inertia::render('warehouse/Inventory', [
            'inventory' => $inventory,
            'categories' => $categories,
            'warehouses' => $warehouses,
            'lowStockCount' => $lowStockCount,
            'outOfStockCount' => $outOfStockCount,
            'totalProducts' => $totalProducts,
            'totalStockValue' => $totalStockValue,
            'variantsWithoutBarcode' => $variantsWithoutBarcode,
        ]);
    }

    /**
     * Display detailed inventory for a specific product variant
     */
    public function show(ProductVariant $productVariant)
    {
        // Load product details
        $productVariant->load([
            'product:id,name,category_id',
            'product.category:id,name',
            'unit:id,symbol',
        ]);

        $product = [
            'id' => $productVariant->id,
            'product_name' => $productVariant->product->name,
            'variant_name' => $productVariant->variant_name,
            'sku' => $productVariant->sku,
            'category_name' => $productVariant->product->category->name,
            'unit_symbol' => $productVariant->unit->symbol,
            'reorder_level' => $productVariant->reorder_level ?? 0,
            'cost_price' => $productVariant->cost_price,
            'selling_price' => $productVariant->selling_price,
            'mrp' => $productVariant->mrp,
        ];

        // Get warehouse-wise stock
        $warehouseStocks = StockSnapshot::with('warehouse:id,name,location')
            ->where('product_variant_id', $productVariant->id)
            ->get()
            ->map(function ($snapshot) {
                return [
                    'warehouse_id' => $snapshot->warehouse_id,
                    'warehouse_name' => $snapshot->warehouse->name,
                    'warehouse_location' => $snapshot->warehouse->location,
                    'available_quantity' => $snapshot->available_quantity,
                    'reserved_quantity' => $snapshot->reserved_quantity,
                ];
            });

        // Calculate totals
        $totalAvailable = $warehouseStocks->sum('available_quantity');
        $totalReserved = $warehouseStocks->sum('reserved_quantity');

        // Get batch details
        $batches = StockBatch::with([
            'warehouse:id,name',
            'purchaseItem.purchase:id,invoice_no,purchase_date'
        ])
            ->where('product_variant_id', $productVariant->id)
            ->orderBy('expiry_date', 'asc')
            ->get()
            ->map(function ($batch) {
                return [
                    'id' => $batch->id,
                    'batch_no' => $batch->batch_no,
                    'expiry_date' => $batch->expiry_date,
                    'received_quantity' => $batch->received_quantity,
                    'available_quantity' => $batch->available_quantity,
                    'warehouse_name' => $batch->warehouse->name,
                    'purchase_invoice_no' => $batch->purchaseItem?->purchase->invoice_no ?? 'N/A',
                    'purchase_date' => $batch->purchaseItem?->purchase->purchase_date ?? null,
                ];
            });

        // Get stock movement history (last 50 movements)
        $stockMovements = StockLedger::with([
            'warehouse:id,name',
            'batch:id,batch_no'
        ])
            ->where('product_variant_id', $productVariant->id)
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get()
            ->map(function ($ledger) {
                return [
                    'id' => $ledger->id,
                    'movement_type' => $ledger->movement_type,
                    'quantity' => $ledger->quantity,
                    'warehouse_name' => $ledger->warehouse->name,
                    'batch_no' => $ledger->batch->batch_no ?? 'N/A',
                    'source_type' => $ledger->source_type,
                    'created_at' => $ledger->created_at,
                    'remarks' => $ledger->remarks ?? '',
                ];
            });

        return Inertia::render('warehouse/InventoryDetails', [
            'product' => $product,
            'warehouseStocks' => $warehouseStocks,
            'batches' => $batches,
            'stockMovements' => $stockMovements,
            'totalAvailable' => $totalAvailable,
            'totalReserved' => $totalReserved,
        ]);
    }

    /**
     * Show barcode printing page
     */
    public function barcode(ProductVariant $productVariant)
    {
        $productVariant->load([
            'product:id,name',
            'barcodes:id,product_variant_id,barcode,is_primary',
            'stockSnapshots:id,product_variant_id,available_quantity'
        ]);

        return Inertia::render('warehouse/Barcode', [
            'variant' => [
                'id' => $productVariant->id,
                'variant_name' => $productVariant->variant_name,
                'sku' => $productVariant->sku,
                'selling_price' => (float) $productVariant->selling_price,
                'mrp' => (float) $productVariant->mrp,
                'product' => [
                    'name' => $productVariant->product->name,
                ],
                'barcodes' => $productVariant->barcodes->map(function ($barcode) {
                    return [
                        'id' => $barcode->id,
                        'barcode' => $barcode->barcode,
                        'is_primary' => (bool) $barcode->is_primary,
                    ];
                }),
            ],
            'stock' => $productVariant->stockSnapshots->sum('available_quantity'),
        ]);
    }

    public function barcode2(ProductVariant $productVariant)
    {
        $barcodes = $productVariant->barcodes()->get(['id', 'barcode']);
        return response()->json($barcodes);
    }

    /**
     * Show barcode labels for printing
     */
    public function printBarcode(ProductVariant $productVariant, Request $request)
    {
        $validated = $request->validate([
            'barcode' => 'required|string',
            'qty' => 'required|integer|min:1',
            'copies' => 'required|integer|min:1|max:100',
            'size' => 'required|string|in:40x30,50x30,60x40,30x20',
            'showName' => 'required|boolean',
            'showPrice' => 'required|boolean',
            'showSku' => 'required|boolean',
            'showMRP' => 'required|boolean',
        ]);

        $productVariant->load([
            'product:id,name',
        ]);

        // return Inertia::render('warehouse/BarcodeLabelPrint', [
        //     'variant' => [
        //         'id' => $productVariant->id,
        //         'variant_name' => $productVariant->variant_name,
        //         'sku' => $productVariant->sku,
        //         'selling_price' => (float) $productVariant->selling_price,
        //         'mrp' => (float) $productVariant->mrp,
        //         'product' => [
        //             'name' => $productVariant->product->name,
        //         ],
        //     ],
        //     'barcode' => $validated['barcode'],
        //     'qty' => $validated['qty'],
        //     'copies' => $validated['copies'],
        //     'size' => $validated['size'],
        //     'showName' => $validated['showName'],
        //     'showPrice' => $validated['showPrice'],
        //     'showSku' => $validated['showSku'],
        //     'showMRP' => $validated['showMRP'],
        // ]);
        
        return Inertia::render('warehouse/BarcodeLabelPrint', [
            'variant' => [
                'id' => $productVariant->id,
                'variant_name' => $productVariant->variant_name,
                'sku' => $productVariant->sku,
                'selling_price' => (float) $productVariant->selling_price,
                'mrp' => (float) $productVariant->mrp,
                'product' => [
                    'name' => $productVariant->product->name,
                ],
            ],
            'barcode' => $validated['barcode'],
            'qty' => (int) $validated['qty'],
            'copies' => (int) $validated['copies'],
            'size' => $validated['size'],
            'showName' => $request->boolean('showName'),
            'showPrice' => $request->boolean('showPrice'),
            'showSku' => $request->boolean('showSku'),
            'showMRP' => $request->boolean('showMRP'),
        ]);
    }

    /**
     * Get low stock items report
     */
    public function lowStock()
    {
        $lowStockItems = ProductVariant::with([
            'product:id,name,category_id',
            'product.category:id,name',
            'unit:id,symbol',
            'stockSnapshots',
        ])
            ->where('status', true)
            ->get()
            ->map(function ($variant) {
                $totalAvailable = $variant->stockSnapshots->sum('available_quantity');
                $reorderLevel = $variant->reorder_level ?? 0;

                return [
                    'product_variant_id' => $variant->id,
                    'product_name' => $variant->product->name,
                    'variant_name' => $variant->variant_name,
                    'sku' => $variant->sku,
                    'category_name' => $variant->product->category->name,
                    'unit_symbol' => $variant->unit->symbol,
                    'total_available' => $totalAvailable,
                    'reorder_level' => $reorderLevel,
                    'shortage' => $reorderLevel - $totalAvailable,
                ];
            })
            ->filter(function ($item) {
                return $item['total_available'] <= $item['reorder_level'];
            })
            ->values();

        return response()->json($lowStockItems);
    }

    /**
     * Get expiring batches report
     */
    public function expiringBatches(Request $request)
    {
        $days = $request->input('days', 30); // Default to 30 days

        $expiryDate = now()->addDays($days);

        $expiringBatches = StockBatch::with([
            'productVariant.product:id,name',
            'productVariant.unit:id,symbol',
            'warehouse:id,name',
        ])
            ->whereNotNull('expiry_date')
            ->where('expiry_date', '<=', $expiryDate)
            ->where('expiry_date', '>=', now())
            ->where('available_quantity', '>', 0)
            ->orderBy('expiry_date', 'asc')
            ->get()
            ->map(function ($batch) {
                return [
                    'batch_id' => $batch->id,
                    'batch_no' => $batch->batch_no,
                    'product_name' => $batch->productVariant->product->name,
                    'variant_name' => $batch->productVariant->variant_name,
                    'sku' => $batch->productVariant->sku,
                    'warehouse_name' => $batch->warehouse->name,
                    'available_quantity' => $batch->available_quantity,
                    'unit_symbol' => $batch->productVariant->unit->symbol,
                    'expiry_date' => $batch->expiry_date,
                    'days_to_expiry' => now()->diffInDays($batch->expiry_date),
                ];
            });

        return response()->json($expiringBatches);
    }

    /**
     * Get stock valuation report
     */
    public function stockValuation()
    {
        $valuation = ProductVariant::with([
            'product:id,name,category_id',
            'product.category:id,name',
            'unit:id,symbol',
            'stockSnapshots',
        ])
            ->where('status', true)
            ->get()
            ->map(function ($variant) {
                $totalAvailable = $variant->stockSnapshots->sum('available_quantity');
                $stockValue = $totalAvailable * $variant->cost_price;
                $potentialRevenue = $totalAvailable * $variant->selling_price;
                $potentialProfit = $potentialRevenue - $stockValue;

                return [
                    'product_variant_id' => $variant->id,
                    'product_name' => $variant->product->name,
                    'variant_name' => $variant->variant_name,
                    'sku' => $variant->sku,
                    'category_name' => $variant->product->category->name,
                    'unit_symbol' => $variant->unit->symbol,
                    'total_available' => $totalAvailable,
                    'cost_price' => $variant->cost_price,
                    'selling_price' => $variant->selling_price,
                    'stock_value' => $stockValue,
                    'potential_revenue' => $potentialRevenue,
                    'potential_profit' => $potentialProfit,
                    'profit_margin' => $stockValue > 0 ? ($potentialProfit / $stockValue) * 100 : 0,
                ];
            })
            ->sortByDesc('stock_value')
            ->values();

        $summary = [
            'total_stock_value' => $valuation->sum('stock_value'),
            'total_potential_revenue' => $valuation->sum('potential_revenue'),
            'total_potential_profit' => $valuation->sum('potential_profit'),
            'total_products' => $valuation->count(),
        ];

        return response()->json([
            'items' => $valuation,
            'summary' => $summary,
        ]);
    }

    /**
     * Adjust stock manually (for corrections, damages, etc.)
     */
    public function adjustStock(Request $request)
    {
        $validated = $request->validate([
            'product_variant_id' => 'required|exists:product_variants,id',
            'warehouse_id' => 'required|exists:warehouses,id',
            'adjustment_type' => 'required|in:increase,decrease',
            'quantity' => 'required|integer|min:1',
            'reason' => 'required|string',
            'batch_id' => 'nullable|exists:stock_batches,id',
        ]);

        DB::beginTransaction();
        try {
            $movementType = $validated['adjustment_type'] === 'increase' ? 'IN' : 'OUT';
            $quantity = $validated['quantity'];

            // Create stock ledger entry
            StockLedger::create([
                'product_variant_id' => $validated['product_variant_id'],
                'warehouse_id' => $validated['warehouse_id'],
                'batch_id' => $validated['batch_id'],
                'movement_type' => $movementType,
                'quantity' => $quantity,
                'source_type' => 'Manual Adjustment',
                'source_id' => null,
                'remarks' => $validated['reason'],
            ]);

            // Update stock snapshot
            $snapshot = StockSnapshot::firstOrCreate(
                [
                    'product_variant_id' => $validated['product_variant_id'],
                    'warehouse_id' => $validated['warehouse_id'],
                ],
                [
                    'available_quantity' => 0,
                    'reserved_quantity' => 0,
                ]
            );

            if ($movementType === 'IN') {
                $snapshot->increment('available_quantity', $quantity);
            } else {
                $snapshot->decrement('available_quantity', $quantity);
            }

            // Update batch if specified
            if ($validated['batch_id']) {
                $batch = StockBatch::find($validated['batch_id']);
                if ($movementType === 'IN') {
                    $batch->increment('available_quantity', $quantity);
                } else {
                    $batch->decrement('available_quantity', $quantity);
                }
            }

            DB::commit();
            return redirect()->back()->with('success', 'Stock adjusted successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->withErrors(['error' => 'Failed to adjust stock: ' . $e->getMessage()]);
        }
    }
}
