# Application Context Blueprint
Generated: 2026-08-29 11:53:07
Framework: Laravel v13.18.1
Environment: PHP v8.5.8
--------------------------------------------------
INSTRUCTION FOR AI: This file contains the structural architecture of the application.
Use this schema map, endpoint list, and relationships to understand context before writing code.

## 1. Database Schemas & Eloquent Models

### Model: `Account`
- **Table:** `accounts`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `journalLines()` [hasMany]

### Model: `Address`
- **Table:** `addresses`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `user()` [belongsTo], `customer()` [belongsTo]

### Model: `Attribute`
- **Table:** `attributes`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `values()` [hasMany]

### Model: `AttributeValue`
- **Table:** `attribute_values`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `attribute()` [belongsTo], `productVariants()` [belongsTo]

### Model: `Banner`
- **Table:** `banners`
- **Columns:** (Database connection unavailable or unmigrated table)

### Model: `Barcode`
- **Table:** `barcodes`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `productVariant()` [belongsTo]

### Model: `BarcodePrintJob`
- **Table:** `barcode_print_jobs`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `warehouse()` [belongsTo], `variant()` [belongsTo], `createdBy()` [belongsTo]

### Model: `Brand`
- **Table:** `brands`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `products()` [hasMany]

### Model: `Cart`
- **Table:** `carts`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `items()` [hasMany], `warehouse()` [belongsTo], `user()` [belongsTo]

### Model: `CartItem`
- **Table:** `cart_items`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `cart()` [belongsTo], `variant()` [belongsTo]

### Model: `Category`
- **Table:** `categories`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `parent()` [belongsTo], `children()` [hasMany], `warehouse()` [belongsTo], `products()` [hasMany]

### Model: `Coupon`
- **Table:** `coupons`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `usages()` [hasMany]

### Model: `CouponUsage`
- **Table:** `coupon_usages`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `coupon()` [belongsTo], `user()` [belongsTo], `order()` [belongsTo]

### Model: `Customer`
- **Table:** `customers`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `user()` [belongsTo], `addresses()` [hasMany], `loyaltyTransactions()` [hasMany], `orders()` [hasMany], `payments()` [hasMany], `returns()` [hasMany]

### Model: `DailySalesSummary`
- **Table:** `daily_sales_summaries`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `warehouse()` [belongsTo]

### Model: `Delivery`
- **Table:** `deliveries`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `order()` [belongsTo], `agent()` [belongsTo], `attempts()` [hasMany]

### Model: `DeliveryAttempt`
- **Table:** `delivery_attempts`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `delivery()` [belongsTo]

### Model: `Expense`
- **Table:** `expenses`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `warehouse()` [belongsTo], `createdBy()` [belongsTo]

### Model: `JournalEntry`
- **Table:** `journal_entries`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `lines()` [hasMany], `user()` [belongsTo]

### Model: `JournalLine`
- **Table:** `journal_lines`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `journalEntry()` [belongsTo], `account()` [belongsTo]

### Model: `LoyaltyTransaction`
- **Table:** `loyalty_transactions`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `customer()` [belongsTo], `order()` [belongsTo], `createdBy()` [belongsTo]

### Model: `Order`
- **Table:** `orders`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `customer()` [belongsTo], `warehouse()` [belongsTo], `address()` [belongsTo], `coupon()` [belongsTo], `agent()` [belongsTo], `createdBy()` [belongsTo], `items()` [hasMany], `payments()` [hasMany], `statusLogs()` [hasMany], `delivery()` [hasOne], `couponUsage()` [hasOne]

### Model: `OrderItem`
- **Table:** `order_items`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `order()` [belongsTo], `productVariant()` [belongsTo]

### Model: `OrderStatusLog`
- **Table:** `order_status_logs`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `order()` [belongsTo], `changedBy()` [belongsTo]

### Model: `OtpVerification`
- **Table:** `otp_verifications`
- **Columns:** (Database connection unavailable or unmigrated table)

### Model: `Payment`
- **Table:** `payments`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `order()` [belongsTo], `customer()` [belongsTo], `vendor()` [belongsTo]

### Model: `PriceHistory`
- **Table:** `price_histories`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `productVariant()` [belongsTo], `creator()` [belongsTo]

### Model: `Product`
- **Table:** `products`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `category()` [belongsTo], `brand()` [belongsTo], `taxCategory()` [belongsTo], `warehouse()` [belongsTo], `variants()` [hasMany], `images()` [hasMany], `reviews()` [hasMany]

