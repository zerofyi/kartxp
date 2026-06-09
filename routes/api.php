<?php

use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\Auth\OtpController;
use App\Http\Controllers\Api\V1\Auth\PasswordController;
use App\Http\Controllers\Api\V1\HomeController;
use App\Http\Controllers\Api\V1\ProductController;
use App\Http\Controllers\Api\V1\CartController;
use App\Http\Controllers\Api\V1\CheckoutController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\OrderController;
use App\Http\Controllers\Api\V1\WishlistController;
use App\Http\Controllers\Api\V1\AddressController;
use App\Http\Controllers\Api\V1\ProfileController;
use App\Http\Controllers\Api\V1\ReviewController;
use App\Http\Controllers\Api\V1\Agent\DeliveryController as AgentDeliveryController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — v1
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {

    // ─── PUBLIC ──────────────────────────────────────────────────────────────

    // Auth
    Route::prefix('auth')->group(function () {
        Route::post('register',           [AuthController::class, 'register'])->middleware('throttle:10,1');
        Route::post('login',              [AuthController::class, 'login'])->middleware('throttle:10,1');
        Route::post('otp/send',           [OtpController::class, 'send'])->middleware('throttle:5,1');
        Route::post('otp/verify',         [OtpController::class, 'verify'])->middleware('throttle:10,1');
        Route::post('otp/resend',         [OtpController::class, 'resend'])->middleware('throttle:3,1');
        Route::post('forgot-password',    [PasswordController::class, 'forgotPassword'])->middleware('throttle:5,1');
        Route::post('reset-password',     [PasswordController::class, 'resetPassword'])->middleware('throttle:5,1');
    });

    // Home / Catalog (public)
    Route::get('home',                       [HomeController::class, 'index']);
    Route::get('banners',                    [HomeController::class, 'banners']);
    Route::get('categories',                 [HomeController::class, 'categories']);
    Route::get('brands',                     [HomeController::class, 'brands']);
    Route::get('search/suggestions',         [HomeController::class, 'searchSuggestions']);
    Route::get('search',                     [HomeController::class, 'search']);
    Route::get('offers',                     [HomeController::class, 'offers']);

    // Products (public)
    Route::get('products',                   [ProductController::class, 'index']);
    Route::get('products/{product:slug}',    [ProductController::class, 'show']);
    Route::get('products/{product:slug}/reviews', [ProductController::class, 'reviews']);
    Route::get('products/{product:slug}/related',  [ProductController::class, 'related']);

    // PhonePe Webhook (no auth — server-to-server)
    Route::post('payments/phonepe/callback', [PaymentController::class, 'callback'])
        ->middleware('phonepe.webhook')
        ->withoutMiddleware(['throttle']);

    // ─── AUTHENTICATED ────────────────────────────────────────────────────────

    Route::middleware('auth:sanctum')->group(function () {

        // Auth actions (requires token)
        Route::prefix('auth')->group(function () {
            Route::post('logout',             [AuthController::class, 'logout']);
            Route::get('me',                  [AuthController::class, 'me']);
            Route::put('profile',             [AuthController::class, 'updateProfile']);
            Route::post('avatar',             [AuthController::class, 'updateAvatar']);
            Route::put('fcm-token',           [AuthController::class, 'updateFcmToken']);
            Route::put('location',            [AuthController::class, 'updateLocation']);
            Route::get('sessions',            [AuthController::class, 'sessions']);
            Route::delete('sessions/{id}',    [AuthController::class, 'revokeSession']);
            Route::put('change-password',     [PasswordController::class, 'changePassword']);
        });

        // Product reviews (requires auth)
        Route::post('products/{product:slug}/reviews', [ProductController::class, 'storeReview']);

        // Cart
        Route::prefix('cart')->group(function () {
            Route::get('/',                  [CartController::class, 'index']);
            Route::post('items',             [CartController::class, 'addItem']);
            Route::put('items/{item}',       [CartController::class, 'updateItem']);
            Route::delete('items/{item}',    [CartController::class, 'removeItem']);
            Route::delete('/',               [CartController::class, 'clear']);
            Route::post('coupon',            [CartController::class, 'applyCoupon']);
            Route::delete('coupon',          [CartController::class, 'removeCoupon']);
            Route::post('merge',             [CartController::class, 'merge']);
        });

        // Checkout
        Route::prefix('checkout')->group(function () {
            Route::post('validate',          [CheckoutController::class, 'validateCheckout']);
            Route::post('initiate',          [CheckoutController::class, 'initiate']);
            Route::get('success/{order}',    [CheckoutController::class, 'success']);
        });

        // Payments
        Route::prefix('payments/phonepe')->group(function () {
            Route::get('status/{order}',     [PaymentController::class, 'status']);
            Route::get('redirect',           [PaymentController::class, 'redirect']);
        });

        // Orders
        Route::prefix('orders')->group(function () {
            Route::get('/',                  [OrderController::class, 'index']);
            Route::get('{order}',            [OrderController::class, 'show']);
            Route::post('{order}/cancel',    [OrderController::class, 'cancel']);
            Route::get('{order}/track',      [OrderController::class, 'track']);
            Route::get('{order}/invoice',    [OrderController::class, 'invoice']);
            Route::post('{order}/return',    [OrderController::class, 'createReturn']);
        });

        // Wishlist
        Route::prefix('wishlist')->group(function () {
            Route::get('/',                          [WishlistController::class, 'index']);
            Route::post('/',                         [WishlistController::class, 'store']);
            Route::delete('{wishlist}',              [WishlistController::class, 'destroy']);
            Route::post('{wishlist}/move-to-cart',   [WishlistController::class, 'moveToCart']);
        });

        // Addresses
        Route::prefix('addresses')->group(function () {
            Route::get('/',                          [AddressController::class, 'index']);
            Route::post('/',                         [AddressController::class, 'store']);
            Route::put('{address}',                  [AddressController::class, 'update']);
            Route::delete('{address}',               [AddressController::class, 'destroy']);
            Route::put('{address}/default',          [AddressController::class, 'setDefault']);
            Route::post('serviceable',               [AddressController::class, 'checkServiceable']);
        });

        // Profile / Notifications / Loyalty
        Route::prefix('profile')->group(function () {
            Route::get('/',                                [ProfileController::class, 'show']);
            Route::get('notifications',                    [ProfileController::class, 'notifications']);
            Route::put('notifications/{id}/read',          [ProfileController::class, 'markNotificationRead']);
            Route::put('notifications/read-all',           [ProfileController::class, 'markAllNotificationsRead']);
            Route::get('notifications/unread-count',       [ProfileController::class, 'unreadNotificationCount']);
            Route::get('loyalty-history',                  [ProfileController::class, 'loyaltyHistory']);
        });

        // Delivery Agent routes (role: delivery_agent)
        Route::prefix('agent/deliveries')
            ->middleware('check:delivery_agent,warehouse,admin')
            ->group(function () {
                Route::get('/',                              [AgentDeliveryController::class, 'index']);
                Route::get('{delivery}',                    [AgentDeliveryController::class, 'show']);
                Route::put('{delivery}/status',             [AgentDeliveryController::class, 'updateStatus']);
                Route::post('{delivery}/proof',             [AgentDeliveryController::class, 'uploadProof']);
                Route::post('{delivery}/attempt',           [AgentDeliveryController::class, 'logAttempt']);
                Route::put('location',                      [AgentDeliveryController::class, 'updateLocation']);
            });
    });
});

// Fallback
Route::fallback(function () {
    return response()->json(['success' => false, 'message' => 'Endpoint not found.'], 404);
});
