<?php

namespace App\Http\Controllers\Agent;

use App\Http\Controllers\Controller;
use App\Models\Delivery;
use App\Models\DeliveryAttempt;
use App\Models\Order;
use App\Models\OrderStatusLog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DeliveryController extends Controller
{
    public function index(Request $request): Response
    {
        $agentId = Auth::id();

        $deliveries = Delivery::with([
            'order:id,order_number,total_amount,payment_status,notes',
            'order.customer:id,name,phone',
            'order.address:id,line1,line2,city,pincode,state',
        ])
            ->where('agent_id', $agentId)
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->latest('assigned_at')
            ->paginate(20);

        return Inertia::render('Agent/Deliveries/Index', [
            'deliveries' => $deliveries,
            'filters'    => $request->only(['status']),
        ]);
    }

    public function show(Delivery $delivery): Response
    {
        // Gate: agent can only see their own deliveries
        abort_if($delivery->agent_id !== Auth::id(), 403);

        $delivery->load([
            'order',
            'order.items.productVariant.product',
            'order.customer',
            'order.address',
            'attempts',
        ]);

        return Inertia::render('Agent/Deliveries/Show', [
            'delivery' => $delivery,
        ]);
    }

    public function markPicked(Delivery $delivery): RedirectResponse
    {
        abort_if($delivery->agent_id !== Auth::id(), 403);

        $delivery->update(['status' => 'picked', 'picked_at' => now()]);
        $this->logOrderStatus($delivery->order, 'picked', 'Picked up by agent');

        return back()->with('success', 'Marked as picked');
    }

    public function markOutForDelivery(Delivery $delivery): RedirectResponse
    {
        abort_if($delivery->agent_id !== Auth::id(), 403);

        $delivery->update(['status' => 'out_for_delivery']);
        $this->logOrderStatus($delivery->order, 'dispatched', 'Out for delivery');

        return back()->with('success', 'Marked as out for delivery');
    }

    public function markDelivered(Request $request, Delivery $delivery): RedirectResponse
    {
        abort_if($delivery->agent_id !== Auth::id(), 403);

        $request->validate([
            'proof_image'    => 'nullable|string',
            'signature_path' => 'nullable|string',
            'notes'          => 'nullable|string|max:500',
        ]);

        DB::transaction(function () use ($delivery, $request) {
            $delivery->update([
                'status'         => 'delivered',
                'delivered_at'   => now(),
                'proof_image'    => $request->proof_image,
                'signature_path' => $request->signature_path,
                'notes'          => $request->notes,
            ]);

            $delivery->order->update([
                'status'       => 'delivered',
                'delivered_at' => now(),
            ]);

            $this->logOrderStatus($delivery->order, 'delivered', 'Delivered by agent ' . Auth::user()->name);
        });

        return back()->with('success', 'Order marked as delivered');
    }

    public function markFailed(Request $request, Delivery $delivery): RedirectResponse
    {
        abort_if($delivery->agent_id !== Auth::id(), 403);

        $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        DB::transaction(function () use ($delivery, $request) {
            $delivery->update(['status' => 'failed']);

            DeliveryAttempt::create([
                'delivery_id'  => $delivery->id,
                'attempted_at' => now(),
                'reason'       => $request->reason,
                'lat'          => $request->lat,
                'lng'          => $request->lng,
            ]);

            $this->logOrderStatus($delivery->order, $delivery->order->status, 'Delivery attempt failed: ' . $request->reason);
        });

        return back()->with('error', 'Delivery marked as failed');
    }

    private function logOrderStatus(Order $order, string $toStatus, string $note): void
    {
        OrderStatusLog::create([
            'order_id'   => $order->id,
            'from_status' => $order->status,
            'to_status'  => $toStatus,
            'note'       => $note,
            'changed_by' => Auth::id(),
        ]);
    }
}