### Model: `ProductImage`
- **Table:** `product_images`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `product()` [belongsTo], `variant()` [belongsTo]

### Model: `ProductSalesSummary`
- **Table:** `product_sales_summaries`
- **Columns:** (Database connection unavailable or unmigrated table)

### Model: `ProductVariant`
- **Table:** `product_variants`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `product()` [belongsTo], `unit()` [belongsTo], `stockSnapshot()` [hasOne], `stockSnapshots()` [hasMany], `barcodes()` [hasMany], `priceHistories()` [hasMany], `images()` [hasMany], `primaryImage()` [hasOne], `attributeValues()` [belongsTo], `cartItems()` [hasMany], `wishlists()` [hasMany]

### Model: `ProductVariantAttribute`
- **Table:** `product_variant_attributes`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `productVariant()` [belongsTo], `attributeValue()` [belongsTo]

### Model: `Purchase`
- **Table:** `purchases`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `vendor()` [belongsTo], `warehouse()` [belongsTo], `items()` [hasMany], `createdBy()` [belongsTo]

### Model: `PurchaseItem`
- **Table:** `purchase_items`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `purchase()` [belongsTo], `productVariant()` [belongsTo], `stockBatches()` [hasMany], `products()` [hasMany], `taxCategory()` [belongsTo]

### Model: `ReturnItem`
- **Table:** `return_items`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `returnRequest()` [belongsTo], `orderItem()` [belongsTo]

### Model: `ReturnRequest`
- **Table:** `returns`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `order()` [belongsTo], `customer()` [belongsTo], `processedBy()` [belongsTo], `items()` [hasMany]

### Model: `Review`
- **Table:** `reviews`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `product()` [belongsTo], `user()` [belongsTo], `orderItem()` [belongsTo]

### Model: `Setting`
- **Table:** `settings`
- **Columns:** (Database connection unavailable or unmigrated table)

### Model: `ShippingZone`
- **Table:** `shipping_zones`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `warehouse()` [belongsTo]

### Model: `StockAdjustment`
- **Table:** `stock_adjustments`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `warehouse()` [belongsTo], `creator()` [belongsTo], `items()` [hasMany]

### Model: `StockAdjustmentItem`
- **Table:** `stock_adjustment_items`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `stockAdjustment()` [belongsTo], `productVariant()` [belongsTo], `batch()` [belongsTo]

### Model: `StockBatch`
- **Table:** `stock_batches`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `productVariant()` [belongsTo], `warehouse()` [belongsTo], `purchaseItem()` [belongsTo]

### Model: `StockLedger`
- **Table:** `stock_ledgers`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `productVariant()` [belongsTo], `warehouse()` [belongsTo], `batch()` [belongsTo], `source()` [morphTo]

### Model: `StockReservation`
- **Table:** `stock_reservations`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `productVariant()` [belongsTo], `warehouse()` [belongsTo], `order()` [belongsTo]

### Model: `StockSnapshot`
- **Table:** `stock_snapshots`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `productVariant()` [belongsTo], `warehouse()` [belongsTo]

### Model: `TaxCategory`
- **Table:** `tax_categories`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `products()` [hasMany]

### Model: `Unit`
- **Table:** `units`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `baseUnit()` [belongsTo], `subUnits()` [hasMany], `products()` [hasMany]

### Model: `User`
- **Table:** `users`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `ownedWarehouse()` [hasOne], `staffWarehouses()` [belongsTo], `deliveries()` [hasMany], `devices()` [hasMany], `customer()` [hasOne], `addresses()` [hasMany], `warehouseUsers()` [hasMany], `notifications()` [morphMany], `tokens()` [morphMany], `roles()` [morphTo], `permissions()` [morphTo]

### Model: `UserDevice`
- **Table:** `user_devices`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `user()` [belongsTo]

### Model: `Vendor`
- **Table:** `vendors`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `user()` [belongsTo]

### Model: `Warehouse`
- **Table:** `warehouses`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `owner()` [belongsTo], `employees()` [belongsTo], `stockBatches()` [hasMany], `stockLedgers()` [hasMany], `stockSnapshots()` [hasMany], `orders()` [hasMany], `products()` [hasMany], `expenses()` [hasMany], `shippingZones()` [hasMany], `settings()` [hasMany], `warehouseUsers()` [hasMany]

### Model: `WarehouseUser`
- **Table:** `warehouse_users`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `warehouse()` [belongsTo], `user()` [belongsTo], `deliveries()` [hasMany]

