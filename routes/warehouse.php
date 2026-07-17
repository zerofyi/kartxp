<?php

use App\Http\Controllers\BarcodeController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\PosController;
use App\Http\Controllers\PurchaseController;
use App\Http\Controllers\Warehouse\SalesController;
use App\Http\Controllers\VendorController;
use App\Http\Controllers\BrandController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\Warehouse\OnlineOrderController;
use App\Http\Controllers\Warehouse\ReturnController;
use App\Http\Controllers\Warehouse\CustomerController as WHCustomerController;
use App\Http\Controllers\Warehouse\StaffController;
use App\Http\Controllers\Warehouse\AccountingController;
use App\Http\Controllers\Warehouse\SettingsController as WHSettingsController;
use App\Http\Controllers\Warehouse\BarcodeController as WHBarcodeController;
use App\Http\Controllers\Warehouse\AnalyticsEngineController;
use App\Http\Controllers\Warehouse\DashboardController;
use App\Models\ProductImage;
use App\Services\ImageStorage\ImageStorageService;
use Inertia\Inertia;

Route::middleware(['auth', 'verified', 'check:warehouse'])
    ->name('warehouse.')
    ->prefix('warehouse')
    ->group(function () {

    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::resource('categories', CategoryController::class)->only(['index', 'store', 'update']);
    Route::resource('brands', BrandController::class)->only(['index', 'store', 'update']);
    Route::resource('products', ProductController::class)->only(['index', 'store', 'update']);
    Route::post('products/quick', [ProductController::class, 'quickStore'])->name('products.quick');
    Route::post('products/variants/{variant}/images', [ProductController::class, 'uploadVariantImages'])
    ->name('products.variants.images.upload');
    Route::delete('products/images/{image}', [ProductController::class, 'deleteVariantImage'])
    ->name('products.images.delete');
    Route::put('products/variants/{variant}/images/reorder', [ProductController::class, 'reorderVariantImages'])
    ->name('products.variants.images.reorder');

    Route::resource('vendors', VendorController::class)->only(['index', 'store', 'update']);

    Route::resource('purchases', PurchaseController::class);
    Route::get('purchase/report', [PurchaseController::class, 'report'])->name('purchases.report');
    Route::post('purchases/{purchase}/confirm', [PurchaseController::class, 'confirm'])->name('purchases.confirm');

    Route::get('inventory', [InventoryController::class, 'index'])->name('inventory.index');
    Route::post('inventory/barcode', [BarcodeController::class, 'store'])->name('barcode.store');
    Route::post('inventory/barcode/suggest', [BarcodeController::class, 'suggest'])->name('barcode.suggest');
    Route::get('inventory/{productVariant}', [InventoryController::class, 'show'])->name('inventory.show');
    Route::get('api/inventory/low-stock', [InventoryController::class, 'lowStock'])->name('inventory.low-stock');
    Route::get('api/inventory/expiring-batches', [InventoryController::class, 'expiringBatches'])->name('inventory.expiring-batches');
    Route::get('api/inventory/stock-valuation', [InventoryController::class, 'stockValuation'])->name('inventory.stock-valuation');
    Route::post('inventory/adjust-stock', [InventoryController::class, 'adjustStock'])->name('inventory.adjust-stock');

    Route::get('barcode/{productVariant}', [InventoryController::class, 'barcode'])->name('inventory.barcode');
    Route::get('label/print/{productVariant}', [InventoryController::class, 'printBarcode'])->name('inventory.barcode.print');

    // POS
    Route::get('/pos', [SalesController::class, 'index'])->name('pos.index');
    Route::get('/pos/display', [PosController::class, 'index'])->name('warehouse.pos.display');
    // Sales CRUD
    Route::get('/sales', [SalesController::class, 'list'])->name('sales.index');
    Route::get('/mcard-sales', [PosController::class, 'mcard'])->name('sales.mcard');
    Route::post('/sales', [SalesController::class, 'store'])->name('sales.store');
    Route::get('/sales/{id}', [SalesController::class, 'show'])->name('sales.show');
    Route::get('/sales/{id}/edit', [SalesController::class, 'edit'])->name('sales.edit');
    Route::put('/sales/{id}', [SalesController::class, 'update'])->name('sales.update');
    Route::get('/sales/{id}/print', [SalesController::class, 'print'])->name('sales.print');
    Route::get('/next-invoice', [SalesController::class, 'nextInvoice'])->name('next-invoice');

    //Route::get('/import-products', [PosController::class, 'import'])->name('import.products');

    // ── NEW ECOMMERCE ROUTES ──────────────────────────────────────────────────

    // Online Orders
    Route::prefix('online-orders')->name('online-orders.')->group(function () {
        Route::get('/', [OnlineOrderController::class, 'index'])->name('index');
        Route::get('/{order}', [OnlineOrderController::class, 'show'])->name('show');
        Route::post('/{order}/status', [OnlineOrderController::class, 'updateStatus'])->name('update-status');
        Route::post('/{order}/assign-agent', [OnlineOrderController::class, 'assignAgent'])->name('assign-agent');
        Route::post('/{order}/assign-staff', [OnlineOrderController::class, 'assignStaff'])->name('assign-staff');
        Route::get('/{order}/packing-slip', [OnlineOrderController::class, 'printPackingSlip'])->name('packing-slip');
        Route::get('/{order}/invoice', [OnlineOrderController::class, 'printInvoice'])->name('invoice');
        Route::post('/bulk-status', [OnlineOrderController::class, 'bulkUpdateStatus'])->name('bulk-status');
        Route::post('/bulk-assign', [OnlineOrderController::class, 'bulkAssignAgent'])->name('bulk-assign');
    });

    // Returns
    Route::prefix('returns')->name('returns.')->group(function () {
        Route::get('/', [ReturnController::class, 'index'])->name('index');
        Route::get('/{return}', [ReturnController::class, 'show'])->name('show');
        Route::post('/{return}/approve', [ReturnController::class, 'approve'])->name('approve');
        Route::post('/{return}/reject', [ReturnController::class, 'reject'])->name('reject');
    });

    // Customers
    Route::prefix('customers')->name('customers.')->group(function () {
        Route::get('/', [WHCustomerController::class, 'index'])->name('index');
        Route::get('/{customer}', [WHCustomerController::class, 'show'])->name('show');
        Route::post('/', [WHCustomerController::class, 'store'])->name('store');
        Route::put('/{customer}', [WHCustomerController::class, 'update'])->name('update');
        Route::post('/{customer}/loyalty', [WHCustomerController::class, 'addLoyaltyPoints'])->name('loyalty');
        Route::post('/{customer}/credit', [WHCustomerController::class, 'adjustCredit'])->name('credit');
    });

    // Staff & Agents
    Route::prefix('staff')->name('staff.')->group(function () {
        Route::get('/', [StaffController::class, 'index'])->name('index');
        Route::post('/', [StaffController::class, 'store'])->name('store');
        Route::delete('/{warehouseUser}', [StaffController::class, 'destroy'])->name('destroy');
        Route::get('/agents', [StaffController::class, 'agentIndex'])->name('agents');
        Route::post('/agents', [StaffController::class, 'agentStore'])->name('agents.store');
        Route::get('/agents/{user}', [StaffController::class, 'agentShow'])->name('agents.show');
        Route::post('/agents/bulk-assign', [StaffController::class, 'bulkAssign'])->name('agents.bulk-assign');
    });

    // Accounting
    Route::prefix('accounting')->name('accounting.')->group(function () {
        Route::get('/chart-of-accounts', [AccountingController::class, 'chartOfAccounts'])->name('accounts');
        Route::get('/journal-entries', [AccountingController::class, 'journalEntries'])->name('journal');
        Route::post('/journal-entries', [AccountingController::class, 'createJournalEntry'])->name('journal.store');
        Route::get('/expenses', [AccountingController::class, 'expenses'])->name('expenses');
        Route::post('/expenses', [AccountingController::class, 'storeExpense'])->name('expenses.store');
        Route::put('/expenses/{expense}', [AccountingController::class, 'updateExpense'])->name('expenses.update');
        Route::delete('/expenses/{expense}', [AccountingController::class, 'deleteExpense'])->name('expenses.destroy');
        Route::get('/pl-statement', [AccountingController::class, 'plStatement'])->name('pl');
        Route::get('/tax-collected', [AccountingController::class, 'taxCollected'])->name('tax');
    });

    // Warehouse Settings
    Route::prefix('settings')->name('settings.')->group(function () {
        Route::get('/', [WHSettingsController::class, 'index'])->name('index');
        Route::post('/', [WHSettingsController::class, 'update'])->name('update');
        Route::get('/profile', [WHSettingsController::class, 'businessProfile'])->name('profile');
        Route::post('/profile/{warehouse}', [WHSettingsController::class, 'updateBusinessProfile'])->name('profile.update');
        Route::get('/shipping-zones', [WHSettingsController::class, 'shippingZones'])->name('shipping-zones');
        Route::post('/shipping-zones', [WHSettingsController::class, 'storeShippingZone'])->name('shipping-zones.store');
        Route::put('/shipping-zones/{zone}', [WHSettingsController::class, 'updateShippingZone'])->name('shipping-zones.update');
        Route::delete('/shipping-zones/{zone}', [WHSettingsController::class, 'deleteShippingZone'])->name('shipping-zones.destroy');
    });

    // Enhanced Barcodes
    Route::prefix('barcodes-v2')->name('barcodes-v2.')->group(function () {
        Route::get('/', [WHBarcodeController::class, 'index'])->name('index');
        Route::get('/lookup', [WHBarcodeController::class, 'lookup'])->name('lookup');
        Route::post('/queue', [WHBarcodeController::class, 'queuePrint'])->name('queue');
        Route::get('/queue', [WHBarcodeController::class, 'printQueue'])->name('queue.index');
        Route::get('/jobs/{job}/pdf', [WHBarcodeController::class, 'generatePdf'])->name('job.pdf');
    });

    // Universal Enterprise Analytics & Reporting Engine
    Route::prefix('analytics-engine')->name('analytics-engine.')->group(function () {
        // Core Modules
        Route::get('/dashboard', [AnalyticsEngineController::class, 'dashboard'])->name('dashboard');

        // 1. Inventory & Stock Intelligence
        Route::get('/stock-intelligence/reorder-velocity', [AnalyticsEngineController::class, 'reorderVelocity'])->name('stock.reorder');
        Route::get('/stock-intelligence/batch-lifecycle', [AnalyticsEngineController::class, 'batchLifecycle'])->name('stock.lifecycle');
        Route::get('/stock-intelligence/valuation-audit', [AnalyticsEngineController::class, 'valuationAudit'])->name('stock.valuation');

        // 2. Sales & Channel Performance
        Route::get('/sales-channels/omnichannel', [AnalyticsEngineController::class, 'omnichannelPerformance'])->name('sales.omnichannel');
        Route::get('/sales-channels/product-margins', [AnalyticsEngineController::class, 'productMargins'])->name('sales.margins');

        // 3. Operations & Fulfillment Metrics
        Route::get('/operations/fulfillment-kpi', [AnalyticsEngineController::class, 'fulfillmentKpi'])->name('ops.fulfillment');
        Route::get('/operations/returns-analysis', [AnalyticsEngineController::class, 'returnsAnalysis'])->name('ops.returns');

        // 4. Localized Warehouse Financials
        Route::get('/financials/profit-loss', [AnalyticsEngineController::class, 'profitLoss'])->name('finance.pl');
        Route::get('/financials/tax-ledger', [AnalyticsEngineController::class, 'taxLedger'])->name('finance.tax');
    });


    Route::prefix('maintenance')->name('maintenance')->group(function () {

        Route::post('/pos/clear-cache', [PosController::class, 'flushCache'])->name('pos.clear-cache');
        Route::post('/dashboard/clear-cache', [DashboardController::class, 'clearCache'])->name('warehouse.cache.clear');

        Route::get('/migrate-product-images', function (ImageStorageService $storageService) {
            // Target base path constant matching the schema configuration[cite: 1]
            $baseFolder = 'Products/Variants';

            $images = ProductImage::whereNotNull('image_path')->get();

            $metrics = ['processed' => 0, 'updated' => 0, 'failed' => 0];

            foreach ($images as $image) {
                $metrics['processed']++;

                DB::beginTransaction();
                try {
                    // Process file movement and thumbnail execution simultaneously
                    $newPath = $storageService->migrateAndBuildThumbnail($image->image_path, $baseFolder);

                    if ($newPath) {
                        $image->update(['image_path' => $newPath]);
                        $metrics['updated']++;
                        DB::commit();
                    } else {
                        DB::rollBack();
                        $metrics['failed']++;
                    }
                } catch (\Throwable $e) {
                    DB::rollBack();
                    $metrics['failed']++;
                    \Log::error("Failed structural migration processing ID {$image->id}: " . $e->getMessage());
                }
            }

            return response()->json([
                'status' => 'Success',
                'message' => 'Legacy ID folders eliminated and uniform thumbnails generated.',
                'metrics' => $metrics
            ]);
        });
    });
});
