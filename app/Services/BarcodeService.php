<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Support\Str;
use Picqer\Barcode\BarcodeGeneratorPNG;
use Picqer\Barcode\BarcodeGeneratorSVG;

class BarcodeService
{
    /**
     * Generate a barcode image (PNG base64) using the given type.
     * Types: C128 (Code128), EAN13, QRCODE.
     */
    public function generate(string $barcodeValue, string $type = 'C128'): string
    {
        $generator = new BarcodeGeneratorPNG();
        $barcode   = $generator->getBarcode(
            $barcodeValue,
            $this->resolveType($type),
            2,  // widthFactor
            50, // height
        );

        return 'data:image/png;base64,' . base64_encode($barcode);
    }

    /**
     * Generate an EAN-13 barcode.
     */
    public function generateEan13(string $value): string
    {
        // Ensure value is 12 digits (check digit will be computed)
        $value = str_pad(substr(preg_replace('/[^0-9]/', '', $value), 0, 12), 12, '0', STR_PAD_LEFT);
        $ean13 = $value . $this->computeEan13CheckDigit($value);

        return $this->generate($ean13, 'EAN13');
    }

    /**
     * Generate a Code128 SVG barcode.
     */
    public function generateSvg(string $barcodeValue, string $type = 'C128'): string
    {
        $generator = new BarcodeGeneratorSVG();

        return $generator->getBarcode($barcodeValue, $this->resolveType($type), 2, 50);
    }

    /**
     * Suggest a unique SKU for a product+variant combination.
     * Format: BRAND-PROD-VARIANT (e.g., AMUL-MILK-1L)
     */
    public function suggestSku(Product $product, string $variantName): string
    {
        $prefix  = strtoupper(substr(preg_replace('/[^A-Z]/i', '', $product->name), 0, 4));
        $suffix  = strtoupper(substr(preg_replace('/[^A-Z0-9]/i', '', $variantName), 0, 4));
        $base    = "{$prefix}-{$suffix}";
        $counter = 1;
        $sku     = $base;

        while (\App\Models\ProductVariant::where('sku', $sku)->exists()) {
            $sku = $base . '-' . $counter++;
        }

        return $sku;
    }

    /**
     * Generate a unique valid EAN-13 barcode number.
     */
    public function suggestEan13(): string
    {
        do {
            $base  = '890' . str_pad((string) random_int(0, 999999999), 9, '0', STR_PAD_LEFT); // 890 = India prefix
            $check = $this->computeEan13CheckDigit($base);
            $ean13 = $base . $check;
        } while (\App\Models\Barcode::where('barcode', $ean13)->exists());

        return $ean13;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internals
    // ─────────────────────────────────────────────────────────────────────────

    private function resolveType(string $type): string
    {
        return match (strtoupper($type)) {
            'EAN13'  => BarcodeGeneratorPNG::TYPE_EAN_13,
            'EAN8'   => BarcodeGeneratorPNG::TYPE_EAN_8,
            'QR'     => BarcodeGeneratorPNG::TYPE_QRCODE,
            'C39'    => BarcodeGeneratorPNG::TYPE_CODE_39,
            default  => BarcodeGeneratorPNG::TYPE_CODE_128,
        };
    }

    private function computeEan13CheckDigit(string $twelveDigits): int
    {
        $sum = 0;
        for ($i = 0; $i < 12; $i++) {
            $sum += (int) $twelveDigits[$i] * ($i % 2 === 0 ? 1 : 3);
        }

        return (10 - ($sum % 10)) % 10;
    }
}
