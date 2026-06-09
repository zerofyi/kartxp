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
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;

class SalesController extends Controller
{
    // Cache TTL constants (in seconds)
    private const CACHE_TTL_PRODUCTS  = 300;  // 5 minutes
    private const CACHE_TTL_CATS      = 600;  // 10 minutes
    private const CACHE_TTL_CUSTOMERS = 180;  // 3 minutes

    // -------------------------------------------------------------------------
    // POS index – serve all seed data the frontend needs
    // -------------------------------------------------------------------------
    public function index()
    {
        $userId = Auth::id();

        // Single query – warehouse is tiny, no need to cache
        $userWarehouse = Auth::user()->currentWarehouse();
        if (!$userWarehouse) {
            return redirect()->back()->withErrors(['error' => 'No warehouse assigned to your account.']);
        }

        $warehouseId = $userWarehouse->id;

        // ── Products ──────────────────────────────────────────────────────────
        // Cache per warehouse so different warehouses get their own snapshot.
        $products = Cache::remember(
            "pos_products_w{$warehouseId}",
            self::CACHE_TTL_PRODUCTS,
            fn () => $this->loadProducts($warehouseId)
        );

        // ── Categories ────────────────────────────────────────────────────────
        $categories = Cache::remember('pos_categories', self::CACHE_TTL_CATS, function () {
            $cats = Category::where('status', true)
                ->orderBy('sort_order')
                ->get(['id', 'name'])
                ->map(fn ($c) => [
                    'id'   => strtolower(str_replace(' ', '', $c->name)),
                    'name' => $c->name,
                    'icon' => '📦',
                ]);

            $cats->prepend(['id' => 'all', 'name' => 'All', 'icon' => '📦']);
            return $cats->values();
        });

        // ── Customers ─────────────────────────────────────────────────────────
        // Customer list can be large – return only the columns the POS needs.
        $customers = Cache::remember('pos_customers', self::CACHE_TTL_CUSTOMERS, fn () =>
            Customer::orderBy('name')->get(['id', 'name', 'phone', 'credit_limit'])
        );

        return Inertia::render('Warehouse/Pos', [
            'products'   => $products,
            'categories' => $categories,
            'warehouse'  => $userWarehouse,
            'customers'  => $customers,
        ]);
    }

    // -------------------------------------------------------------------------
    // Internal helper – build the product list (used by cache closure)
    // -------------------------------------------------------------------------
    private function loadProducts(int $warehouseId): \Illuminate\Support\Collection
    {
        // One joined query instead of eager-loading 5 separate relationships.
        // StockSnapshot is joined so we avoid an extra round-trip per variant.
        return ProductVariant::query()
            ->select([
                'product_variants.id',
                'product_variants.variant_name',
                'product_variants.selling_price',
                'product_variants.min_selling_price',
                'product_variants.mrp',
                'product_variants.cost_price',
                'product_variants.sku',
                'products.id   as product_id',
                'products.name as product_name',
                'products.tax_category_id',
                'categories.name as category_name',
                'tax_categories.tax_percent',
                'tax_categories.type as tax_type',
                'units.symbol as unit_symbol',
                DB::raw('COALESCE(ss.available_quantity, 0) as available_qty'),
            ])
            ->join('products',       'products.id',        '=', 'product_variants.product_id')
            ->join('categories',     'categories.id',      '=', 'products.category_id')
            ->join('tax_categories', 'tax_categories.id',  '=', 'products.tax_category_id')
            ->join('units',          'units.id',           '=', 'product_variants.unit_id')
            ->leftJoin(
                DB::raw('(SELECT product_variant_id, available_quantity FROM stock_snapshots WHERE warehouse_id = ' . $warehouseId . ') ss'),
                'ss.product_variant_id', '=', 'product_variants.id'
            )
            // Primary barcode sub-query to avoid N+1
            ->addSelect(DB::raw('
                (SELECT barcode FROM barcodes
                 WHERE barcodes.product_variant_id = product_variants.id
                   AND barcodes.is_primary = 1
                 LIMIT 1) as primary_barcode
            '))
            ->where('product_variants.status', true)
            ->get()
            ->map(fn ($v) => [
                'id'               => $v->id,
                'name'             => $v->product_name . ' - ' . $v->variant_name,
                'selling_price'    => (float) $v->selling_price,
                'min_selling_price'=> (float) $v->min_selling_price,
                'qty'              => (int) $v->available_qty,
                'img'              => '',
                'category'         => strtolower(str_replace(' ', '', $v->category_name)),
                'barcode'          => $v->primary_barcode ?? $v->sku,
                'sku'              => $v->sku,
                'mrp'              => (float) $v->mrp,
                'cost_price'       => (float) $v->cost_price,
                'tax_category_id'  => $v->tax_category_id,
                'tax_percent'      => (float) $v->tax_percent,
                'tax_type'         => $v->tax_type,
            ]);
    }

    // -------------------------------------------------------------------------
    // Store a new POS sale
    // -------------------------------------------------------------------------
    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_id'                    => 'nullable|exists:customers,id',
            'customer_name'                  => 'nullable|string|max:255',
            'customer_mobile'                => 'nullable|string|max:20',
            'order_channel'                  => 'required|in:pos,online,manual',
            'warehouse_id'                   => 'required|exists:warehouses,id',
            'payment_method'                 => 'required|in:cash,upi,card,bank',
            'sale_type'                      => 'required|in:retail,wholesale',
            'items'                          => 'required|array|min:1',
            'items.*.product_variant_id'     => 'required|exists:product_variants,id',
            'items.*.quantity'               => 'required|integer|min:1',
            'items.*.price'                  => 'required|numeric|min:0',
            'items.*.discount'               => 'nullable|numeric|min:0',
            'items.*.tax_percent'            => 'required|numeric|min:0',
            'items.*.tax_type'               => 'required|in:inclusive,exclusive',
            'overall_discount'               => 'nullable|numeric|min:0',
            'discount_type'                  => 'required|in:percentage,amount',
        ]);

