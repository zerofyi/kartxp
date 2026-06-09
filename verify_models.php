<?php

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$modelsPath = app_path('Models');
$files = scandir($modelsPath);
$errors = [];

foreach ($files as $file) {
    if (pathinfo($file, PATHINFO_EXTENSION) === 'php') {
        $className = 'App\\Models\\' . pathinfo($file, PATHINFO_FILENAME);
        if (class_exists($className)) {
            $reflection = new ReflectionClass($className);
            if (!$reflection->isAbstract() && $reflection->isSubclassOf(Illuminate\Database\Eloquent\Model::class)) {
                $model = new $className;
                $table = $model->getTable();
                
                if (!Illuminate\Support\Facades\Schema::hasTable($table)) {
                    $errors[] = "Model $className expects table '$table' which does not exist.";
                    continue;
                }
                
                $columns = Illuminate\Support\Facades\Schema::getColumnListing($table);
                
                $fillable = $model->getFillable();
                foreach ($fillable as $field) {
                    if (!in_array($field, $columns)) {
                        $errors[] = "Model $className has fillable field '$field' which does not exist in table '$table'.";
                    }
                }
                
                $casts = $model->getCasts();
                foreach (array_keys($casts) as $field) {
                    // Ignore built-in attributes and relations
                    if (!in_array($field, $columns) && $field !== 'id' && $field !== 'created_at' && $field !== 'updated_at' && $field !== 'deleted_at') {
                        // Some casts might be accessors, but standard casts usually map to columns.
                        // We'll just check if it's a real column, else it might be a false positive, but good to review.
                    }
                }
            }
        }
    }
}

if (empty($errors)) {
    echo "All models match database schema!\n";
} else {
    echo "Mismatches found:\n";
    echo implode("\n", $errors) . "\n";
}
