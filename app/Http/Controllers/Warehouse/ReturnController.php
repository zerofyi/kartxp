<?php

namespace App\Http\Controllers\Warehouse;

use App\Http\Controllers\Controller;
use App\Models\ReturnRequest;
use App\Services\FcmService;
use App\Services\StockService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ReturnController extends Controller
{
    public function __construct(
        private readonly StockService $stockService,
        private readonly FcmService $fcmService,
    ) {}

    /**
     * Resolve the active warehouse ID context safely.
     */
    private function currentWarehouseId(): int
    {
        return Auth::user()->currentWarehouse()->value('warehouses.id')
            ?? abort(403, 'Warehouse session context missing or invalid.');
    }

    /**
     * GET /warehouse/returns
     */
    public function index(Request $request): Response
    {
        $warehouseId = $this->currentWarehouseId();

        $returns = ReturnRequest::with(['order', 'customer'])
            ->whereHas('order', function ($query) use ($warehouseId) {
                $query->where('warehouse_id', $warehouseId);
            })
            ->when($request->input('status'), fn ($q, $s) => $q->where('status', $s))
            ->orderByDesc('created_at')
            ->paginate(25)
            ->withQueryString();

        // Single aggregation lookup query bypassing separate heavy table counts
        $statusStats = ReturnRequest::whereHas('order', function ($query) use ($warehouseId) {
                $query->where('warehouse_id', $warehouseId);
            })
            ->selectRaw("
                COUNT(CASE WHEN status = 'requested' THEN 1 END) as requested,
                COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN refund_amount ELSE 0 END), 0) as total_refunded
            ")
            ->first();

        return Inertia::render('Warehouse/Returns/Index', [
            'returns' => $returns,
            'filters' => $request->only(['status']),
            'stats'   => [
                'requested'      => (int) $statusStats->requested,
                'approved'       => (int) $statusStats->approved,
                'completed'      => (int) $statusStats->completed,
                'total_refunded' => (float) $statusStats->total_refunded,
            ],
        ]);
    }

    /**
     * GET /warehouse/returns/{return}
     */
    public function show(ReturnRequest $return): Response
    {
        if ($return->order->warehouse_id !== $this->currentWarehouseId()) {
            abort(403, 'Requested resource context falls outside authorized managed boundaries.');
        }

        // Fixed relation chain tracking map: replaced old variant pointer with productVariant
        $return->load([
            'order.items.productVariant.product',
            'customer',
            'items.orderItem.productVariant.product',
            'processedBy'
        ]);

        return Inertia::render('Warehouse/Returns/Show', [
            'returnRequest' => $return
        ]);
    }

    /**
     * POST /warehouse/returns/{return}/approve
     */
    public function approve(Request $request, ReturnRequest $return): RedirectResponse
    {
        if ($return->order->warehouse_id !== $this->currentWarehouseId()) {
            abort(403, 'Unauthorized operation action target modification.');
        }

        $validated = $request->validate([
            'refund_amount' => 'required|numeric|min:0',
            'refund_method' => 'required|string|in:bank,cod,wallet,credit',
            'restock'       => 'nullable|boolean',
            'note'          => 'nullable|string|max:500',
        ]);

        DB::transaction(function () use ($return, $validated) {
            $return->update([
                'status'        => 'approved',
                'refund_amount' => $validated['refund_amount'],
                'refund_method' => $validated['refund_method'],
                'note'          => $validated['note'] ?? null,
                'processed_by'  => Auth::id(),
                'processed_at'  => now(),
            ]);

            if ($validated['restock'] ?? false) {
                foreach ($return->items as $item) {
                    if ($item->orderItem && $return->order->warehouse_id) {
                        $this->stockService->adjustStock(
                            $item->orderItem->product_variant_id,
                            $return->order->warehouse_id,
                            $item->quantity,
                            'return',
                            $return->id,
                            'Return approved - processing stock re-allocation run'
                        );
                    }
                }
            }
        });

        if ($return->customer?->user) {
            $this->fcmService->sendToUser($return->customer->user, [
                'title' => 'Return Request Approved',
                'body'  => "Your return request for order #{$return->order->order_number} has been approved. A refund of ₹{$validated['refund_amount']} is being processed.",
            ], ['type' => 'return_approved', 'return_id' => (string) $return->id]);
        }

        return back()->with('success', 'Return requested state resolved to approved.');
    }

    /**
     * POST /warehouse/returns/{return}/reject
     */
    public function reject(Request $request, ReturnRequest $return): RedirectResponse
    {
        if ($return->order->warehouse_id !== $this->currentWarehouseId()) {
            abort(403, 'Unauthorized operation action target modification.');
        }

        $validated = $request->validate([
            'note' => 'required|string|max:500'
        ]);

        $return->update([
            'status'       => 'rejected',
            'note'         => $validated['note'],
            'processed_by' => Auth::id(),
            'processed_at' => now(),
        ]);

        if ($return->customer?->user) {
            $this->fcmService->sendToUser($return->customer->user, [
                'title' => 'Return Request Rejected',
                'body'  => "Your return request for order #{$return->order->order_number} was rejected. Reason: {$validated['note']}",
            ], ['type' => 'return_rejected', 'return_id' => (string) $return->id]);
        }

        return back()->with('success', 'Return request rejected.');
    }
}