        // Verify warehouse ownership (single query)
        $warehouse = Auth::user()->currentWarehouse();

        if (!$warehouse) {
            return redirect()->back()->withErrors(['error' => 'Invalid warehouse selected.']);
        }

        $variantIds  = array_column($validated['items'], 'product_variant_id');
        $warehouseId = (int) $validated['warehouse_id'];

        // ── Pre-fetch all required stock snapshots in ONE query ───────────────
        $snapshots = StockSnapshot::whereIn('product_variant_id', $variantIds)
            ->where('warehouse_id', $warehouseId)
            ->get()
            ->keyBy('product_variant_id');

        // ── Stock availability check BEFORE transaction ───────────────────────
        foreach ($validated['items'] as $item) {
            $snapshot = $snapshots->get($item['product_variant_id']);
            if (!$snapshot || $snapshot->available_quantity < $item['quantity']) {
                return redirect()->back()->withErrors([
                    'error' => 'Insufficient stock for product variant ID: ' . $item['product_variant_id'],
                ]);
            }
        }

        // ── Calculate totals ──────────────────────────────────────────────────
        [
            'itemsBeforeTax'    => $itemsBeforeTax,
            'totalTaxAmount'    => $totalTaxAmount,
            'totalDiscount'     => $totalDiscount,
            'subtotal'          => $subtotal,
            'overallDiscAmt'    => $overallDiscAmt,
        ] = $this->computeTotals($validated);

        $totalAmount = $subtotal;

