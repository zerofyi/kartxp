<?php

namespace App\Http\Controllers;

use App\Models\Attribute;
use App\Models\Barcode;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use App\Models\TaxCategory;
use App\Models\Unit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ProductController extends Controller
{
    /**
     * Display a listing of the resource (paginated).
     */
    public function index(Request $request)
    {
        $search = $request->input('search', '');
        $perPage = $request->input('per_page', 20);

        $products = Product::with([
            'category',
            'brand',
            'taxCategory',
            'variants.barcodes',
            'variants.unit',
            'variants.images',
        ])
            ->when($search, function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('product_code', 'like', "%{$search}%");
            })
            ->latest()
            ->paginate($perPage)
            ->withQueryString();

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
            'products'      => $products,
            'categories'    => $categories,
            'brands'        => $brands,
            'taxCategories' => $taxCategories,
            'units'         => $units,
            'attributes'    => $attributes,
            'filters'       => ['search' => $search, 'per_page' => $perPage],
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'                                  => 'required|string|max:255',
            'product_code'                          => 'required|string|unique:products,product_code',
            'description'                           => 'nullable|string',
            'category_id'                           => 'required|exists:categories,id',
            'brand_id'                              => 'nullable|exists:brands,id',
            'tax_category_id'                       => 'required|exists:tax_categories,id',
            'is_active'                             => 'boolean',
            'is_returnable'                         => 'boolean',
            'variants'                              => 'required|array|min:1',
            'variants.*.variant_name'               => 'required|string|max:255',
            'variants.*.sku'                        => 'required|string|unique:product_variants,sku',
            'variants.*.unit_id'                    => 'required|exists:units,id',
            'variants.*.net_quantity'               => 'nullable|numeric|min:0',
            'variants.*.mrp'                        => 'required|numeric|min:0',
            'variants.*.selling_price'              => 'required|numeric|min:0',
            'variants.*.cost_price'                 => 'required|numeric|min:0',
            'variants.*.min_selling_price'          => 'nullable|numeric|min:0',
            'variants.*.status'                     => 'boolean',
            'variants.*.barcodes'                   => 'nullable|array',
            'variants.*.barcodes.*.barcode'         => 'nullable|string|distinct',
            'variants.*.barcodes.*.is_primary'      => 'nullable|boolean',
        ]);

        DB::beginTransaction();
        try {
            $product = Product::create([
                'name'            => $validated['name'],
                'product_code'    => $validated['product_code'],
                'description'     => $validated['description'] ?? null,
                'category_id'     => $validated['category_id'],
                'brand_id'        => $validated['brand_id'] ?? null,
                'tax_category_id' => $validated['tax_category_id'],
                'is_active'       => $validated['is_active'] ?? true,
                'is_returnable'   => $validated['is_returnable'] ?? true,
            ]);

            foreach ($validated['variants'] as $variantData) {
                $variant = $product->variants()->create([
                    'variant_name'     => $variantData['variant_name'],
                    'sku'              => $variantData['sku'],
                    'unit_id'         => $variantData['unit_id'],
                    'net_quantity'    => $variantData['net_quantity'] ?? null,
                    'mrp'             => $variantData['mrp'],
                    'selling_price'   => $variantData['selling_price'],
                    'cost_price'      => $variantData['cost_price'],
                    'min_selling_price' => $variantData['min_selling_price'] ?? null,
                    'status'          => $variantData['status'] ?? true,
                ]);

                $this->syncBarcodes($variant, $variantData['barcodes'] ?? []);
            }

            DB::commit();
            return redirect()->back()->with('success', 'Product created successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->withErrors(['error' => 'Failed to create product: ' . $e->getMessage()]);
        }
    }

    /**
     * Quick store multiple products.
     */
    public function quickStore(Request $request)
    {
        $validated = $request->validate([
            'category_id'                                   => 'required|exists:categories,id',
            'tax_category_id'                               => 'required|exists:tax_categories,id',
            'products'                                      => 'required|array|min:1',
            'products.*.name'                               => 'required|string|max:255',
            'products.*.brand_id'                           => 'nullable|exists:brands,id',
            'products.*.variants'                           => 'required|array|min:1',
            'products.*.variants.*.variant_name'            => 'required|string',
            'products.*.variants.*.sku'                     => ['required', 'string', Rule::unique('product_variants', 'sku')],
            'products.*.variants.*.unit_id'                 => 'required|exists:units,id',
            'products.*.variants.*.net_quantity'            => 'nullable|numeric',
            'products.*.variants.*.mrp'                     => 'required|numeric|min:0',
            'products.*.variants.*.selling_price'           => 'required|numeric|min:0',
            'products.*.variants.*.cost_price'              => 'required|numeric|min:0',
            'products.*.variants.*.min_selling_price'       => 'nullable|numeric|min:0',
            'products.*.variants.*.barcodes'                => 'nullable|array',
            'products.*.variants.*.barcodes.*.barcode'      => 'nullable|string|distinct',
            'products.*.variants.*.barcodes.*.is_primary'   => 'nullable|boolean',
        ]);

        DB::beginTransaction();
        try {
            foreach ($validated['products'] as $productData) {
                $product = Product::create([
                    'name'            => $productData['name'],
                    'product_code'    => $this->generateUniqueProductCode(),
                    'category_id'     => $validated['category_id'],
                    'brand_id'        => $productData['brand_id'] ?? null,
                    'tax_category_id' => $validated['tax_category_id'],
                    'is_active'       => true,
                    'is_returnable'   => true,
                ]);

                foreach ($productData['variants'] as $variantData) {
                    $variant = $product->variants()->create([
                        'variant_name'      => $variantData['variant_name'],
                        'sku'               => $variantData['sku'],
                        'unit_id'           => $variantData['unit_id'],
                        'net_quantity'      => $variantData['net_quantity'] ?? null,
                        'mrp'              => $variantData['mrp'],
                        'selling_price'    => $variantData['selling_price'],
                        'cost_price'       => $variantData['cost_price'],
                        'min_selling_price' => $variantData['min_selling_price'] ?? null,
                        'status'           => true,
                    ]);

                    $this->syncBarcodes($variant, $variantData['barcodes'] ?? []);
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
            'name'                             => 'required|string|max:255',
            'product_code'                     => ['required', 'string', Rule::unique('products', 'product_code')->ignore($product->id)],
            'description'                      => 'nullable|string',
            'category_id'                      => 'required|exists:categories,id',
            'brand_id'                         => 'nullable|exists:brands,id',
            'tax_category_id'                  => 'required|exists:tax_categories,id',
            'is_active'                        => 'boolean',
            'is_returnable'                    => 'boolean',
            'variants'                         => 'required|array|min:1',
            'variants.*.id'                    => 'nullable|exists:product_variants,id',
            'variants.*.variant_name'          => 'required|string|max:255',
            'variants.*.sku'                   => 'required|string',
            'variants.*.unit_id'               => 'required|exists:units,id',
            'variants.*.net_quantity'          => 'nullable|numeric|min:0',
            'variants.*.mrp'                   => 'required|numeric|min:0',
            'variants.*.selling_price'         => 'required|numeric|min:0',
            'variants.*.cost_price'            => 'required|numeric|min:0',
            'variants.*.min_selling_price'     => 'nullable|numeric|min:0',
            'variants.*.status'                => 'boolean',
            'variants.*.barcodes'              => 'nullable|array',
            'variants.*.barcodes.*.barcode'    => 'nullable|string',
            'variants.*.barcodes.*.is_primary' => 'nullable|boolean',
            // deleted_image_ids: IDs of existing images to remove
            'variants.*.deleted_image_ids'     => 'nullable|array',
            'variants.*.deleted_image_ids.*'   => 'integer|exists:product_images,id',
        ]);

        DB::beginTransaction();
        try {
            $product->update([
                'name'            => $validated['name'],
                'product_code'    => $validated['product_code'],
                'description'     => $validated['description'] ?? null,
                'category_id'     => $validated['category_id'],
                'brand_id'        => $validated['brand_id'] ?? null,
                'tax_category_id' => $validated['tax_category_id'],
                'is_active'       => $validated['is_active'] ?? true,
                'is_returnable'   => $validated['is_returnable'] ?? true,
            ]);

            $existingVariantIds = $product->variants()->pluck('id')->toArray();
            $updatedVariantIds  = [];

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
                    $variant = ProductVariant::find($variantData['id']);
                    $variant->update([
                        'variant_name'      => $variantData['variant_name'],
                        'sku'               => $variantData['sku'],
                        'unit_id'           => $variantData['unit_id'],
                        'net_quantity'      => $variantData['net_quantity'] ?? null,
                        'mrp'              => $variantData['mrp'],
                        'selling_price'    => $variantData['selling_price'],
                        'cost_price'       => $variantData['cost_price'],
                        'min_selling_price' => $variantData['min_selling_price'] ?? null,
                        'status'           => $variantData['status'] ?? true,
                    ]);
                    $updatedVariantIds[] = $variant->id;
                    $variant->barcodes()->delete();
                } else {
                    $variant = $product->variants()->create([
                        'variant_name'      => $variantData['variant_name'],
                        'sku'               => $variantData['sku'],
                        'unit_id'           => $variantData['unit_id'],
                        'net_quantity'      => $variantData['net_quantity'] ?? null,
                        'mrp'              => $variantData['mrp'],
                        'selling_price'    => $variantData['selling_price'],
                        'cost_price'       => $variantData['cost_price'],
                        'min_selling_price' => $variantData['min_selling_price'] ?? null,
                        'status'           => $variantData['status'] ?? true,
                    ]);
                    $updatedVariantIds[] = $variant->id;
                }

                $this->syncBarcodes($variant, $variantData['barcodes'] ?? []);

                // Delete images marked for removal
                if (!empty($variantData['deleted_image_ids'])) {
                    $imagesToDelete = ProductImage::whereIn('id', $variantData['deleted_image_ids'])
                        ->where('product_variant_id', $variant->id)
                        ->get();

                    foreach ($imagesToDelete as $img) {
                        Storage::disk('public_html')->delete($img->image_path);
                        $img->delete();
                    }
                }
            }

            // Delete removed variants (and their images)
            $variantsToDelete = array_diff($existingVariantIds, $updatedVariantIds);
            if (!empty($variantsToDelete)) {
                $variantModels = ProductVariant::whereIn('id', $variantsToDelete)->get();
                foreach ($variantModels as $v) {
                    foreach ($v->images as $img) {
                        Storage::disk('public_html')->delete($img->image_path);
                    }
                }
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
     * Upload images for a product variant.
     * POST /warehouse/products/variants/{variant}/images
     *
     * Accepts multipart: images[] (up to 4 total per variant)
     * First slot = is_primary=true, subsequent = sort_order ascending.
     */
    public function uploadVariantImages(Request $request, ProductVariant $variant)
    {
        $request->validate([
            'images'   => 'required|array|min:1|max:4',
            'images.*' => 'required|image|mimes:jpeg,jpg,png,webp|max:2048',
        ]);

        $existingCount = $variant->images()->count();
        $toUpload      = count($request->file('images'));

        if ($existingCount + $toUpload > 4) {
            return response()->json([
                'error' => "Maximum 4 images per variant. Currently has {$existingCount}.",
            ], 422);
        }

        $uploaded = [];

        // Build a slug from the product name for readable filenames
        $slug = Str::slug($variant->product->name ?? 'product');

        foreach ($request->file('images') as $index => $file) {
            $sortOrder = $existingCount + $index;
            $isPrimary = ($sortOrder === 0);

            $path = $this->uploadProductImage($file, $slug, $variant->id);

            if (!$path) {
                return response()->json(['error' => 'Image upload failed.'], 500);
            }

            $image = ProductImage::create([
                'product_id'         => $variant->product_id,
                'product_variant_id' => $variant->id,
                'image_path'         => $path,
                'is_primary'         => $isPrimary,
                'sort_order'         => $sortOrder,
            ]);

            $uploaded[] = [
                'id'         => $image->id,
                'url'        => Storage::url($path),
                'is_primary' => $isPrimary,
                'sort_order' => $sortOrder,
            ];
        }

        return response()->json(['images' => $uploaded]);
    }

    /**
     * Store a product variant image to disk.
     * Mirrors the brand uploadBrandLogo pattern.
     * Files land at: storage/app/public_html/Products/{variantId}/{slug}-{random}.{ext}
     */
    protected function uploadProductImage($file, string $slug, int $variantId): string|false
    {
        try {
            $extension    = $file->getClientOriginalExtension();
            $randomString = Str::random(6);
            $fileName     = $slug . '-' . $randomString . '.' . $extension;

            return $file->storeAs("Products/{$variantId}", $fileName, 'public_html');
        } catch (\Exception $e) {
            logger()->error('Product image upload failed: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Delete a single variant image.
     * DELETE /warehouse/products/images/{image}
     */
    public function deleteVariantImage(ProductImage $image)
    {
        Storage::disk('public_html')->delete($image->image_path);

        $variantId = $image->product_variant_id;
        $image->delete();

        // Re-index sort_order & re-assign is_primary
        $remaining = ProductImage::where('product_variant_id', $variantId)
            ->orderBy('sort_order')
            ->get();

        foreach ($remaining as $i => $img) {
            $img->update([
                'sort_order' => $i,
                'is_primary' => $i === 0,
            ]);
        }

        return response()->json(['success' => true]);
    }

    /**
     * Reorder images for a variant.
     * PUT /warehouse/products/variants/{variant}/images/reorder
     * Body: { image_ids: [3, 1, 2] }  — ordered array of IDs
     */
    public function reorderVariantImages(Request $request, ProductVariant $variant)
    {
        $request->validate([
            'image_ids'   => 'required|array',
            'image_ids.*' => 'integer|exists:product_images,id',
        ]);

        foreach ($request->image_ids as $order => $imageId) {
            ProductImage::where('id', $imageId)
                ->where('product_variant_id', $variant->id)
                ->update([
                    'sort_order' => $order,
                    'is_primary' => $order === 0,
                ]);
        }

        return response()->json(['success' => true]);
    }

    // ─── Helpers ────────────────────────────────────────────────────────────────

    private function syncBarcodes(ProductVariant $variant, array $barcodesData): void
    {
        $hasPrimary = false;

        foreach ($barcodesData as $index => $barcodeData) {
            $barcodeValue = is_array($barcodeData) ? ($barcodeData['barcode'] ?? '') : $barcodeData;

            if (!empty($barcodeValue) && trim($barcodeValue) !== '') {
                $isPrimary = is_array($barcodeData)
                    ? ($barcodeData['is_primary'] ?? false)
                    : ($index === 0);

                if ($isPrimary && $hasPrimary) {
                    $isPrimary = false;
                }

                Barcode::create([
                    'product_variant_id' => $variant->id,
                    'barcode'            => trim($barcodeValue),
                    'is_primary'         => $isPrimary,
                ]);

                if ($isPrimary) {
                    $hasPrimary = true;
                }
            }
        }
    }

    private function generateUniqueProductCode(): string
    {
        do {
            $code = 'PRD-' . strtoupper(uniqid());
        } while (Product::where('product_code', $code)->exists());

        return $code;
    }
}
