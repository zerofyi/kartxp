<?php

namespace App\Http\Controllers\Warehouse;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\ProductVariant;
use App\Models\Setting;
use App\Models\StockBatch;
use App\Models\StockLedger;
use App\Models\StockSnapshot;
use App\Models\Warehouse;
use App\Services\ImageStorage\ImageStorageService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;

// ── NATIVE MODERN BACON QR CODE IMPORTS ──────────────────────────────────────
use BaconQrCode\Writer;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;

class SalesController extends Controller
{
    private const CACHE_TTL = 3600;
    public function __construct(protected ImageStorageService $imageStorageService) {}

    /**
     * Renders primary POS Workbench workspace layout catalog vectors.
     */
    public function index()
    {
        $userWarehouse = Auth::user()->ownedWarehouse;
        if (!$userWarehouse) {
            return redirect()->back()->withErrors(['error' => 'No warehouse assigned to your account.']);
        }

        $warehouseId = $userWarehouse->id;

        $catalog = Cache::remember("pos_catalog_w{$warehouseId}", self::CACHE_TTL, function () {
            return ProductVariant::query()
                ->where('status', true)
                ->with([
                    'product.category:id,name',
                    'product.taxCategory:id,tax_percent,type',
                    'unit:id,symbol',
                    'primaryImage:id,product_variant_id,image_path',
                    'barcodes' => fn($query) => $query->where('is_primary', true)
                ])
                ->get()
                ->map(fn ($variant) => [
                    'id'                => $variant->id,
                    'name'              => "{$variant->product->name} - {$variant->variant_name}",
                    'selling_price'     => (float) $variant->selling_price,
                    'min_selling_price' => (float) $variant->min_selling_price,
                    'mrp'               => (float) $variant->mrp,
                    'cost_price'        => (float) $variant->cost_price,
                    'sku'               => $variant->sku,
                    'barcode'           => $variant->barcodes->first()?->barcode ?? '',
                    'category'          => $variant->barcodes->isNotEmpty() && $variant->product->category
                                            ? strtolower(str_replace(' ', '', $variant->product->category->name))
                                            : 'unknown',
                    'tax_category_id'   => $variant->product->tax_category_id,
                    'tax_percent'       => (float) ($variant->product->taxCategory->tax_percent ?? 0),
                    'tax_type'          => $variant->product->taxCategory->type ?? 'exclusive',
                    'img'               => $variant->primaryImage
                                            ? $this->imageStorageService->thumbnailUrl($variant->primaryImage->image_path)
                                            : '',
                ]);
        });

        $stockSnapshots = DB::table('stock_snapshots')
            ->where('warehouse_id', $warehouseId)
            ->pluck('available_quantity', 'product_variant_id');

        $products = $catalog->map(function ($item) use ($stockSnapshots) {
            $item['qty'] = (int) ($stockSnapshots[$item['id']] ?? 0);
            return $item;
        });

        $categories = Cache::remember('pos_categories', self::CACHE_TTL, function () {
            $cats = Category::query()
                ->where('status', true)
                ->orderBy('sort_order')
                ->get(['id', 'name'])
                ->map(fn ($c) => [
                    'id'   => strtolower(str_replace(' ', '', $c->name)),
                    'name' => $c->name,
                ]);

            return $cats->prepend(['id' => 'all', 'name' => 'All'])
                        ->push(['id' => 'unknown', 'name' => 'Unknown'])
                        ->values();
        });

        $customers = Customer::query()
            ->orderBy('name')
            ->get(['id', 'name', 'phone', 'credit_limit']);

        $storeName = $userWarehouse->name ?? 'KartXP';
        $upiId = Setting::get('upi_id', '', $warehouseId);
        $totalAmount = '10.00';

        $upiPayload = "upi://pay?pa={$upiId}&pn=" . str_replace(' ', '', $storeName) . "&am={$totalAmount}&cu=INR";

        $upiQrSvg = '';
        if (!empty($upiId)) {
            try {
                $renderer = new ImageRenderer(
                    new RendererStyle(150, 1),
                    new SvgImageBackEnd()
                );
                $writer = new Writer($renderer);
                $svgContent = $writer->writeString($upiPayload);
                $upiQrSvg = 'data:image/svg+xml;base64,' . base64_encode($svgContent);
            } catch (\Exception $e) {
                Log::error('BaconQrCode Generation Failed: ' . $e->getMessage());
            }
        }

        // Buffer local storage logos into direct secure inline base64 vectors
        $logoBase64 = null;
        if (!empty($userWarehouse->logo_path) && \Storage::disk('public')->exists($userWarehouse->logo_path)) {
            $fileContent = \Storage::disk('public')->get($userWarehouse->logo_path);
            $mimeType = \Storage::disk('public')->mimeType($userWarehouse->logo_path);
            $logoBase64 = 'data:' . $mimeType . ';base64,' . base64_encode($fileContent);
        }

        $settings = [
            'upi_id'               => $upiId,
            'receipt_footer'       => Setting::get('receipt_footer',  '',    $warehouseId),
            'welcome_message'      => Setting::get('welcome_message', '',    $warehouseId),
            'gst_enabled'          => Setting::get('gst_enabled',     '0',   $warehouseId),
            'invoice_layout'       => Setting::get('invoice_layout',       'thermal_classic', $warehouseId),
            'is_qz_enabled'        => Setting::get('is_qz_enabled',        '0',   $warehouseId),
            'thermal_printer_name' => Setting::get('thermal_printer_name', '',    $warehouseId),
            'a4_printer_name'      => Setting::get('a4_printer_name',      '',    $warehouseId),
            'upi_qr_svg'           => $upiQrSvg,
        ];

        return Inertia::render('Warehouse/Pos/Index', [
            'products'   => $products,
            'categories' => $categories,
            'warehouse'  => [
                'id'        => $userWarehouse->id,
                'name'      => $userWarehouse->name,
                'address'   => $userWarehouse->address,
                'gstin'     => $userWarehouse->gstin,
                'email'     => $userWarehouse->email,
                'phone'     => $userWarehouse->phone,
                'logo_path' => $logoBase64,
            ],
            'customers'  => $customers,
            'settings'   => $settings,
        ]);
    }