### Model: `Wishlist`
- **Table:** `wishlists`
- **Columns:** (Database connection unavailable or unmigrated table)
- **Relationships:** `user()` [belongsTo], `variant()` [belongsTo]

## 2. API & Application Routing

| Method | URI | Action | Validation / Request Form |
|--------|-----|--------|----------------------------|
| GET | `/login` | `AuthenticatedSessionController@create` | None |
| POST | `/login` | `AuthenticatedSessionController@store` | `LoginRequest` |
| POST | `/logout` | `AuthenticatedSessionController@destroy` | None |
| GET | `/forgot-password` | `PasswordResetLinkController@create` | None |
| GET | `/reset-password/{token}` | `NewPasswordController@create` | None |
| POST | `/forgot-password` | `PasswordResetLinkController@store` | `SendPasswordResetLinkRequest` |
| POST | `/reset-password` | `NewPasswordController@store` | None |
| GET | `/register` | `RegisteredUserController@create` | None |
| POST | `/register` | `RegisteredUserController@store` | None |
| GET | `/email/verify` | `EmailVerificationPromptController@__invoke` | None |
| GET | `/email/verify/{id}/{hash}` | `VerifyEmailController@__invoke` | `VerifyEmailRequest` |
| POST | `/email/verification-notification` | `EmailVerificationNotificationController@store` | None |
| GET | `/user/confirm-password` | `ConfirmablePasswordController@show` | None |
| GET | `/user/confirmed-password-status` | `ConfirmedPasswordStatusController@show` | None |
| POST | `/user/confirm-password` | `ConfirmablePasswordController@store` | None |
| GET | `/two-factor-challenge` | `TwoFactorAuthenticatedSessionController@create` | `code: [nullable|string], recovery_code: [nullable|string]` |
| POST | `/two-factor-challenge` | `TwoFactorAuthenticatedSessionController@store` | `code: [nullable|string], recovery_code: [nullable|string]` |
| POST | `/user/two-factor-authentication` | `TwoFactorAuthenticationController@store` | None |
| POST | `/user/confirmed-two-factor-authentication` | `ConfirmedTwoFactorAuthenticationController@store` | None |
| DELETE | `/user/two-factor-authentication` | `TwoFactorAuthenticationController@destroy` | None |
| GET | `/user/two-factor-qr-code` | `TwoFactorQrCodeController@show` | None |
| GET | `/user/two-factor-secret-key` | `TwoFactorSecretKeyController@show` | None |
| GET | `/user/two-factor-recovery-codes` | `RecoveryCodeController@index` | None |
| POST | `/user/two-factor-recovery-codes` | `RecoveryCodeController@store` | None |
| POST | `/api/v1/auth/register` | `AuthController@register` | None |
| POST | `/api/v1/auth/login` | `AuthController@login` | None |
| POST | `/api/v1/auth/otp/send` | `OtpController@send` | None |
| POST | `/api/v1/auth/otp/verify` | `OtpController@verify` | None |
| POST | `/api/v1/auth/otp/resend` | `OtpController@resend` | None |
| POST | `/api/v1/auth/forgot-password` | `PasswordController@forgotPassword` | None |
| POST | `/api/v1/auth/reset-password` | `PasswordController@resetPassword` | None |
| GET | `/api/v1/home` | `HomeController@index` | None |
| GET | `/api/v1/banners` | `HomeController@banners` | None |
| GET | `/api/v1/categories` | `HomeController@categories` | None |
| GET | `/api/v1/brands` | `HomeController@brands` | None |
| GET | `/api/v1/search/suggestions` | `HomeController@searchSuggestions` | None |
| GET | `/api/v1/search` | `HomeController@search` | None |
| GET | `/api/v1/offers` | `HomeController@offers` | None |
| GET | `/api/v1/products` | `ProductController@index` | None |
| GET | `/api/v1/products/{product}` | `ProductController@show` | None |
| GET | `/api/v1/products/{product}/reviews` | `ProductController@reviews` | None |
| GET | `/api/v1/products/{product}/related` | `ProductController@related` | None |
| POST | `/api/v1/payments/phonepe/callback` | `PaymentController@callback` | None |
| POST | `/api/v1/auth/logout` | `AuthController@logout` | None |
| GET | `/api/v1/auth/me` | `AuthController@me` | None |
| PUT | `/api/v1/auth/profile` | `AuthController@updateProfile` | None |
| POST | `/api/v1/auth/avatar` | `AuthController@updateAvatar` | None |
| PUT | `/api/v1/auth/fcm-token` | `AuthController@updateFcmToken` | None |
| PUT | `/api/v1/auth/location` | `AuthController@updateLocation` | None |
| GET | `/api/v1/auth/sessions` | `AuthController@sessions` | None |
| DELETE | `/api/v1/auth/sessions/{id}` | `AuthController@revokeSession` | None |
| PUT | `/api/v1/auth/change-password` | `PasswordController@changePassword` | None |
| POST | `/api/v1/products/{product}/reviews` | `ProductController@storeReview` | None |
| GET | `/api/v1/cart` | `CartController@index` | None |
| POST | `/api/v1/cart/items` | `CartController@addItem` | None |
| PUT | `/api/v1/cart/items/{item}` | `CartController@updateItem` | None |
| DELETE | `/api/v1/cart/items/{item}` | `CartController@removeItem` | None |
| DELETE | `/api/v1/cart` | `CartController@clear` | None |
| POST | `/api/v1/cart/coupon` | `CartController@applyCoupon` | None |
| DELETE | `/api/v1/cart/coupon` | `CartController@removeCoupon` | None |
| POST | `/api/v1/cart/merge` | `CartController@merge` | None |
| POST | `/api/v1/checkout/validate` | `CheckoutController@validateCheckout` | None |
| POST | `/api/v1/checkout/initiate` | `CheckoutController@initiate` | None |
| GET | `/api/v1/checkout/success/{order}` | `CheckoutController@success` | None |
| GET | `/api/v1/payments/phonepe/status/{order}` | `PaymentController@status` | None |
| GET | `/api/v1/payments/phonepe/redirect` | `PaymentController@redirect` | None |
| GET | `/api/v1/orders` | `OrderController@index` | None |
| GET | `/api/v1/orders/{order}` | `OrderController@show` | None |
| POST | `/api/v1/orders/{order}/cancel` | `OrderController@cancel` | None |
| GET | `/api/v1/orders/{order}/track` | `OrderController@track` | None |
| GET | `/api/v1/orders/{order}/invoice` | `OrderController@invoice` | None |
| POST | `/api/v1/orders/{order}/return` | `OrderController@createReturn` | None |
| GET | `/api/v1/wishlist` | `WishlistController@index` | None |
| POST | `/api/v1/wishlist` | `WishlistController@store` | None |
| DELETE | `/api/v1/wishlist/{wishlist}` | `WishlistController@destroy` | None |
| POST | `/api/v1/wishlist/{wishlist}/move-to-cart` | `WishlistController@moveToCart` | None |
| GET | `/api/v1/addresses` | `AddressController@index` | None |
| POST | `/api/v1/addresses` | `AddressController@store` | None |
| PUT | `/api/v1/addresses/{address}` | `AddressController@update` | None |
| DELETE | `/api/v1/addresses/{address}` | `AddressController@destroy` | None |
| PUT | `/api/v1/addresses/{address}/default` | `AddressController@setDefault` | None |
| POST | `/api/v1/addresses/serviceable` | `AddressController@checkServiceable` | None |
| GET | `/api/v1/profile` | `ProfileController@show` | None |
| GET | `/api/v1/profile/notifications` | `ProfileController@notifications` | None |
| PUT | `/api/v1/profile/notifications/{id}/read` | `ProfileController@markNotificationRead` | None |
| PUT | `/api/v1/profile/notifications/read-all` | `ProfileController@markAllNotificationsRead` | None |
| GET | `/api/v1/profile/notifications/unread-count` | `ProfileController@unreadNotificationCount` | None |
| GET | `/api/v1/profile/loyalty-history` | `ProfileController@loyaltyHistory` | None |
| GET | `/api/v1/agent/deliveries` | `DeliveryController@index` | None |
| GET | `/api/v1/agent/deliveries/{delivery}` | `DeliveryController@show` | None |
| PUT | `/api/v1/agent/deliveries/{delivery}/status` | `DeliveryController@updateStatus` | None |
| POST | `/api/v1/agent/deliveries/{delivery}/proof` | `DeliveryController@uploadProof` | None |
| POST | `/api/v1/agent/deliveries/{delivery}/attempt` | `DeliveryController@logAttempt` | None |
| PUT | `/api/v1/agent/deliveries/location` | `DeliveryController@updateLocation` | None |
| GET | `/api/{fallbackPlaceholder}` | *Closure* | None |
| GET | `/up` | *Closure* | None |
| GET | `//` | *Closure* | None |
| GET | `/soon` | *Closure* | None |
| GET | `/api/qz/certificate` | `PrintSigningController@getCertificate` | None |
| POST | `/api/qz/sign` | `PrintSigningController@signMessage` | None |
| POST | `/signin` | `AuthController@signin` | None |
| GET | `/dashboard` | *Closure* | None |
| GET | `/admin` | `DashboardController@index` | None |
| GET | `/admin/dashboard` | `DashboardController@index` | None |
| GET | `/admin/users` | `UserController@index` | None |
| GET | `/admin/users/create` | `UserController@create` | None |
| POST | `/admin/users` | `UserController@store` | None |
| GET | `/admin/users/{user}` | `UserController@show` | None |
| GET | `/admin/users/{user}/edit` | `UserController@edit` | None |
| PUT | `/admin/users/{user}` | `UserController@update` | None |
| POST | `/admin/users/{user}/toggle-status` | `UserController@toggleStatus` | None |
| POST | `/admin/users/{user}/impersonate` | `UserController@impersonate` | None |
| DELETE | `/admin/users/{user}` | `UserController@destroy` | None |
| GET | `/admin/users/export/csv` | `UserController@export` | None |
| GET | `/admin/warehouses` | `WarehouseController@index` | None |
| GET | `/admin/warehouses/create` | `WarehouseController@create` | None |
| POST | `/admin/warehouses` | `WarehouseController@store` | None |
| GET | `/admin/warehouses/{warehouse}` | `WarehouseController@show` | None |
| GET | `/admin/warehouses/{warehouse}/edit` | `WarehouseController@edit` | None |
| PUT | `/admin/warehouses/{warehouse}` | `WarehouseController@update` | None |
| POST | `/admin/warehouses/{warehouse}/toggle-status` | `WarehouseController@toggleStatus` | None |
| POST | `/admin/warehouses/{warehouse}/assign-manager` | `WarehouseController@assignManager` | None |
| GET | `/admin/roles` | `RolePermissionController@index` | None |
| POST | `/admin/roles` | `RolePermissionController@store` | None |
| PUT | `/admin/roles/{role}` | `RolePermissionController@update` | None |
| DELETE | `/admin/roles/{role}` | `RolePermissionController@destroy` | None |
| GET | `/admin/catalog/categories` | `CatalogController@categoriesIndex` | None |
| POST | `/admin/catalog/categories` | `CatalogController@categoriesStore` | None |
| PUT | `/admin/catalog/categories/{category}` | `CatalogController@categoriesUpdate` | None |
| DELETE | `/admin/catalog/categories/{category}` | `CatalogController@categoriesDestroy` | None |
| GET | `/admin/catalog/brands` | `CatalogController@brandsIndex` | None |
| POST | `/admin/catalog/brands` | `CatalogController@brandsStore` | None |
| PUT | `/admin/catalog/brands/{brand}` | `CatalogController@brandsUpdate` | None |
| GET | `/admin/catalog/attributes` | `CatalogController@attributesIndex` | None |
| POST | `/admin/catalog/attributes` | `CatalogController@attributesStore` | None |
| POST | `/admin/catalog/attribute-values` | `CatalogController@attributeValuesStore` | None |
| GET | `/admin/catalog/tax-categories` | `CatalogController@taxCategoriesIndex` | None |
| POST | `/admin/catalog/tax-categories` | `CatalogController@taxCategoriesStore` | None |
| GET | `/admin/catalog/units` | `CatalogController@unitsIndex` | None |
| POST | `/admin/catalog/units` | `CatalogController@unitsStore` | None |
| GET | `/admin/settings` | `SettingsController@index` | None |
| POST | `/admin/settings` | `SettingsController@update` | None |
| GET | `/admin/banners` | `BannerController@index` | None |
| POST | `/admin/banners` | `BannerController@store` | None |
| PUT | `/admin/banners/{banner}` | `BannerController@update` | None |
| DELETE | `/admin/banners/{banner}` | `BannerController@destroy` | None |
| GET | `/admin/coupons` | `CouponController@index` | None |
| GET | `/admin/coupons/create` | `CouponController@create` | None |
| POST | `/admin/coupons` | `CouponController@store` | None |
| GET | `/admin/coupons/{coupon}/edit` | `CouponController@edit` | None |
| PUT | `/admin/coupons/{coupon}` | `CouponController@update` | None |
| DELETE | `/admin/coupons/{coupon}` | `CouponController@destroy` | None |
| GET | `/admin/orders` | `OrderController@index` | None |
| GET | `/admin/orders/{order}` | `OrderController@show` | None |
| POST | `/admin/orders/{order}/status` | `OrderController@updateStatus` | None |
| GET | `/admin/orders/export/csv` | `OrderController@export` | None |
| GET | `/admin/reports` | `ReportController@index` | None |
| GET | `/admin/reports/sales` | `ReportController@salesReport` | None |
| GET | `/admin/reports/revenue` | `ReportController@revenueReport` | None |
| GET | `/admin/reports/inventory` | `ReportController@inventoryReport` | None |
| GET | `/admin/reports/customers` | `ReportController@customerReport` | None |
| GET | `/admin/reports/export` | `ReportController@export` | None |
| GET | `/admin/activity-log` | `ActivityLogController@index` | None |
| GET | `/admin/activity-log/export` | `ActivityLogController@export` | None |
| GET | `/admin/notifications` | `NotificationController@index` | None |
| POST | `/admin/notifications/broadcast` | `NotificationController@broadcast` | None |
| GET | `/warehouse/dashboard` | `DashboardController@index` | None |
| GET | `/warehouse/categories` | `CategoryController@index` | None |
| POST | `/warehouse/categories` | `CategoryController@store` | None |
| PUT|PATCH | `/warehouse/categories/{category}` | `CategoryController@update` | None |
| GET | `/warehouse/brands` | `BrandController@index` | None |
| POST | `/warehouse/brands` | `BrandController@store` | None |
| PUT|PATCH | `/warehouse/brands/{brand}` | `BrandController@update` | None |
| GET | `/warehouse/products` | `ProductController@index` | None |
| POST | `/warehouse/products` | `ProductController@store` | None |
| PUT|PATCH | `/warehouse/products/{product}` | `ProductController@update` | None |
| POST | `/warehouse/products/quick` | `ProductController@quickStore` | None |
| POST | `/warehouse/products/variants/{variant}/images` | `ProductController@uploadVariantImages` | None |
| DELETE | `/warehouse/products/images/{image}` | `ProductController@deleteVariantImage` | None |
| PUT | `/warehouse/products/variants/{variant}/images/reorder` | `ProductController@reorderVariantImages` | None |
| GET | `/warehouse/vendors` | `VendorController@index` | None |
| POST | `/warehouse/vendors` | `VendorController@store` | None |
| PUT|PATCH | `/warehouse/vendors/{vendor}` | `VendorController@update` | None |
| GET | `/warehouse/purchases` | `PurchaseController@index` | None |
| GET | `/warehouse/purchases/create` | `PurchaseController@create` | None |
| POST | `/warehouse/purchases` | `PurchaseController@store` | None |
| GET | `/warehouse/purchases/{purchase}` | `PurchaseController@show` | None |
| GET | `/warehouse/purchases/{purchase}/edit` | `PurchaseController@edit` | None |
| PUT|PATCH | `/warehouse/purchases/{purchase}` | `PurchaseController@update` | None |
| DELETE | `/warehouse/purchases/{purchase}` | `PurchaseController@destroy` | None |
| GET | `/warehouse/purchase/report` | `PurchaseController@report` | None |
| POST | `/warehouse/purchases/{purchase}/confirm` | `PurchaseController@confirm` | None |
| GET | `/warehouse/inventory` | `InventoryController@index` | None |
| POST | `/warehouse/inventory/barcode` | `BarcodeController@store` | None |
| POST | `/warehouse/inventory/barcode/suggest` | `BarcodeController@suggest` | None |
| GET | `/warehouse/inventory/{productVariant}` | `InventoryController@show` | None |
| GET | `/warehouse/api/inventory/low-stock` | `InventoryController@lowStock` | None |
| GET | `/warehouse/api/inventory/expiring-batches` | `InventoryController@expiringBatches` | None |
| GET | `/warehouse/api/inventory/stock-valuation` | `InventoryController@stockValuation` | None |
| POST | `/warehouse/inventory/adjust-stock` | `InventoryController@adjustStock` | None |
| GET | `/warehouse/barcode/{productVariant}` | `InventoryController@barcode` | None |
| GET | `/warehouse/label/print/{productVariant}` | `InventoryController@printBarcode` | None |
| GET | `/warehouse/pos` | `SalesController@index` | None |
| GET | `/warehouse/pos/display` | `PosController@index` | None |
| GET | `/warehouse/sales` | `SalesController@list` | None |
| GET | `/warehouse/mcard-sales` | `PosController@mcard` | None |
| POST | `/warehouse/sales` | `SalesController@store` | None |
| GET | `/warehouse/sales/{id}` | `SalesController@show` | None |
| GET | `/warehouse/sales/{id}/edit` | `SalesController@edit` | None |
| PUT | `/warehouse/sales/{id}` | `SalesController@update` | None |
| GET | `/warehouse/sales/{id}/print` | `SalesController@print` | None |
| GET | `/warehouse/next-invoice` | `SalesController@nextInvoice` | None |
| GET | `/warehouse/online-orders` | `OnlineOrderController@index` | None |
| GET | `/warehouse/online-orders/{order}` | `OnlineOrderController@show` | None |
| POST | `/warehouse/online-orders/{order}/status` | `OnlineOrderController@updateStatus` | None |
| POST | `/warehouse/online-orders/{order}/assign-agent` | `OnlineOrderController@assignAgent` | None |
| POST | `/warehouse/online-orders/{order}/assign-staff` | `OnlineOrderController@assignStaff` | None |
| GET | `/warehouse/online-orders/{order}/packing-slip` | `OnlineOrderController@printPackingSlip` | None |
| GET | `/warehouse/online-orders/{order}/invoice` | `OnlineOrderController@printInvoice` | None |
| POST | `/warehouse/online-orders/bulk-status` | `OnlineOrderController@bulkUpdateStatus` | None |
| POST | `/warehouse/online-orders/bulk-assign` | `OnlineOrderController@bulkAssignAgent` | None |
| GET | `/warehouse/returns` | `ReturnController@index` | None |
| GET | `/warehouse/returns/{return}` | `ReturnController@show` | None |
| POST | `/warehouse/returns/{return}/approve` | `ReturnController@approve` | None |
| POST | `/warehouse/returns/{return}/reject` | `ReturnController@reject` | None |
| GET | `/warehouse/customers` | `CustomerController@index` | None |
| GET | `/warehouse/customers/{customer}` | `CustomerController@show` | None |
| POST | `/warehouse/customers` | `CustomerController@store` | None |
| PUT | `/warehouse/customers/{customer}` | `CustomerController@update` | None |
| POST | `/warehouse/customers/{customer}/loyalty` | `CustomerController@addLoyaltyPoints` | None |
| POST | `/warehouse/customers/{customer}/credit` | `CustomerController@adjustCredit` | None |
| GET | `/warehouse/staff` | `StaffController@index` | None |
| POST | `/warehouse/staff` | `StaffController@store` | None |
| DELETE | `/warehouse/staff/{warehouseUser}` | `StaffController@destroy` | None |
| GET | `/warehouse/staff/agents` | `StaffController@agentIndex` | None |
| POST | `/warehouse/staff/agents` | `StaffController@agentStore` | None |
| GET | `/warehouse/staff/agents/{user}` | `StaffController@agentShow` | None |
| POST | `/warehouse/staff/agents/bulk-assign` | `StaffController@bulkAssign` | None |
| GET | `/warehouse/accounting/chart-of-accounts` | `AccountingController@chartOfAccounts` | None |
| GET | `/warehouse/accounting/journal-entries` | `AccountingController@journalEntries` | None |
| POST | `/warehouse/accounting/journal-entries` | `AccountingController@createJournalEntry` | None |
| GET | `/warehouse/accounting/expenses` | `AccountingController@expenses` | None |
| POST | `/warehouse/accounting/expenses` | `AccountingController@storeExpense` | None |
| PUT | `/warehouse/accounting/expenses/{expense}` | `AccountingController@updateExpense` | None |
| DELETE | `/warehouse/accounting/expenses/{expense}` | `AccountingController@deleteExpense` | None |
| GET | `/warehouse/accounting/pl-statement` | `AccountingController@plStatement` | None |
| GET | `/warehouse/accounting/tax-collected` | `AccountingController@taxCollected` | None |
| GET | `/warehouse/settings` | `SettingsController@index` | None |
| POST | `/warehouse/settings` | `SettingsController@update` | None |
| GET | `/warehouse/settings/profile` | `SettingsController@businessProfile` | None |
| POST | `/warehouse/settings/profile/{warehouse}` | `SettingsController@updateBusinessProfile` | None |
| GET | `/warehouse/settings/shipping-zones` | `SettingsController@shippingZones` | None |
| POST | `/warehouse/settings/shipping-zones` | `SettingsController@storeShippingZone` | None |
| PUT | `/warehouse/settings/shipping-zones/{zone}` | `SettingsController@updateShippingZone` | None |
| DELETE | `/warehouse/settings/shipping-zones/{zone}` | `SettingsController@deleteShippingZone` | None |
| GET | `/warehouse/barcodes-v2` | `BarcodeController@index` | None |
| GET | `/warehouse/barcodes-v2/lookup` | `BarcodeController@lookup` | None |
| POST | `/warehouse/barcodes-v2/queue` | `BarcodeController@queuePrint` | None |
| GET | `/warehouse/barcodes-v2/queue` | `BarcodeController@printQueue` | None |
| GET | `/warehouse/barcodes-v2/jobs/{job}/pdf` | `BarcodeController@generatePdf` | None |
| GET | `/warehouse/analytics-engine/dashboard` | `AnalyticsEngineController@dashboard` | None |
| GET | `/warehouse/analytics-engine/stock-intelligence/reorder-velocity` | `AnalyticsEngineController@reorderVelocity` | None |
| GET | `/warehouse/analytics-engine/stock-intelligence/batch-lifecycle` | `AnalyticsEngineController@batchLifecycle` | None |
| GET | `/warehouse/analytics-engine/stock-intelligence/valuation-audit` | `AnalyticsEngineController@valuationAudit` | None |
| GET | `/warehouse/analytics-engine/sales-channels/omnichannel` | `AnalyticsEngineController@omnichannelPerformance` | None |
| GET | `/warehouse/analytics-engine/sales-channels/product-margins` | `AnalyticsEngineController@productMargins` | None |
| GET | `/warehouse/analytics-engine/operations/fulfillment-kpi` | `AnalyticsEngineController@fulfillmentKpi` | None |
| GET | `/warehouse/analytics-engine/operations/returns-analysis` | `AnalyticsEngineController@returnsAnalysis` | None |
| GET | `/warehouse/analytics-engine/financials/profit-loss` | `AnalyticsEngineController@profitLoss` | None |
| GET | `/warehouse/analytics-engine/financials/tax-ledger` | `AnalyticsEngineController@taxLedger` | None |
| POST | `/warehouse/maintenance/pos/clear-cache` | `PosController@flushCache` | None |
| POST | `/warehouse/maintenance/dashboard/clear-cache` | `DashboardController@clearCache` | None |
| GET | `/warehouse/maintenance/migrate-product-images` | *Closure* | None |
| GET|POST|PUT|PATCH|DELETE|OPTIONS | `/settings` | `RedirectController` | None |
| GET | `/settings/profile` | `ProfileController@edit` | None |
| PATCH | `/settings/profile` | `ProfileController@update` | `ProfileUpdateRequest` |
| DELETE | `/settings/profile` | `ProfileController@destroy` | `ProfileDeleteRequest` |
| GET | `/settings/password` | `PasswordController@edit` | None |
| PUT | `/settings/password` | `PasswordController@update` | `PasswordUpdateRequest` |
| GET | `/settings/appearance` | *Closure* | None |
| GET | `/settings/two-factor` | `TwoFactorAuthenticationController@show` | Custom Request |
| GET | `/manager` | `DashboardController@index` | None |
| GET | `/manager/dashboard` | `DashboardController@index` | None |
| GET | `/staff-panel` | `DashboardController@index` | None |
| GET | `/staff-panel/dashboard` | `DashboardController@index` | None |
| GET | `/agent` | `DashboardController@index` | None |
| GET | `/agent/dashboard` | `DashboardController@index` | None |
| GET | `/agent/deliveries` | `DeliveryController@index` | None |
| GET | `/agent/deliveries/{delivery}` | `DeliveryController@show` | None |
| POST | `/agent/deliveries/{delivery}/picked` | `DeliveryController@markPicked` | None |
| POST | `/agent/deliveries/{delivery}/out-for-delivery` | `DeliveryController@markOutForDelivery` | None |
| POST | `/agent/deliveries/{delivery}/delivered` | `DeliveryController@markDelivered` | None |
| POST | `/agent/deliveries/{delivery}/failed` | `DeliveryController@markFailed` | None |
| GET | `/customer` | `DashboardController@index` | None |
| GET | `/customer/dashboard` | `DashboardController@index` | None |
| GET | `/customer/orders` | `OrderController@index` | None |
| GET | `/customer/orders/{order}` | `OrderController@show` | None |
| GET | `/customer/profile` | `ProfileController@index` | None |
| POST | `/customer/profile/address` | `ProfileController@storeAddress` | None |
| GET | `/storage/{path}` | *Closure* | None |
| PUT | `/storage/{path}` | *Closure* | None |
