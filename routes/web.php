<?php

use App\Http\Controllers\InventoryController;
use App\Http\Controllers\BrandController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\PurchaseController;
use App\Http\Controllers\SalesController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\VendorController;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::get('soon', function () {
    return "Coming Soon!";
})->name('soon');

// Route::get('/', function () {
//     return Inertia::render('sales');
// })->name('home');

Route::middleware(['auth', 'verified', 'check'])->prefix('')->group(function () {
    Route::get('dashboard', function () {
        $role = \Illuminate\Support\Facades\Auth::user()->role;
        return match ($role) {
            'admin'          => redirect()->route('admin.dashboard'),
            'warehouse'      => redirect()->route('warehouse.dashboard'),
            'manager'        => redirect()->route('manager.dashboard'),
            'staff'          => redirect()->route('staff.dashboard'),
            'delivery_agent' => redirect()->route('agent.dashboard'),
            'customer'       => redirect()->route('customer.dashboard'),
            default          => redirect('/'),
        };
    })->name('dashboard');





});

require __DIR__.'/auth.php';
require __DIR__.'/admin.php';
require __DIR__.'/warehouse.php';
require __DIR__.'/settings.php';
require __DIR__.'/manager.php';
require __DIR__.'/staff.php';
require __DIR__.'/agent.php';
require __DIR__.'/customer.php';