    /**
     * Finalizes checkout transaction records inside database mutation boundaries.
     */
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

        $warehouse = Auth::user()->ownedWarehouse;
        if (!$warehouse) {
            return redirect()->back()->withErrors(['error' => 'Invalid warehouse selected.']);
        }

        $variantIds  = array_column($validated['items'], 'product_variant_id');
        $warehouseId = (int) $validated['warehouse_id'];
        $gstEnabled = Setting::where('warehouse_id', $warehouseId)->where('key', 'gst_enabled')->value('value') === '1';

        $snapshots = StockSnapshot::whereIn('product_variant_id', $variantIds)
            ->where('warehouse_id', $warehouseId)
            ->get()
            ->keyBy('product_variant_id');

        foreach ($validated['items'] as $item) {
            $snapshot = $snapshots->get($item['product_variant_id']);
            if (!$snapshot || $snapshot->available_quantity < $item['quantity']) {
                return redirect()->back()->withErrors([
                    'error' => 'Insufficient stock for product variant ID: ' . $item['product_variant_id'],
                ]);
            }
        }

        [
            'itemsBeforeTax'    => $itemsBeforeTax,
            'totalTaxAmount'    => $totalTaxAmount,
            'totalDiscount'     => $totalDiscount,
            'subtotal'          => $subtotal,
        ] = $this->computeTotals($validated, $gstEnabled);

