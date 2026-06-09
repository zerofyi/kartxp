<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CartItem;
use App\Models\Wishlist;
use App\Services\CartService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WishlistController extends Controller
{
    public function __construct(private readonly CartService $cartService) {}

    public function index(Request $request): JsonResponse
    {
        $wishlists = Wishlist::where('user_id', $request->user()->id)
            ->with(['variant.product', 'variant.images'])
            ->latest()
            ->paginate(20);

        return response()->json(['success' => true, 'data' => $wishlists]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate(['product_variant_id' => 'required|exists:product_variants,id']);

        $wishlist = Wishlist::firstOrCreate([
            'user_id'            => $request->user()->id,
            'product_variant_id' => $validated['product_variant_id'],
        ]);

        return response()->json(['success' => true, 'data' => $wishlist], 201);
    }

    public function destroy(Request $request, Wishlist $wishlist): JsonResponse
    {
        if ($wishlist->user_id !== $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 403);
        }

        $wishlist->delete();

        return response()->json(['success' => true, 'message' => 'Removed from wishlist.']);
    }

    public function moveToCart(Request $request, Wishlist $wishlist): JsonResponse
    {
        if ($wishlist->user_id !== $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 403);
        }

        $cart   = $this->cartService->getOrCreate($request->user()->id, null);
        $result = $this->cartService->addItem($cart, $wishlist->variant, 1);
        $wishlist->delete();

        return response()->json(['success' => true, 'message' => 'Moved to cart.']);
    }
}
