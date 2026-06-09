<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$tables = [
  'accounts', 'banners', 'barcode_print_jobs', 'coupons', 'expenses',
  'journal_entries', 'loyalty_transactions', 'order_status_logs',
  'return_items', 'shipping_zones', 'warehouses'
];
foreach($tables as $t) {
  echo "=== $t ===\n";
  echo implode(', ', Illuminate\Support\Facades\Schema::getColumnListing($t)) . "\n";
}
