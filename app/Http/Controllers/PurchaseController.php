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
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Log;

class PurchaseController extends Controller
{
    /**
     * Display a listing of the resource - Purchase List Page
     */
    public function index()
    {
        $purchases = Purchase::with([
            'vendor:id,name,phone',
            'items.productVariant.product:id,name',
            'items.productVariant.unit:id,symbol',
            'items.taxCategory:id,name,tax_percent,type',
            'createdBy:id,name'
        ])
            ->latest()
            ->get();

        $warehouses = Warehouse::where('user_id', Auth::id())->orderBy('name')->get(['id', 'name', 'location']);

        return Inertia::render('warehouse/PurchaseList', [
            'purchases' => $purchases,
            'warehouses' => $warehouses,
        ]);
    }

    /**
     * Show the form for creating a new resource - Add Purchase Page
     */
    public function create()
    {
        $vendors = Vendor::where('user_id', Auth::id())->get();
        $warehouses = Warehouse::where('user_id', Auth::id())->get();
        $taxCategories = TaxCategory::all(['id', 'name', 'tax_percent', 'type']);

        $products = ProductVariant::with([
            'product:id,name,category_id,tax_category_id',
            'product.category:id,name',
            'product.taxCategory:id,name,tax_percent,type',
            'unit:id,name,symbol',
            'barcodes'
        ])
            ->where('status', true)
            ->get()
            ->map(function ($variant) {
                return [
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
                ];
            });

        return Inertia::render('warehouse/AddPurchase', [
            'vendors' => $vendors,
            'warehouses' => $warehouses,
            'products' => $products,
            'taxCategories' => $taxCategories,
        ]);
    }

    /**
     * Store a newly created resource in storage
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'vendor_id' => 'required|exists:vendors,id',
            'invoice_no' => 'required|string|unique:purchases,invoice_no',
            'purchase_date' => 'required|date',
            'warehouse_id' => 'required|exists:warehouses,id',
            'invoice_image' => 'nullable|image|max:5120', // 5MB
            'items' => 'required|array|min:1',
            'items.*.product_variant_id' => 'required|exists:product_variants,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.cost_price' => 'required|numeric|min:0',
            'items.*.min_selling_price' => 'required|numeric|min:0',
            'items.*.selling_price' => 'required|numeric|min:0',
            'items.*.mrp' => 'required|numeric|min:0',
            'items.*.tax_id' => 'required|exists:tax_categories,id',
            'items.*.batch_no' => 'required|string',
            'items.*.expiry_date' => 'nullable|date|after:today',
            'status' => 'required|in:draft,confirmed',
        ]);

        DB::beginTransaction();
        try {
            // Calculate totals
            $subtotal = 0;
            $taxAmount = 0;

            foreach ($validated['items'] as $item) {
                $taxCategory = TaxCategory::find($item['tax_id']);

                if ($taxCategory->type === 'inclusive') {
                    // For inclusive tax: cost_price already includes tax
                    // Base amount = cost_price / (1 + tax_percent/100)
                    $baseAmount = ($item['cost_price'] * $item['quantity']) / (1 + ($taxCategory->tax_percent / 100));
                    $itemTax = ($item['cost_price'] * $item['quantity']) - $baseAmount;

                    $subtotal += $baseAmount;
                    $taxAmount += $itemTax;
                } else {
                    // For exclusive tax: tax is added on top
                    $itemTotal = $item['quantity'] * $item['cost_price'];
                    $itemTax = ($itemTotal * $taxCategory->tax_percent) / 100;

                    $subtotal += $itemTotal;
                    $taxAmount += $itemTax;
                }
            }

            $totalAmount = $subtotal + $taxAmount;

            // Handle invoice image upload
            $imagePath = null;
            if ($request->hasFile('invoice_image')) {
                $imagePath = $this->uploadImage($request->file('invoice_image'), $validated['invoice_no']);
            }

            // Create purchase
            $purchase = Purchase::create([
                'vendor_id' => $validated['vendor_id'],
                'invoice_no' => $validated['invoice_no'],
                'image_path' => $imagePath,
                'purchase_date' => $validated['purchase_date'],
                'subtotal' => $subtotal,
                'tax_amount' => $taxAmount,
                'total_amount' => $totalAmount,
                'status' => $validated['status'],
                'created_by' => Auth::id(),
            ]);

            // Create purchase items and handle stock if confirmed
            foreach ($validated['items'] as $itemData) {
                $purchaseItem = $purchase->items()->create([
                    'product_variant_id' => $itemData['product_variant_id'],
                    'quantity' => $itemData['quantity'],
                    'cost_price' => $itemData['cost_price'],
                    'min_selling_price' => $itemData['min_selling_price'],
                    'selling_price' => $itemData['selling_price'],
                    'mrp' => $itemData['mrp'],
                    'tax_id' => $itemData['tax_id'],
                    'batch_no' => $itemData['batch_no'],
                    'expiry_date' => $itemData['expiry_date'] ?? null,
                ]);

                // If purchase is confirmed, update stock
                if ($validated['status'] === 'confirmed') {
                    $this->updateStock(
                        $purchaseItem,
                        $validated['warehouse_id'],
                        $itemData['quantity']
                    );
                }
            }

            DB::commit();
            return redirect()->route('purchases.index')->with('success', 'Purchase created successfully.');
        } catch (\Exception $e) {
            DB::rollBack();

            // Delete uploaded image if transaction fails
            if (isset($imagePath)) {
                Storage::disk('public_html')->delete($imagePath);
            }
            Log::error('E'. $e->getMessage());
            return redirect()->back()->withErrors(['error' => 'Failed to create purchase: ' . $e->getMessage()]);
        }
    }

    /**
     * Display the specified resource - View Purchase Details Page
     */
    public function show(Purchase $purchase)
    {
        $purchase->load([
            'vendor',
            'items.productVariant.product',
            'items.productVariant.unit',
            'items.taxCategory',
            'items.stockBatches.warehouse',
            'createdBy'
        ]);

        return Inertia::render('warehouse/ViewPurchase', [
            'purchase' => $purchase,
        ]);
    }

