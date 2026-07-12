# Application Context Blueprint
Generated: 2026-07-08 22:25:40
Framework: Laravel v13.18.1
Environment: PHP v8.5.8
--------------------------------------------------
INSTRUCTION FOR AI: This file contains the structural architecture of the application.
Use this schema map, endpoint list, and relationships to understand context before writing code.

## 1. Database Schemas & Eloquent Models

### Model: `Account`
- **Table:** `accounts`
- **Columns:** `id` (bigint), `name` (varchar), `type` (enum), `is_active` (tinyint)
- **Relationships:** `journalLines()` [hasMany]

### Model: `Address`
- **Table:** `addresses`
- **Columns:** `id` (bigint), `user_id` (bigint), `customer_id` (bigint), `label` (varchar), `name` (varchar), `phone` (varchar), `line1` (varchar), `line2` (varchar), `city` (varchar), `state` (varchar), `pincode` (varchar), `country` (varchar), `lat` (decimal), `lng` (decimal), `is_default` (tinyint), `created_at` (timestamp), `updated_at` (timestamp)
- **Relationships:** `user()` [belongsTo], `customer()` [belongsTo]

### Model: `Attribute`
- **Table:** `attributes`
- **Columns:** `id` (bigint), `name` (varchar)
- **Relationships:** `values()` [hasMany]

### Model: `AttributeValue`
- **Table:** `attribute_values`
- **Columns:** `id` (bigint), `attribute_id` (bigint), `value` (varchar)
- **Relationships:** `attribute()` [belongsTo], `productVariants()` [belongsTo]

### Model: `Banner`
- **Table:** `banners`
- **Columns:** `id` (bigint), `warehouse_id` (bigint), `title` (varchar), `image_path` (varchar), `link_type` (enum), `link_value` (varchar), `position` (enum), `sort_order` (int), `is_active` (tinyint), `starts_at` (timestamp), `ends_at` (timestamp), `created_at` (timestamp), `updated_at` (timestamp)

### Model: `Barcode`
- **Table:** `barcodes`
- **Columns:** `id` (bigint), `product_variant_id` (bigint), `barcode` (varchar), `is_primary` (tinyint)
- **Relationships:** `productVariant()` [belongsTo]

### Model: `BarcodePrintJob`
- **Table:** `barcode_print_jobs`
- **Columns:** `id` (bigint), `warehouse_id` (bigint), `product_variant_id` (bigint), `quantity` (int), `template` (varchar), `status` (enum), `created_by` (bigint), `printed_at` (timestamp), `created_at` (timestamp), `updated_at` (timestamp)
- **Relationships:** `warehouse()` [belongsTo], `variant()` [belongsTo], `createdBy()` [belongsTo]

### Model: `Brand`
- **Table:** `brands`
- **Columns:** `id` (bigint), `name` (varchar), `slug` (varchar), `description` (text), `logo_path` (varchar), `is_active` (tinyint), `created_at` (timestamp), `updated_at` (timestamp)
- **Relationships:** `products()` [hasMany]

### Model: `Cart`
- **Table:** `carts`
- **Columns:** `id` (bigint), `user_id` (bigint), `session_id` (varchar), `warehouse_id` (bigint), `expires_at` (timestamp), `created_at` (timestamp), `updated_at` (timestamp)
- **Relationships:** `items()` [hasMany], `warehouse()` [belongsTo], `user()` [belongsTo]

### Model: `CartItem`
- **Table:** `cart_items`
- **Columns:** `id` (bigint), `cart_id` (bigint), `product_variant_id` (bigint), `quantity` (int), `unit_price` (decimal), `created_at` (timestamp), `updated_at` (timestamp)
- **Relationships:** `cart()` [belongsTo], `variant()` [belongsTo]

### Model: `Category`
- **Table:** `categories`
- **Columns:** `id` (bigint), `name` (varchar), `slug` (varchar), `image_path` (varchar), `icon_path` (varchar), `warehouse_id` (bigint), `parent_id` (bigint), `sort_order` (int), `status` (tinyint), `created_at` (timestamp), `updated_at` (timestamp)
- **Relationships:** `parent()` [belongsTo], `children()` [hasMany], `warehouse()` [belongsTo], `products()` [hasMany]

