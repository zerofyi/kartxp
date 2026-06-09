<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\ProductVariant;
use App\Models\StockBatch;
use App\Models\StockLedger;
use App\Models\StockSnapshot;
use App\Models\Warehouse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Log;

class SalesController extends Controller
{
    public function index()
    {
        // Get user's warehouse (assuming one warehouse per user)
        $userWarehouse = Warehouse::where('user_id', Auth::id())->first();

        if (!$userWarehouse) {
            return redirect()->back()->withErrors(['error' => 'No warehouse assigned to your account.']);
        }

        // Get all active product variants with stock from user's warehouse
        $products = ProductVariant::with([
            'product:id,name,category_id,tax_category_id',
            'product.category:id,name',
            'product.taxCategory:id,name,tax_percent,type',
            'unit:id,symbol',
            'barcodes',
            'stockSnapshots' => function($query) use ($userWarehouse) {
                $query->where('warehouse_id', $userWarehouse->id);
            }
        ])
            ->where('status', true)
            ->get()
            ->map(function ($variant) {
                $snapshot = $variant->stockSnapshots->first();
                $totalAvailable = $snapshot ? $snapshot->available_quantity : 0;
                $primaryBarcode = $variant->barcodes->where('is_primary', true)->first();

                return [
                    'id' => $variant->id,
                    'name' => $variant->product->name . ' - ' . $variant->variant_name,
                    'selling_price' => (float) $variant->selling_price,
                    'min_selling_price' => (float) $variant->min_selling_price,
                    'qty' => $totalAvailable,
                    'img' => '',
                    'category' => strtolower(str_replace(' ', '', $variant->product->category->name)),
                    'barcode' => $primaryBarcode ? $primaryBarcode->barcode : $variant->sku,
                    'sku' => $variant->sku,
                    'mrp' => (float) $variant->mrp,
                    'cost_price' => (float) $variant->cost_price,
                    'tax_category_id' => $variant->product->tax_category_id,
                    'tax_percent' => (float) $variant->product->taxCategory->tax_percent,
                    'tax_type' => $variant->product->taxCategory->type, // 'inclusive' or 'exclusive'
                ];
            });

        // Get categories
        $categories = Category::where('status', true)
            ->orderBy('sort_order')
            ->get(['id', 'name'])
            ->map(function ($cat) {
                return [
                    'id' => strtolower(str_replace(' ', '', $cat->name)),
                    'name' => $cat->name,
                    'icon' => '📦',
                ];
            });

        // Add "All" category at the beginning
        $categories->prepend([
            'id' => 'all',
            'name' => 'All',
            'icon' => '📦',
        ]);

        // Get customers
        $customers = Customer::orderBy('name')->get(['id', 'name', 'phone', 'credit_limit']);

        return Inertia::render('Warehouse/Pos', [
            'products' => $products->values(),
            'categories' => $categories->values(),
            'warehouse' => $userWarehouse,
            'customers' => $customers,
        ]);
    }

