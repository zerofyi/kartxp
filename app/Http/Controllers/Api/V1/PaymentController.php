<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;
use App\Services\FcmService;
use App\Services\OrderService;
use App\Services\PhonePeService;
use App\Services\StockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PaymentController extends Controller
{
    public function __construct(
        private readonly PhonePeService $phonePeService,
        private readonly OrderService $orderService,
        private readonly StockService $stockService,
        private readonly FcmService $fcmService,
    ) {}

    /**
     * POST /api/v1/payments/phonepe/callback
     * PhonePe server-to-server callback (no auth, VerifyPhonePeWebhook middleware applied via route)
     */
    public function callback(Request $request): JsonResponse
    {
        $responsePayload = $request->input('response');

        try {
            $decoded = json_decode(base64_decode($responsePayload), true);
        } catch (\Throwable $e) {
            Log::error('PhonePe callback: invalid payload', ['raw' => $responsePayload]);

            return response()->json(['code' => 'BAD_REQUEST'], 400);
        }

        $transactionId  = $decoded['data']['merchantTransactionId'] ?? null;
        $code           = $decoded['code'] ?? '';
        $gatewayOrderId = $decoded['data']['transactionId'] ?? null;

        if (! $transactionId) {
            return response()->json(['code' => 'BAD_REQUEST'], 400);
        }

        // Idempotency: check if already processed
        $payment = Payment::where('transaction_id', $transactionId)->first();

        if (! $payment) {
            Log::warning('PhonePe callback: no matching payment record', ['tx' => $transactionId]);

            return response()->json(['code' => 'SUCCESS']); // Acknowledge anyway
        }

        if ($payment->status === 'success') {
            return response()->json(['code' => 'SUCCESS']); // Already processed
        }

        $order = Order::find($payment->order_id);

        if (! $order) {
            return response()->json(['code' => 'SUCCESS']);
        }

        DB::transaction(function () use ($payment, $order, $code, $gatewayOrderId, $decoded) {
            if ($code === 'PAYMENT_SUCCESS') {
                // Update payment
                $payment->update([
                    'status'           => 'success',
                    'gateway_order_id' => $gatewayOrderId,
                    'payload'          => $decoded,
                ]);

                // Update order
                $order->update(['payment_status' => 'paid', 'status' => 'confirmed']);

                // Convert reservations → actual stock deductions
                if ($order->warehouse_id) {
                    $this->stockService->convertReservationToDeduction($order->id);
                }

                // Log status change
                $this->orderService->transitionStatus($order, 'confirmed', $order->createdBy ?? auth()->user() ?? new \App\Models\User, 'Payment confirmed via PhonePe');

                // Send FCM notification to customer
                if ($order->customer?->user) {
                    $this->fcmService->sendToUser($order->customer->user, [
                        'title' => 'Order Confirmed!',
                        'body'  => "Your order #{$order->order_number} has been confirmed.",
                    ], ['type' => 'order_confirmed', 'order_id' => (string) $order->id]);
                }
            } elseif (in_array($code, ['PAYMENT_DECLINED', 'PAYMENT_ERROR', 'TIMED_OUT'])) {
                // Update payment
                $payment->update(['status' => 'failed', 'payload' => $decoded]);

                // Update order
                $order->update(['payment_status' => 'failed']);

                // Release stock reservations
                if ($order->warehouse_id) {
                    foreach ($order->items as $item) {
                        $this->stockService->release($item->variant_id, $order->warehouse_id, $order->id);
                    }
                }

                // Notify customer
                if ($order->customer?->user) {
                    $this->fcmService->sendToUser($order->customer->user, [
                        'title' => 'Payment Failed',
                        'body'  => "Your payment for order #{$order->order_number} failed. Please try again.",
                    ], ['type' => 'payment_failed', 'order_id' => (string) $order->id]);
                }
            } else {
                Log::info('PhonePe callback: pending/unknown code', ['code' => $code, 'tx' => $payment->transaction_id]);
            }
        });

        return response()->json(['code' => 'SUCCESS']);
    }

    /**
     * GET /api/v1/payments/phonepe/status/{order}
     */
    public function status(Request $request, Order $order): JsonResponse
    {
        // Authorization: own order only
        if ($order->customer_id !== $request->user()->customer?->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 403);
        }

        $payment = Payment::where('order_id', $order->id)->latest()->first();

        if (! $payment || $payment->status !== 'pending') {
            return response()->json([
                'success' => true,
                'data'    => [
                    'order_status'  => $order->fresh()->status,
                    'payment_status' => $order->fresh()->payment_status,
                    'payment'       => $payment?->only(['status', 'transaction_id']),
                ],
            ]);
        }

        // Check live status from PhonePe
        $result = $this->phonePeService->checkStatus($payment->transaction_id);

        return response()->json([
            'success' => true,
            'data'    => [
                'order_status'   => $order->fresh()->status,
                'payment_status' => $order->fresh()->payment_status,
                'phonepe_code'   => $result['status'],
                'payment'        => $payment->fresh()?->only(['status', 'transaction_id']),
            ],
        ]);
    }

    /**
     * GET /api/v1/payments/phonepe/redirect
     */
    public function redirect(Request $request): \Illuminate\Http\RedirectResponse
    {
        $orderId = $request->query('order');

        // Redirect to app deeplink or web success page
        return redirect()->away(config('app.url') . "/payment/result?order={$orderId}");
    }
}