        DB::beginTransaction();
        try {
            $customerId = $validated['customer_id'];
            if (!$customerId && !empty($validated['customer_mobile'])) {
                $customer   = Customer::firstOrCreate(
                    ['phone' => $validated['customer_mobile']],
                    ['name'  => $validated['customer_name'] ?? 'Walk-in Customer', 'credit_limit' => 0]
                );
                $customerId = $customer->id;
            }

            $orderNumber = $this->generateOrderNumber();

            $order = Order::create([
                'order_number'    => $orderNumber,
                'order_channel'   => $validated['order_channel'],
                'customer_id'     => $customerId,
                'warehouse_id'    => $warehouseId,
                'payment_status'  => 'paid',
                'payment_method'  => $validated['payment_method'],
                'status'          => 'completed',
                'subtotal'        => $subtotal, //itemsBeforeTax
                'tax_amount'      => $totalTaxAmount,
                'discount_amount' => $totalDiscount,
                'total_amount'    => $subtotal,
                'created_by'      => Auth::id(),
            ]);

            $variantDetails = ProductVariant::query()
                ->join('products', 'products.id', '=', 'product_variants.product_id')
                ->whereIn('product_variants.id', $variantIds)
                ->get([
                    'product_variants.id as variant_id',
                    'product_variants.variant_name',
                    'product_variants.sku',
                    'products.name as product_name'
                ])
                ->keyBy('variant_id');

            $orderItemsData = [];
            $now = now();

            foreach ($validated['items'] as $item) {
                $qty = (int) $item['quantity'];
                $price = (float) $item['price'];
                $disc = (float) ($item['discount'] ?? 0);
                $taxPct = $gstEnabled ? (float) $item['tax_percent'] : 0.0;

                if ($gstEnabled && $item['tax_type'] === 'exclusive') {
                    $basePrice = ($price * $qty) - $disc;
                    $rowTotal = $basePrice + ($basePrice * $taxPct / 100);
                } else {
                    $rowTotal = ($price * $qty) - $disc;
                }

                $meta = $variantDetails->get($item['product_variant_id']);
                $snapshotPayload = [
                    'product_name' => $meta ? $meta->product_name : 'Unknown Product',
                    'variant_name' => $meta ? $meta->variant_name : 'Default',
                    'sku'          => $meta ? $meta->sku : 'N/A',
                    'tax_type'     => $gstEnabled ? $item['tax_type'] : 'inclusive'
                ];

                $orderItemsData[] = [
                    'order_id'           => $order->id,
                    'product_variant_id' => $item['product_variant_id'],
                    'quantity'           => $qty,
                    'price'              => $price,
                    'discount'           => $disc,
                    'tax_percent'        => $taxPct,
                    'product_snapshot'   => json_encode($snapshotPayload),
                    'total'              => $rowTotal,
                    'created_at'         => $now,
                    'updated_at'         => $now,
                ];
            }

            OrderItem::insert($orderItemsData);
            $this->deductStockBulk($validated['items'], $warehouseId, $order->id, $orderNumber, $snapshots);

            Payment::create([
                'order_id'     => $order->id,
                'customer_id'  => $customerId,
                'amount'       => $subtotal,
                'method'       => $validated['payment_method'],
                'type'         => 'receipt',
                'reference_no' => 'PAY-' . $orderNumber,
            ]);

            DB::commit();
            Cache::forget("pos_products_w{$warehouseId}");

            $order->load([
                'customer:id,name,phone,address',
                'items.productVariant:id,variant_name,sku,unit_id,product_id',
                'items.productVariant.product:id,name,tax_category_id',
                'items.productVariant.product.taxCategory:id,name,tax_percent,type',
                'items.productVariant.unit:id,symbol',
                'payments:id,order_id,amount,method',
                'createdBy:id,name',
            ]);

            $dbSettings = Setting::where('warehouse_id', $warehouse->id)->pluck('value', 'key')->toArray();
            $settings = array_merge([
                'upi_id' => '', 'receipt_footer' => '', 'welcome_message' => '', 'gst_enabled' => '0',
                'invoice_layout' => 'thermal_classic', 'is_qz_enabled' => '0', 'thermal_printer_name' => '', 'a4_printer_name' => '',
            ], $dbSettings);

            // Re-render explicit transactional value parameters inside QR Base64 vectors
            $upiQrSvgPayload = '';
            if (!empty($settings['upi_id'])) {
                try {
                    $storeName = $warehouse->name ?? 'KartXP';
                    $orderTotalAmount = number_format($subtotal, 2, '.', '');
                    $activeUpiPayload = "upi://pay?pa={$settings['upi_id']}&pn=" . str_replace(' ', '', $storeName) . "&am={$orderTotalAmount}&cu=INR";

                    $renderer = new ImageRenderer(new RendererStyle(150, 1), new SvgImageBackEnd());
                    $writer = new Writer($renderer);
                    $upiQrSvgPayload = 'data:image/svg+xml;base64,' . base64_encode($writer->writeString($activeUpiPayload));
                } catch (\Exception $e) {
                    Log::error('BaconQrCode printing matrix generation failed: ' . $e->getMessage());
                }
            }
            $settings['upi_qr_svg'] = $upiQrSvgPayload;

            $logoBase64 = null;
            if (!empty($warehouse->logo_path) && \Storage::disk('public')->exists($warehouse->logo_path)) {
                $fileContent = \Storage::disk('public')->get($warehouse->logo_path);
                $mimeType = \Storage::disk('public')->mimeType($warehouse->logo_path);
                $logoBase64 = 'data:' . $mimeType . ';base64,' . base64_encode($fileContent);
            }

            return redirect()->back()->with('success', [
                'message'      => 'Sale completed successfully!',
                'order_number' => $orderNumber,
                'total_amount' => number_format($subtotal, 2),
                'order'        => $order,
                'settings'     => $settings,
                'warehouse'    => [
                    'name'      => $warehouse->name,
                    'address'   => $warehouse->address,
                    'gstin'     => $warehouse->gstin,
                    'email'     => $warehouse->email,
                    'phone'     => $warehouse->phone,
                    'logo_path' => $logoBase64,
                ]
            ]);

        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Sale Error', ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return redirect()->back()->withErrors(['error' => 'Failed to process sale: ' . $e->getMessage()]);
        }
    }

    private function computeTotals(array $validated, bool $gstEnabled): array
    {
        $subtotal       = 0.0;
        $totalTaxAmount = 0.0;
        $totalDiscount  = 0.0;
        $itemsBeforeTax = 0.0;

        foreach ($validated['items'] as $item) {
            $price    = (float) $item['price'];
            $qty      = (int)   $item['quantity'];
            $disc     = (float) ($item['discount'] ?? 0);
            $taxPct   = $gstEnabled ? (float) $item['tax_percent'] : 0.0;
            $taxType  = $item['tax_type'];

            if ($gstEnabled) {
                if ($taxType === 'inclusive') {
                    $itemTotal      = ($price * $qty) - $disc;
                    $base           = $itemTotal / (1 + $taxPct / 100);
                    $itemsBeforeTax += $base;
                    $totalTaxAmount += ($itemTotal - $base);
                    $subtotal       += $itemTotal;
                } else {
                    $base           = ($price * $qty) - $disc;
                    $tax            = $base * $taxPct / 100;
                    $itemsBeforeTax += $base;
                    $totalTaxAmount += $tax;
                    $subtotal       += ($base + $tax);
                }
            } else {
                $itemTotal      = ($price * $qty) - $disc;
                $itemsBeforeTax += $itemTotal;
                $subtotal       += $itemTotal;
            }

            $totalDiscount += $disc;
        }

        $overallDiscount = (float) ($validated['overall_discount'] ?? 0);
        if ($overallDiscount > 0) {
            $overallDiscAmt = $validated['discount_type'] === 'percentage'
                ? $itemsBeforeTax * $overallDiscount / 100
                : $overallDiscount;

            if ($gstEnabled && $itemsBeforeTax > 0) {
                $ratio          = ($itemsBeforeTax - $overallDiscAmt) / $itemsBeforeTax;
                $totalTaxAmount = $totalTaxAmount * $ratio;
            }

            $itemsBeforeTax -= $overallDiscAmt;
            $totalDiscount  += $overallDiscAmt;
            $subtotal        = $itemsBeforeTax + $totalTaxAmount;
        }

        return compact('itemsBeforeTax', 'totalTaxAmount', 'totalDiscount', 'subtotal');
    }

    public function nextInvoice()
    {
        $invoiceNumber = $this->generateOrderNumber();

        return response()->json([
            'invoice_number' => $invoiceNumber,
        ]);
    }

    private function generateOrderNumber(): string
    {
        $warehouse = Auth::user()->ownedWarehouse;
        $warehouseName = $warehouse ? $warehouse->name : 'SYSTEM';

        $initials = preg_replace('/(?<=\b\w)\w*\s*/', '', strtoupper($warehouseName));
        $initials = Str::limit(preg_replace('/[^A-Z]/', '', $initials), 3, '');

        $now = Carbon::now();
        $startYear = ($now->month >= 4) ? $now->year : $now->year - 1;
        $endYear   = $startYear + 1;

        $fyPrefix = sprintf('%s-%s', substr($startYear, -2), substr($endYear, -2));
        $baseFormat = "{$initials}/{$fyPrefix}/";

        $lastOrderNumber = Order::where('warehouse_id', $warehouse?->id)
            ->whereBetween('created_at', ["{$startYear}-04-01 00:00:00", "{$endYear}-03-31 23:59:59"])
            ->where('order_number', 'LIKE', "{$baseFormat}%")
            ->orderByRaw('CAST(SUBSTRING_INDEX(order_number, "/", -1) AS UNSIGNED) DESC')
            ->value('order_number');

        $nextSequence = $lastOrderNumber ? ((int) substr($lastOrderNumber, strrpos($lastOrderNumber, '/') + 1)) + 1 : 1;

        return $baseFormat . str_pad($nextSequence, 4, '0', STR_PAD_LEFT);
    }

    private function deductStockBulk(array $items, int $warehouseId, int $orderId, string $orderNumber, \Illuminate\Support\Collection $snapshots): void
    {
        $variantIds = array_column($items, 'product_variant_id');

        $allBatches = StockBatch::whereIn('product_variant_id', $variantIds)
            ->where('warehouse_id', $warehouseId)
            ->where('available_quantity', '>', 0)
            ->orderByRaw('product_variant_id ASC, CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END ASC, expiry_date ASC, created_at ASC')
            ->lockForUpdate()
            ->get()
            ->groupBy('product_variant_id');

        $batchUpdates  = [];
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
                throw new \RuntimeException("Unable to allocate stock from batches for product variant ID: {$variantId}");
            }
        }

        if (!empty($batchUpdates)) {
            $ids = array_keys($batchUpdates);
            $caseParts = [];
            $bindings = [];

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

        if (!empty($ledgerEntries)) {
            StockLedger::insert($ledgerEntries);
        }

        $snapshotUpdates = [];
        foreach ($items as $item) {
            $vid = (int) $item['product_variant_id'];
            $snapshotUpdates[$vid] = ($snapshotUpdates[$vid] ?? 0) + (int) $item['quantity'];
        }

        if (!empty($snapshotUpdates)) {
            $caseParts = [];
            $bindings = [];

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

    public function list(Request $request)
    {
        $search    = $request->string('search')->trim();
        $status    = $request->string('status')->trim();
        $channel   = $request->string('channel')->trim();
        $startDate = $request->input('start_date');
        $endDate   = $request->input('end_date');
        $perPage   = $request->integer('per_page', 25);

        $warehouse = Auth::user()->ownedWarehouse;
        $warehouseId = $warehouse ? $warehouse->id : null;

        $query = Order::query()
            ->with([
                'customer:id,name,phone',
                'items.productVariant:id,variant_name,product_id,unit_id',
                'items.productVariant.product:id,name',
                'items.productVariant.unit:id,symbol',
                'payments:id,order_id,amount,method',
                'createdBy:id,name',
            ])
            ->select([
                'id', 'order_number', 'order_channel', 'customer_id', 'status',
                'subtotal', 'tax_amount', 'discount_amount', 'total_amount',
                'created_by', 'created_at'
            ]);

        if ($warehouseId) {
            $query->where('warehouse_id', $warehouseId);
        }

        $query->when($search, function ($q) use ($search) {
            $q->where(function ($inner) use ($search) {
                $inner->where('order_number', 'like', "%{$search}%")
                      ->orWhereHas('customer', function ($c) use ($search) {
                          $c->where('name', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%");
                      });
            });
        });

        $query->when($status->isNotEmpty() && $status->toString() !== 'all', fn($q) => $q->where('status', $status));
        $query->when($channel->isNotEmpty() && $channel->toString() !== 'all', fn($q) => $q->where('order_channel', $channel));
        $query->when($startDate, fn($q) => $q->whereDate('created_at', '>=', $startDate));
        $query->when($endDate, fn($q) => $q->whereDate('created_at', '<=', $endDate));

        $statsQuery = clone $query;

        $thisMonthStart = now()->startOfMonth()->toDateTimeString();
        $thisMonthEnd   = now()->endOfMonth()->toDateTimeString();
        $lastMonthStart = now()->subMonth()->startOfMonth()->toDateTimeString();
        $lastMonthEnd   = now()->subMonth()->endOfMonth()->toDateTimeString();

        $stats = $statsQuery->setEagerLoads([])
            ->select(DB::raw("
                COUNT(id) as total_orders,
                COALESCE(SUM(total_amount), 0) as gross_revenue,
                COUNT(CASE WHEN created_at BETWEEN '{$thisMonthStart}' AND '{$thisMonthEnd}' THEN id END) as tm_count,
                COALESCE(SUM(CASE WHEN created_at BETWEEN '{$thisMonthStart}' AND '{$thisMonthEnd}' THEN total_amount END), 0) as tm_sales,
                COALESCE(SUM(CASE WHEN created_at BETWEEN '{$thisMonthStart}' AND '{$thisMonthEnd}' THEN discount_amount END), 0) as tm_discounts,
                COUNT(DISTINCT CASE WHEN created_at BETWEEN '{$thisMonthStart}' AND '{$thisMonthEnd}' THEN customer_id END) as tm_customers,
                COUNT(CASE WHEN created_at BETWEEN '{$lastMonthStart}' AND '{$lastMonthEnd}' THEN id END) as lm_count,
                COALESCE(SUM(CASE WHEN created_at BETWEEN '{$lastMonthStart}' AND '{$lastMonthEnd}' THEN total_amount END), 0) as lm_sales,
                COALESCE(SUM(CASE WHEN created_at BETWEEN '{$lastMonthStart}' AND '{$lastMonthEnd}' THEN discount_amount END), 0) as lm_discounts,
                COUNT(DISTINCT CASE WHEN created_at BETWEEN '{$lastMonthStart}' AND '{$lastMonthEnd}' THEN customer_id END) as lm_customers
            "))
            ->first();

        $sales = $query->latest('created_at')
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn($s) => [
                'id'              => $s->id,
                'order_number'    => $s->order_number,
                'order_channel'   => $s->order_channel,
                'customer'        => $s->customer,
                'status'          => $s->status,
                'subtotal'        => (float) $s->subtotal,
                'tax_amount'      => (float) $s->tax_amount,
                'discount_amount' => (float) $s->discount_amount,
                'total_amount'    => (float) $s->total_amount,
                'created_at'      => $s->created_at->toISOString(),
                'items_count'     => $s->items->count(),
            ]);

        return Inertia::render('Warehouse/SalesList', [
            'sales' => $sales,
            'stats' => [
                'grand_total'   => (float) ($stats->gross_revenue ?? 0),
                'grand_count'   => (int) ($stats->total_orders ?? 0),
                'this_month' => [
                    'sales'     => (float) ($stats->tm_sales ?? 0),
                    'count'     => (int) ($stats->tm_count ?? 0),
                    'discounts' => (float) ($stats->tm_discounts ?? 0),
                    'customers' => (int) ($stats->tm_customers ?? 0),
                ],
                'last_month' => [
                    'sales'     => (float) ($stats->lm_sales ?? 0),
                    'count'     => (int) ($stats->lm_count ?? 0),
                    'discounts' => (float) ($stats->lm_discounts ?? 0),
                    'customers' => (int) ($stats->lm_customers ?? 0),
                ],
            ],
            'filters' => [
                'search'     => $search->toString(),
                'status'     => $status->toString() ?: 'all',
                'channel'    => $channel->toString() ?: 'all',
                'start_date' => $startDate,
                'end_date'   => $endDate,
                'per_page'   => $perPage,
            ]
        ]);
    }

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

    public function print($id)
    {
        $order = Order::with([
            'customer:id,name,phone,address',
            'items.productVariant:id,variant_name,product_id,unit_id',
            'items.productVariant.product:id,name,tax_category_id',
            'items.productVariant.product.taxCategory:id,name,tax_percent,type',
            'items.productVariant.unit:id,symbol',
            'payments:id,order_id,amount,method,reference_no',
            'createdBy:id,name',
        ])->findOrFail($id);

        $warehouse = $order->warehouse;
        if (!$warehouse) {
            abort(404, 'Associated warehouse transaction root missing.');
        }

        $dbSettings = Setting::where('warehouse_id', $warehouse->id)->pluck('value', 'key')->toArray();
        $settings = array_merge([
            'upi_id' => '', 'receipt_footer' => '', 'welcome_message' => '', 'gst_enabled' => '0',
            'invoice_layout' => 'thermal_classic', 'is_qz_enabled' => '0', 'thermal_printer_name' => '', 'a4_printer_name' => '',
        ], $dbSettings);

        $upiQrSvg = '';
        if (!empty($settings['upi_id'])) {
            try {
                $storeName = $warehouse->name ?? 'KartXP';
                $totalAmount = number_format($order->total_amount, 2, '.', '');
                $upiPayload = "upi://pay?pa={$settings['upi_id']}&pn=" . str_replace(' ', '', $storeName) . "&am={$totalAmount}&cu=INR";

                $renderer = new ImageRenderer(
                    new RendererStyle(150, 1),
                    new SvgImageBackEnd()
                );
                $writer = new Writer($renderer);
                $svgContent = $writer->writeString($upiPayload);
                $upiQrSvg = 'data:image/svg+xml;base64,' . base64_encode($svgContent);
            } catch (\Exception $e) {
                Log::error('BaconQrCode re-print failed: ' . $e->getMessage());
            }
        }
        $settings['upi_qr_svg'] = $upiQrSvg;

        $logoBase64 = null;
        if (!empty($warehouse->logo_path) && \Storage::disk('public')->exists($warehouse->logo_path)) {
            $fileContent = \Storage::disk('public')->get($warehouse->logo_path);
            $mimeType = \Storage::disk('public')->mimeType($warehouse->logo_path);
            $logoBase64 = 'data:' . $mimeType . ';base64,' . base64_encode($fileContent);
        }

        return Inertia::render('Warehouse/Invoice', [
            'order'     => $order,
            'warehouse' => [
                'name'      => $warehouse->name,
                'address'   => $warehouse->address,
                'gstin'     => $warehouse->gstin,
                'email'     => $warehouse->email,
                'phone'     => $warehouse->phone,
                'logo_path' => $logoBase64,
            ],
            'settings'  => $settings,
        ]);
    }
}