    /**
     * Store a new sale
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => 'nullable|exists:customers,id',
            'customer_name' => 'nullable|string|max:255',
            'customer_mobile' => 'nullable|string|max:20',
            'order_channel' => 'required|in:pos,online,manual',
            'warehouse_id' => 'required|exists:warehouses,id',
            'payment_method' => 'required|in:cash,upi,card,bank',
            'sale_type' => 'required|in:retail,wholesale',
            'items' => 'required|array|min:1',
            'items.*.product_variant_id' => 'required|exists:product_variants,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price' => 'required|numeric|min:0',
            'items.*.discount' => 'nullable|numeric|min:0',
            'items.*.tax_percent' => 'required|numeric|min:0',
            'items.*.tax_type' => 'required|in:inclusive,exclusive',
            'overall_discount' => 'nullable|numeric|min:0',
            'discount_type' => 'required|in:percentage,amount',
        ]);

        // Verify warehouse belongs to user
        $warehouse = Warehouse::where('id', $validated['warehouse_id'])
            ->where('user_id', Auth::id())
            ->first();

        if (!$warehouse) {
            return redirect()->back()->withErrors(['error' => 'Invalid warehouse selected.']);
        }

        DB::beginTransaction();
        try {
            // Create or get customer
            $customerId = $validated['customer_id'];
            if (!$customerId && $validated['customer_mobile']) {
                $customer = Customer::firstOrCreate(
                    ['phone' => $validated['customer_mobile']],
                    [
                        'name' => $validated['customer_name'] ?? 'Walk-in Customer',
                        'credit_limit' => 0,
                    ]
                );
                $customerId = $customer->id;
            }

            // Calculate totals with proper tax handling
            $subtotal = 0;
            $totalTaxAmount = 0;
            $totalDiscount = 0;
            $itemsBeforeTax = 0;

            foreach ($validated['items'] as $item) {
                $itemPrice = $item['price'];
                $itemQty = $item['quantity'];
                $itemDiscount = $item['discount'] ?? 0;
                $taxPercent = $item['tax_percent'];
                $taxType = $item['tax_type'];

                if ($taxType === 'inclusive') {
                    // Tax is already included in price
                    // Extract base price: base = price / (1 + tax/100)
                    $basePrice = $itemPrice / (1 + ($taxPercent / 100));
                    $taxAmount = $itemPrice - $basePrice;

                    $itemSubtotal = $itemPrice * $itemQty;
                    $itemTotalTax = $taxAmount * $itemQty;
                    $itemBaseTotal = $basePrice * $itemQty;

                    // Discount is applied on total (including tax)
                    $itemSubtotal -= $itemDiscount;

                    // Recalculate tax after discount
                    $discountedBase = $itemSubtotal / (1 + ($taxPercent / 100));
                    $itemTotalTax = $itemSubtotal - $discountedBase;

                    $itemsBeforeTax += $discountedBase;
                    $totalTaxAmount += $itemTotalTax;
                    $subtotal += $itemSubtotal;
                } else {
                    // Tax is exclusive - added on top of price
                    $itemBaseTotal = $itemPrice * $itemQty;
                    $itemBaseTotal -= $itemDiscount; // Apply discount first

                    $itemTotalTax = ($itemBaseTotal * $taxPercent) / 100;
                    $itemSubtotal = $itemBaseTotal + $itemTotalTax;

                    $itemsBeforeTax += $itemBaseTotal;
                    $totalTaxAmount += $itemTotalTax;
                    $subtotal += $itemSubtotal;
                }

                $totalDiscount += $itemDiscount;
            }

            // Apply overall discount
            $overallDiscountAmount = 0;
            if ($validated['overall_discount'] > 0) {
                if ($validated['discount_type'] === 'percentage') {
                    $overallDiscountAmount = ($itemsBeforeTax * $validated['overall_discount']) / 100;
                } else {
                    $overallDiscountAmount = $validated['overall_discount'];
                }

                // Recalculate totals after overall discount
                $itemsBeforeTax -= $overallDiscountAmount;
                $totalDiscount += $overallDiscountAmount;

                // Recalculate tax proportionally
                $taxRatio = $itemsBeforeTax / ($itemsBeforeTax + $overallDiscountAmount);
                $totalTaxAmount = $totalTaxAmount * $taxRatio;

                $subtotal = $itemsBeforeTax + $totalTaxAmount;
            }

            $totalAmount = $subtotal;

            // Generate order number
            $orderNumber = 'ORD-' . date('Ymd') . '-' . str_pad(
                Order::whereDate('created_at', today())->count() + 1,
                4,
                '0',
                STR_PAD_LEFT
            );

            // Create order
            $order = Order::create([
                'order_number' => $orderNumber,
                'order_channel' => $validated['order_channel'],
                'customer_id' => $customerId,
                'status' => 'completed',
                'subtotal' => $itemsBeforeTax,
                'tax_amount' => $totalTaxAmount,
                'discount_amount' => $totalDiscount,
                'total_amount' => $totalAmount,
                'created_by' => Auth::id(),
            ]);

            // Create order items and update stock
            foreach ($validated['items'] as $itemData) {
                // Verify stock availability
                $snapshot = StockSnapshot::where('product_variant_id', $itemData['product_variant_id'])
                    ->where('warehouse_id', $validated['warehouse_id'])
                    ->first();

                if (!$snapshot || $snapshot->available_quantity < $itemData['quantity']) {
                    throw new \Exception('Insufficient stock for product variant ID: ' . $itemData['product_variant_id']);
                }

                // Create order item
                $order->items()->create([
                    'product_variant_id' => $itemData['product_variant_id'],
                    'quantity' => $itemData['quantity'],
                    'price' => $itemData['price'],
                    'discount' => $itemData['discount'] ?? 0,
                    'tax_percent' => $itemData['tax_percent'],
                ]);

                // Update stock using FIFO
                $this->updateStockOnSale(
                    $itemData['product_variant_id'],
                    $validated['warehouse_id'],
                    $itemData['quantity'],
                    $order->id,
                    $order->order_number
                );
            }

            // Create payment record
            Payment::create([
                'order_id' => $order->id,
                'customer_id' => $customerId,
                'amount' => $totalAmount,
                'method' => $validated['payment_method'],
                'type' => 'receipt',
                'reference_no' => 'PAY-' . $order->order_number,
            ]);

            DB::commit();

            // Load order with relationships for invoice
            $order->load([
                'customer',
                'items.productVariant.product',
                'items.productVariant.unit',
                'payments',
                'createdBy'
            ]);

            return redirect()->back()->with('success', [
                'message' => 'Sale completed successfully!',
                'order_number' => $orderNumber,
                'total_amount' => number_format($totalAmount, 2),
                'order' => $order,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Sale Error: ' . $e->getMessage());
            return redirect()->back()->withErrors(['error' => 'Failed to process sale: ' . $e->getMessage()]);
        }
    }

    private function updateStockOnSale(int $productVariantId, int $warehouseId, int $quantity, int $orderId, string $orderNumber): void
    {
        Log::info("Updating stock for product_variant_id: $productVariantId, warehouse_id: $warehouseId, quantity: $quantity");
        // Get stock snapshot
        $snapshot = StockSnapshot::where('product_variant_id', $productVariantId)
            ->where('warehouse_id', $warehouseId)
            ->lockForUpdate()
            ->first();

        if (!$snapshot || $snapshot->available_quantity < $quantity) {
            throw new \Exception('Insufficient stock for product variant ID: ' . $productVariantId);
        }

        // Get batches for FIFO (First In, First Out)
        $batches = StockBatch::where('product_variant_id', $productVariantId)
            ->where('warehouse_id', $warehouseId)
            ->where('available_quantity', '>', 0)
            ->orderByRaw('CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END')
            ->orderBy('expiry_date', 'asc')
            ->orderBy('created_at', 'asc')
            ->lockForUpdate()
            ->get();

        $remainingQty = $quantity;

        foreach ($batches as $batch) {
            if ($remainingQty <= 0) break;

            $qtyToDeduct = min($batch->available_quantity, $remainingQty);

            Log::info('Hello');
            // Update batch quantity
            $batch->decrement('available_quantity', $qtyToDeduct);

            // Create stock ledger entry
            StockLedger::create([
                'product_variant_id' => $productVariantId,
                'warehouse_id' => $warehouseId,
                'batch_id' => $batch->id,
                'movement_type' => 'OUT',
                'quantity' => $qtyToDeduct,
                'source_type' => Order::class,
                'source_id' => $orderId,
                'remarks' => "Sale order #" . $orderNumber,
            ]);

            $remainingQty -= $qtyToDeduct;
        }
        Log::info('Remaining Qty after batch deduction: ' . $remainingQty);

        if ($remainingQty > 0) {
            throw new \Exception('Unable to allocate stock from batches for product variant ID: ' . $productVariantId);
        }

        // Update stock snapshot
        $snapshot->decrement('available_quantity', $quantity);
    }

    /**
     * Display list of all sales
     */
    public function list()
    {
        $sales = Order::with([
            'customer:id,name,phone',
            'items.productVariant.product:id,name',
            'items.productVariant.unit:id,symbol',
            'payments',
            'createdBy:id,name'
        ])
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        return Inertia::render('Warehouse/SalesList', [
            'sales' => $sales,
        ]);
    }

