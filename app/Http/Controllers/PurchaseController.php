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
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class PurchaseController extends Controller
{
    /** Disk used for invoice images — one place to change if it ever moves. */
    private const IMAGE_DISK = 'public_html';

    // ─────────────────────────────────────────────────────────────
    // INDEX
    // ─────────────────────────────────────────────────────────────

    public function index(): Response
    {
        $purchases = Purchase::with([
            'vendor:id,name,phone',
            'items.productVariant.product:id,name',
            'items.productVariant.unit:id,symbol',
            'items.taxCategory:id,name,tax_percent,type',
            'createdBy:id,name',
        ])
            ->latest()
            ->get();

        $warehouses = Warehouse::where('user_id', Auth::id())
            ->orderBy('name')
            ->get(['id', 'name', 'location']);

        return Inertia::render('Warehouse/PurchaseList', [
            'purchases'  => $purchases,
            'warehouses' => $warehouses,
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

        // Eager-load all tax categories referenced in this request — avoids N+1
        $taxMap = $this->loadTaxMap($validated['items']);

        DB::beginTransaction();
        try {
            [$subtotal, $taxAmount] = $this->calculateTotals($validated['items'], $taxMap);

            $imagePath = $request->hasFile('invoice_image')
                ? $this->uploadImage($request->file('invoice_image'), $validated['invoice_no'])
                : null;

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
        } catch (\Throwable $e) {
            DB::rollBack();
            if (isset($imagePath) && $imagePath) {
                Storage::disk(self::IMAGE_DISK)->delete($imagePath);
            }
            Log::error('Purchase store failed', ['error' => $e->getMessage(), 'user' => Auth::id()]);
            return redirect()->back()->withErrors(['form' => 'Failed to create purchase. Please try again.'])->withInput();
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
            'image_path' => $purchase->image_path,
            'purchase_date' => $purchase->purchase_date?->format('Y-m-d'),
            'subtotal' => (float) $purchase->subtotal,
            'tax_amount' => (float) $purchase->tax_amount,
            'total_amount' => (float) $purchase->total_amount,
            'status' => $purchase->status,
            'created_at' => $purchase->created_at?->toISOString(),

            'vendor' => $purchase->vendor ? [
                'id' => $purchase->vendor->id,
                'name' => $purchase->vendor->name,
                'phone' => $purchase->vendor->phone,
                'gstin' => $purchase->vendor->gstin,
                'email' => $purchase->vendor->email,
                'address' => $purchase->vendor->address,
            ] : null,

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

                'tax_category' => $item->taxCategory ? [
                    'id' => $item->taxCategory->id,
                    'name' => $item->taxCategory->name,
                    'tax_percent' => (float) $item->taxCategory->tax_percent,
                    'type' => $item->taxCategory->type,
                ] : null,
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

            // Handle image replacement
            $imagePath = $purchase->image_path;
            if ($request->hasFile('invoice_image')) {
                if ($imagePath) {
                    Storage::disk(self::IMAGE_DISK)->delete($imagePath);
                }
                $imagePath = $this->uploadImage($request->file('invoice_image'), $validated['invoice_no']);
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
                Storage::disk(self::IMAGE_DISK)->delete($purchase->image_path);
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
    // REPORT
    // ─────────────────────────────────────────────────────────────

    public function report(): Response
    {
        // withCount avoids loading item collections just to count them
        $purchases = Purchase::with(['vendor:id,name,phone'])
            ->withCount('items')
            ->latest()
            ->get()
            ->map(fn ($p) => [
                'id'            => $p->id,
                'vendor_id'     => $p->vendor_id,
                'vendor'        => $p->vendor,
                'invoice_no'    => $p->invoice_no,
                'purchase_date' => $p->purchase_date,
                'subtotal'      => $p->subtotal,
                'tax_amount'    => $p->tax_amount,
                'total_amount'  => $p->total_amount,
                'status'        => $p->status,
                'items_count'   => $p->items_count,
            ]);

        return Inertia::render('Warehouse/PurchaseReport', [
            'purchases' => $purchases,
            'vendors'   => Vendor::where('user_id', Auth::id())->orderBy('name')->get(['id', 'name', 'phone']),
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────

    /**
     * Shared validation rules for store/update.
     * Caller passes overrides for invoice_no uniqueness and optional items.*.id.
     */
    private function itemRules(array $overrides = []): array
    {
        return array_merge([
            'vendor_id'                      => 'required|exists:vendors,id',
            'purchase_date'                  => 'required|date',
            'warehouse_id'                   => 'required|exists:warehouses,id',
            'invoice_image'                  => 'nullable|image|max:5120',
            'items'                          => 'required|array|min:1',
            'items.*.product_variant_id'     => 'required|exists:product_variants,id',
            'items.*.quantity'               => 'required|integer|min:1',
            'items.*.cost_price'             => 'required|numeric|min:0',
            'items.*.min_selling_price'      => 'required|numeric|min:0',
            'items.*.selling_price'          => 'required|numeric|min:0',
            'items.*.mrp'                    => 'required|numeric|min:0',
            'items.*.tax_id'                 => 'required|exists:tax_categories,id',
            'items.*.batch_no'               => 'required|string',
            'items.*.expiry_date'            => 'nullable|date|after:today',
            'status'                         => 'required|in:draft,confirmed',
        ], $overrides);
    }

    /**
     * Load all TaxCategory records referenced in the items array — one query total.
     *
     * @param  array<int, array<string, mixed>>  $items
     * @return array<int, TaxCategory>  keyed by id
     */
    private function loadTaxMap(array $items): array
    {
        $ids = array_unique(array_column($items, 'tax_id'));
        return TaxCategory::whereIn('id', $ids)->get()->keyBy('id')->all();
    }

    /**
     * Calculate subtotal and tax from items, using a pre-loaded tax map.
     *
     * @param  array<int, TaxCategory>  $taxMap
     * @return array{float, float}  [$subtotal, $taxAmount]
     */
    private function calculateTotals(array $items, array $taxMap): array
    {
        $subtotal  = 0.0;
        $taxAmount = 0.0;

        foreach ($items as $item) {
            $taxCategory = $taxMap[$item['tax_id']] ?? null;
            $lineTotal   = (float) $item['quantity'] * (float) $item['cost_price'];

            if ($taxCategory?->type === 'inclusive') {
                $base       = $lineTotal / (1 + ($taxCategory->tax_percent / 100));
                $subtotal  += $base;
                $taxAmount += $lineTotal - $base;
            } else {
                $tax        = $taxCategory ? ($lineTotal * $taxCategory->tax_percent / 100) : 0;
                $subtotal  += $lineTotal;
                $taxAmount += $tax;
            }
        }

        return [round($subtotal, 2), round($taxAmount, 2)];
    }

    /**
     * Normalise item data into the DB column shape used by both create and update.
     *
     * @param  array<string, mixed>  $itemData
     * @return array<string, mixed>
     */
    private function itemPayload(array $itemData): array
    {
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

    /**
     * Build the mapped product list used by Add/Edit forms.
     *
     * @return \Illuminate\Support\Collection<int, array<string, mixed>>
     */
    private function buildProductList()
    {
        return ProductVariant::with([
            'product:id,name,category_id,tax_category_id',
            'product.category:id,name',
            'product.taxCategory:id,name,tax_percent,type',
            'unit:id,name,symbol',
            'barcodes',
        ])
            ->where('status', true)
            ->get()
            ->map(fn ($variant) => [
                'id'                => $variant->id,
                'name'              => ($variant->product?->name ?? 'N/A') . ' - ' . ($variant->variant_name ?? 'N/A'),
                'sku'               => $variant->sku ?? null,
                'unit'              => $variant->unit?->symbol ?? null,
                'mrp'               => $variant->mrp ?? 0,
                'min_selling_price' => $variant->min_selling_price ?? 0,
                'selling_price'     => $variant->selling_price ?? 0,
                'cost_price'        => $variant->cost_price ?? 0,
                'tax_id'            => $variant->product?->tax_category_id ?? null,
                'barcode'           => $variant->barcodes?->first()?->barcode ?? null,
            ]);
    }

    /**
     * Update stock when a purchase is confirmed.
     */
    private function updateStock(PurchaseItem $purchaseItem, int $warehouseId, int $quantity): void
    {
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

    /**
     * Upload invoice image and return its stored path, or null on failure.
     */
    private function uploadImage(UploadedFile $file, string $slug): ?string
    {
        try {
            $fileName = $slug . '-' . Str::random(6) . '.' . $file->getClientOriginalExtension();
            return $file->storeAs('Invoice', $fileName, self::IMAGE_DISK);
        } catch (\Throwable $e) {
            Log::error('Invoice image upload failed', ['error' => $e->getMessage()]);
            return null;
        }
    }
}
