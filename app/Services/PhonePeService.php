<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Payment;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class PhonePeService
{
    private string $merchantId;
    private string $saltKey;
    private int    $saltIndex;
    private string $baseUrl;

    public function __construct()
    {
        $this->merchantId = config('phonepe.merchant_id');
        $this->saltKey    = config('phonepe.salt_key');
        $this->saltIndex  = (int) config('phonepe.salt_index', 1);
        $this->baseUrl    = config('phonepe.base_url');
    }

    /**
     * Initiate a payment request with PhonePe.
     * Returns ['success', 'payment_url', 'transaction_id', 'message'].
     */
    public function initiatePayment(Order $order, string $mobileNumber): array
    {
        $transactionId = 'GB' . $order->id . 'T' . time();
        $amountInPaise = (int) round($order->total_amount * 100);

        $payload = [
            'merchantId'            => $this->merchantId,
            'merchantTransactionId' => $transactionId,
            'merchantUserId'        => 'USER' . ($order->customer_id ?? 'GUEST'),
            'amount'                => $amountInPaise,
            'redirectUrl'           => config('phonepe.redirect_url') . '?order=' . $order->id,
            'redirectMode'          => 'REDIRECT',
            'callbackUrl'           => config('phonepe.callback_url'),
            'mobileNumber'          => preg_replace('/[^0-9]/', '', $mobileNumber),
            'paymentInstrument'     => ['type' => 'PAY_PAGE'],
        ];

        $base64Payload = base64_encode(json_encode($payload));
        $checksum      = $this->buildChecksum($base64Payload, '/pg/v1/pay');

        try {
            $response = Http::withHeaders([
                'Content-Type'  => 'application/json',
                'X-VERIFY'      => $checksum,
                'X-MERCHANT-ID' => $this->merchantId,
            ])->timeout(30)->post("{$this->baseUrl}/pg/v1/pay", [
                'request' => $base64Payload,
            ]);

            $body = $response->json();

            if ($response->successful() && ($body['success'] ?? false)) {
                $payUrl = $body['data']['instrumentResponse']['redirectInfo']['url'] ?? null;

                // Persist payment record
                Payment::updateOrCreate(
                    ['order_id' => $order->id, 'type' => 'receipt'],
                    [
                        'customer_id'      => $order->customer_id,
                        'amount'           => $order->total_amount,
                        'method'           => 'phonepe',
                        'type'             => 'receipt',
                        'gateway'          => 'phonepe',
                        'transaction_id'   => $transactionId,
                        'gateway_order_id' => $transactionId,
                        'status'           => 'pending',
                        'payload'          => $body,
                    ]
                );

                return ['success' => true, 'payment_url' => $payUrl, 'transaction_id' => $transactionId, 'message' => 'Payment initiated'];
            }

            Log::warning('PhonePe initiate failed', ['response' => $body]);

            return ['success' => false, 'payment_url' => null, 'transaction_id' => null, 'message' => $body['message'] ?? 'Payment initiation failed'];
        } catch (\Throwable $e) {
            Log::error('PhonePe initiate exception', ['error' => $e->getMessage()]);

            return ['success' => false, 'payment_url' => null, 'transaction_id' => null, 'message' => 'Payment gateway error'];
        }
    }

    /**
     * Check payment status via PhonePe Status API.
     */
    public function checkStatus(string $transactionId): array
    {
        $endpoint  = "/pg/v1/status/{$this->merchantId}/{$transactionId}";
        $checksum  = $this->buildChecksum('', $endpoint);

        try {
            $response = Http::withHeaders([
                'Content-Type'  => 'application/json',
                'X-VERIFY'      => $checksum,
                'X-MERCHANT-ID' => $this->merchantId,
            ])->timeout(15)->get("{$this->baseUrl}{$endpoint}");

            $body = $response->json();

            return [
                'success' => $response->successful(),
                'status'  => $body['code'] ?? 'UNKNOWN',
                'data'    => $body,
            ];
        } catch (\Throwable $e) {
            Log::error('PhonePe status check failed', ['tx' => $transactionId, 'error' => $e->getMessage()]);

            return ['success' => false, 'status' => 'ERROR', 'data' => []];
        }
    }

    /**
     * Initiate a refund via PhonePe Refund API.
     */
    public function refund(string $originalTransactionId, float $amount, string $refundTransactionId): array
    {
        $amountInPaise = (int) round($amount * 100);

        $payload = [
            'merchantId'                  => $this->merchantId,
            'merchantUserId'              => 'REFUND',
            'originalMerchantTransactionId' => $originalTransactionId,
            'merchantTransactionId'       => $refundTransactionId,
            'amount'                      => $amountInPaise,
            'callbackUrl'                 => config('phonepe.callback_url'),
        ];

        $base64Payload = base64_encode(json_encode($payload));
        $checksum      = $this->buildChecksum($base64Payload, '/pg/v1/refund');

        try {
            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
                'X-VERIFY'     => $checksum,
            ])->timeout(30)->post("{$this->baseUrl}/pg/v1/refund", [
                'request' => $base64Payload,
            ]);

            $body = $response->json();

            return [
                'success' => $response->successful() && ($body['success'] ?? false),
                'message' => $body['message'] ?? 'Refund processed',
                'data'    => $body,
            ];
        } catch (\Throwable $e) {
            Log::error('PhonePe refund failed', ['original_tx' => $originalTransactionId, 'error' => $e->getMessage()]);

            return ['success' => false, 'message' => 'Refund failed', 'data' => []];
        }
    }

    /**
     * Verify a PhonePe server-to-server callback signature.
     */
    public function verifyCallback(string $responsePayload, string $xVerify): bool
    {
        $endpoint = '/pg/v1/status/' . $this->merchantId;
        $expected = $this->buildChecksum($responsePayload, $endpoint);

        return hash_equals($expected, $xVerify);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internals
    // ─────────────────────────────────────────────────────────────────────────

    private function buildChecksum(string $payload, string $endpoint): string
    {
        $toHash = $payload . $endpoint . $this->saltKey;
        $hash   = hash('sha256', $toHash);

        return $hash . '###' . $this->saltIndex;
    }
}
