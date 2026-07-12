<?php

use App\Http\Controllers\PrintSigningController;
use Illuminate\Support\Facades\Route;


Route::get('/', function () {
    return redirect(route('login'));
})->name('home');

Route::get('soon', function () {
    return "Coming Soon!";
})->name('soon');

Route::get('/api/qz/certificate', [PrintSigningController::class, 'getCertificate']);
Route::post('/api/qz/sign', [PrintSigningController::class, 'signMessage']);

require __DIR__.'/auth.php';
require __DIR__.'/admin.php';
require __DIR__.'/warehouse.php';
require __DIR__.'/settings.php';
require __DIR__.'/manager.php';
require __DIR__.'/staff.php';
require __DIR__.'/agent.php';
require __DIR__.'/customer.php';


