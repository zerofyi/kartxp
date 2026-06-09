<?php

use App\Http\Controllers\AuthController;

Route::middleware('check')->group(function () {
    //Route::get('login', [AuthController::class, 'login'])->name('login');
    });
    Route::post('signin', [AuthController::class, 'signin'])->name('signin');