### Model: `Coupon`
- **Table:** `coupons`
- **Columns:** `id` (bigint), `warehouse_id` (bigint), `code` (varchar), `name` (varchar), `type` (enum), `value` (decimal), `min_order_amount` (decimal), `max_discount` (decimal), `usage_limit` (int), `used_count` (int), `per_user_limit` (int), `applicable_to` (enum), `applicable_ids` (longtext), `starts_at` (timestamp), `ends_at` (timestamp), `is_active` (tinyint), `created_at` (timestamp), `updated_at` (timestamp)
- **Relationships:** `usages()` [hasMany]

### Model: `CouponUsage`
- **Table:** `coupon_usages`
- **Columns:** `id` (bigint), `coupon_id` (bigint), `user_id` (bigint), `order_id` (bigint), `discount_given` (decimal), `used_at` (timestamp), `created_at` (timestamp), `updated_at` (timestamp)
- **Relationships:** `coupon()` [belongsTo], `user()` [belongsTo], `order()` [belongsTo]

### Model: `Customer`
- **Table:** `customers`
- **Columns:** `id` (bigint), `name` (varchar), `phone` (varchar), `email` (varchar), `address` (text), `loyalty_points` (int), `total_spent` (decimal), `is_verified` (tinyint), `user_id` (bigint), `credit_limit` (decimal), `created_at` (timestamp), `updated_at` (timestamp)
- **Relationships:** `user()` [belongsTo], `addresses()` [hasMany], `loyaltyTransactions()` [hasMany], `orders()` [hasMany], `payments()` [hasMany], `returns()` [hasMany]

### Model: `DailySalesSummary`
- **Table:** `daily_sales_summaries`
- **Columns:** `date` (date), `warehouse_id` (bigint), `total_sales` (decimal), `total_orders` (int), `total_tax` (decimal)
- **Relationships:** `warehouse()` [belongsTo]

### Model: `Delivery`
- **Table:** `deliveries`
- **Columns:** `id` (bigint), `order_id` (bigint), `agent_id` (bigint), `status` (enum), `assigned_at` (timestamp), `picked_at` (timestamp), `delivered_at` (timestamp), `proof_image` (varchar), `signature_path` (varchar), `notes` (text), `created_at` (timestamp), `updated_at` (timestamp)
- **Relationships:** `order()` [belongsTo], `agent()` [belongsTo], `attempts()` [hasMany]

### Model: `DeliveryAttempt`
- **Table:** `delivery_attempts`
- **Columns:** `id` (bigint), `delivery_id` (bigint), `attempted_at` (timestamp), `reason` (varchar), `lat` (decimal), `lng` (decimal), `photo` (varchar), `created_at` (timestamp), `updated_at` (timestamp)
- **Relationships:** `delivery()` [belongsTo]

### Model: `Expense`
- **Table:** `expenses`
- **Columns:** `id` (bigint), `warehouse_id` (bigint), `category` (varchar), `amount` (decimal), `note` (text), `attachment_path` (varchar), `expense_date` (date), `created_by` (bigint), `created_at` (timestamp), `updated_at` (timestamp)
- **Relationships:** `warehouse()` [belongsTo], `createdBy()` [belongsTo]

### Model: `JournalEntry`
- **Table:** `journal_entries`
- **Columns:** `id` (bigint), `user_id` (bigint), `date` (date), `reference_type` (varchar), `reference_id` (bigint), `description` (text), `created_at` (timestamp), `updated_at` (timestamp)
- **Relationships:** `lines()` [hasMany], `user()` [belongsTo]

### Model: `JournalLine`
- **Table:** `journal_lines`
- **Columns:** `id` (bigint), `journal_entry_id` (bigint), `account_id` (bigint), `debit` (decimal), `credit` (decimal), `created_at` (timestamp), `updated_at` (timestamp)
- **Relationships:** `journalEntry()` [belongsTo], `account()` [belongsTo]

