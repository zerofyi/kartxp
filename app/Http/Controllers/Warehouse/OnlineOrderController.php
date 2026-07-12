<?php

namespace App\Http\Controllers\Warehouse;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\User;
use App\Services\FcmService;
use App\Services\OrderService;
use App\Services\PdfService;
use App\Services\StockService;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class OnlineOrderController extends Controller
{
    public function __construct(
        private readonly OrderService $orderService,
        private readonly StockService $stockService,
        private readonly PdfService $pdfService,
        private readonly FcmService $fcmService,
    ) {}

    /**
     * Resolve the active warehouse ID context for the session.
     */
    private function currentWarehouseId(): int
    {
        return Auth::user()->ownedWarehouse()->value('warehouses.id')
            ?? abort(403, 'Warehouse session context missing or invalid.');
    }

    /**
     * GET /warehouse/online-orders
     */
    public function index(Request $request): Response
    {
        $warehouseId = $this->currentWarehouseId();
        $today = now()->toDateString();

        $query = Order::query()
            ->with(['customer'])
            ->withCount('items')
            ->where('warehouse_id', $warehouseId)
            ->where('order_channel', 'online')
            ->whereNotNull('payment_method')
            ->when($request->input('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->input('payment_status'), fn ($q, $s) => $q->where('payment_status', $s))
            ->when($request->input('search'), fn ($q, $s) =>
                $q->where(fn ($inner) =>
                    $inner->where('order_number', 'like', "%{$s}%")
                        ->orWhereHas('customer', fn ($c) =>
                            $c->where('name', 'like', "%{$s}%")
                              ->orWhere('phone', 'like', "%{$s}%")
                        )
                )
            )
            ->when($request->input('from'), fn ($q, $d) => $q->whereDate('created_at', '>=', $d))
            ->when($request->input('to'),   fn ($q, $d) => $q->whereDate('created_at', '<=', $d))
            ->orderByDesc('created_at');

        $orders = $query->paginate(25)->withQueryString();

        // Optimized single grouped state count aggregation lookup
        $statusCounts = Order::query()
            ->where('warehouse_id', $warehouseId)
            ->where('order_channel', 'online')
            ->whereNotNull('payment_method')
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        $todayStats = Order::query()
            ->where('warehouse_id', $warehouseId)
            ->where('order_channel', 'online')
            ->whereNotNull('payment_method')
            ->whereDate('created_at', $today)
            ->selectRaw('COUNT(*) as count, COALESCE(SUM(total_amount), 0) as revenue')
            ->first();

        // Load active delivery agents assigned to this active warehouse branch
        $agents = User::whereHas('warehouseUsers', function($q) use ($warehouseId) {
            $q->where('warehouse_id', $warehouseId)->where('role', 'delivery_agent');
        })->select(['id', 'name', 'mobile'])->get();

        return Inertia::render('Warehouse/OnlineOrders/Index', [
            'orders'   => $orders,
            'agents'   => $agents,
            'filters'  => $request->only(['status', 'payment_status', 'search', 'from', 'to']),
            'statuses' => ['pending', 'confirmed', 'processing', 'packed', 'dispatched', 'delivered', 'cancelled'],
            'stats'    => [
                'today_count'   => (int) $todayStats->count,
                'today_revenue' => (float) $todayStats->revenue,
                'pending'       => (int) ($statusCounts['pending']    ?? 0),
                'confirmed'     => (int) ($statusCounts['confirmed']  ?? 0),
                'processing'    => (int) ($statusCounts['processing'] ?? 0),
                'dispatched'    => (int) ($statusCounts['dispatched'] ?? 0),
            ],
        ]);
    }

    /**
     * GET /warehouse/online-orders/{order}
     */
    public function show(Order $order): Response
    {
        $warehouseId = $this->currentWarehouseId();

        if ($order->warehouse_id !== $warehouseId) {
            abort(403, 'Requested order dataset falls outside managed warehouse scope.');
        }

        // Fixed relationship map loading rule to use productVariant instead of variant
        $order->load([
            'customer',
            'items.productVariant.product',
            'payments',
            'delivery.agent',
            'statusLogs.changedBy'
        ]);

        $agents = User::whereHas('warehouseUsers', function($q) use ($warehouseId) {
            $q->where('warehouse_id', $warehouseId)->where('role', 'delivery_agent');
        })->select(['id', 'name', 'mobile'])->get();

        return Inertia::render('Warehouse/OnlineOrders/Show', [
            'order'              => $order,
            'agents'             => $agents,
            'available_statuses' => ['confirmed', 'processing', 'packed', 'dispatched', 'delivered', 'cancelled']
        ]);
    }

    /**
     * POST /warehouse/online-orders/{order}/status
     */
    public function updateStatus(Request $request, Order $order): RedirectResponse
    {
        if ($order->warehouse_id !== $this->currentWarehouseId()) {
            abort(403, 'Unauthorized scope mutation attempt.');
        }

        $validated = $request->validate([
            'status' => 'required|in:confirmed,processing,packed,dispatched,delivered,cancelled',
            'note'   => 'nullable|string|max:500',
        ]);

        $this->orderService->transitionStatus($order, $validated['status'], Auth::user(), $validated['note'] ?? '');

        if ($order->customer?->user) {
            $statusLabels = [
                'confirmed'  => 'confirmed',
                'processing' => 'being processed',
                'packed'     => 'packed and ready',
                'dispatched' => 'dispatched',
                'delivered'  => 'delivered',
                'cancelled'  => 'cancelled',
            ];

            $label = $statusLabels[$validated['status']] ?? $validated['status'];
            $this->fcmService->sendToUser($order->customer->user, [
                'title' => 'Order Update',
                'body'  => "Your order #{$order->order_number} has been {$label}.",
            ], ['type' => 'order_status', 'order_id' => (string) $order->id]);
        }

        return back()->with('success', 'Order status track configuration updated.');
    }

    /**
     * POST /warehouse/online-orders/{order}/assign-agent
     */
    public function assignAgent(Request $request, Order $order): RedirectResponse
    {
        if ($order->warehouse_id !== $this->currentWarehouseId()) {
            abort(403, 'Unauthorized route parameter manipulation.');
        }

        $validated = $request->validate(['agent_id' => 'required|exists:users,id']);

        $order->update(['assigned_agent_id' => $validated['agent_id']]);

        \App\Models\Delivery::updateOrCreate(
            ['order_id' => $order->id],
            [
                'agent_id'    => $validated['agent_id'],
                'status'      => 'assigned',
                'assigned_at' => now(),
            ]
        );

        $agent = User::find($validated['agent_id']);
        if ($agent) {
            $this->fcmService->sendToUser($agent, [
                'title' => 'New Delivery Assigned',
                'body'  => "Order #{$order->order_number} has been assigned to you.",
            ], ['type' => 'delivery_assigned', 'order_id' => (string) $order->id]);
        }

        return back()->with('success', 'Fulfillment delivery agent assigned.');
    }

    /**
     * POST /warehouse/online-orders/{order}/assign-staff
     */
    public function assignStaff(Request $request, Order $order): RedirectResponse
    {
        if ($order->warehouse_id !== $this->currentWarehouseId()) {
            abort(403);
        }

        $validated = $request->validate(['staff_id' => 'required|exists:users,id']);
        $order->update(['assigned_agent_id' => $validated['staff_id']]);

        return back()->with('success', 'Internal facility operator linked to payload reference.');
    }

    /**
     * GET /warehouse/online-orders/{order}/packing-slip
     */
    public function printPackingSlip(Order $order): \Illuminate\Http\Response
    {
        if ($order->warehouse_id !== $this->currentWarehouseId()) {
            abort(403, 'Unauthorized warehouse asset access.');
        }

        // Explicitly preload the correct model mapping to bypass the missing "variant" relation error inside PdfService
        $order->load(['customer', 'items.productVariant.product']);

        $pdf = $this->pdfService->generatePackingSlip($order);

        return response($pdf, 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => "inline; filename=packing-{$order->order_number}.pdf",
        ]);
    }

    /**
     * GET /warehouse/online-orders/{order}/invoice
     */
    public function printInvoice(Order $order): \Illuminate\Http\Response
    {
        if ($order->warehouse_id !== $this->currentWarehouseId()) {
            abort(403);
        }

        $order->load(['customer', 'items.productVariant.product', 'payments']);
        $pdf = $this->pdfService->generateInvoice($order);

        return response($pdf, 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => "inline; filename=invoice-{$order->order_number}.pdf",
        ]);
    }

    /**
     * POST /warehouse/online-orders/bulk-status
     */
    public function bulkUpdateStatus(Request $request): RedirectResponse
    {
        $warehouseId = $this->currentWarehouseId();

        $validated = $request->validate([
            'order_ids'   => 'required|array',
            'order_ids.*' => 'integer|exists:orders,id',
            'status'      => 'required|in:confirmed,processing,packed,dispatched,cancelled',
        ]);

        $orders = Order::whereIn('id', $validated['order_ids'])
            ->where('warehouse_id', $warehouseId)
            ->get();

        foreach ($orders as $order) {
            $this->orderService->transitionStatus($order, $validated['status'], Auth::user(), 'Bulk modification protocol run');
        }

        return back()->with('success', $orders->count() . ' orders processed cleanly.');
    }

    /**
     * POST /warehouse/online-orders/bulk-assign
     */
    public function bulkAssignAgent(Request $request): RedirectResponse
    {
        $warehouseId = $this->currentWarehouseId();

        $validated = $request->validate([
            'order_ids'   => 'required|array',
            'order_ids.*' => 'integer|exists:orders,id',
            'agent_id'    => 'required|exists:users,id',
        ]);

        $affectedCount = Order::whereIn('id', $validated['order_ids'])
            ->where('warehouse_id', $warehouseId)
            ->update(['assigned_agent_id' => $validated['agent_id']]);

        if ($affectedCount > 0) {
            foreach ($validated['order_ids'] as $orderId) {
                \App\Models\Delivery::updateOrCreate(
                    ['order_id' => $orderId],
                    ['agent_id' => $validated['agent_id'], 'status' => 'assigned', 'assigned_at' => now()]
                );
            }
        }

        return back()->with('success', 'Agent linked to ' . $affectedCount . ' valid warehouse manifests.');
    }
}
