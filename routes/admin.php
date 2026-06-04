<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\WarehouseController;

Route::group([
    'middleware' => ['auth', 'verified', 'admin'],
    'prefix' => 'admin'
], function ($router) {
    Route::get('dashboard', [AdminController::class, 'index'])->name('admin.dashboard');
    Route::resource('warehouses', WarehouseController::class)->only(['index', 'store', 'update']);
});