### Model: `LoyaltyTransaction`
- **Table:** `loyalty_transactions`
- **Columns:** `id` (bigint), `customer_id` (bigint), `order_id` (bigint), `type` (enum), `points` (int), `balance_after` (int), `note` (varchar), `created_by` (bigint), `created_at` (timestamp), `updated_at` (timestamp)
- **Relationships:** `customer()` [belongsTo], `order()` [belongsTo], `createdBy()` [belongsTo]

### Model: `Order`
- **Table:** `orders`
- **Columns:** `id` (bigint), `order_number` (varchar), `order_channel` (enum), `warehouse_id` (bigint), `customer_id` (bigint), `status` (enum), `payment_status` (enum), `payment_method` (varchar), `address_id` (bigint), `address_snapshot` (longtext), `coupon_id` (bigint), `coupon_discount` (decimal), `shipping_charge` (decimal), `assigned_agent_id` (bigint), `delivered_at` (timestamp), `cancelled_at` (timestamp), `notes` (text), `cancellation_reason` (text), `subtotal` (decimal), `tax_amount` (decimal), `discount_amount` (decimal), `total_amount` (decimal), `created_by` (bigint), `created_at` (timestamp), `updated_at` (timestamp)
- **Relationships:** `customer()` [belongsTo], `warehouse()` [belongsTo], `address()` [belongsTo], `coupon()` [belongsTo], `agent()` [belongsTo], `createdBy()` [belongsTo], `items()` [hasMany], `payments()` [hasMany], `statusLogs()` [hasMany], `delivery()` [hasOne], `couponUsage()` [hasOne]

### Model: `OrderItem`
- **Table:** `order_items`
- **Columns:** `id` (bigint), `order_id` (bigint), `product_variant_id` (bigint), `quantity` (int), `price` (decimal), `discount` (decimal), `tax_percent` (decimal), `product_snapshot` (longtext), `total` (decimal), `created_at` (timestamp), `updated_at` (timestamp)
- **Relationships:** `order()` [belongsTo], `productVariant()` [belongsTo]

### Model: `OrderStatusLog`
- **Table:** `order_status_logs`
- **Columns:** `id` (bigint), `order_id` (bigint), `from_status` (varchar), `to_status` (varchar), `note` (text), `changed_by` (bigint), `created_at` (timestamp)
- **Relationships:** `order()` [belongsTo], `changedBy()` [belongsTo]

### Model: `OtpVerification`
- **Table:** `otp_verifications`
- **Columns:** `id` (bigint), `identifier` (varchar), `otp` (varchar), `type` (enum), `expires_at` (timestamp), `verified_at` (timestamp), `attempts` (tinyint), `sent_at` (timestamp), `ip_address` (varchar), `created_at` (timestamp), `updated_at` (timestamp)

### Model: `Payment`
- **Table:** `payments`
- **Columns:** `id` (bigint), `order_id` (bigint), `customer_id` (bigint), `vendor_id` (bigint), `amount` (decimal), `method` (enum), `type` (enum), `reference_no` (varchar), `gateway` (varchar), `transaction_id` (varchar), `status` (enum), `payload` (longtext), `gateway_order_id` (varchar), `created_at` (timestamp), `updated_at` (timestamp)
- **Relationships:** `order()` [belongsTo], `customer()` [belongsTo], `vendor()` [belongsTo]

### Model: `PriceHistory`
- **Table:** `price_histories`
- **Columns:** `id` (bigint), `product_variant_id` (bigint), `mrp` (decimal), `selling_price` (decimal), `cost_price` (decimal), `effective_from` (date), `created_by` (bigint), `created_at` (timestamp), `updated_at` (timestamp)
- **Relationships:** `productVariant()` [belongsTo], `creator()` [belongsTo]