    /**
     * Display the specified sale
     */
    public function show($id)
    {
        $sale = Order::with([
            'customer',
            'items.productVariant.product',
            'items.productVariant.unit',
            'payments',
            'createdBy'
        ])->findOrFail($id);

        return Inertia::render('Warehouse/SaleDetails', [
            'sale' => $sale,
        ]);
    }

    // /**
    //  * Show the form for editing the specified sale
    //  */
    // public function edit($id)
    // {
    //     $sale = Order::with([
    //         'customer',
    //         'items.productVariant',
    //     ])->findOrFail($id);

    //     // Only allow editing if order is not completed
    //     if ($sale->status === 'completed') {
    //         return redirect()->back()->withErrors(['error' => 'Cannot edit completed orders.']);
    //     }

    //     $products = ProductVariant::with(['product', 'unit', 'barcodes', 'stockSnapshots'])
    //         ->where('status', true)
    //         ->get();

    //     $warehouses = Warehouse::all();
    //     $customers = Customer::all();

    //     return Inertia::render('SalesEdit', [
    //         'sale' => $sale,
    //         'products' => $products,
    //         'warehouses' => $warehouses,
    //         'customers' => $customers,
    //     ]);
    // }

    // /**
    //  * Update the specified sale
    //  */
    // public function update(Request $request, $id)
    // {
    //     $sale = Order::findOrFail($id);

