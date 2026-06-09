<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $user = Auth::user();
        $customer = $user->customer;

        $stats = [
            'total_orders' => Order::where('customer_id', $customer?->id)->count(),
            'loyalty_points' => $customer?->loyalty_points ?? 0,
            'total_spent' => $customer?->total_spent ?? 0,
        ];

        $recentOrders = Order::where('customer_id', $customer?->id)
            ->withCount('items')
            ->latest()
            ->limit(5)
            ->get(['id', 'order_number', 'status', 'total_amount', 'created_at']);

        return Inertia::render('Customer/Dashboard', [
            'stats' => $stats,
            'recent_orders' => $recentOrders,
            'customer' => $customer,
        ]);
    }
}
