<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Banner;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class HomeController extends Controller
{
    /**
     * GET /api/v1/home — Homepage data (cached 10 minutes)
     */
    public function index(): JsonResponse
    {
        $data = Cache::remember('api:home', 600, function () {
            return [
                'banners'          => $this->getBanners('home_hero'),
                'mid_banners'      => $this->getBanners('home_mid'),
                'categories'       => $this->getFeaturedCategories(),
                'brands'           => $this->getActiveBrands(),
                'trending_products'  => $this->getProductList(['is_trending' => true], 12),
                'best_sellers'       => $this->getProductList(['is_best_seller' => true], 12),
                'featured_products'  => $this->getProductList(['is_featured' => true], 12),
                'active_offers'    => $this->getActiveOffers(),
            ];
        });

        return response()->json(['success' => true, 'data' => $data]);
    }

    /**
     * GET /api/v1/banners?position=home_hero
     */
    public function banners(Request $request): JsonResponse
    {
        $position = $request->query('position', 'home_hero');
        $banners  = $this->getBanners($position);

        return response()->json(['success' => true, 'data' => $banners]);
    }

    /**
     * GET /api/v1/categories — Full category tree
     */
    public function categories(): JsonResponse
    {
        $categories = Cache::remember('api:categories', 1800, function () {
            return Category::whereNull('parent_id')
                ->where('is_active', true)
                ->with(['children' => fn ($q) => $q->where('is_active', true)])
                ->orderBy('sort_order')
                ->get()
                ->map(fn ($c) => $this->categoryResource($c));
        });

        return response()->json(['success' => true, 'data' => $categories]);
    }

    /**
     * GET /api/v1/brands
     */
    public function brands(): JsonResponse
    {
        $brands = Cache::remember('api:brands', 1800, function () {
            return Brand::where('is_active', true)
                ->orderBy('name')
                ->limit(50)
                ->get(['id', 'name', 'slug', 'logo_path'])
                ->map(fn ($b) => [
                    'id'       => $b->id,
                    'name'     => $b->name,
                    'slug'     => $b->slug,
                    'logo_url' => $b->logo_path ? asset('storage/' . $b->logo_path) : null,
                ]);
        });

        return response()->json(['success' => true, 'data' => $brands]);
    }

    /**
     * GET /api/v1/search/suggestions?q=milk
     */
    public function searchSuggestions(Request $request): JsonResponse
    {
        $q = trim($request->query('q', ''));

        if (strlen($q) < 2) {
            return response()->json(['success' => true, 'data' => ['products' => [], 'categories' => [], 'brands' => []]]);
        }

        $products = Product::where('name', 'like', "%{$q}%")
            ->where('is_active', true)
            ->limit(5)
            ->get(['id', 'name', 'slug']);

        $categories = Category::where('name', 'like', "%{$q}%")
            ->where('is_active', true)
            ->limit(5)
            ->get(['id', 'name', 'slug']);

        $brands = Brand::where('name', 'like', "%{$q}%")
            ->where('is_active', true)
            ->limit(5)
            ->get(['id', 'name', 'slug']);

        return response()->json([
            'success' => true,
            'data'    => [
                'products'   => $products,
                'categories' => $categories,
                'brands'     => $brands,
            ],
        ]);
    }

    /**
     * GET /api/v1/search?q=milk&category=1&brand=2&min_price=10&max_price=100&sort=price_asc&page=1
     */
    public function search(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q'           => 'nullable|string|max:200',
            'category'    => 'nullable|integer',
            'brand'       => 'nullable|integer',
            'min_price'   => 'nullable|numeric|min:0',
            'max_price'   => 'nullable|numeric|min:0',
            'in_stock'    => 'nullable|boolean',
            'sort'        => 'nullable|in:newest,price_asc,price_desc,rating,popularity',
            'per_page'    => 'nullable|integer|min:1|max:50',
        ]);

        $q = $validated['q'] ?? '';

        $products = Product::query()
            ->with(['variants' => fn ($q) => $q->orderBy('selling_price')->limit(1), 'images' => fn ($q) => $q->where('is_primary', true)])
            ->where('is_active', true)
            ->when($q, fn ($query) => $query->where(fn ($q2) => $q2->where('name', 'like', "%{$q}%")->orWhere('description', 'like', "%{$q}%")))
            ->when($validated['category'] ?? null, fn ($query, $cat) => $query->where('category_id', $cat))
            ->when($validated['brand'] ?? null, fn ($query, $brand) => $query->where('brand_id', $brand))
            ->when($validated['min_price'] ?? null, fn ($query, $min) => $query->whereHas('variants', fn ($v) => $v->where('selling_price', '>=', $min)))
            ->when($validated['max_price'] ?? null, fn ($query, $max) => $query->whereHas('variants', fn ($v) => $v->where('selling_price', '<=', $max)))
            ->when(($validated['in_stock'] ?? null) === true || ($validated['in_stock'] ?? null) === '1', fn ($query) =>
                $query->whereHas('variants.stockSnapshot', fn ($s) => $s->where('available_quantity', '>', 0))
            )
            ->when($validated['sort'] ?? 'newest', function ($query, $sort) {
                match ($sort) {
                    'newest'     => $query->latest(),
                    'price_asc'  => $query->orderBy(fn ($q) => $q->select('selling_price')->from('product_variants')->whereColumn('product_id', 'products.id')->orderBy('selling_price')->limit(1)),
                    'popularity' => $query->orderByDesc('is_best_seller'),
                    default      => $query->latest(),
                };
            })
            ->paginate($validated['per_page'] ?? 20);

        return response()->json([
            'success' => true,
            'data'    => [
                'products'    => $products->map(fn ($p) => $this->productCardResource($p)),
                'pagination'  => [
                    'total'        => $products->total(),
                    'per_page'     => $products->perPage(),
                    'current_page' => $products->currentPage(),
                    'last_page'    => $products->lastPage(),
                ],
            ],
        ]);
    }

    /**
     * GET /api/v1/offers
     */
    public function offers(): JsonResponse
    {
        $offers = $this->getActiveOffers();

        return response()->json(['success' => true, 'data' => $offers]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────────

    private function getBanners(string $position): array
    {
        return Banner::where('is_active', true)
            ->where('position', $position)
            ->where(fn ($q) => $q->whereNull('starts_at')->orWhere('starts_at', '<=', now()))
            ->where(fn ($q) => $q->whereNull('ends_at')->orWhere('ends_at', '>=', now()))
            ->orderBy('sort_order')
            ->get()
            ->map(fn ($b) => [
                'id'          => $b->id,
                'title'       => $b->title,
                'image_url'   => asset('storage/' . $b->image_path),
                'link_type'   => $b->link_type,
                'link_value'  => $b->link_value,
            ])
            ->toArray();
    }

    private function getFeaturedCategories(): array
    {
        return Category::where('is_active', true)
            ->whereNull('parent_id')
            ->orderBy('sort_order')
            ->limit(10)
            ->get()
            ->map(fn ($c) => [
                'id'        => $c->id,
                'name'      => $c->name,
                'slug'      => $c->slug,
                'image_url' => $c->image_path ? asset('storage/' . $c->image_path) : null,
                'icon_url'  => $c->icon_path ? asset('storage/' . $c->icon_path) : null,
            ])
            ->toArray();
    }

    private function getActiveBrands(): array
    {
        return Brand::where('is_active', true)
            ->limit(20)
            ->get()
            ->map(fn ($b) => [
                'id'       => $b->id,
                'name'     => $b->name,
                'slug'     => $b->slug,
                'logo_url' => $b->logo_path ? asset('storage/' . $b->logo_path) : null,
            ])
            ->toArray();
    }

    private function getProductList(array $filters, int $limit): array
    {
        $query = Product::with(['variants' => fn ($q) => $q->orderBy('selling_price')->limit(1), 'images' => fn ($q) => $q->where('is_primary', true)])
            ->where('is_active', true);

        foreach ($filters as $column => $value) {
            $query->where($column, $value);
        }

        return $query->limit($limit)->get()->map(fn ($p) => $this->productCardResource($p))->toArray();
    }

    private function getActiveOffers(): array
    {
        return Coupon::where('is_active', true)
            ->where(fn ($q) => $q->whereNull('starts_at')->orWhere('starts_at', '<=', now()))
            ->where(fn ($q) => $q->whereNull('ends_at')->orWhere('ends_at', '>=', now()))
            ->whereNull('warehouse_id') // Global only
            ->limit(10)
            ->get(['id', 'code', 'name', 'type', 'value', 'min_order_amount', 'max_discount', 'ends_at'])
            ->toArray();
    }

    private function productCardResource(Product $product): array
    {
        $variant = $product->variants->first();

        return [
            'id'              => $product->id,
            'name'            => $product->name,
            'slug'            => $product->slug,
            'short_description' => $product->short_description,
            'primary_image'   => $product->images->first()?->image_path ? asset('storage/' . $product->images->first()->image_path) : null,
            'price'           => $variant?->selling_price,
            'mrp'             => $variant?->mrp,
            'compare_price'   => $variant?->compare_price,
            'in_stock'        => ($variant?->stockSnapshot?->available_quantity ?? 0) > 0,
            'is_featured'     => $product->is_featured,
            'is_trending'     => $product->is_trending,
            'is_best_seller'  => $product->is_best_seller,
            'category_id'     => $product->category_id,
            'brand_id'        => $product->brand_id,
        ];
    }

    private function categoryResource(Category $category): array
    {
        return [
            'id'        => $category->id,
            'name'      => $category->name,
            'slug'      => $category->slug,
            'image_url' => $category->image_path ? asset('storage/' . $category->image_path) : null,
            'icon_url'  => $category->icon_path ? asset('storage/' . $category->icon_path) : null,
            'children'  => $category->children->map(fn ($c) => $this->categoryResource($c))->toArray(),
        ];
    }
}
