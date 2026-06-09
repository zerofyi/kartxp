<?php

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

// Extract ENUM values from actual database schema
$tables = DB::select('SHOW TABLES');
$tableKey = "Tables_in_" . env('DB_DATABASE', 'ghorerbazar');

$enums = [];

foreach ($tables as $tableObj) {
    $table = (array)$tableObj;
    $tableName = array_values($table)[0];
    
    $columns = DB::select("SHOW COLUMNS FROM {$tableName}");
    foreach ($columns as $column) {
        if (str_starts_with($column->Type, 'enum(')) {
            // Extract enum values
            preg_match_all("/'([^']+)'/", $column->Type, $matches);
            $enums["{$tableName}.{$column->Field}"] = $matches[1];
        }
    }
}

print_r($enums);
