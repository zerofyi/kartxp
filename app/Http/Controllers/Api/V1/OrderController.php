<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\ReturnRequest;
use App\Services\OrderService;
use App\Services\PdfService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    public function __construct(
        private readonly OrderService $orderService,
        private readonly PdfService $pdfService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $customer = $request->user()->customer;
        if (! $customer) {
            return response()->json(['success' => false, 'message' => 'Customer profile not found.'], 422);
        }

        $orders = Order::where('customer_id', $customer->id)
            ->with(['items' => fn ($q) => $q->limit(3)])
            ->orderByDesc('created_at')
            ->paginate(15);

        return response()->json(['success' => true, 'data' => [
            'orders'     => $orders->items(),
            'pagination' => [
                'total'        => $orders->total(),
                'per_page'     => $orders->perPage(),
                'current_page' => $orders->currentPage(),
                'last_page'    => $orders->lastPage(),
            ],
        ]]);
    }

    public function show(Request $request, Order $order): JsonResponse
    {
        if ($order->customer_id !== $request->user()->customer?->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 403);
        }

        $order->load(['items.variant.product', 'payments', 'delivery', 'statusLogs']);

        return response()->json(['success' => true, 'data' => $order]);
    }

    public function cancel(Request $request, Order $order): JsonResponse
    {
        if ($order->customer_id !== $request->user()->customer?->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 403);
        }

        $validated = $request->validate(['reason' => 'nullable|string|max:500']);

        if (! in_array($order->status, ['pending', 'confirmed'])) {
            return response()->json(['success' => false, 'message' => 'Order cannot be cancelled at this stage.'], 422);
        }

        DB::transaction(function () use ($order, $validated, $request) {
            $this->orderService->transitionStatus(
                $order,
                'cancelled',
                $request->user(),
                $validated['reason'] ?? 'Cancelled by customer'
            );
            $order->update([
                'cancelled_at'        => now(),
                'cancellation_reason' => $validated['reason'] ?? null,
            ]);
        });

        return response()->json(['success' => true, 'message' => 'Order cancelled.']);
    }

    public function track(Request $request, Order $order): JsonResponse
    {
        if ($order->customer_id !== $request->user()->customer?->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 403);
        }

        $order->load(['statusLogs', 'delivery.agent:id,name,mobile']);

        return response()->json(['success' => true, 'data' => [
            'status'      => $order->status,
            'status_logs' => $order->statusLogs,
            'delivery'    => $order->delivery,
        ]]);
    }

    public function invoice(Request $request, Order $order): \Illuminate\Http\Response
    {
        if ($order->customer_id !== $request->user()->customer?->id) {
            abort(403);
        }

        $pdf = $this->pdfService->generateInvoice($order);

        return response($pdf, 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => "inline; filename=invoice-{$order->order_number}.pdf",
        ]);
    }

    public function createReturn(Request $request, Order $order): JsonResponse
    {
        if ($order->customer_id !== $request->user()->customer?->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 403);
        }

        if ($order->status !== 'delivered') {
            return response()->json(['success' => false, 'message' => 'Only delivered orders can be returned.'], 422);
        }

        $returnWindowDays = (int) (\App\Models\Setting::get('app.return_window_days') ?? 7);
        if ($order->delivered_at && $order->delivered_at->diffInDays(now()) > $returnWindowDays) {
            return response()->json(['success' => false, 'message' => "Return window of {$returnWindowDays} days has passed."], 422);
        }

        $validated = $request->validate([
            'reason'   => 'required|string|max:1000',
            'images'   => 'nullable|array|max:3',
            'images.*' => 'image|max:2048',
        ]);

        $imagePaths = [];
        foreach ($request->file('images', []) as $image) {
            $imagePaths[] = $image->store('returns', 'public');
        }

        $return = ReturnRequest::create([
            'order_id'    => $order->id,
            'customer_id' => $order->customer_id,
            'reason'      => $validated['reason'],
            'status'      => 'requested',
            'images'      => $imagePaths ?: null,
        ]);

        return response()->json(['success' => true, 'data' => $return, 'message' => 'Return request submitted.'], 201);
    }
}
