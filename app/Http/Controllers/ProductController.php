<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use App\Services\ImageStorage\ImageStorageException;
use App\Services\ImageStorage\ImageStorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ProductController extends Controller
{
    private const IMAGE_FOLDER = 'Products';
    private const PER_PAGE     = 20;

    // Correctly inject the ImageStorageService instance
    public function __construct(protected ImageStorageService $imageStorageService) {}

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private function currentWarehouse()
    {
        $warehouse = Auth::user()->ownedWarehouse;
        abort_if(! $warehouse, 403, 'No active warehouse selected.');
        return $warehouse;
    }

    private function resolveUrl(?string $path): ?string
    {
        // Leverage the service wrapper to resolve public URLs natively
        return $this->imageStorageService->url($path);
    }

    private function uploadVariantImage($file, string $slug, int $variantId): string
    {
        $imageResult = $this->imageStorageService->upload(
            file:         $file,
            slug:         $slug . '_' . Str::random(6),
            folder:       self::IMAGE_FOLDER,
            allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
        );

        return $imageResult->path;
    }

    private function deleteImageFile(?string $path): void
    {
        if ($path) {
            $this->imageStorageService->delete($path);
        }
    }

    /**
     * Reindex sort_order and is_primary after any image mutation.
     */
    private function reindexImages(int $variantId): void
    {
        ProductImage::where('product_variant_id', $variantId)
            ->orderBy('sort_order')
            ->get()
            ->each(fn ($img, $i) => $img->update(['sort_order' => $i, 'is_primary' => $i === 0]));
    }

    /**
     * Generate a warehouse-scoped unique slug.
     */
    private function uniqueSlug(string $name, int $warehouseId, ?int $exceptId = null): string
    {
        $base    = Str::slug($name);
        $slug    = $base;
        $counter = 2;

        while (
            Product::where('slug', $slug)
                ->where('warehouse_id', $warehouseId)
                ->when($exceptId, fn ($q) => $q->where('id', '!=', $exceptId))
                ->exists()
        ) {
            $slug = "{$base}-{$counter}";
            $counter++;
        }

        return $slug;
    }

    private function generateProductCode(): string
    {
        do {
            $code = 'PRD-' . strtoupper(Str::random(8));
        } while (Product::where('product_code', $code)->exists());

        return $code;
    }

    /**
     * Sync barcodes: delete all then re-create.
     */
    private function syncBarcodes(ProductVariant $variant, array $barcodesData): void
    {
        $variant->barcodes()->delete();

        $filtered = array_values(
            array_filter($barcodesData, fn ($b) => trim($b['barcode'] ?? '') !== '')
        );

        if (empty($filtered)) {
            return;
        }

        $primarySet = false;
        foreach ($filtered as $index => &$data) {
            $wants = (bool) ($data['is_primary'] ?? false);

            if ($wants && ! $primarySet) {
                $data['is_primary'] = true;
                $primarySet = true;
            } else {
                $data['is_primary'] = false;
            }
        }
        unset($data);

        if (! $primarySet) {
            $filtered[0]['is_primary'] = true;
        }

        foreach ($filtered as $data) {
            $variant->barcodes()->create([
                'barcode'    => trim($data['barcode']),
                'is_primary' => $data['is_primary'],
            ]);
        }
    }

    /**
     * Upload and persist images for a variant.
     */
    private function storeVariantImages(ProductVariant $variant, array $files): array
    {
        $existingCount = $variant->images()->count();
        $slug          = Str::slug($variant->product->name ?? 'product');
        $paths         = [];

        foreach ($files as $i => $file) {
            $sortOrder = $existingCount + $i;
            $path      = $this->uploadVariantImage($file, $slug, $variant->id);
            $paths[]   = $path;

            ProductImage::create([
                'product_id'         => $variant->product_id,
                'product_variant_id' => $variant->id,
                'image_path'         => $path,
                'is_primary'         => $sortOrder === 0,
                'sort_order'         => $sortOrder,
            ]);
        }

        return $paths;
    }

    // -----------------------------------------------------------------------
    // Validation rule sets
    // -----------------------------------------------------------------------

    private function variantRules(string $prefix = 'variants.*'): array
    {
        return [
            "{$prefix}.variant_name"          => ['required', 'string', 'max:255'],
            "{$prefix}.unit_id"               => ['required', 'exists:units,id'],
            "{$prefix}.net_quantity"          => ['nullable', 'numeric', 'min:0'],
            "{$prefix}.mrp"                   => ['required', 'numeric', 'min:0'],
            "{$prefix}.selling_price"         => ['required', 'numeric', 'min:0'],
            "{$prefix}.cost_price"            => ['required', 'numeric', 'min:0'],
            "{$prefix}.min_selling_price"     => ['nullable', 'numeric', 'min:0'],
            "{$prefix}.status"                => ['boolean'],
            "{$prefix}.barcodes"              => ['nullable', 'array'],
            "{$prefix}.barcodes.*.barcode"    => ['nullable', 'string'],
            "{$prefix}.barcodes.*.is_primary" => ['nullable', 'boolean'],
            "{$prefix}.images"                => ['nullable', 'array', 'max:4'],
            "{$prefix}.images.*"              => ['file', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ];
    }

    private function productRules(array $productCodeRule = []): array
    {
        return [
            'name'            => ['required', 'string', 'max:255'],
            'product_code'    => array_merge(['nullable', 'string', 'max:100'], $productCodeRule),
            'description'     => ['nullable', 'string'],
            'category_id'     => ['required', 'exists:categories,id'],
            'brand_id'        => ['nullable', 'exists:brands,id'],
            'tax_category_id' => ['required', 'exists:tax_categories,id'],
            'is_active'       => ['boolean'],
            'is_returnable'   => ['boolean'],
            'variants'        => ['required', 'array', 'min:1'],
        ];
    }

    // -----------------------------------------------------------------------
    // Index
    // -----------------------------------------------------------------------

    public function index(Request $request)
    {
        $warehouse = $this->currentWarehouse();
        $search    = $request->string('search')->trim();
        $perPage   = (int) $request->input('per_page', self::PER_PAGE);

        $products = Product::with([
            'category:id,name',
            'brand:id,name',
            'taxCategory:id,name,tax_percent',
            'variants.barcodes',
            'variants.unit:id,name,symbol',
            'variants.images',
        ])
            ->where('warehouse_id', $warehouse->id)
            ->when($search, fn ($q) => $q->where(fn ($inner) =>
                $inner->where('name', 'like', "%{$search}%")
                      ->orWhere('product_code', 'like', "%{$search}%")
                      ->orWhereHas('variants.barcodes', fn ($b) =>
                          $b->where('barcode', 'like', "%{$search}%")
                      )
            ))
            ->latest()
            ->paginate($perPage)
            ->withQueryString()
            ->through(function ($product) {
                $hasImages = $product->variants->some(fn ($v) => $v->images->isNotEmpty());

                return [
                    ...$product->only([
                        'id', 'slug', 'name', 'product_code', 'description',
                        'category_id', 'brand_id', 'tax_category_id',
                        'is_active', 'is_returnable',
                    ]),
                    'has_images'   => $hasImages,
                    'category'     => $product->category,
                    'brand'        => $product->brand,
                    'tax_category' => $product->taxCategory,
                    'variants'     => $product->variants->map(fn ($v) => [
                        ...$v->only([
                            'id', 'variant_name', 'sku', 'unit_id', 'net_quantity',
                            'mrp', 'selling_price', 'cost_price', 'min_selling_price', 'status',
                        ]),
                        'unit'     => $v->unit,
                        'barcodes' => $v->barcodes,
                        'images'   => $v->images->sortBy('sort_order')->map(fn ($img) => [
                            'id'         => $img->id,
                            'url'        => $this->resolveUrl($img->image_path),
                            'is_primary' => $img->is_primary,
                            'sort_order' => $img->sort_order,
                        ])->values(),
                    ]),
                ];
            });

        $categories = Category::where('warehouse_id', $warehouse->id)
            ->active()
            ->orderBy('sort_order')
            ->get(['id', 'name']);

        return Inertia::render('Warehouse/Products', [
            'products'      => $products,
            'categories'    => $categories,
            'brands'        => \App\Models\Brand::orderBy('name')->get(['id', 'name']),
            'taxCategories' => \App\Models\TaxCategory::get(['id', 'name', 'tax_percent']),
            'units'         => \App\Models\Unit::get(['id', 'name', 'symbol']),
            'attributes'    => \App\Models\Attribute::with('values')->get(['id', 'name']),
            'filters'       => ['search' => (string) $search, 'per_page' => $perPage],
        ]);
    }

    // -----------------------------------------------------------------------
    // Store
    // -----------------------------------------------------------------------

    public function store(Request $request)
    {
        $warehouse = $this->currentWarehouse();

        $validated = $request->validate(array_merge(
            $this->productRules(productCodeRule: [
                Rule::unique('products', 'product_code')->whereNotNull('product_code'),
            ]),
            ['variants.*.sku' => ['required', 'string', Rule::unique('product_variants', 'sku')]],
            $this->variantRules(),
        ));

        DB::beginTransaction();
        $uploadedPaths = [];

        try {
            $slug = $this->uniqueSlug($validated['name'], $warehouse->id);
            $code = $validated['product_code'] ?: $this->generateProductCode();

            $product = Product::create([
                ...$this->productPayload($validated, $code),
                'slug'         => $slug,
                'warehouse_id' => $warehouse->id,
            ]);

            foreach ($validated['variants'] as $i => $variantData) {
                $variant = $product->variants()->create($this->variantPayload($variantData));
                $this->syncBarcodes($variant, $variantData['barcodes'] ?? []);

                $files = $request->file("variants.{$i}.images") ?? [];
                if ($files) {
                    $paths         = $this->storeVariantImages($variant, array_slice($files, 0, 4));
                    $uploadedPaths = array_merge($uploadedPaths, $paths);
                }
            }

            DB::commit();
            return redirect()->back()->with('success', 'Product created successfully.');

        } catch (ImageStorageException $e) {
            DB::rollBack();
            foreach ($uploadedPaths as $path) {
                $this->deleteImageFile($path);
            }
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        } catch (\Exception $e) {
            DB::rollBack();
            foreach ($uploadedPaths as $path) {
                $this->deleteImageFile($path);
            }
            logger()->error('Product store failed', ['error' => $e->getMessage()]);
            return redirect()->back()->withErrors(['error' => 'Failed to create product: ' . $e->getMessage()]);
        }
    }

    // -----------------------------------------------------------------------
    // Quick Store
    // -----------------------------------------------------------------------

    public function quickStore(Request $request)
    {
        $warehouse = $this->currentWarehouse();

        $validated = $request->validate([
            'category_id'                                 => ['required', 'exists:categories,id'],
            'tax_category_id'                             => ['required', 'exists:tax_categories,id'],
            'products'                                    => ['required', 'array', 'min:1'],
            'products.*.name'                             => ['required', 'string', 'max:255'],
            'products.*.brand_id'                         => ['nullable', 'exists:brands,id'],
            'products.*.variants'                         => ['required', 'array', 'min:1'],
            'products.*.variants.*.variant_name'          => ['required', 'string', 'max:255'],
            'products.*.variants.*.sku'                   => ['required', 'string', Rule::unique('product_variants', 'sku')],
            'products.*.variants.*.unit_id'               => ['required', 'exists:units,id'],
            'products.*.variants.*.net_quantity'          => ['nullable', 'numeric', 'min:0'],
            'products.*.variants.*.mrp'                   => ['required', 'numeric', 'min:0'],
            'products.*.variants.*.selling_price'         => ['required', 'numeric', 'min:0'],
            'products.*.variants.*.cost_price'            => ['required', 'numeric', 'min:0'],
            'products.*.variants.*.min_selling_price'     => ['nullable', 'numeric', 'min:0'],
            'products.*.variants.*.barcodes'              => ['nullable', 'array'],
            'products.*.variants.*.barcodes.*.barcode'    => ['nullable', 'string'],
            'products.*.variants.*.barcodes.*.is_primary' => ['nullable', 'boolean'],
        ]);

        DB::beginTransaction();

        try {
            foreach ($validated['products'] as $productData) {
                $slug = $this->uniqueSlug($productData['name'], $warehouse->id);

                $product = Product::create([
                    'name'            => $productData['name'],
                    'slug'            => $slug,
                    'product_code'    => $this->generateProductCode(),
                    'category_id'     => $validated['category_id'],
                    'brand_id'        => $productData['brand_id'] ?? null,
                    'tax_category_id' => $validated['tax_category_id'],
                    'is_active'       => true,
                    'is_returnable'   => true,
                    'warehouse_id'    => $warehouse->id,
                ]);

                foreach ($productData['variants'] as $variantData) {
                    $variant = $product->variants()->create($this->variantPayload($variantData));
                    $this->syncBarcodes($variant, $variantData['barcodes'] ?? []);
                }
            }

            DB::commit();
            return redirect()->back()->with('success', 'Products created successfully.');

        } catch (\Exception $e) {
            DB::rollBack();
            logger()->error('Quick product store failed', ['error' => $e->getMessage()]);
            return redirect()->back()->withErrors(['error' => 'Failed to create products: ' . $e->getMessage()]);
        }
    }

    // -----------------------------------------------------------------------
    // Update
    // -----------------------------------------------------------------------

    public function update(Request $request, Product $product)
    {
        $warehouse = $this->currentWarehouse();
        abort_if($product->warehouse_id !== $warehouse->id, 403);

        $validated = $request->validate(array_merge(
            $this->productRules(productCodeRule: [
                Rule::unique('products', 'product_code')
                    ->ignore($product->id)
                    ->whereNotNull('product_code'),
            ]),
            [
                'variants.*.id' => [
                    'nullable',
                    Rule::exists('product_variants', 'id')->where('product_id', $product->id),
                ],
                'variants.*.sku'                 => ['required', 'string'],
                'variants.*.deleted_image_ids'   => ['nullable', 'array'],
                'variants.*.deleted_image_ids.*' => [
                    'integer',
                    Rule::exists('product_images', 'id')->where('product_id', $product->id),
                ],
            ],
            $this->variantRules(),
        ));

        DB::beginTransaction();
        $uploadedPaths         = [];
        $pathsToDeleteOnCommit = [];
        $existingIds          = $product->variants()->pluck('id')->toArray();
        $processedIds         = [];

        try {
            $slug = $product->name !== $validated['name']
                ? $this->uniqueSlug($validated['name'], $warehouse->id, $product->id)
                : $product->slug;

            $code = $validated['product_code'] ?: $product->product_code;

            $product->update([
                ...$this->productPayload($validated, $code),
                'slug' => $slug,
            ]);

            foreach ($validated['variants'] as $i => $variantData) {
                $skuExists = ProductVariant::where('sku', $variantData['sku'])
                    ->when(! empty($variantData['id']), fn ($q) => $q->where('id', '!=', $variantData['id']))
                    ->exists();

                if ($skuExists) {
                    throw new \RuntimeException("SKU '{$variantData['sku']}' is already taken.");
                }

                if (! empty($variantData['id'])) {
                    $variant = ProductVariant::findOrFail($variantData['id']);
                    $variant->update($this->variantPayload($variantData));
                } else {
                    $variant = $product->variants()->create($this->variantPayload($variantData));
                }

                $processedIds[] = $variant->id;

                $this->syncBarcodes($variant, $variantData['barcodes'] ?? []);

                foreach ($variantData['deleted_image_ids'] ?? [] as $imgId) {
                    $img = ProductImage::where('id', $imgId)
                        ->where('product_variant_id', $variant->id)
                        ->first();
                    if ($img) {
                        $pathsToDeleteOnCommit[] = $img->image_path;
                        $img->delete();
                    }
                }

                // Upload new images safely
                $files = $request->file("variants.{$i}.images") ?? [];
                if ($files) {
                    $currentCount = $variant->images()
                        ->whereNotIn('id', $variantData['deleted_image_ids'] ?? [])
                        ->count();
                    $canAdd  = 4 - $currentCount;
                    $toStore = array_slice($files, 0, max(0, $canAdd));
                    if ($toStore) {
                        $paths         = $this->storeVariantImages($variant, $toStore);
                        $uploadedPaths = array_merge($uploadedPaths, $paths);
                    }
                }

                $this->reindexImages($variant->id);
            }

            $toDelete = array_diff($existingIds, $processedIds);
            if (! empty($toDelete)) {
                $removing = ProductVariant::whereIn('id', $toDelete)->with('images')->get();
                foreach ($removing as $v) {
                    foreach ($v->images as $img) {
                        $pathsToDeleteOnCommit[] = $img->image_path;
                    }
                }
                ProductVariant::whereIn('id', $toDelete)->delete();
            }

            DB::commit();

            // Perform final filesystem removals only after the DB states commit safely
            foreach ($pathsToDeleteOnCommit as $path) {
                $this->deleteImageFile($path);
            }

            return redirect()->back()->with('success', 'Product updated successfully.');

        } catch (ImageStorageException $e) {
            DB::rollBack();
            foreach ($uploadedPaths as $path) {
                $this->deleteImageFile($path);
            }
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        } catch (\Exception $e) {
            DB::rollBack();
            foreach ($uploadedPaths as $path) {
                $this->deleteImageFile($path);
            }
            logger()->error('Product update failed', ['product_id' => $product->id, 'error' => $e->getMessage()]);
            return redirect()->back()->withErrors(['error' => 'Failed to update product: ' . $e->getMessage()]);
        }
    }

    // -----------------------------------------------------------------------
    // Image endpoints
    // -----------------------------------------------------------------------

    public function deleteVariantImage(ProductImage $image)
    {
        $warehouse = $this->currentWarehouse();

        $image->load('variant.product');
        $product = $image->variant->product ?? null;
        abort_if(! $product || $product->warehouse_id !== $warehouse->id, 403);

        $variantId = $image->product_variant_id;

        $path = $image->image_path;
        $image->delete();
        $this->reindexImages($variantId);
        $this->deleteImageFile($path);

        return response()->json(['success' => true]);
    }

    public function reorderVariantImages(Request $request, ProductVariant $variant)
    {
        $warehouse = $this->currentWarehouse();
        $variant->load('product');
        abort_if($variant->product->warehouse_id !== $warehouse->id, 403);

        $request->validate([
            'image_ids'   => ['required', 'array'],
            'image_ids.*' => [
                'integer',
                Rule::exists('product_images', 'id')->where('product_variant_id', $variant->id),
            ],
        ]);

        foreach ($request->image_ids as $order => $imageId) {
            ProductImage::where('id', $imageId)
                ->where('product_variant_id', $variant->id)
                ->update(['sort_order' => $order, 'is_primary' => $order === 0]);
        }

        return response()->json(['success' => true]);
    }

    // -----------------------------------------------------------------------
    // Shared payload builders
    // -----------------------------------------------------------------------

    private function productPayload(array $data, ?string $code = null): array
    {
        return [
            'name'            => $data['name'],
            'product_code'    => $code ?? ($data['product_code'] ?: null),
            'description'     => $data['description'] ?? null,
            'category_id'     => $data['category_id'],
            'brand_id'        => $data['brand_id'] ?? null,
            'tax_category_id' => $data['tax_category_id'],
            'is_active'       => $data['is_active'] ?? true,
            'is_returnable'   => $data['is_returnable'] ?? true,
        ];
    }

    private function variantPayload(array $data): array
    {
        return [
            'variant_name'      => $data['variant_name'],
            'sku'               => $data['sku'],
            'unit_id'           => $data['unit_id'],
            'net_quantity'      => $data['net_quantity'] ?? null,
            'mrp'               => $data['mrp'],
            'selling_price'     => $data['selling_price'],
            'cost_price'        => $data['cost_price'],
            'min_selling_price' => $data['min_selling_price'] ?? null,
            'status'            => $data['status'] ?? true,
        ];
    }
}
