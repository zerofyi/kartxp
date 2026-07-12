<?php

namespace App\Http\Controllers;

use App\Models\ProductVariant;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\StockBatch;
use App\Models\StockLedger;
use App\Models\StockSnapshot;
use App\Models\TaxCategory;
use App\Models\Vendor;
use App\Models\Warehouse;
use App\Services\ImageStorage\ImageStorageException;
use App\Services\ImageStorage\ImageStorageService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class PurchaseController extends Controller
{
    private const IMAGE_FOLDER = 'Invoices';
    private const PER_PAGE     = 20;

    public function __construct(protected ImageStorageService $imageStorageService) {}

    // ─────────────────────────────────────────────────────────────
    // INDEX
    // ─────────────────────────────────────────────────────────────

    public function index(Request $request): Response
    {
        // 1. Capture dynamic filter parameters
        $search     = $request->string('search')->trim();
        $status     = $request->string('status')->trim();
        $vendorId   = $request->input('vendor_id');
        $warehouseId = $request->input('warehouse_id');
        $startDate  = $request->input('start_date');
        $endDate    = $request->input('end_date');
        $perPage    = $request->integer('per_page', self::PER_PAGE);

        // 2. Build performance-optimized query builder scope
        $query = Purchase::with([
            'vendor:id,name,phone',
            'items.productVariant.product:id,name',
            'items.productVariant.unit:id,symbol',
            'items.taxCategory:id,name,tax_percent,type',
            'createdBy:id,name',
        ]);

        // Apply filters directly at the Database level
        $query->when($search, function ($q) use ($search) {
            $q->where(function ($inner) use ($search) {
                $inner->where('invoice_no', 'like', "%{$search}%")
                      ->orWhereHas('vendor', fn($v) => $v->where('name', 'like', "%{$search}%"));
            });
        });

        $query->when($status->isNotEmpty() && $status->toString() !== 'all', fn($q) => $q->where('status', $status));
        $query->when($vendorId, fn($q) => $q->where('vendor_id', $vendorId));
        $query->when($warehouseId, fn($q) => $q->where('warehouse_id', $warehouseId));
        $query->when($startDate, fn($q) => $q->whereDate('purchase_date', '>=', $startDate));
        $query->when($endDate, fn($q) => $q->whereDate('purchase_date', '<=', $endDate));

        // 3. Compute High-Performance Aggregated KPI Meta-Metrics for Summary Cards
        $statsQuery = clone $query;
        $stats = $statsQuery->selectRaw("
            COUNT(id) as total_count,
            SUM(CASE WHEN status = 'confirmed' THEN total_amount ELSE 0 END) as confirmed_total,
            SUM(CASE WHEN status = 'draft' THEN total_amount ELSE 0 END) as draft_total,
            SUM(total_amount) as grand_total
        ")->first();

        // 4. Paginate final dataset records efficiently
        $purchases = $query->latest()
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn($p) => [
                'id'            => $p->id,
                'vendor_id'     => $p->vendor_id,
                'vendor'        => $p->vendor,
                'invoice_no'    => $p->invoice_no,
                'image_url'     => $this->imageStorageService->url($p->image_path),
                'purchase_date' => $p->purchase_date?->format('Y-m-d'),
                'subtotal'      => (float) $p->subtotal,
                'tax_amount'    => (float) $p->tax_amount,
                'total_amount'  => (float) $p->total_amount,
                'status'        => $p->status,
                'created_at'    => $p->created_at?->toISOString(),
                'items_count'   => $p->items->count(),
            ]);

        return Inertia::render('Warehouse/PurchaseList', [
            'purchases'  => $purchases,
            'vendors'    => Vendor::where('user_id', Auth::id())->orderBy('name')->get(['id', 'name']),
            'warehouses' => Warehouse::where('user_id', Auth::id())->orderBy('name')->get(['id', 'name', 'location']),
            'stats' => [
                'total_count'     => (int) ($stats->total_count ?? 0),
                'confirmed_total' => (float) ($stats->confirmed_total ?? 0),
                'draft_total'     => (float) ($stats->draft_total ?? 0),
                'grand_total'     => (float) ($stats->grand_total ?? 0),
            ],
            'filters' => [
                'search'       => $search->toString(),
                'status'       => $status->toString() ?: 'all',
                'vendor_id'    => $vendorId,
                'warehouse_id' => $warehouseId,
                'start_date'   => $startDate,
                'end_date'     => $endDate,
                'per_page'     => $perPage,
            ]
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // CREATE
    // ─────────────────────────────────────────────────────────────

    public function create(): Response
    {
        return Inertia::render('Warehouse/AddPurchase', [
            'vendors'       => Vendor::where('user_id', Auth::id())->orderBy('name')->get(['id', 'name', 'phone', 'gstin']),
            'warehouses'    => Warehouse::where('user_id', Auth::id())->orderBy('name')->get(['id', 'name', 'location']),
            'taxCategories' => TaxCategory::orderBy('name')->get(['id', 'name', 'tax_percent', 'type']),
            'products'      => $this->buildProductList(),
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // STORE
    // ─────────────────────────────────────────────────────────────

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate($this->itemRules([
            'invoice_no' => 'required|string|unique:purchases,invoice_no',
        ]));

        $taxMap = $this->loadTaxMap($validated['items']);

        DB::beginTransaction();
        $imagePath = null;

        try {
            [$subtotal, $taxAmount] = $this->calculateTotals($validated['items'], $taxMap);

            if ($request->hasFile('invoice_image')) {
                $imageResult = $this->imageStorageService->upload(
                    file: $request->file('invoice_image'),
                    slug: Str::slug($validated['invoice_no']),
                    folder: self::IMAGE_FOLDER,
                    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] // Add PDF if your service config allows it
                );
                $imagePath = $imageResult->path;
            }

            $purchase = Purchase::create([
                'vendor_id'     => $validated['vendor_id'],
                'warehouse_id'  => $validated['warehouse_id'],
                'invoice_no'    => $validated['invoice_no'],
                'image_path'    => $imagePath,
                'purchase_date' => $validated['purchase_date'],
                'subtotal'      => $subtotal,
                'tax_amount'    => $taxAmount,
                'total_amount'  => $subtotal + $taxAmount,
                'status'        => $validated['status'],
                'created_by'    => Auth::id(),
            ]);

            foreach ($validated['items'] as $itemData) {
                $purchaseItem = $purchase->items()->create($this->itemPayload($itemData));

                if ($validated['status'] === 'confirmed') {
                    $this->updateStock($purchaseItem, $validated['warehouse_id'], $itemData['quantity']);
                }
            }

            DB::commit();
            return redirect()->route('warehouse.purchases.index')->with('success', 'Purchase created successfully.');

        } catch (ImageStorageException $e) {
            DB::rollBack();
            if ($imagePath) { $this->imageStorageService->delete($imagePath); }
            return redirect()->back()->withErrors(['form' => $e->getMessage()])->withInput();
        } catch (\Throwable $e) {
            DB::rollBack();
            if ($imagePath) { $this->imageStorageService->delete($imagePath); }
            Log::error('Purchase store failed', ['error' => $e->getMessage(), 'user' => Auth::id()]);
            return redirect()->back()->withErrors(['form' => 'Failed to create purchase: ' . $e->getMessage()])->withInput();
        }
    }

    // ─────────────────────────────────────────────────────────────
    // SHOW
    // ─────────────────────────────────────────────────────────────

    public function show(Purchase $purchase): Response
    {
        $purchase->load([
            'vendor:id,name,phone,gstin,email,address',
            'items.taxCategory:id,name,tax_percent,type',
            'items.productVariant.product:id,name',
        ]);

        return Inertia::render('Warehouse/ViewPurchase', [
            'purchase' => [
                'id' => $purchase->id,
                'vendor_id' => $purchase->vendor_id,
                'invoice_no' => $purchase->invoice_no,
                'image_url' => $this->imageStorageService->url($purchase->image_path),
                'purchase_date' => $purchase->purchase_date?->format('Y-m-d'),
                'subtotal' => (float) $purchase->subtotal,
                'tax_amount' => (float) $purchase->tax_amount,
                'total_amount' => (float) $purchase->total_amount,
                'status' => $purchase->status,
                'created_at' => $purchase->created_at?->toISOString(),
                'vendor' => $purchase->vendor,
                'items' => $purchase->items->map(fn ($item) => [
                    'id' => $item->id,
                    'product_variant_id' => $item->product_variant_id,
                    'product_name' => $item->productVariant?->product?->name,
                    'quantity' => (float) $item->quantity,
                    'cost_price' => (float) $item->cost_price,
                    'selling_price' => (float) $item->selling_price,
                    'mrp' => (float) $item->mrp,
                    'tax_id' => $item->tax_id,
                    'batch_no' => $item->batch_no,
                    'expiry_date' => $item->expiry_date,
                    'tax_category' => $item->taxCategory,
                ])->values(),
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // EDIT
    // ─────────────────────────────────────────────────────────────

    public function edit(Purchase $purchase): Response
    {
        $purchase->load([
            'vendor',
            'items.productVariant.product',
            'items.taxCategory',
        ]);

        return Inertia::render('Warehouse/EditPurchase', [
            'purchase'      => $purchase,
            'vendors'       => Vendor::where('user_id', Auth::id())->orderBy('name')->get(['id', 'name', 'phone', 'gstin']),
            'warehouses'    => Warehouse::where('user_id', Auth::id())->orderBy('name')->get(['id', 'name', 'location']),
            'taxCategories' => TaxCategory::orderBy('name')->get(['id', 'name', 'tax_percent', 'type']),
            'products'      => $this->buildProductList(),
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // UPDATE
    // ─────────────────────────────────────────────────────────────

    public function update(Request $request, Purchase $purchase): RedirectResponse
    {
        if ($purchase->status === 'confirmed') {
            return redirect()->back()->withErrors(['form' => 'Cannot edit a confirmed purchase.']);
        }

        $validated = $request->validate($this->itemRules([
            'invoice_no' => 'required|string|unique:purchases,invoice_no,' . $purchase->id,
            'items.*.id' => 'nullable|exists:purchase_items,id',
        ]));

        $taxMap = $this->loadTaxMap($validated['items']);
        $becomingConfirmed = $validated['status'] === 'confirmed' && $purchase->status === 'draft';

        DB::beginTransaction();
        try {
            [$subtotal, $taxAmount] = $this->calculateTotals($validated['items'], $taxMap);

            $imagePath = $purchase->image_path;
            if ($request->hasFile('invoice_image')) {
                $imageResult = $this->imageStorageService->replace(
                    file: $request->file('invoice_image'),
                    slug: Str::slug($validated['invoice_no']),
                    folder: self::IMAGE_FOLDER,
                    existingPath: $purchase->image_path,
                    allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
                );
                $imagePath = $imageResult->path;
            }

            $purchase->update([
                'vendor_id'     => $validated['vendor_id'],
                'warehouse_id'  => $validated['warehouse_id'],
                'invoice_no'    => $validated['invoice_no'],
                'image_path'    => $imagePath,
                'purchase_date' => $validated['purchase_date'],
                'subtotal'      => $subtotal,
                'tax_amount'    => $taxAmount,
                'total_amount'  => $subtotal + $taxAmount,
                'status'        => $validated['status'],
            ]);

            $existingItemIds = $purchase->items()->pluck('id')->toArray();
            $updatedItemIds  = [];

            foreach ($validated['items'] as $itemData) {
                if (!empty($itemData['id'])) {
                    $item = PurchaseItem::findOrFail($itemData['id']);
                    $item->update($this->itemPayload($itemData));
                } else {
                    $item = $purchase->items()->create($this->itemPayload($itemData));
                }
                $updatedItemIds[] = $item->id;

                if ($becomingConfirmed) {
                    $this->updateStock($item, $validated['warehouse_id'], $itemData['quantity']);
                }
            }

            $toDelete = array_diff($existingItemIds, $updatedItemIds);
            if (!empty($toDelete)) {
                PurchaseItem::whereIn('id', $toDelete)->delete();
            }

            DB::commit();
            return redirect()->route('warehouse.purchases.index')->with('success', 'Purchase updated successfully.');
        } catch (ImageStorageException $e) {
            DB::rollBack();
            return redirect()->back()->withErrors(['form' => $e->getMessage()]);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Purchase update failed', ['purchase' => $purchase->id, 'error' => $e->getMessage()]);
            return redirect()->back()->withErrors(['form' => 'Failed to update purchase. Please try again.'])->withInput();
        }
    }

    // ─────────────────────────────────────────────────────────────
    // CONFIRM
    // ─────────────────────────────────────────────────────────────

    public function confirm(Request $request, Purchase $purchase): RedirectResponse
    {
        if ($purchase->status === 'confirmed') {
            return redirect()->back()->withErrors(['form' => 'Purchase is already confirmed.']);
        }

        $validated = $request->validate([
            'warehouse_id' => 'required|exists:warehouses,id',
        ]);

        DB::beginTransaction();
        try {
            foreach ($purchase->items as $item) {
                $this->updateStock($item, $validated['warehouse_id'], $item->quantity);
            }

            $purchase->update([
                'status'       => 'confirmed',
                'warehouse_id' => $validated['warehouse_id'],
            ]);

            DB::commit();
            return redirect()->back()->with('success', 'Purchase confirmed successfully.');
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Purchase confirm failed', ['purchase' => $purchase->id, 'error' => $e->getMessage()]);
            return redirect()->back()->withErrors(['form' => 'Failed to confirm purchase. Please try again.']);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // DESTROY
    // ─────────────────────────────────────────────────────────────

    public function destroy(Purchase $purchase): RedirectResponse
    {
        if ($purchase->status === 'confirmed') {
            return redirect()->back()->withErrors(['form' => 'Cannot delete a confirmed purchase.']);
        }

        DB::beginTransaction();
        try {
            if ($purchase->image_path) {
                $this->imageStorageService->delete($purchase->image_path);
            }

            $purchase->delete();

            DB::commit();
            return redirect()->back()->with('success', 'Purchase deleted successfully.');
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Purchase delete failed', ['purchase' => $purchase->id, 'error' => $e->getMessage()]);
            return redirect()->back()->withErrors(['form' => 'Failed to delete purchase. Please try again.']);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // REPORT – Scoped, Clean, and Highly Optimized
    // ─────────────────────────────────────────────────────────────
    public function report(Request $request): Response
    {
        $warehouse = Auth::user()->ownedWarehouse;
        $warehouseId = $warehouse ? $warehouse->id : null;

        $startDate = $request->input('start_date');
        $endDate   = $request->input('end_date');
        $vendorId  = $request->input('vendor_id');
        $status    = $request->string('status')->trim();

        $query = Purchase::with(['vendor:id,name,phone'])
            ->withCount('items')
            ->select(['id', 'vendor_id', 'invoice_no', 'purchase_date', 'subtotal', 'tax_amount', 'total_amount', 'status']);

        // Enforce strong warehouse safety boundary box limits
        if ($warehouseId) {
            $query->where('warehouse_id', $warehouseId);
        }

        // Apply filters directly at the database level before loading into memory
        $query->when($startDate, fn($q) => $q->whereDate('purchase_date', '>=', $startDate));
        $query->when($endDate,   fn($q) => $q->whereDate('purchase_date', '<=', $endDate));
        $query->when($vendorId,  fn($q) => $q->where('vendor_id', $vendorId));
        $query->when($status->isNotEmpty() && $status->toString() !== 'all', fn($q) => $q->where('status', $status));

        // Limit the maximum number of rows returned to prevent system memory exhaustion
        $purchases = $query->latest('purchase_date')
            ->take(2500)
            ->get()
            ->map(fn ($p) => [
                'id'            => $p->id,
                'vendor_id'     => $p->vendor_id,
                'vendor'        => $p->vendor,
                'invoice_no'    => $p->invoice_no,
                'purchase_date' => $p->purchase_date?->format('Y-m-d'),
                'subtotal'      => (float) $p->subtotal,
                'tax_amount'    => (float) $p->tax_amount,
                'total_amount'  => (float) $p->total_amount,
                'status'        => $p->status,
                'items_count'   => $p->items_count,
            ]);

        return Inertia::render('Warehouse/PurchaseReport', [
            'purchases' => $purchases,
            'vendors'   => Vendor::where('user_id', Auth::id())->orderBy('name')->get(['id', 'name', 'phone']),
            'filters'   => [
                'start_date' => $startDate,
                'end_date'   => $endDate,
                'vendor_id'  => $vendorId,
                'status'     => $status->toString() ?: 'all',
            ]
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // STRIPPED INTERNAL IMPLEMENTATIONS
    // ─────────────────────────────────────────────────────────────

    private function itemRules(array $overrides = []): array
    {
        return array_merge([
            'vendor_id'                  => 'required|exists:vendors,id',
            'purchase_date'              => 'required|date',
            'warehouse_id'               => 'required|exists:warehouses,id',
            'invoice_image'              => 'nullable|file|mimes:jpg,jpeg,png,webp|max:5120',
            'items'                      => 'required|array|min:1',
            'items.*.product_variant_id' => 'required|exists:product_variants,id',
            'items.*.quantity'           => 'required|integer|min:1',
            'items.*.cost_price'         => 'required|numeric|min:0',
            'items.*.min_selling_price'  => 'required|numeric|min:0',
            'items.*.selling_price'      => 'required|numeric|min:0',
            'items.*.mrp'                => 'required|numeric|min:0',
            'items.*.tax_id'             => 'required|exists:tax_categories,id',
            'items.*.batch_no'           => 'required|string',
            'items.*.expiry_date'        => 'nullable|date|after:today',
            'status'                     => 'required|in:draft,confirmed',
        ], $overrides);
    }

    private function loadTaxMap(array $items): array {
        $ids = array_unique(array_column($items, 'tax_id'));
        return TaxCategory::whereIn('id', $ids)->get()->keyBy('id')->all();
    }

    private function calculateTotals(array $items, array $taxMap): array {
        $subtotal = 0.0; $taxAmount = 0.0;
        foreach ($items as $item) {
            $taxCategory = $taxMap[$item['tax_id']] ?? null;
            $lineTotal   = (float) $item['quantity'] * (float) $item['cost_price'];
            if ($taxCategory?->type === 'inclusive') {
                $base = $lineTotal / (1 + ($taxCategory->tax_percent / 100));
                $subtotal += $base; $taxAmount += $lineTotal - $base;
            } else {
                $tax = $taxCategory ? ($lineTotal * $taxCategory->tax_percent / 100) : 0;
                $subtotal += $lineTotal; $taxAmount += $tax;
            }
        }
        return [round($subtotal, 2), round($taxAmount, 2)];
    }

    private function itemPayload(array $itemData): array {
        return [
            'product_variant_id' => $itemData['product_variant_id'],
            'quantity'           => $itemData['quantity'],
            'cost_price'         => $itemData['cost_price'],
            'min_selling_price'  => $itemData['min_selling_price'],
            'selling_price'      => $itemData['selling_price'],
            'mrp'                => $itemData['mrp'],
            'tax_id'             => $itemData['tax_id'],
            'batch_no'           => $itemData['batch_no'],
            'expiry_date'        => $itemData['expiry_date'] ?? null,
        ];
    }

    private function buildProductList() {
        return ProductVariant::with(['product:id,name,category_id,tax_category_id', 'product.category:id,name', 'product.taxCategory:id,name,tax_percent,type', 'unit:id,name,symbol', 'barcodes'])
            ->where('status', true)->get()->map(fn ($variant) => [
                'id' => $variant->id,
                'name' => ($variant->product?->name ?? 'N/A') . ' - ' . ($variant->variant_name ?? 'N/A'),
                'sku' => $variant->sku ?? null,
                'unit' => $variant->unit?->symbol ?? null,
                'mrp' => $variant->mrp ?? 0,
                'min_selling_price' => $variant->min_selling_price ?? 0,
                'selling_price' => $variant->selling_price ?? 0,
                'cost_price' => $variant->cost_price ?? 0,
                'tax_id' => $variant->product?->tax_category_id ?? null,
                'barcode' => $variant->barcodes?->first()?->barcode ?? null,
            ]);
    }

    private function updateStock(PurchaseItem $purchaseItem, int $warehouseId, int $quantity): void {
        $stockBatch = StockBatch::create([
            'product_variant_id' => $purchaseItem->product_variant_id,
            'warehouse_id'       => $warehouseId,
            'batch_no'           => $purchaseItem->batch_no,
            'expiry_date'        => $purchaseItem->expiry_date,
            'purchase_item_id'   => $purchaseItem->id,
            'received_quantity'  => $quantity,
            'available_quantity' => $quantity,
        ]);
        StockLedger::create([
            'product_variant_id' => $purchaseItem->product_variant_id,
            'warehouse_id'       => $warehouseId,
            'batch_id'           => $stockBatch->id,
            'movement_type'      => 'IN',
            'quantity'           => $quantity,
            'source_type'        => Purchase::class,
            'source_id'          => $purchaseItem->purchase_id,
            'remarks'            => "Purchase from invoice #{$purchaseItem->purchase->invoice_no}",
        ]);
        $snapshot = StockSnapshot::firstOrCreate(
            ['product_variant_id' => $purchaseItem->product_variant_id, 'warehouse_id' => $warehouseId],
            ['available_quantity' => 0, 'reserved_quantity' => 0],
        );
        $snapshot->increment('available_quantity', $quantity);
        ProductVariant::where('id', $purchaseItem->product_variant_id)->update([
            'cost_price'        => $purchaseItem->cost_price,
            'min_selling_price' => $purchaseItem->min_selling_price,
            'selling_price'     => $purchaseItem->selling_price,
            'mrp'               => $purchaseItem->mrp,
        ]);
    }
}
