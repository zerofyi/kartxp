<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderStatusLog;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class OrderController extends Controller
{
    /**
     * All valid order statuses.
     */
    private const STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];

    /**
     * List all orders with filters.
     */
    public function index(Request $request): Response
    {
        $query = Order::with(['customer', 'warehouse'])
            ->when($request->search, function ($q, $search) {
                $q->where(function ($inner) use ($search) {
                    $inner->where('order_number', 'like', "%{$search}%")
                          ->orWhereHas('customer', fn ($c) => $c->where('name', 'like', "%{$search}%")
                                                                  ->orWhere('phone', 'like', "%{$search}%"));
                });
            })
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->payment_status, fn ($q, $p) => $q->where('payment_status', $p))
            ->when($request->payment_method, fn ($q, $pm) => $q->where('payment_method', $pm))
            ->when($request->warehouse_id, fn ($q, $wid) => $q->where('warehouse_id', $wid))
            ->when($request->channel, fn ($q, $c) => $q->where('order_channel', $c))
            ->when($request->date_from, fn ($q, $d) => $q->whereDate('created_at', '>=', $d))
            ->when($request->date_to, fn ($q, $d) => $q->whereDate('created_at', '<=', $d));

        $orders     = $query->latest()->paginate(20)->withQueryString();
        $warehouses = Warehouse::orderBy('name')->get(['id', 'name']);

        return Inertia::render('Admin/Orders/Index', [
            'orders'     => $orders,
            'warehouses' => $warehouses,
            'statuses'   => self::STATUSES,
            'filters'    => $request->only([
                'search', 'status', 'payment_status', 'payment_method',
                'warehouse_id', 'channel', 'date_from', 'date_to',
            ]),
            'summary' => [
                'total'     => Order::count(),
                'pending'   => Order::where('status', 'pending')->count(),
                'today'     => Order::whereDate('created_at', today())->count(),
                'revenue'   => Order::where('payment_status', 'paid')->sum('total_amount'),
            ],
        ]);
    }

    /**
     * Show a single order detail.
     */
    public function show(Order $order): Response
    {
        $order->load([
            'customer',
            'warehouse',
            'items.product',
            'items.productVariant',
            'payments',
            'statusLogs.createdBy',
            'delivery',
            'coupon',
            'address',
        ]);

        $deliveryAgents = User::role('delivery_agent')
                              ->active()
                              ->orderBy('name')
                              ->get(['id', 'name', 'mobile']);

        return Inertia::render('Admin/Orders/Show', [
            'order'          => $order,
            'statuses'       => self::STATUSES,
            'deliveryAgents' => $deliveryAgents,
        ]);
    }

    /**
     * Update order status with audit log entry.
     */
    public function updateStatus(Request $request, Order $order): RedirectResponse
    {
        $data = $request->validate([
            'status'               => ['required', 'string', Rule::in(self::STATUSES)],
            'note'                 => ['nullable', 'string', 'max:500'],
            'assigned_agent_id'    => ['nullable', 'exists:users,id'],
            'cancellation_reason'  => ['nullable', 'string', 'max:500', 'required_if:status,cancelled'],
        ]);

        DB::transaction(function () use ($data, $order) {
            $previousStatus = $order->status;

            $updatePayload = ['status' => $data['status']];

            if ($data['status'] === 'delivered') {
                $updatePayload['delivered_at'] = now();
            }

            if ($data['status'] === 'cancelled') {
                $updatePayload['cancelled_at']        = now();
                $updatePayload['cancellation_reason'] = $data['cancellation_reason'] ?? null;
            }

            if (! empty($data['assigned_agent_id'])) {
                $updatePayload['assigned_agent_id'] = $data['assigned_agent_id'];
            }

            $order->update($updatePayload);

            // Write status log
            OrderStatusLog::create([
                'order_id'   => $order->id,
                'status'     => $data['status'],
                'note'       => $data['note'] ?? null,
                'created_by' => Auth::id(),
            ]);

            activity()
                ->causedBy(Auth::user())
                ->performedOn($order)
                ->withProperties([
                    'from'   => $previousStatus,
                    'to'     => $data['status'],
                    'note'   => $data['note'] ?? null,
                ])
                ->log('Admin updated order status');
        });

        return redirect()->back()
                         ->with('success', "Order status updated to '{$data['status']}'.");
    }

    /**
     * Export orders as CSV.
     */
    public function export(Request $request): StreamedResponse
    {
        $orders = Order::with(['customer', 'warehouse'])
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->payment_status, fn ($q, $p) => $q->where('payment_status', $p))
            ->when($request->warehouse_id, fn ($q, $wid) => $q->where('warehouse_id', $wid))
            ->when($request->date_from, fn ($q, $d) => $q->whereDate('created_at', '>=', $d))
            ->when($request->date_to, fn ($q, $d) => $q->whereDate('created_at', '<=', $d))
            ->orderBy('created_at')
            ->get();

        $headers = [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="orders_' . now()->format('Ymd_His') . '.csv"',
        ];

        $callback = function () use ($orders) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, [
                'Order #', 'Channel', 'Customer', 'Phone', 'Warehouse',
                'Status', 'Payment Status', 'Payment Method',
                'Subtotal', 'Discount', 'Tax', 'Shipping', 'Total',
                'Created At',
            ]);

            foreach ($orders as $order) {
                fputcsv($handle, [
                    $order->order_number,
                    $order->order_channel,
                    $order->customer?->name ?? 'N/A',
                    $order->customer?->phone ?? 'N/A',
                    $order->warehouse?->name ?? 'N/A',
                    $order->status,
                    $order->payment_status,
                    $order->payment_method,
                    $order->subtotal,
                    $order->discount_amount,
                    $order->tax_amount,
                    $order->shipping_charge,
                    $order->total_amount,
                    $order->created_at->format('Y-m-d H:i:s'),
                ]);
            }

            fclose($handle);
        };

        return response()->stream($callback, 200, $headers);
    }
}
