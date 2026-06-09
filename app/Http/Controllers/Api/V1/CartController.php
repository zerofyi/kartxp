<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\ProductVariant;
use App\Services\CartService;
use App\Services\CouponService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CartController extends Controller
{
    public function __construct(
        private readonly CartService $cartService,
        private readonly CouponService $couponService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $cart = $this->cartService->getOrCreate($user->id, null);
        $cart->load(['items.variant.product', 'items.variant.images']);
        $totals = $this->cartService->getTotal($cart);

        return response()->json(['success' => true, 'data' => [
            'cart'   => $cart,
            'totals' => $totals,
        ]]);
    }

    public function addItem(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_variant_id' => 'required|exists:product_variants,id',
            'quantity'           => 'required|integer|min:1|max:100',
        ]);

        $user    = $request->user();
        $cart    = $this->cartService->getOrCreate($user->id, null);
        $variant = ProductVariant::findOrFail($validated['product_variant_id']);

        $result = $this->cartService->addItem($cart, $variant, $validated['quantity']);

        if (! $result['success']) {
            return response()->json(['success' => false, 'message' => $result['message']], 422);
        }

        return response()->json(['success' => true, 'message' => 'Item added to cart.', 'data' => $result['item']], 201);
    }

    public function updateItem(Request $request, CartItem $item): JsonResponse
    {
        if ($item->cart->user_id !== $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 403);
        }

        $validated = $request->validate(['quantity' => 'required|integer|min:1|max:100']);
        $result    = $this->cartService->updateItem($item, $validated['quantity']);

        if (! $result['success']) {
            return response()->json(['success' => false, 'message' => $result['message']], 422);
        }

        return response()->json(['success' => true, 'data' => $item->fresh()]);
    }

    public function removeItem(Request $request, CartItem $item): JsonResponse
    {
        if ($item->cart->user_id !== $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 403);
        }

        $item->delete();

        return response()->json(['success' => true, 'message' => 'Item removed.']);
    }

    public function clear(Request $request): JsonResponse
    {
        $cart = $this->cartService->getOrCreate($request->user()->id, null);
        $this->cartService->clear($cart);

        return response()->json(['success' => true, 'message' => 'Cart cleared.']);
    }

    public function applyCoupon(Request $request): JsonResponse
    {
        $validated = $request->validate(['coupon_code' => 'required|string']);
        $user      = $request->user();
        $cart      = $this->cartService->getOrCreate($user->id, null);
        $totals    = $this->cartService->getTotal($cart);

        $result = $this->couponService->validate($validated['coupon_code'], $totals['subtotal'], $user, $cart->warehouse_id);

        if (! $result['valid']) {
            return response()->json(['success' => false, 'message' => $result['message']], 422);
        }

        return response()->json(['success' => true, 'data' => [
            'coupon'   => $result['coupon'],
            'discount' => $result['discount'],
            'message'  => $result['message'],
        ]]);
    }

    public function removeCoupon(Request $request): JsonResponse
    {
        return response()->json(['success' => true, 'message' => 'Coupon removed.']);
    }

    public function merge(Request $request): JsonResponse
    {
        $validated = $request->validate(['session_id' => 'required|string']);
        $user      = $request->user();

        $guestCart = Cart::where('session_id', $validated['session_id'])->first();
        if ($guestCart) {
            $userCart = $this->cartService->getOrCreate($user->id, null);
            foreach ($guestCart->items as $item) {
                $this->cartService->addItem($userCart, $item->variant, $item->quantity);
            }
            $guestCart->delete();
        }

        return response()->json(['success' => true, 'message' => 'Cart merged.']);
    }
}
