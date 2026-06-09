<?php

namespace App\Http\Controllers\Warehouse;

use App\Http\Controllers\Controller;
use App\Models\BarcodePrintJob;
use App\Models\ProductVariant;
use App\Services\BarcodeService;
use App\Services\PdfService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class BarcodeController extends Controller
{
    public function __construct(
        private readonly BarcodeService $barcodeService,
        private readonly PdfService $pdfService,
    ) {}

    public function index(): Response
    {
        return Inertia::render('Warehouse/Barcodes/Index');
    }

    /**
     * GET /warehouse/barcodes/lookup?barcode=xxx&sku=xxx
     */
    public function lookup(Request $request): JsonResponse
    {
        $barcode = $request->query('barcode');
        $sku     = $request->query('sku');

        $query = ProductVariant::with(['product:id,name,category_id', 'stockSnapshot']);

        if ($barcode) {
            $variant = $query->whereHas('barcode', fn ($q) => $q->where('barcode', $barcode))->first();
        } elseif ($sku) {
            $variant = $query->where('sku', $sku)->first();
        } else {
            return response()->json(['success' => false, 'message' => 'Provide barcode or sku.'], 422);
        }

        if (! $variant) {
            return response()->json(['success' => false, 'message' => 'Product not found.'], 404);
        }

        return response()->json(['success' => true, 'data' => $variant]);
    }

    /**
     * POST /warehouse/barcodes/queue — Queue a barcode print job
     */
    public function queuePrint(Request $request): \Illuminate\Http\RedirectResponse
    {
        $validated = $request->validate([
            'product_variant_id' => 'required|exists:product_variants,id',
            'quantity'           => 'required|integer|min:1|max:1000',
            'template'           => 'nullable|string|in:default,price_tag,mini',
        ]);

        $warehouseId = Auth::user()->managedWarehouses()->value('warehouses.id');

        BarcodePrintJob::create([
            'warehouse_id'       => $warehouseId,
            'product_variant_id' => $validated['product_variant_id'],
            'quantity'           => $validated['quantity'],
            'template'           => $validated['template'] ?? 'default',
            'status'             => 'queued',
            'created_by'         => Auth::id(),
        ]);

        return back()->with('success', 'Print job queued.');
    }

    /**
     * GET /warehouse/barcodes/queue — Show pending print jobs
     */
    public function printQueue(): Response
    {
        $warehouseId = Auth::user()->managedWarehouses()->value('warehouses.id');

        $jobs = BarcodePrintJob::where('warehouse_id', $warehouseId)
            ->with('variant.product:id,name')
            ->orderByDesc('created_at')
            ->paginate(25);

        return Inertia::render('Warehouse/Barcodes/PrintQueue', compact('jobs'));
    }

    /**
     * GET /warehouse/barcodes/jobs/{job}/pdf — Generate barcode PDF for a print job
     */
    public function generatePdf(BarcodePrintJob $job): \Illuminate\Http\Response
    {
        $variant  = $job->variant()->with('product')->firstOrFail();
        $barcodes = [];

        for ($i = 0; $i < $job->quantity; $i++) {
            $barcodes[] = [
                'image'    => $this->barcodeService->generate($variant->sku ?? $variant->id, 'C128'),
                'sku'      => $variant->sku,
                'name'     => $variant->product->name . ' - ' . $variant->variant_name,
                'price'    => '₹' . $variant->selling_price,
            ];
        }

        $pdf = $this->pdfService->generateBarcodeSheet($barcodes, $job->template);

        $job->update(['status' => 'printed', 'printed_at' => now()]);

        return response($pdf, 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => "inline; filename=barcodes-{$job->id}.pdf",
        ]);
    }
}
