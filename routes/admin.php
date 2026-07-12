<?php

use App\Http\Controllers\Admin\ActivityLogController;
use App\Http\Controllers\Admin\BannerController;
use App\Http\Controllers\Admin\CatalogController;
use App\Http\Controllers\Admin\CouponController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\NotificationController;
use App\Http\Controllers\Admin\OrderController;
use App\Http\Controllers\Admin\ReportController;
use App\Http\Controllers\Admin\RolePermissionController;
use App\Http\Controllers\Admin\SettingsController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\WarehouseController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Admin Panel Routes
|--------------------------------------------------------------------------
*/

Route::prefix('admin')
    ->middleware(['auth', 'verified', 'check:admin'])
    ->name('admin.')
    ->group(function () {

        // Dashboard
        Route::get('/', [DashboardController::class, 'index'])->name('dashboard');
        Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard.alt');

        // Users
        Route::prefix('users')->name('users.')->group(function () {
            Route::get('/', [UserController::class, 'index'])->name('index');
            Route::get('/create', [UserController::class, 'create'])->name('create');
            Route::post('/', [UserController::class, 'store'])->name('store');
            Route::get('/{user}', [UserController::class, 'show'])->name('show');
            Route::get('/{user}/edit', [UserController::class, 'edit'])->name('edit');
            Route::put('/{user}', [UserController::class, 'update'])->name('update');
            Route::post('/{user}/toggle-status', [UserController::class, 'toggleStatus'])->name('toggle-status');
            Route::post('/{user}/impersonate', [UserController::class, 'impersonate'])->name('impersonate');
            Route::delete('/{user}', [UserController::class, 'destroy'])->name('destroy');
            Route::get('/export/csv', [UserController::class, 'export'])->name('export');
        });

        // Warehouses
        Route::prefix('warehouses')->name('warehouses.')->group(function () {
            Route::get('/', [WarehouseController::class, 'index'])->name('index');
            Route::get('/create', [WarehouseController::class, 'create'])->name('create');
            Route::post('/', [WarehouseController::class, 'store'])->name('store');
            Route::get('/{warehouse}', [WarehouseController::class, 'show'])->name('show');
            Route::get('/{warehouse}/edit', [WarehouseController::class, 'edit'])->name('edit');
            Route::put('/{warehouse}', [WarehouseController::class, 'update'])->name('update');
            Route::post('/{warehouse}/toggle-status', [WarehouseController::class, 'toggleStatus'])->name('toggle-status');
            Route::post('/{warehouse}/assign-manager', [WarehouseController::class, 'assignManager'])->name('assign-manager');
        });

        // Roles & Permissions
        Route::prefix('roles')->name('roles.')->group(function () {
            Route::get('/', [RolePermissionController::class, 'index'])->name('index');
            Route::post('/', [RolePermissionController::class, 'store'])->name('store');
            Route::put('/{role}', [RolePermissionController::class, 'update'])->name('update');
            Route::delete('/{role}', [RolePermissionController::class, 'destroy'])->name('destroy');
        });

        // Catalog
        Route::prefix('catalog')->name('catalog.')->group(function () {
            Route::get('/categories', [CatalogController::class, 'categoriesIndex'])->name('categories');
            Route::post('/categories', [CatalogController::class, 'categoriesStore'])->name('categories.store');
            Route::put('/categories/{category}', [CatalogController::class, 'categoriesUpdate'])->name('categories.update');
            Route::delete('/categories/{category}', [CatalogController::class, 'categoriesDestroy'])->name('categories.destroy');

            Route::get('/brands', [CatalogController::class, 'brandsIndex'])->name('brands');
            Route::post('/brands', [CatalogController::class, 'brandsStore'])->name('brands.store');
            Route::put('/brands/{brand}', [CatalogController::class, 'brandsUpdate'])->name('brands.update');

            Route::get('/attributes', [CatalogController::class, 'attributesIndex'])->name('attributes');
            Route::post('/attributes', [CatalogController::class, 'attributesStore'])->name('attributes.store');
            Route::post('/attribute-values', [CatalogController::class, 'attributeValuesStore'])->name('attribute-values.store');

            Route::get('/tax-categories', [CatalogController::class, 'taxCategoriesIndex'])->name('tax-categories');
            Route::post('/tax-categories', [CatalogController::class, 'taxCategoriesStore'])->name('tax-categories.store');

            Route::get('/units', [CatalogController::class, 'unitsIndex'])->name('units');
            Route::post('/units', [CatalogController::class, 'unitsStore'])->name('units.store');
        });

        // Settings
        Route::prefix('settings')->name('settings.')->group(function () {
            Route::get('/', [SettingsController::class, 'index'])->name('index');
            Route::post('/', [SettingsController::class, 'update'])->name('update');
        });

        // Banners
        Route::prefix('banners')->name('banners.')->group(function () {
            Route::get('/', [BannerController::class, 'index'])->name('index');
            Route::post('/', [BannerController::class, 'store'])->name('store');
            Route::put('/{banner}', [BannerController::class, 'update'])->name('update');
            Route::delete('/{banner}', [BannerController::class, 'destroy'])->name('destroy');
        });

        // Coupons
        Route::prefix('coupons')->name('coupons.')->group(function () {
            Route::get('/', [CouponController::class, 'index'])->name('index');
            Route::get('/create', [CouponController::class, 'create'])->name('create');
            Route::post('/', [CouponController::class, 'store'])->name('store');
            Route::get('/{coupon}/edit', [CouponController::class, 'edit'])->name('edit');
            Route::put('/{coupon}', [CouponController::class, 'update'])->name('update');
            Route::delete('/{coupon}', [CouponController::class, 'destroy'])->name('destroy');
        });

        // Orders
        Route::prefix('orders')->name('orders.')->group(function () {
            Route::get('/', [OrderController::class, 'index'])->name('index');
            Route::get('/{order}', [OrderController::class, 'show'])->name('show');
            Route::post('/{order}/status', [OrderController::class, 'updateStatus'])->name('update-status');
            Route::get('/export/csv', [OrderController::class, 'export'])->name('export');
        });

        // Reports
        Route::prefix('reports')->name('reports.')->group(function () {
            Route::get('/', [ReportController::class, 'index'])->name('index');
            Route::get('/sales', [ReportController::class, 'salesReport'])->name('sales');
            Route::get('/revenue', [ReportController::class, 'revenueReport'])->name('revenue');
            Route::get('/inventory', [ReportController::class, 'inventoryReport'])->name('inventory');
            Route::get('/customers', [ReportController::class, 'customerReport'])->name('customers');
            Route::get('/export', [ReportController::class, 'export'])->name('export');
        });

        // Activity Log
        Route::prefix('activity-log')->name('activity-log.')->group(function () {
            Route::get('/', [ActivityLogController::class, 'index'])->name('index');
            Route::get('/export', [ActivityLogController::class, 'export'])->name('export');
        });

        // Notifications
        Route::prefix('notifications')->name('notifications.')->group(function () {
            Route::get('/', [NotificationController::class, 'index'])->name('index');
            Route::post('/broadcast', [NotificationController::class, 'broadcast'])->name('broadcast');
        });

        // Route::get('/migrate-slugs', function () {
        //     \App\Models\Brand::whereNull('slug')->each(fn($b) => $b->update(['slug' => \Illuminate\Support\Str::slug($b->name)]));
        //     \App\Models\Category::whereNull('slug')->each(fn($c) => $c->update(['slug' => \Illuminate\Support\Str::slug($c->name)]));

        //     \App\Models\Product::whereNull('slug')->each(function ($p) {
        //         $slug = \Illuminate\Support\Str::slug($p->name);
        //         while (\App\Models\Product::where('slug', $slug)->where('id', '!=', $p->id)->exists()) {
        //             $slug = \Illuminate\Support\Str::slug($p->name) . '-' . rand(10, 99);
        //         }
        //         $p->update(['slug' => $slug]);
        //     });

        //     return 'Slugs generated successfully.';
        // });
    });
