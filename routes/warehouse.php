<?php

use App\Http\Controllers\BarcodeController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\PosController;
use App\Http\Controllers\PurchaseController;
use App\Http\Controllers\SalesController;
use App\Http\Controllers\VendorController;
use App\Http\Controllers\BrandController;
use App\Http\Controllers\ProductController;
use Inertia\Inertia;

Route::group([
    'middleware' => ['auth', 'verified', 'warehouse'],
    'prefix' => 'warehouse'
], function ($router) {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('warehouse.dashboard');

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
    // Sales CRUD
    Route::get('/sales', [SalesController::class, 'list'])->name('sales.index');
    Route::post('/sales', [SalesController::class, 'store'])->name('sales.store');
    Route::get('/sales/{id}', [SalesController::class, 'show'])->name('sales.show');
    Route::get('/sales/{id}/edit', [SalesController::class, 'edit'])->name('sales.edit');
    Route::put('/sales/{id}', [SalesController::class, 'update'])->name('sales.update');
    Route::get('/sales/{id}/print', [SalesController::class, 'print'])->name('sales.print');

    //Route::get('/import-products', [PosController::class, 'import'])->name('import.products');

});
