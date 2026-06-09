<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    public function index(): Response
    {
        $customer = Auth::user()->customer;

        $orders = Order::where('customer_id', $customer?->id)
            ->withCount('items')
            ->latest()
            ->paginate(15);

        return Inertia::render('Customer/Orders/Index', [
            'orders' => $orders,
        ]);
    }

    public function show(Order $order): Response
    {
        $customer = Auth::user()->customer;
        abort_if($order->customer_id !== $customer?->id, 403);

        $order->load([
            'items.productVariant.product',
            'warehouse:id,name,phone,email',
            'deliveries.attempts',
            'statusLogs' => fn($q) => $q->latest()
        ]);

        return Inertia::render('Customer/Orders/Show', [
            'order' => $order,
        ]);
    }
}
