<?php

use App\Http\Controllers\Staff\DashboardController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Staff Panel Routes
|--------------------------------------------------------------------------
| Role: 'staff' — warehouse staff members for order packing/fulfillment
*/

Route::prefix('staff-panel')
    ->middleware(['auth', 'check:staff'])
    ->name('staff.')
    ->group(function () {
        Route::get('/', [DashboardController::class, 'index'])->name('dashboard');
        Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard.alt');
    });
