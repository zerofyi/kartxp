<?php

use App\Http\Controllers\AuthController;

Route::post('signin', [AuthController::class, 'signin'])->name('signin');

Route::get('dashboard', function () {
    $user = Auth::user();
    return ('Welcome, ' . $user->name . '! You are logged in as ' . $user->role . '.');
})->name('dashboard')->middleware('auth', 'role.redirect');

