<?php

use App\Http\Controllers\Customer\DashboardController;
use App\Http\Controllers\Customer\OrderController;
use App\Http\Controllers\Customer\ProfileController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Customer Panel Routes
|--------------------------------------------------------------------------
| Role: 'customer'
*/

Route::prefix('customer')
    ->middleware(['auth', 'check:customer'])
    ->name('customer.')
    ->group(function () {
        Route::get('/', [DashboardController::class, 'index'])->name('dashboard');
        Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard.alt');

        // Orders
        Route::get('/orders', [OrderController::class, 'index'])->name('orders.index');
        Route::get('/orders/{order}', [OrderController::class, 'show'])->name('orders.show');

        // Profile & Addresses
        Route::get('/profile', [ProfileController::class, 'index'])->name('profile.index');
        Route::post('/profile/address', [ProfileController::class, 'storeAddress'])->name('profile.address.store');
    });
