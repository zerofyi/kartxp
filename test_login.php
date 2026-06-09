<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$request = Illuminate\Http\Request::create('/login', 'POST', ['email' => 'admin@kartxp.com', 'password' => 'password']);
$response = $kernel->handle($request);
echo "STATUS: " . $response->getStatusCode() . "\n";
echo "LOCATION: " . $response->headers->get('Location') . "\n";
