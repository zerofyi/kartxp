<?php
require 'vendor/autoload.php';

$fixes = [
  'App\\Models\\BarcodePrintJob' => "['warehouse_id', 'product_variant_id', 'quantity', 'template', 'status', 'created_by', 'printed_at']",
  'App\\Models\\Coupon' => "['warehouse_id', 'code', 'name', 'type', 'value', 'min_order_amount', 'max_discount', 'usage_limit', 'used_count', 'per_user_limit', 'applicable_to', 'applicable_ids', 'starts_at', 'ends_at', 'is_active']",
  'App\\Models\\Expense' => "['warehouse_id', 'category', 'amount', 'note', 'attachment_path', 'expense_date', 'created_by']",
  'App\\Models\\JournalEntry' => "['user_id', 'date', 'reference_type', 'reference_id', 'description']",
  'App\\Models\\LoyaltyTransaction' => "['customer_id', 'order_id', 'type', 'points', 'balance_after', 'note', 'created_by']",
  'App\\Models\\OrderStatusLog' => "['order_id', 'from_status', 'to_status', 'note', 'changed_by']",
  'App\\Models\\ReturnItem' => "['return_id', 'order_item_id', 'quantity', 'condition', 'restock']",
  'App\\Models\\ShippingZone' => "['warehouse_id', 'name', 'pincodes', 'radius_km', 'charge', 'free_above', 'is_active']",
  'App\\Models\\Warehouse' => "['name', 'address', 'location', 'phone', 'email', 'logo_path', 'is_active', 'gstin', 'lat', 'lng', 'timezone', 'currency', 'user_id']"
];

foreach ($fixes as $class => $fillable) {
  $path = (new ReflectionClass($class))->getFileName();
  $content = file_get_contents($path);
  $newContent = preg_replace('/protected\s+\$fillable\s*=\s*\[.*?\];/s', 'protected $fillable = ' . $fillable . ';', $content);
  file_put_contents($path, $newContent);
  echo "Fixed $class\n";
}