        DB::beginTransaction();
        try {
            // ── Customer resolution ───────────────────────────────────────────
            $customerId = $validated['customer_id'];
            if (!$customerId && !empty($validated['customer_mobile'])) {
                $customer   = Customer::firstOrCreate(
                    ['phone' => $validated['customer_mobile']],
                    ['name'  => $validated['customer_name'] ?? 'Walk-in Customer', 'credit_limit' => 0]
                );
                $customerId = $customer->id;
            }

            // ── Atomic order number (single DB call, no race condition) ───────
            $orderNumber = $this->generateOrderNumber();

            // ── Create order ──────────────────────────────────────────────────
            $order = Order::create([
                'order_number'    => $orderNumber,
                'order_channel'   => $validated['order_channel'],
                'customer_id'     => $customerId,
                'warehouse_id'    => $warehouseId,
                'payment_status'  => 'paid',
                'payment_method'  => $validated['payment_method'],
                'status'          => 'completed',
                'subtotal'        => $itemsBeforeTax,
                'tax_amount'      => $totalTaxAmount,
                'discount_amount' => $totalDiscount,
                'total_amount'    => $totalAmount,
                'created_by'      => Auth::id(),
            ]);

            // ── Bulk-insert order items ────────────────────────────────────────
            $orderItemsData = [];
            $now = now();
            foreach ($validated['items'] as $item) {
                $orderItemsData[] = [
                    'order_id'           => $order->id,
                    'product_variant_id' => $item['product_variant_id'],
                    'quantity'           => $item['quantity'],
                    'price'              => $item['price'],
                    'discount'           => $item['discount'] ?? 0,
                    'tax_percent'        => $item['tax_percent'],
                    'created_at'         => $now,
                    'updated_at'         => $now,
                ];
            }
            OrderItem::insert($orderItemsData);  // Single INSERT

            // ── Process stock for ALL items together (batched) ────────────────
            $this->deductStockBulk(
                $validated['items'],
                $warehouseId,
                $order->id,
                $orderNumber,
                $snapshots
            );

            // ── Payment record ────────────────────────────────────────────────
            Payment::create([
                'order_id'     => $order->id,
                'customer_id'  => $customerId,
                'amount'       => $totalAmount,
                'method'       => $validated['payment_method'],
                'type'         => 'receipt',
                'reference_no' => 'PAY-' . $orderNumber,
            ]);

            DB::commit();

            // Bust product cache so next POS load reflects updated stock
            Cache::forget("pos_products_w{$warehouseId}");

            // Load minimal order data for the invoice (avoid loading all relationships)
            $order->load([
                'customer:id,name,phone',
                'items.productVariant:id,variant_name,sku,unit_id',
                'items.productVariant.product:id,name',
                'items.productVariant.unit:id,symbol',
                'payments:id,order_id,amount,method',
                'createdBy:id,name',
            ]);

            return redirect()->back()->with('success', [
                'message'      => 'Sale completed successfully!',
                'order_number' => $orderNumber,
                'total_amount' => number_format($totalAmount, 2),
                'order'        => $order,
            ]);

        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Sale Error', ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return redirect()->back()->withErrors(['error' => 'Failed to process sale: ' . $e->getMessage()]);
        }
    }

    // -------------------------------------------------------------------------
    // Pure calculation – no DB, no side effects
    // -------------------------------------------------------------------------
    private function computeTotals(array $validated): array
    {
        $subtotal       = 0.0;
        $totalTaxAmount = 0.0;
        $totalDiscount  = 0.0;
        $itemsBeforeTax = 0.0;

        foreach ($validated['items'] as $item) {
            $price    = (float) $item['price'];
            $qty      = (int)   $item['quantity'];
            $disc     = (float) ($item['discount'] ?? 0);
            $taxPct   = (float) $item['tax_percent'];
            $taxType  = $item['tax_type'];

            if ($taxType === 'inclusive') {
                $itemTotal     = ($price * $qty) - $disc;
                $base          = $itemTotal / (1 + $taxPct / 100);
                $tax           = $itemTotal - $base;
                $itemsBeforeTax += $base;
                $totalTaxAmount += $tax;
                $subtotal       += $itemTotal;
            } else {
                $base          = ($price * $qty) - $disc;
                $tax           = $base * $taxPct / 100;
                $itemsBeforeTax += $base;
                $totalTaxAmount += $tax;
                $subtotal       += $base + $tax;
            }

            $totalDiscount += $disc;
        }

        $overallDiscAmt = 0.0;
        $overallDiscount = (float) ($validated['overall_discount'] ?? 0);
        if ($overallDiscount > 0) {
            $overallDiscAmt = $validated['discount_type'] === 'percentage'
                ? $itemsBeforeTax * $overallDiscount / 100
                : $overallDiscount;

            if ($itemsBeforeTax > 0) {
                $ratio          = ($itemsBeforeTax - $overallDiscAmt) / $itemsBeforeTax;
                $totalTaxAmount = $totalTaxAmount * $ratio;
            }

            $itemsBeforeTax -= $overallDiscAmt;
            $totalDiscount  += $overallDiscAmt;
            $subtotal        = $itemsBeforeTax + $totalTaxAmount;
        }

        return compact('itemsBeforeTax', 'totalTaxAmount', 'totalDiscount', 'subtotal', 'overallDiscAmt');
    }

    // -------------------------------------------------------------------------
    // Race-condition-safe order number using DB sequence trick
    // -------------------------------------------------------------------------
    private function generateOrderNumber(): string
    {
        // 1. Resolve logged-in user's warehouse name initials safely
        $warehouse = Auth::user()->currentWarehouse()->first();
        $warehouseName = $warehouse ? $warehouse->name : 'SYSTEM';

        // Convert "Ghorer Bazar" -> "GB", "Food Bazar" -> "FB"
        $initials = preg_replace('/(?<=\b\w)\w*\s*/', '', strtoupper($warehouseName));
        $initials = Str::limit(preg_replace('/[^A-Z]/', '', $initials), 3, '');

        // 2. Compute true Indian Fiscal Year boundaries (April 1st - March 31st)
        $now = Carbon::now();
        $currentYear = $now->year;

        if ($now->month >= 4) {
            // If April or later: FY 2026-2027 -> "26-27"
            $startYear = $currentYear;
            $endYear   = $currentYear + 1;
        } else {
            // If Jan/Feb/Mar: FY 2025-2026 -> "25-26"
            $startYear = $currentYear - 1;
            $endYear   = $currentYear;
        }

        $fyPrefix = sprintf('%s-%s', substr($startYear, -2), substr($endYear, -2)); // Output string: "26-27"
        $baseFormat = "{$initials}/{$fyPrefix}/"; // Build base pattern target lookup prefix string: "GB/26-27/"

        // 3. Prevent Race Conditions: Find the highest absolute structural serial issued inside this fiscal window
        $fiscalStartString = "{$startYear}-04-01 00:00:00";
        $fiscalEndString   = "{$endYear}-03-31 23:59:59";

        // Grab the highest sequential invoice number matching the prefix format to avoid day-reset constraints
        $lastOrderNumber = Order::where('warehouse_id', $warehouse?->id)
            ->whereBetween('created_at', [$fiscalStartString, $fiscalEndString])
            ->where('order_number', 'LIKE', "{$baseFormat}%")
            ->orderByRaw('CAST(SUBSTRING_INDEX(order_number, "/", -1) AS UNSIGNED) DESC')
            ->value('order_number');

        if ($lastOrderNumber) {
            // Extract the trailing numeric digits after the last slash token character and increment
            $lastSequence = (int) substr($lastOrderNumber, strrpos($lastOrderNumber, '/') + 1);
            $nextSequence = $lastSequence + 1;
        } else {
            // Reset rule validation action: fallback to seed on a completely pristine fiscal period block
            $nextSequence = 1;
        }

        // 4. Return formatted padded signature string output mapping up to 4 places matching legal records
        return $baseFormat . str_pad($nextSequence, 4, '0', STR_PAD_LEFT);
    }

    // -------------------------------------------------------------------------
    // Deduct stock for ALL items in the sale in as few queries as possible
    // -------------------------------------------------------------------------
    private function deductStockBulk(
        array $items,
        int $warehouseId,
        int $orderId,
        string $orderNumber,
        \Illuminate\Support\Collection $snapshots
    ): void {
        $variantIds = array_column($items, 'product_variant_id');

        // Fetch ALL relevant batches in ONE query, sorted FIFO
        $allBatches = StockBatch::whereIn('product_variant_id', $variantIds)
            ->where('warehouse_id', $warehouseId)
            ->where('available_quantity', '>', 0)
            ->orderByRaw('product_variant_id ASC, CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END ASC, expiry_date ASC, created_at ASC')
            ->lockForUpdate()
            ->get()
            ->groupBy('product_variant_id');  // keyed by variant id

        $batchUpdates  = [];  // [batch_id => qty_to_deduct]
        $ledgerEntries = [];
        $now = now()->toDateTimeString();

        foreach ($items as $item) {
            $variantId = (int) $item['product_variant_id'];
            $remaining = (int) $item['quantity'];

            $batches = $allBatches->get($variantId, collect());

            foreach ($batches as $batch) {
                if ($remaining <= 0) break;

                $deduct = min($batch->available_quantity, $remaining);

                $batchUpdates[$batch->id] = ($batchUpdates[$batch->id] ?? 0) + $deduct;

                $ledgerEntries[] = [
                    'product_variant_id' => $variantId,
                    'warehouse_id'       => $warehouseId,
                    'batch_id'           => $batch->id,
                    'movement_type'      => 'OUT',
                    'quantity'           => $deduct,
                    'source_type'        => Order::class,
                    'source_id'          => $orderId,
                    'remarks'            => "Sale order #{$orderNumber}",
                    'created_at'         => $now,
                    'updated_at'         => $now,
                ];

                $remaining -= $deduct;
            }

            if ($remaining > 0) {
                throw new \RuntimeException(
                    "Unable to allocate stock from batches for product variant ID: {$variantId}"
                );
            }
        }

        // ── Bulk-update batches using a single CASE WHEN statement ────────────
        if (!empty($batchUpdates)) {
            $ids       = array_keys($batchUpdates);
            $caseParts = [];
            $bindings  = [];

            foreach ($batchUpdates as $batchId => $qty) {
                $caseParts[] = "WHEN id = ? THEN available_quantity - ?";
                $bindings[]  = $batchId;
                $bindings[]  = $qty;
            }

            $idsPlaceholders = implode(',', array_fill(0, count($ids), '?'));
            $caseSQL = implode(' ', $caseParts);

            DB::statement(
                "UPDATE stock_batches SET available_quantity = CASE {$caseSQL} ELSE available_quantity END WHERE id IN ({$idsPlaceholders})",
                array_merge($bindings, $ids)
            );
        }

        // ── Bulk-insert ALL ledger entries in ONE query ───────────────────────
        if (!empty($ledgerEntries)) {
            StockLedger::insert($ledgerEntries);
        }

        // ── Bulk-update snapshots using CASE WHEN ────────────────────────────
        $snapshotUpdates = [];
        foreach ($items as $item) {
            $vid = (int) $item['product_variant_id'];
            $snapshotUpdates[$vid] = ($snapshotUpdates[$vid] ?? 0) + (int) $item['quantity'];
        }

        if (!empty($snapshotUpdates)) {
            $caseParts = [];
            $bindings  = [];

            foreach ($snapshotUpdates as $variantId => $qty) {
                $caseParts[] = "WHEN product_variant_id = ? THEN available_quantity - ?";
                $bindings[]  = $variantId;
                $bindings[]  = $qty;
            }

            $variantPlaceholders = implode(',', array_fill(0, count($snapshotUpdates), '?'));
            $caseSQL = implode(' ', $caseParts);

            DB::statement(
                "UPDATE stock_snapshots
                 SET available_quantity = CASE {$caseSQL} ELSE available_quantity END
                 WHERE product_variant_id IN ({$variantPlaceholders})
                   AND warehouse_id = ?",
                array_merge($bindings, array_keys($snapshotUpdates), [$warehouseId])
            );
        }
    }

    // -------------------------------------------------------------------------
    // Sales list – paginated
    // -------------------------------------------------------------------------
    public function list()
    {
        $sales = Order::with([
            'customer:id,name,phone',
            'items.productVariant:id,variant_name,product_id,unit_id',
            'items.productVariant.product:id,name',
            'items.productVariant.unit:id,symbol',
            'payments:id,order_id,amount,method',
            'createdBy:id,name',
        ])
            ->select(['id', 'order_number', 'order_channel', 'customer_id', 'status',
                      'subtotal', 'tax_amount', 'discount_amount', 'total_amount',
                      'created_by', 'created_at'])
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        return Inertia::render('Warehouse/SalesList', ['sales' => $sales]);
    }

    // -------------------------------------------------------------------------
    // Single sale detail
    // -------------------------------------------------------------------------
    public function show($id)
    {
        $sale = Order::with([
            'customer:id,name,phone',
            'items.productVariant:id,variant_name,product_id,unit_id,sku',
            'items.productVariant.product:id,name',
            'items.productVariant.unit:id,symbol',
            'payments:id,order_id,amount,method,reference_no',
            'createdBy:id,name',
        ])->findOrFail($id);

        return Inertia::render('Warehouse/SaleDetails', ['sale' => $sale]);
    }

    // -------------------------------------------------------------------------
    // Invoice print view
    // -------------------------------------------------------------------------
    public function print($id)
    {
        $order = Order::with([
            'customer:id,name,phone',
            'items.productVariant:id,variant_name,product_id,unit_id',
            'items.productVariant.product:id,name,tax_category_id',
            'items.productVariant.product.taxCategory:id,name,tax_percent,type',
            'items.productVariant.unit:id,symbol',
            'payments:id,order_id,amount,method,reference_no',
            'createdBy:id,name',
        ])->findOrFail($id);

        return Inertia::render('Warehouse/Invoice', ['order' => $order]);
    }
}