### Model: `Product`
- **Table:** `products`
- **Columns:** `id` (bigint), `name` (varchar), `slug` (varchar), `product_code` (varchar), `description` (text), `short_description` (text), `category_id` (bigint), `brand_id` (bigint), `tax_category_id` (bigint), `is_active` (tinyint), `is_returnable` (tinyint), `is_featured` (tinyint), `is_trending` (tinyint), `is_best_seller` (tinyint), `warehouse_id` (bigint), `meta_title` (varchar), `meta_description` (text), `deleted_at` (timestamp), `created_at` (timestamp), `updated_at` (timestamp)
- **Relationships:** `category()` [belongsTo], `brand()` [belongsTo], `taxCategory()` [belongsTo], `warehouse()` [belongsTo], `variants()` [hasMany], `images()` [hasMany], `reviews()` [hasMany]

### Model: `ProductImage`
- **Table:** `product_images`
- **Columns:** `id` (bigint), `product_id` (bigint), `product_variant_id` (bigint), `image_path` (varchar), `is_primary` (tinyint), `sort_order` (int)
- **Relationships:** `product()` [belongsTo], `variant()` [belongsTo]

### Model: `ProductSalesSummary`
- **Table:** `product_sales_summaries`
- **Columns:** `product_variant_id` (bigint), `total_quantity_sold` (int), `total_revenue` (decimal)

### Model: `ProductVariant`
- **Table:** `product_variants`
- **Columns:** `id` (bigint), `product_id` (bigint), `variant_name` (varchar), `sku` (varchar), `unit_id` (bigint), `net_quantity` (decimal), `mrp` (decimal), `selling_price` (decimal), `cost_price` (decimal), `min_selling_price` (decimal), `status` (tinyint), `stock_alert_qty` (int), `compare_price` (decimal), `weight` (decimal), `deleted_at` (timestamp), `created_at` (timestamp), `updated_at` (timestamp)
- **Relationships:** `product()` [belongsTo], `unit()` [belongsTo], `stockSnapshot()` [hasOne], `stockSnapshots()` [hasMany], `barcodes()` [hasMany], `priceHistories()` [hasMany], `images()` [hasMany], `primaryImage()` [hasOne], `attributeValues()` [belongsTo], `cartItems()` [hasMany], `wishlists()` [hasMany]

### Model: `ProductVariantAttribute`
- **Table:** `product_variant_attributes`
- **Columns:** `product_variant_id` (bigint), `attribute_value_id` (bigint)
- **Relationships:** `productVariant()` [belongsTo], `attributeValue()` [belongsTo]

### Model: `Purchase`
- **Table:** `purchases`
- **Columns:** `id` (bigint), `vendor_id` (bigint), `warehouse_id` (bigint), `invoice_no` (varchar), `image_path` (varchar), `purchase_date` (date), `subtotal` (decimal), `tax_amount` (decimal), `total_amount` (decimal), `status` (enum), `notes` (text), `discount_amount` (decimal), `created_by` (bigint), `created_at` (timestamp), `updated_at` (timestamp)
- **Relationships:** `vendor()` [belongsTo], `warehouse()` [belongsTo], `items()` [hasMany], `createdBy()` [belongsTo]

### Model: `PurchaseItem`
- **Table:** `purchase_items`
- **Columns:** `id` (bigint), `purchase_id` (bigint), `product_variant_id` (bigint), `quantity` (int), `cost_price` (decimal), `min_selling_price` (decimal), `selling_price` (decimal), `mrp` (decimal), `tax_id` (bigint), `batch_no` (varchar), `expiry_date` (date), `created_at` (timestamp), `updated_at` (timestamp)
- **Relationships:** `purchase()` [belongsTo], `productVariant()` [belongsTo], `stockBatches()` [hasMany], `products()` [hasMany], `taxCategory()` [belongsTo]

### Model: `ReturnItem`
- **Table:** `return_items`
- **Columns:** `id` (bigint), `return_id` (bigint), `order_item_id` (bigint), `quantity` (int), `condition` (enum), `restock` (tinyint), `created_at` (timestamp), `updated_at` (timestamp)
- **Relationships:** `returnRequest()` [belongsTo], `orderItem()` [belongsTo]