    /**
     * Show the form for editing the specified resource - Edit Purchase Page
     */
    public function edit(Purchase $purchase)
    {
        $purchase->load([
            'vendor',
            'items.productVariant.product',
            'items.taxCategory'
        ]);

        $vendors = Vendor::where('user_id', Auth::id())->get();
        $warehouses = Warehouse::where('user_id', Auth::id())->get();
        $taxCategories = TaxCategory::all(['id', 'name', 'tax_percent', 'type']);

        $products = ProductVariant::with([
            'product:id,name,category_id,tax_category_id',
            'product.category:id,name',
            'product.taxCategory:id,name,tax_percent,type',
            'unit:id,name,symbol',
            'barcodes'
        ])
            ->where('status', true)
            ->get()
            ->map(function ($variant) {
                return [
                    'id' => $variant->id,
                    'name' => $variant->product->name . ' - ' . $variant->variant_name,
                    'sku' => $variant->sku,
                    'unit' => $variant->unit->symbol,
                    'mrp' => $variant->mrp,
                    'min_selling_price' => $variant->min_selling_price,
                    'selling_price' => $variant->selling_price,
                    'cost_price' => $variant->cost_price,
                    'tax_id' => $variant->product->tax_category_id,
                    'barcode' => $variant->barcodes->first()?->barcode,
                ];
            });

        return Inertia::render('warehouse/EditPurchase', [
            'purchase' => $purchase,
            'vendors' => $vendors,
            'warehouses' => $warehouses,
            'products' => $products,
            'taxCategories' => $taxCategories,
        ]);
    }

