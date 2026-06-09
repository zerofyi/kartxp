<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$user = \App\Models\User::find(1);
Auth::login($user);

$request = Illuminate\Http\Request::create('/dashboard', 'GET');
$response = app()->handle($request);

echo "STATUS: " . $response->getStatusCode() . "\n";
echo "LOCATION: " . $response->headers->get('Location') . "\n";
