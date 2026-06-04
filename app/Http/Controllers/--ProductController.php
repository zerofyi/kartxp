<?php

namespace App\Http\Controllers;

use App\Models\Attribute;
use App\Models\Barcode;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\TaxCategory;
use App\Models\Unit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ProductController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $products = Product::with(['category', 'brand', 'taxCategory', 'variants.barcodes', 'variants.unit'])
            ->latest()
            ->get();

        $categories = Category::where('status', true)
            ->orderBy('sort_order')
            ->get(['id', 'name']);

        $brands = Brand::orderBy('name')
            ->get(['id', 'name']);

        $taxCategories = TaxCategory::get(['id', 'name', 'tax_percent']);

        $units = Unit::get(['id', 'name', 'symbol']);

        $attributes = Attribute::with('values')
            ->get(['id', 'name']);

        return Inertia::render('warehouse/Products', [
            'products' => $products,
            'categories' => $categories,
            'brands' => $brands,
            'taxCategories' => $taxCategories,
            'units' => $units,
            'attributes' => $attributes,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'product_code' => 'required|string|unique:products,product_code',
            'description' => 'nullable|string',
            'category_id' => 'required|exists:categories,id',
            'brand_id' => 'nullable|exists:brands,id',
            'tax_category_id' => 'required|exists:tax_categories,id',
            'is_active' => 'boolean',
            'is_returnable' => 'boolean',
            'variants' => 'required|array|min:1',
            'variants.*.variant_name' => 'required|string|max:255',
            'variants.*.sku' => 'required|string|unique:product_variants,sku',
            'variants.*.unit_id' => 'required|exists:units,id',
            'variants.*.net_quantity' => 'nullable|numeric|min:0',
            'variants.*.mrp' => 'required|numeric|min:0',
            'variants.*.selling_price' => 'required|numeric|min:0',
            'variants.*.cost_price' => 'required|numeric|min:0',
            'variants.*.min_selling_price' => 'nullable|numeric|min:0',
            'variants.*.status' => 'boolean',
            'variants.*.barcodes' => 'nullable|array',
            'variants.*.barcodes.*.barcode' => 'nullable|string|distinct',
            'variants.*.barcodes.*.is_primary' => 'nullable|boolean',
        ]);

        DB::beginTransaction();
        try {
            // Create product
            $product = Product::create([
                'name' => $validated['name'],
                'product_code' => $validated['product_code'],
                'description' => $validated['description'] ?? null,
                'category_id' => $validated['category_id'],
                'brand_id' => $validated['brand_id'] ?? null,
                'tax_category_id' => $validated['tax_category_id'],
                'is_active' => $validated['is_active'] ?? true,
                'is_returnable' => $validated['is_returnable'] ?? true,
            ]);

            // Create variants
            foreach ($validated['variants'] as $variantData) {
                $variant = $product->variants()->create([
                    'variant_name' => $variantData['variant_name'],
                    'sku' => $variantData['sku'],
                    'unit_id' => $variantData['unit_id'],
                    'net_quantity' => $variantData['net_quantity'] ?? null,
                    'mrp' => $variantData['mrp'],
                    'selling_price' => $variantData['selling_price'],
                    'cost_price' => $variantData['cost_price'],
                    'min_selling_price' => $variantData['min_selling_price'] ?? null,
                    'status' => $variantData['status'] ?? true,
                ]);

                // Create barcodes
                if (!empty($variantData['barcodes'])) {
                    $hasPrimary = false;
                    foreach ($variantData['barcodes'] as $index => $barcodeData) {
                        $barcodeValue = is_array($barcodeData) ? ($barcodeData['barcode'] ?? '') : $barcodeData;

                        if (!empty($barcodeValue) && trim($barcodeValue) !== '') {
                            $isPrimary = is_array($barcodeData)
                                ? ($barcodeData['is_primary'] ?? false)
                                : ($index === 0);

                            // Ensure only one primary barcode
                            if ($isPrimary && $hasPrimary) {
                                $isPrimary = false;
                            }

                            Barcode::create([
                                'product_variant_id' => $variant->id,
                                'barcode' => trim($barcodeValue),
                                'is_primary' => $isPrimary,
                            ]);

                            if ($isPrimary) {
                                $hasPrimary = true;
                            }
                        }
                    }
                }
            }

            DB::commit();
            return redirect()->back()->with('success', 'Product created successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->withErrors(['error' => 'Failed to create product: ' . $e->getMessage()]);
        }
    }

    /**
     * Quick store multiple products
     */
    public function quickStore(Request $request)
    {
        $validated = $request->validate([
            'category_id' => 'required|exists:categories,id',
            'tax_category_id' => 'required|exists:tax_categories,id',
            'products' => 'required|array|min:1',
            'products.*.name' => 'required|string|max:255',
            'products.*.brand_id' => 'nullable|exists:brands,id',
            'products.*.variants' => 'required|array|min:1',
            'products.*.variants.*.variant_name' => 'required|string',
            'products.*.variants.*.sku' => [
                'required',
                'string',
                Rule::unique('product_variants', 'sku')
            ],
            'products.*.variants.*.unit_id' => 'required|exists:units,id',
            'products.*.variants.*.net_quantity' => 'nullable|numeric',
            'products.*.variants.*.mrp' => 'required|numeric|min:0',
            'products.*.variants.*.selling_price' => 'required|numeric|min:0',
            'products.*.variants.*.cost_price' => 'required|numeric|min:0',
            'products.*.variants.*.min_selling_price' => 'nullable|numeric|min:0',
            'products.*.variants.*.barcodes' => 'nullable|array',
            'products.*.variants.*.barcodes.*.barcode' => 'nullable|string|distinct',
            'products.*.variants.*.barcodes.*.is_primary' => 'nullable|boolean',
        ]);

        DB::beginTransaction();
        try {
            foreach ($validated['products'] as $productData) {
                // Generate unique product code
                $productCode = $this->generateUniqueProductCode();

                $product = Product::create([
                    'name' => $productData['name'],
                    'product_code' => $productCode,
                    'category_id' => $validated['category_id'],
                    'brand_id' => $productData['brand_id'] ?? null,
                    'tax_category_id' => $validated['tax_category_id'],
                    'is_active' => true,
                    'is_returnable' => true,
                ]);

                foreach ($productData['variants'] as $variantData) {
                    $variant = $product->variants()->create([
                        'variant_name' => $variantData['variant_name'],
                        'sku' => $variantData['sku'],
                        'unit_id' => $variantData['unit_id'],
                        'net_quantity' => $variantData['net_quantity'] ?? null,
                        'mrp' => $variantData['mrp'],
                        'selling_price' => $variantData['selling_price'],
                        'cost_price' => $variantData['cost_price'],
                        'min_selling_price' => $variantData['min_selling_price'] ?? null,
                        'status' => true,
                    ]);

                    // Create barcodes for quick add
                    if (!empty($variantData['barcodes'])) {
                        $hasPrimary = false;
                        foreach ($variantData['barcodes'] as $index => $barcodeData) {
                            $barcodeValue = is_array($barcodeData) ? ($barcodeData['barcode'] ?? '') : $barcodeData;

                            if (!empty($barcodeValue) && trim($barcodeValue) !== '') {
                                $isPrimary = is_array($barcodeData)
                                    ? ($barcodeData['is_primary'] ?? false)
                                    : ($index === 0);

                                // Ensure only one primary barcode
                                if ($isPrimary && $hasPrimary) {
                                    $isPrimary = false;
                                }

                                Barcode::create([
                                    'product_variant_id' => $variant->id,
                                    'barcode' => trim($barcodeValue),
                                    'is_primary' => $isPrimary,
                                ]);

                                if ($isPrimary) {
                                    $hasPrimary = true;
                                }
                            }
                        }
                    }
                }
            }

            DB::commit();
            return redirect()->back()->with('success', 'Products created successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->withErrors(['error' => 'Failed to create products: ' . $e->getMessage()]);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Product $product)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'product_code' => [
                'required',
                'string',
                Rule::unique('products', 'product_code')->ignore($product->id)
            ],
            'description' => 'nullable|string',
            'category_id' => 'required|exists:categories,id',
            'brand_id' => 'nullable|exists:brands,id',
            'tax_category_id' => 'required|exists:tax_categories,id',
            'is_active' => 'boolean',
            'is_returnable' => 'boolean',
            'variants' => 'required|array|min:1',
            'variants.*.id' => 'nullable|exists:product_variants,id',
            'variants.*.variant_name' => 'required|string|max:255',
            'variants.*.sku' => 'required|string',
            'variants.*.unit_id' => 'required|exists:units,id',
            'variants.*.net_quantity' => 'nullable|numeric|min:0',
            'variants.*.mrp' => 'required|numeric|min:0',
            'variants.*.selling_price' => 'required|numeric|min:0',
            'variants.*.cost_price' => 'required|numeric|min:0',
            'variants.*.min_selling_price' => 'nullable|numeric|min:0',
            'variants.*.status' => 'boolean',
            'variants.*.barcodes' => 'nullable|array',
            'variants.*.barcodes.*.barcode' => 'nullable|string',
            'variants.*.barcodes.*.is_primary' => 'nullable|boolean',
        ]);

        DB::beginTransaction();
        try {
            // Update product
            $product->update([
                'name' => $validated['name'],
                'product_code' => $validated['product_code'],
                'description' => $validated['description'] ?? null,
                'category_id' => $validated['category_id'],
                'brand_id' => $validated['brand_id'] ?? null,
                'tax_category_id' => $validated['tax_category_id'],
                'is_active' => $validated['is_active'] ?? true,
                'is_returnable' => $validated['is_returnable'] ?? true,
            ]);

            // Track existing variant IDs to delete removed ones
            $existingVariantIds = $product->variants()->pluck('id')->toArray();
            $updatedVariantIds = [];

            // Update or create variants
            foreach ($validated['variants'] as $variantData) {
                // Validate SKU uniqueness
                if (!empty($variantData['id'])) {
                    $skuExists = ProductVariant::where('sku', $variantData['sku'])
                        ->where('id', '!=', $variantData['id'])
                        ->exists();
                } else {
                    $skuExists = ProductVariant::where('sku', $variantData['sku'])->exists();
                }

                if ($skuExists) {
                    throw new \Exception("SKU '{$variantData['sku']}' already exists.");
                }

                if (!empty($variantData['id'])) {
                    // Update existing variant
                    $variant = ProductVariant::find($variantData['id']);
                    $variant->update([
                        'variant_name' => $variantData['variant_name'],
                        'sku' => $variantData['sku'],
                        'unit_id' => $variantData['unit_id'],
                        'net_quantity' => $variantData['net_quantity'] ?? null,
                        'mrp' => $variantData['mrp'],
                        'selling_price' => $variantData['selling_price'],
                        'cost_price' => $variantData['cost_price'],
                        'min_selling_price' => $variantData['min_selling_price'] ?? null,
                        'status' => $variantData['status'] ?? true,
                    ]);
                    $updatedVariantIds[] = $variant->id;

                    // Delete existing barcodes
                    $variant->barcodes()->delete();
                } else {
                    // Create new variant
                    $variant = $product->variants()->create([
                        'variant_name' => $variantData['variant_name'],
                        'sku' => $variantData['sku'],
                        'unit_id' => $variantData['unit_id'],
                        'net_quantity' => $variantData['net_quantity'] ?? null,
                        'mrp' => $variantData['mrp'],
                        'selling_price' => $variantData['selling_price'],
                        'cost_price' => $variantData['cost_price'],
                        'min_selling_price' => $variantData['min_selling_price'] ?? null,
                        'status' => $variantData['status'] ?? true,
                    ]);
                    $updatedVariantIds[] = $variant->id;
                }

                // Recreate barcodes
                if (!empty($variantData['barcodes'])) {
                    $hasPrimary = false;
                    foreach ($variantData['barcodes'] as $barcodeData) {
                        $barcodeValue = is_array($barcodeData) ? ($barcodeData['barcode'] ?? '') : $barcodeData;

                        if (!empty($barcodeValue) && trim($barcodeValue) !== '') {
                            $isPrimary = is_array($barcodeData) ? ($barcodeData['is_primary'] ?? false) : false;

                            // Ensure only one primary barcode
                            if ($isPrimary && $hasPrimary) {
                                $isPrimary = false;
                            }

                            Barcode::create([
                                'product_variant_id' => $variant->id,
                                'barcode' => trim($barcodeValue),
                                'is_primary' => $isPrimary,
                            ]);

                            if ($isPrimary) {
                                $hasPrimary = true;
                            }
                        }
                    }
                }
            }

            // Delete removed variants
            $variantsToDelete = array_diff($existingVariantIds, $updatedVariantIds);
            if (!empty($variantsToDelete)) {
                ProductVariant::whereIn('id', $variantsToDelete)->delete();
            }

            DB::commit();
            return redirect()->back()->with('success', 'Product updated successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->withErrors(['error' => 'Failed to update product: ' . $e->getMessage()]);
        }
    }

    /**
     * Generate a unique product code
     */
    private function generateUniqueProductCode(): string
    {
        do {
            $code = 'PRD-' . strtoupper(uniqid());
        } while (Product::where('product_code', $code)->exists());

        return $code;
    }
}