    /**
     * Update the specified resource in storage
     */
    public function update(Request $request, Purchase $purchase)
    {
        // Only allow updating draft purchases
        if ($purchase->status === 'confirmed') {
            return redirect()->back()->withErrors(['error' => 'Cannot edit confirmed purchase.']);
        }

        $validated = $request->validate([
            'vendor_id' => 'required|exists:vendors,id',
            'invoice_no' => 'required|string|unique:purchases,invoice_no,' . $purchase->id,
            'purchase_date' => 'required|date',
            'warehouse_id' => 'required|exists:warehouses,id',
            'invoice_image' => 'nullable|image|max:5120',
            'items' => 'required|array|min:1',
            'items.*.id' => 'nullable|exists:purchase_items,id',
            'items.*.product_variant_id' => 'required|exists:product_variants,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.cost_price' => 'required|numeric|min:0',
            'items.*.min_selling_price' => 'required|numeric|min:0',
            'items.*.selling_price' => 'required|numeric|min:0',
            'items.*.mrp' => 'required|numeric|min:0',
            'items.*.tax_id' => 'required|exists:tax_categories,id',
            'items.*.batch_no' => 'required|string',
            'items.*.expiry_date' => 'nullable|date|after:today',
            'status' => 'required|in:draft,confirmed',
        ]);

        DB::beginTransaction();
        try {
            // Calculate totals
            $subtotal = 0;
            $taxAmount = 0;

            foreach ($validated['items'] as $item) {
                $taxCategory = TaxCategory::find($item['tax_id']);

                if ($taxCategory->type === 'inclusive') {
                    // For inclusive tax: cost_price already includes tax
                    $baseAmount = ($item['cost_price'] * $item['quantity']) / (1 + ($taxCategory->tax_percent / 100));
                    $itemTax = ($item['cost_price'] * $item['quantity']) - $baseAmount;

                    $subtotal += $baseAmount;
                    $taxAmount += $itemTax;
                } else {
                    // For exclusive tax: tax is added on top
                    $itemTotal = $item['quantity'] * $item['cost_price'];
                    $itemTax = ($itemTotal * $taxCategory->tax_percent) / 100;

                    $subtotal += $itemTotal;
                    $taxAmount += $itemTax;
                }
            }

            $totalAmount = $subtotal + $taxAmount;

            // Handle invoice image upload
            $imagePath = $purchase->image_path;
            if ($request->hasFile('invoice_image')) {
                // Delete old image
                if ($imagePath) {
                    Storage::disk('public_html')->delete($imagePath);
                }
                $imagePath = $this->uploadImage($request->file('invoice_image'), $validated['invoice_no']);
            }

            // Update purchase
            $purchase->update([
                'vendor_id' => $validated['vendor_id'],
                'invoice_no' => $validated['invoice_no'],
                'image_path' => $imagePath,
                'purchase_date' => $validated['purchase_date'],
                'subtotal' => $subtotal,
                'tax_amount' => $taxAmount,
                'total_amount' => $totalAmount,
                'status' => $validated['status'],
            ]);

            // Track existing items
            $existingItemIds = $purchase->items()->pluck('id')->toArray();
            $updatedItemIds = [];

            // Update or create items
            foreach ($validated['items'] as $itemData) {
                if (!empty($itemData['id'])) {
                    // Update existing item
                    $item = PurchaseItem::find($itemData['id']);
                    $item->update([
                        'product_variant_id' => $itemData['product_variant_id'],
                        'quantity' => $itemData['quantity'],
                        'cost_price' => $itemData['cost_price'],
                        'min_selling_price' => $itemData['min_selling_price'],
                        'selling_price' => $itemData['selling_price'],
                        'mrp' => $itemData['mrp'],
                        'tax_id' => $itemData['tax_id'],
                        'batch_no' => $itemData['batch_no'],
                        'expiry_date' => $itemData['expiry_date'] ?? null,
                    ]);
                    $updatedItemIds[] = $item->id;
                } else {
                    // Create new item
                    $item = $purchase->items()->create([
                        'product_variant_id' => $itemData['product_variant_id'],
                        'quantity' => $itemData['quantity'],
                        'cost_price' => $itemData['cost_price'],
                        'min_selling_price' => $itemData['min_selling_price'],
                        'selling_price' => $itemData['selling_price'],
                        'mrp' => $itemData['mrp'],
                        'tax_id' => $itemData['tax_id'],
                        'batch_no' => $itemData['batch_no'],
                        'expiry_date' => $itemData['expiry_date'] ?? null,
                    ]);
                    $updatedItemIds[] = $item->id;
                }

                // If status changed to confirmed, update stock
                if ($validated['status'] === 'confirmed' && $purchase->status === 'draft') {
                    $this->updateStock($item, $validated['warehouse_id'], $itemData['quantity']);
                }
            }

            // Delete removed items
            $itemsToDelete = array_diff($existingItemIds, $updatedItemIds);
            if (!empty($itemsToDelete)) {
                PurchaseItem::whereIn('id', $itemsToDelete)->delete();
            }

            DB::commit();
            return redirect()->route('purchases.index')->with('success', 'Purchase updated successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->withErrors(['error' => 'Failed to update purchase: ' . $e->getMessage()]);
        }
    }

    /**
     * Confirm a purchase and update stock
     */
    public function confirm(Request $request, Purchase $purchase)
    {
        if ($purchase->status === 'confirmed') {
            return redirect()->back()->withErrors(['error' => 'Purchase is already confirmed.']);
        }

        $validated = $request->validate([
            'warehouse_id' => 'required|exists:warehouses,id',
        ]);

        DB::beginTransaction();
        try {
            Log::info('XX'. $purchase->id);
            // Update stock for all items
            foreach ($purchase->items as $item) {
                $this->updateStock($item, $validated['warehouse_id'], $item->quantity);
            }

            // Update purchase status
            $purchase->update(['status' => 'confirmed']);

            DB::commit();
            return redirect()->back()->with('success', 'Purchase confirmed successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('E'. $e->getMessage());
            return redirect()->back()->withErrors(['error' => 'Failed to confirm purchase: ' . $e->getMessage()]);
        }
    }

    /**
     * Remove the specified resource from storage
     */
    public function destroy(Purchase $purchase)
    {
        if ($purchase->status === 'confirmed') {
            return redirect()->back()->withErrors(['error' => 'Cannot delete confirmed purchase.']);
        }

        DB::beginTransaction();
        try {
            // Delete invoice image if exists
            if ($purchase->image_path) {
                Storage::disk('public')->delete($purchase->image_path);
            }

            $purchase->delete();

            DB::commit();
            return redirect()->back()->with('success', 'Purchase deleted successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->withErrors(['error' => 'Failed to delete purchase: ' . $e->getMessage()]);
        }
    }

    /**
     * Display purchase reports page
     */
    public function report()
    {
        $purchases = Purchase::with([
            'vendor:id,name,phone',
            'items.taxCategory:id,name,tax_percent,type'
        ])
            ->latest()
            ->get()
            ->map(function ($purchase) {
                return [
                    'id' => $purchase->id,
                    'vendor_id' => $purchase->vendor_id,
                    'vendor' => $purchase->vendor,
                    'invoice_no' => $purchase->invoice_no,
                    'purchase_date' => $purchase->purchase_date,
                    'subtotal' => $purchase->subtotal,
                    'tax_amount' => $purchase->tax_amount,
                    'total_amount' => $purchase->total_amount,
                    'status' => $purchase->status,
                    'items_count' => $purchase->items->count(),
                ];
            });

        $vendors = Vendor::where('user_id', Auth::id())->orderBy('name')->get(['id', 'name', 'phone']);

        return Inertia::render('warehouse/PurchaseReport', [
            'purchases' => $purchases,
            'vendors' => $vendors,
        ]);
    }

    /**
     * Update stock when purchase is confirmed
     */
    private function updateStock(PurchaseItem $purchaseItem, int $warehouseId, int $quantity): void
    {
        // Create stock batch
        $stockBatch = StockBatch::create([
            'product_variant_id' => $purchaseItem->product_variant_id,
            'warehouse_id' => $warehouseId,
            'batch_no' => $purchaseItem->batch_no,
            'expiry_date' => $purchaseItem->expiry_date,
            'purchase_item_id' => $purchaseItem->id,
            'received_quantity' => $quantity,
            'available_quantity' => $quantity,
        ]);

        // Create stock ledger entry
        StockLedger::create([
            'product_variant_id' => $purchaseItem->product_variant_id,
            'warehouse_id' => $warehouseId,
            'batch_id' => $stockBatch->id,
            'movement_type' => 'IN',
            'quantity' => $quantity,
            'source_type' => Purchase::class,
            'source_id' => $purchaseItem->purchase_id,
            'remarks' => "Purchase from invoice #{$purchaseItem->purchase->invoice_no}",
        ]);

        // Update stock snapshot
        $snapshot = StockSnapshot::firstOrCreate(
            [
                'product_variant_id' => $purchaseItem->product_variant_id,
                'warehouse_id' => $warehouseId,
            ],
            [
                'available_quantity' => 0,
                'reserved_quantity' => 0,
            ]
        );

        $snapshot->increment('available_quantity', $quantity);

        // Update product variant prices if needed
        $variant = ProductVariant::find($purchaseItem->product_variant_id);
        $variant->update([
            'cost_price' => $purchaseItem->cost_price,
            'min_selling_price' => $purchaseItem->min_selling_price,
            'selling_price' => $purchaseItem->selling_price,
            'mrp' => $purchaseItem->mrp,
        ]);
    }

    protected function uploadImage($file, $slug)
    {
        try {
            $extension = $file->getClientOriginalExtension();
            $randomString = Str::random(6);
            $fileName = $slug . '-' . $randomString . '.' . $extension;

            return $file->storeAs('Invoice', $fileName, 'public_html');

        } catch (\Exception $e) {
            logger()->error('Invoice image upload failed: ' . $e->getMessage());
            return false;
        }
    }
}