### Model: `ReturnRequest`
- **Table:** `returns`
- **Columns:** `id` (bigint), `order_id` (bigint), `customer_id` (bigint), `reason` (text), `status` (enum), `refund_amount` (decimal), `refund_method` (varchar), `refund_reference` (varchar), `images` (longtext), `note` (text), `processed_by` (bigint), `processed_at` (timestamp), `created_at` (timestamp), `updated_at` (timestamp)
- **Relationships:** `order()` [belongsTo], `customer()` [belongsTo], `processedBy()` [belongsTo], `items()` [hasMany]

### Model: `Review`
- **Table:** `reviews`
- **Columns:** `id` (bigint), `product_id` (bigint), `user_id` (bigint), `order_item_id` (bigint), `rating` (tinyint), `title` (varchar), `body` (text), `images` (longtext), `is_verified_purchase` (tinyint), `is_approved` (tinyint), `created_at` (timestamp), `updated_at` (timestamp)
- **Relationships:** `product()` [belongsTo], `user()` [belongsTo], `orderItem()` [belongsTo]

### Model: `Setting`
- **Table:** `settings`
- **Columns:** `id` (bigint), `key` (varchar), `value` (text), `warehouse_id` (bigint), `group` (varchar), `created_at` (timestamp), `updated_at` (timestamp)

### Model: `ShippingZone`
- **Table:** `shipping_zones`
- **Columns:** `id` (bigint), `warehouse_id` (bigint), `name` (varchar), `pincodes` (longtext), `radius_km` (decimal), `charge` (decimal), `free_above` (decimal), `is_active` (tinyint), `created_at` (timestamp), `updated_at` (timestamp)
- **Relationships:** `warehouse()` [belongsTo]

### Model: `StockAdjustment`
- **Table:** `stock_adjustments`
- **Columns:** `id` (bigint), `warehouse_id` (bigint), `reason` (varchar), `created_by` (bigint), `created_at` (timestamp), `updated_at` (timestamp)
- **Relationships:** `warehouse()` [belongsTo], `creator()` [belongsTo], `items()` [hasMany]

### Model: `StockAdjustmentItem`
- **Table:** `stock_adjustment_items`
- **Columns:** `id` (bigint), `stock_adjustment_id` (bigint), `product_variant_id` (bigint), `batch_id` (bigint), `quantity` (int), `adjustment_type` (enum), `created_at` (timestamp), `updated_at` (timestamp)
- **Relationships:** `stockAdjustment()` [belongsTo], `productVariant()` [belongsTo], `batch()` [belongsTo]

### Model: `StockBatch`
- **Table:** `stock_batches`
- **Columns:** `id` (bigint), `product_variant_id` (bigint), `warehouse_id` (bigint), `batch_no` (varchar), `expiry_date` (date), `purchase_item_id` (bigint), `received_quantity` (int), `available_quantity` (int), `created_at` (timestamp), `updated_at` (timestamp)
- **Relationships:** `productVariant()` [belongsTo], `warehouse()` [belongsTo], `purchaseItem()` [belongsTo]

### Model: `StockLedger`
- **Table:** `stock_ledgers`
- **Columns:** `id` (bigint), `product_variant_id` (bigint), `warehouse_id` (bigint), `batch_id` (bigint), `movement_type` (enum), `quantity` (int), `source_type` (varchar), `source_id` (bigint), `remarks` (text), `created_at` (timestamp), `updated_at` (timestamp)
- **Relationships:** `productVariant()` [belongsTo], `warehouse()` [belongsTo], `batch()` [belongsTo], `source()` [morphTo]

### Model: `StockReservation`
- **Table:** `stock_reservations`
- **Columns:** `id` (bigint), `product_variant_id` (bigint), `warehouse_id` (bigint), `order_id` (bigint), `quantity` (int), `status` (enum), `created_at` (timestamp), `updated_at` (timestamp)
- **Relationships:** `productVariant()` [belongsTo], `warehouse()` [belongsTo], `order()` [belongsTo]

