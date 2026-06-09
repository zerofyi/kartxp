<?php

namespace App\Http\Controllers\Agent;

use App\Http\Controllers\Controller;
use App\Models\Delivery;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $agentId = Auth::id();

        // Stats shaped to match Agent/Dashboard.tsx props
        $stats = [
            'assigned_today' => Delivery::where('agent_id', $agentId)
                ->whereDate('assigned_at', today())
                ->count(),

            'completed_today' => Delivery::where('agent_id', $agentId)
                ->whereDate('delivered_at', today())
                ->where('status', 'delivered')
                ->count(),

            'failed_today' => Delivery::where('agent_id', $agentId)
                ->whereDate('assigned_at', today())
                ->where('status', 'failed')
                ->count(),

            'total_pending' => Delivery::where('agent_id', $agentId)
                ->whereIn('status', ['assigned', 'picked', 'out_for_delivery'])
                ->count(),
        ];

        // Today's deliveries for table — shape matches what the page expects
        $todayDeliveries = Delivery::with([
            'order:id,order_number,address_snapshot',
            'order.customer:id,name,phone',
        ])
            ->where('agent_id', $agentId)
            ->whereDate('assigned_at', today())
            ->latest('assigned_at')
            ->get(['id', 'order_id', 'status', 'assigned_at']);

        return Inertia::render('Agent/Dashboard', [
            'stats'            => $stats,
            'today_deliveries' => $todayDeliveries,
        ]);
    }
}
