<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProductController extends Controller
{
    /**
     * GET /api/v1/products
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category'  => 'nullable|integer',
            'brand'     => 'nullable|integer',
            'sort'      => 'nullable|in:newest,price_asc,price_desc,popularity',
            'per_page'  => 'nullable|integer|min:1|max:50',
            'q'         => 'nullable|string|max:200',
        ]);

        $products = Product::query()
            ->with([
                'variants' => fn ($q) => $q->orderBy('selling_price')->limit(1),
                'images'   => fn ($q) => $q->where('is_primary', true)->limit(1),
            ])
            ->where('is_active', true)
            ->when($validated['category'] ?? null, fn ($q, $v) => $q->where('category_id', $v))
            ->when($validated['brand'] ?? null, fn ($q, $v) => $q->where('brand_id', $v))
            ->when($validated['q'] ?? null, fn ($q, $v) => $q->where('name', 'like', "%{$v}%"))
            ->when($validated['sort'] ?? 'newest', fn ($q, $sort) => match ($sort) {
                'price_asc'  => $q->join('product_variants as pv', 'pv.product_id', '=', 'products.id')->orderBy('pv.selling_price')->select('products.*'),
                'popularity' => $q->orderByDesc('is_best_seller'),
                default      => $q->latest(),
            })
            ->paginate($validated['per_page'] ?? 20);

        return response()->json([
            'success' => true,
            'data'    => [
                'products'   => $products->map(fn ($p) => $this->productCardResource($p)),
                'pagination' => [
                    'total'        => $products->total(),
                    'per_page'     => $products->perPage(),
                    'current_page' => $products->currentPage(),
                    'last_page'    => $products->lastPage(),
                ],
            ],
        ]);
    }

    /**
     * GET /api/v1/products/{product:slug}
     */
    public function show(Product $product): JsonResponse
    {
        if (! $product->is_active) {
            return response()->json(['success' => false, 'message' => 'Product not found.'], 404);
        }

        $product->load([
            'variants',
            'images',
            'category',
            'brand',
            'taxCategory',
            'attributes',
        ]);

        $avgRating = Review::where('product_id', $product->id)
            ->where('is_approved', true)
            ->avg('rating');

        $reviewCount = Review::where('product_id', $product->id)
            ->where('is_approved', true)
            ->count();

        return response()->json([
            'success' => true,
            'data'    => array_merge($this->productCardResource($product), [
                'description'      => $product->description,
                'images'           => $product->images->map(fn ($img) => [
                    'id'          => $img->id,
                    'url'         => asset('storage/' . $img->image_path),
                    'is_primary'  => $img->is_primary,
                    'sort_order'  => $img->sort_order ?? 0,
                ]),
                'variants'         => $product->variants->map(fn ($v) => [
                    'id'             => $v->id,
                    'name'           => $v->variant_name,
                    'sku'            => $v->sku,
                    'selling_price'  => $v->selling_price,
                    'mrp'            => $v->mrp,
                    'compare_price'  => $v->compare_price,
                    'unit'           => $v->unit,
                    'weight'         => $v->weight,
                    'is_active'      => $v->is_active,
                ]),
                'category'         => $product->category ? ['id' => $product->category->id, 'name' => $product->category->name, 'slug' => $product->category->slug] : null,
                'brand'            => $product->brand ? ['id' => $product->brand->id, 'name' => $product->brand->name, 'slug' => $product->brand->slug] : null,
                'avg_rating'       => round($avgRating ?? 0, 1),
                'review_count'     => $reviewCount,
                'meta_title'       => $product->meta_title,
                'meta_description' => $product->meta_description,
            ]),
        ]);
    }

    /**
     * GET /api/v1/products/{product:slug}/reviews
     */
    public function reviews(Product $product, Request $request): JsonResponse
    {
        $reviews = Review::where('product_id', $product->id)
            ->where('is_approved', true)
            ->with('user:id,name,avatar')
            ->latest()
            ->paginate($request->query('per_page', 10));

        return response()->json([
            'success' => true,
            'data'    => [
                'reviews'    => $reviews->items(),
                'pagination' => [
                    'total'        => $reviews->total(),
                    'per_page'     => $reviews->perPage(),
                    'current_page' => $reviews->currentPage(),
                    'last_page'    => $reviews->lastPage(),
                ],
            ],
        ]);
    }

    /**
     * POST /api/v1/products/{product:slug}/reviews (auth)
     */
    public function storeReview(Request $request, Product $product): JsonResponse
    {
        $validated = $request->validate([
            'rating'   => 'required|integer|min:1|max:5',
            'title'    => 'nullable|string|max:255',
            'body'     => 'nullable|string|max:2000',
            'images'   => 'nullable|array|max:3',
            'images.*' => 'image|max:2048',
        ]);

        // Check if already reviewed
        if (Review::where('product_id', $product->id)->where('user_id', $request->user()->id)->exists()) {
            return response()->json(['success' => false, 'message' => 'You have already reviewed this product.'], 422);
        }

        $imagePaths = [];
        foreach ($request->file('images', []) as $image) {
            $imagePaths[] = $image->store('reviews', 'public');
        }

        $isVerified = \App\Models\OrderItem::whereHas('order', fn ($q) =>
            $q->where('customer_id', $request->user()->customer?->id)
              ->where('status', 'delivered')
        )->whereHas('variant', fn ($q) => $q->where('product_id', $product->id))->exists();

        $review = Review::create([
            'product_id'           => $product->id,
            'user_id'              => $request->user()->id,
            'rating'               => $validated['rating'],
            'title'                => $validated['title'] ?? null,
            'body'                 => $validated['body'] ?? null,
            'images'               => $imagePaths ?: null,
            'is_verified_purchase' => $isVerified,
            'is_approved'          => false, // Requires moderation
        ]);

        return response()->json(['success' => true, 'message' => 'Review submitted and pending approval.', 'data' => $review], 201);
    }

    /**
     * GET /api/v1/products/{product:slug}/related
     */
    public function related(Product $product): JsonResponse
    {
        $related = Product::with([
            'variants' => fn ($q) => $q->orderBy('selling_price')->limit(1),
            'images'   => fn ($q) => $q->where('is_primary', true)->limit(1),
        ])
        ->where('is_active', true)
        ->where('id', '!=', $product->id)
        ->where(fn ($q) => $q->where('category_id', $product->category_id)->orWhere('brand_id', $product->brand_id))
        ->limit(8)
        ->get();

        return response()->json(['success' => true, 'data' => $related->map(fn ($p) => $this->productCardResource($p))]);
    }

    private function productCardResource(Product $product): array
    {
        $variant = $product->variants->first();

        return [
            'id'                => $product->id,
            'name'              => $product->name,
            'slug'              => $product->slug,
            'short_description' => $product->short_description,
            'primary_image'     => $product->images->first()?->image_path ? asset('storage/' . $product->images->first()->image_path) : null,
            'price'             => $variant?->selling_price,
            'mrp'               => $variant?->mrp,
            'compare_price'     => $variant?->compare_price,
            'in_stock'          => true,
            'is_featured'       => $product->is_featured,
            'is_trending'       => $product->is_trending,
            'is_best_seller'    => $product->is_best_seller,
            'category_id'       => $product->category_id,
            'brand_id'          => $product->brand_id,
        ];
    }
}