### Model: `StockSnapshot`
- **Table:** `stock_snapshots`
- **Columns:** `id` (bigint), `product_variant_id` (bigint), `warehouse_id` (bigint), `available_quantity` (int), `reserved_quantity` (int), `created_at` (timestamp), `updated_at` (timestamp)
- **Relationships:** `productVariant()` [belongsTo], `warehouse()` [belongsTo]

### Model: `TaxCategory`
- **Table:** `tax_categories`
- **Columns:** `id` (bigint), `name` (varchar), `tax_percent` (decimal), `type` (enum), `created_at` (timestamp), `updated_at` (timestamp)
- **Relationships:** `products()` [hasMany]

### Model: `Unit`
- **Table:** `units`
- **Columns:** `id` (bigint), `name` (varchar), `symbol` (varchar), `base_unit_id` (bigint), `multiplier` (decimal), `created_at` (timestamp), `updated_at` (timestamp)
- **Relationships:** `baseUnit()` [belongsTo], `subUnits()` [hasMany], `products()` [hasMany]

### Model: `User`
- **Table:** `users`
- **Columns:** `id` (bigint), `name` (varchar), `avatar` (varchar), `email` (varchar), `mobile` (varchar), `role` (enum), `status` (enum), `email_verified_at` (timestamp), `phone_verified_at` (timestamp), `password` (varchar), `two_factor_secret` (text), `two_factor_recovery_codes` (text), `two_factor_confirmed_at` (timestamp), `parent_id` (bigint), `last_login_at` (timestamp), `remember_token` (varchar), `deleted_at` (timestamp), `created_at` (timestamp), `updated_at` (timestamp)
- **Relationships:** `ownedWarehouse()` [hasOne], `devices()` [hasMany], `warehouseUsers()` [hasMany], `warehouses()` [belongsTo], `customer()` [hasOne], `addresses()` [hasMany], `notifications()` [morphMany], `tokens()` [morphMany], `roles()` [morphTo], `permissions()` [morphTo]

### Model: `UserDevice`
- **Table:** `user_devices`
- **Columns:** `id` (bigint), `user_id` (bigint), `device_id` (varchar), `device_name` (varchar), `fcm_token` (text), `lat` (decimal), `lng` (decimal), `platform` (varchar), `app_version` (varchar), `last_active_at` (timestamp), `created_at` (timestamp), `updated_at` (timestamp)
- **Relationships:** `user()` [belongsTo]

### Model: `Vendor`
- **Table:** `vendors`
- **Columns:** `id` (bigint), `name` (varchar), `phone` (varchar), `email` (varchar), `gstin` (varchar), `address` (text), `user_id` (bigint), `created_at` (timestamp), `updated_at` (timestamp)
- **Relationships:** `user()` [belongsTo]

### Model: `Warehouse`
- **Table:** `warehouses`
- **Columns:** `id` (bigint), `name` (varchar), `platform` (enum), `address` (text), `location` (varchar), `phone` (varchar), `email` (varchar), `logo_path` (varchar), `is_active` (tinyint), `gstin` (varchar), `lat` (decimal), `lng` (decimal), `timezone` (varchar), `currency` (varchar), `user_id` (bigint), `created_at` (timestamp), `updated_at` (timestamp)
- **Relationships:** `ownerUser()` [belongsTo], `warehouseUsers()` [hasMany], `users()` [belongsTo], `stockBatches()` [hasMany], `stockLedgers()` [hasMany], `stockSnapshots()` [hasMany], `orders()` [hasMany], `products()` [hasMany], `expenses()` [hasMany], `shippingZones()` [hasMany], `settings()` [hasMany]

### Model: `WarehouseUser`
- **Table:** `warehouse_users`
- **Columns:** `id` (bigint), `warehouse_id` (bigint), `user_id` (bigint), `role` (enum), `is_active` (tinyint), `joined_at` (timestamp), `created_at` (timestamp), `updated_at` (timestamp)
- **Relationships:** `warehouse()` [belongsTo], `user()` [belongsTo], `deliveries()` [hasMany]

