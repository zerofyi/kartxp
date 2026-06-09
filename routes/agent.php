<?php

use App\Http\Controllers\Agent\DashboardController;
use App\Http\Controllers\Agent\DeliveryController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Delivery Agent Panel Routes
|--------------------------------------------------------------------------
| Role: 'delivery_agent' — handles order pickup & delivery
*/

Route::prefix('agent')
    ->middleware(['auth', 'check:delivery_agent'])
    ->name('agent.')
    ->group(function () {
        Route::get('/', [DashboardController::class, 'index'])->name('dashboard');
        Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard.alt');

        // Deliveries
        Route::prefix('deliveries')->name('deliveries.')->group(function () {
            Route::get('/', [DeliveryController::class, 'index'])->name('index');
            Route::get('/{delivery}', [DeliveryController::class, 'show'])->name('show');
            Route::post('/{delivery}/picked', [DeliveryController::class, 'markPicked'])->name('picked');
            Route::post('/{delivery}/out-for-delivery', [DeliveryController::class, 'markOutForDelivery'])->name('out-for-delivery');
            Route::post('/{delivery}/delivered', [DeliveryController::class, 'markDelivered'])->name('delivered');
            Route::post('/{delivery}/failed', [DeliveryController::class, 'markFailed'])->name('failed');
        });
    });
