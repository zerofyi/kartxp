<?php

namespace App\Services;

use App\Models\Order;
use App\Models\ProductVariant;
use App\Models\Purchase;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;

class PdfService
{
    private string $disk = 'local';

    /**
     * Generate a GST-compliant invoice PDF for an order.
     */
    public function generateInvoice(Order $order): string
    {
        // Fixed: Swap 'items.variant.product' out for 'items.productVariant.product'
        $order->load(['customer', 'items.productVariant.product', 'payments', 'warehouse']);

        $path = "invoices/invoice-{$order->order_number}.pdf";

        $pdf = Pdf::loadView('pdf.invoice', [
            'order'    => $order,
            'settings' => $this->getSettings(),
        ])->setPaper('a4');

        $output = $pdf->output();

        Storage::disk($this->disk)->put($path, $output);

        // Ensure it returns raw binary stream chunks so your controller responses map cleanly
        return $output;
    }

    /**
     * Generate a packing slip PDF (no prices).
     */
    public function generatePackingSlip(Order $order): string
    {
        // Fixed: Swap out the non-existent 'variant' relation for the correct 'productVariant'
        $order->load(['customer', 'items.productVariant.product', 'address', 'warehouse']);

        $path = "packing-slips/packing-{$order->order_number}.pdf";

        $pdf = Pdf::loadView('pdf.packing_slip', [
            'order'    => $order,
            'settings' => $this->getSettings(),
        ])->setPaper('a4');

        // Capture raw compilation payload stream
        $output = $pdf->output();

        // Write to designated filesystem persistence disk
        Storage::disk($this->disk)->put($path, $output);

        // Crucial Fix: Return the raw binary data string stream so the controller response works correctly
        return $output;
    }

    /**
     * Generate barcode label PDF.
     */
    public function generateBarcodeLabel(ProductVariant $variant, int $copies, string $template = 'default'): string
    {
        $variant->load('product', 'barcodes');

        $path = "barcode-labels/label-{$variant->id}-" . time() . '.pdf';

        $pdf = Pdf::loadView('pdf.barcode_label', [
            'variants' => collect([$variant]),
            'copies'   => $copies,
            'template' => $template,
            'settings' => $this->getSettings(),
        ])->setPaper([0, 0, 226.77, 141.73]); // 80x50mm label

        Storage::disk($this->disk)->put($path, $pdf->output());

        return $path;
    }

    /**
     * Generate POS receipt (80mm thermal).
     */
    public function generatePosReceipt(Order $order): string
    {
        $order->load(['customer', 'items.variant.product', 'payments', 'createdBy', 'warehouse']);

        $path = "receipts/receipt-{$order->order_number}.pdf";

        $pdf = Pdf::loadView('pdf.pos_receipt', [
            'order'    => $order,
            'settings' => $this->getSettings(),
        ])->setPaper([0, 0, 226.77, 841.89], 'portrait'); // 80mm width

        Storage::disk($this->disk)->put($path, $pdf->output());

        return $path;
    }

    /**
     * Generate purchase receipt PDF.
     */
    public function generatePurchaseReceipt(Purchase $purchase): string
    {
        $purchase->load(['vendor', 'items.variant.product', 'warehouse']);

        $path = "purchase-receipts/purchase-{$purchase->invoice_no}.pdf";

        $pdf = Pdf::loadView('pdf.purchase_receipt', [
            'purchase' => $purchase,
            'settings' => $this->getSettings(),
        ])->setPaper('a4');

        Storage::disk($this->disk)->put($path, $pdf->output());

        return $path;
    }

    /**
     * Generate a temporary signed URL to download a generated PDF.
     */
    public function getSignedUrl(string $filePath, int $expiryMinutes = 1440): string
    {
        return URL::temporarySignedRoute(
            'pdf.download',
            Carbon::now()->addMinutes($expiryMinutes),
            ['path' => base64_encode($filePath)]
        );
    }

    private function getSettings(): array
    {
        return [
            'app_name'    => \App\Models\Setting::get('app.name', config('app.name')),
            'currency'    => \App\Models\Setting::get('app.currency', 'INR'),
            'symbol'      => \App\Models\Setting::get('app.currency_symbol', '₹'),
            'logo'        => \App\Models\Setting::get('app.logo', ''),
        ];
    }
}