### Model: `Wishlist`
- **Table:** `wishlists`
- **Columns:** `id` (bigint), `user_id` (bigint), `product_variant_id` (bigint), `created_at` (timestamp), `updated_at` (timestamp)
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
| GET | `//` | `AppController@index` | None |
| GET | `/soon` | *Closure* | None |
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

# Core Services Framework

## Infrastructure Service: ImageStorageService

**Namespace:** `App\Services\ImageStorage\ImageStorageService`

**Engine:** Intervention Image **v4.1.5** (Imagick Driver)

### Purpose

Central image service for all uploads across the application.

Responsibilities:

- Secure upload validation
- Automatic raster → WebP conversion
- SVG preservation
- Thumbnail generation
- Atomic file replacement
- URL resolution
- File deletion
- Legacy storage migration
- Laravel filesystem disk abstraction

---

# Storage Rules

## Folder Naming

Always use **Pascal Case** folders.

✅ Examples

```text
Warehouses/Logo
Products/Variants
Category/Images
Brands/Logo
```

Never use lowercase or camelCase.

---

# Image Processing

- Shared `ImageManager` (Imagick)
- Raster images → WebP
- SVG remains unchanged
- Master quality: **85**
- Thumbnail quality: **75**
- Thumbnail size: **200×200** using `scaleDown()`
- Thumbnail path:

```text
Thumbnails/{OriginalFolder}/{filename}
```

---

# Security

Every upload performs:

- MIME allowlist validation (caller may further restrict)
- Double-extension detection (`file.php.jpg`)
- Raster magic-byte validation
- Path traversal protection
- Max file size validation
- ULID filename generation

Filename format:

```text
{slug}_{ulid}.{extension}
```

---

# Public API

## upload()

```php
upload(
    UploadedFile $file,
    string $slug,
    string $folder,
    ?int $maxSizeKb = null,
    ?string $disk = null,
    ?array $allowedTypes = null,
    bool $generateThumb = false
): StoredImageResult
```

Performs validation, security checks, WebP conversion (SVG preserved), storage, optional thumbnail generation, and returns `StoredImageResult`.

---

## replace()

```php
replace(...)
```

- Uploads new image
- Deletes old asset **only after successful upload**
- Regenerates thumbnail if enabled

---

## delete()

```php
delete(string $path, ?string $disk = null): bool
```

- Deletes master image
- Deletes matching thumbnail
- Returns `false` if file is missing
- Never throws for missing files

---

## url()

```php
url(?string $path, ?string $disk = null): ?string
```

Returns the public asset URL.

---

## thumbnailUrl()

```php
thumbnailUrl(?string $path, ?string $disk = null): ?string
```

Returns thumbnail URL or falls back to the master image.

---

## migrateAndBuildThumbnail()

```php
migrateAndBuildThumbnail(
    string $oldRelativePath,
    string $targetBaseFolder,
    ?string $disk = null
): ?string
```

- Flattens legacy folder structures
- Converts raster → WebP
- Preserves SVG
- Generates thumbnail
- Removes empty legacy folders
- Returns new relative path or `null`

---

# Internal Methods

Implementation-only helpers (never call directly):

```text
validate()
assertMimeAllowed()
assertNoDoubleExtension()
assertFileSize()
assertMagicBytes()
storeAsWebp()
generateThumbnailOnDisk()
resolveAllowedTypes()
sanitizeFolder()
buildFilename()
mimeToExtension()
```

---

# StoredImageResult

Successful uploads return:

```php
path
url
filename
size
mime
disk
```

Always save **`$result->path`** to the database, **never** `$result->url`.

---

# Usage

```php
// Upload
$result = $this->imageStorage->upload(...);

// Replace
$result = $this->imageStorage->replace(...);

// Delete
$this->imageStorage->delete($path);

// URL
$this->imageStorage->url($path);

// Thumbnail
$this->imageStorage->thumbnailUrl($path);

// Legacy migration
$this->imageStorage->migrateAndBuildThumbnail(...);
```

---

# Project Notes
- Uses **PWA (Progressive Web App)** with installable support, offline caching, service worker, and web app manifest.