    //     if ($sale->status === 'completed') {
    //         return redirect()->back()->withErrors(['error' => 'Cannot update completed orders.']);
    //     }

    //     $validated = $request->validate([
    //         'customer_id' => 'nullable|exists:customers,id',
    //         'status' => 'required|in:pending,processing,completed,cancelled',
    //         'items' => 'required|array|min:1',
    //         'items.*.product_variant_id' => 'required|exists:product_variants,id',
    //         'items.*.quantity' => 'required|integer|min:1',
    //         'items.*.price' => 'required|numeric|min:0',
    //         'items.*.discount' => 'nullable|numeric|min:0',
    //     ]);

    //     DB::beginTransaction();
    //     try {
    //         // Recalculate totals
    //         $subtotal = 0;
    //         $totalTax = 0;
    //         $totalDiscount = 0;

    //         foreach ($validated['items'] as $item) {
    //             $itemSubtotal = $item['quantity'] * $item['price'];
    //             $itemDiscount = $item['discount'] ?? 0;
    //             $itemTax = (($itemSubtotal - $itemDiscount) * 5) / 100; // 5% tax

    //             $subtotal += $itemSubtotal;
    //             $totalDiscount += $itemDiscount;
    //             $totalTax += $itemTax;
    //         }

    //         $totalAmount = $subtotal - $totalDiscount + $totalTax;

    //         // Update order
    //         $sale->update([
    //             'customer_id' => $validated['customer_id'],
    //             'status' => $validated['status'],
    //             'subtotal' => $subtotal,
    //             'tax_amount' => $totalTax,
    //             'discount_amount' => $totalDiscount,
    //             'total_amount' => $totalAmount,
    //         ]);

    //         // Delete old items
    //         $sale->items()->delete();

    //         // Create new items
    //         foreach ($validated['items'] as $itemData) {
    //             $sale->items()->create([
    //                 'product_variant_id' => $itemData['product_variant_id'],
    //                 'quantity' => $itemData['quantity'],
    //                 'price' => $itemData['price'],
    //                 'discount' => $itemData['discount'] ?? 0,
    //                 'tax_percent' => 5,
    //             ]);
    //         }

    //         DB::commit();
    //         return redirect()->route('sales.index')->with('success', 'Sale updated successfully.');
    //     } catch (\Exception $e) {
    //         DB::rollBack();
    //         return redirect()->back()->withErrors(['error' => 'Failed to update sale: ' . $e->getMessage()]);
    //     }
    // }

    /**
     * Print sale invoice
     */
    public function print($id)
    {
        $order = Order::with([
            'customer',
            'items.productVariant.product.taxCategory',
            'items.productVariant.unit',
            'payments',
            'createdBy'
        ])->findOrFail($id);

        return Inertia::render('Warehouse/Invoice', [
            'order' => $order,
        ]);
    }

}
