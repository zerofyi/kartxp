<?php

use App\Http\Controllers\Manager\DashboardController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Manager Panel Routes
|--------------------------------------------------------------------------
| Role: 'manager' — assigned to a specific warehouse
*/

Route::prefix('manager')
    ->middleware(['auth', 'check:manager'])
    ->name('manager.')
    ->group(function () {
        Route::get('/', [DashboardController::class, 'index'])->name('dashboard');
        Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard.alt');

        // Managers share the same warehouse routes but with a restricted middleware.
        // The manager sees all warehouse routes under /warehouse with the manager role.
        // This panel provides the manager-specific views.
    });
