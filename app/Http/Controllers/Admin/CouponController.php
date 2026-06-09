<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Coupon;
use App\Models\CouponUsage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CouponController extends Controller
{
    public function index(Request $request): Response
    {
        $coupons = Coupon::withCount('usages')
            ->when($request->input('search'), fn ($q, $s) =>
                $q->where('code', 'like', "%{$s}%")->orWhere('name', 'like', "%{$s}%")
            )
            ->when($request->input('type'), fn ($q, $t) => $q->where('type', $t))
            ->when($request->input('is_active') !== null, fn ($q) =>
                $q->where('is_active', (bool) $request->input('is_active'))
            )
            ->orderByDesc('created_at')
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('Admin/Coupons/Index', [
            'coupons' => $coupons,
            'filters' => $request->only(['search', 'type', 'is_active']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'code'              => 'required|string|max:50|unique:coupons,code',
            'name'              => 'required|string|max:255',
            'type'              => 'required|in:percent,flat,free_shipping',
            'value'             => 'required|numeric|min:0',
            'min_order_amount'  => 'nullable|numeric|min:0',
            'max_discount'      => 'nullable|numeric|min:0',
            'usage_limit'       => 'nullable|integer|min:1',
            'per_user_limit'    => 'nullable|integer|min:1',
            'applicable_to'     => 'required|in:all,category,product,brand',
            'applicable_ids'    => 'nullable|array',
            'starts_at'         => 'nullable|date',
            'ends_at'           => 'nullable|date|after_or_equal:starts_at',
            'is_active'         => 'boolean',
            'warehouse_id'      => 'nullable|exists:warehouses,id',
        ]);

        $validated['code'] = strtoupper($validated['code']);
        Coupon::create($validated);

        return back()->with('success', 'Coupon created.');
    }

    public function update(Request $request, Coupon $coupon): RedirectResponse
    {
        $validated = $request->validate([
            'code'              => 'required|string|max:50|unique:coupons,code,' . $coupon->id,
            'name'              => 'required|string|max:255',
            'type'              => 'required|in:percent,flat,free_shipping',
            'value'             => 'required|numeric|min:0',
            'min_order_amount'  => 'nullable|numeric|min:0',
            'max_discount'      => 'nullable|numeric|min:0',
            'usage_limit'       => 'nullable|integer|min:1',
            'per_user_limit'    => 'nullable|integer|min:1',
            'applicable_to'     => 'required|in:all,category,product,brand',
            'applicable_ids'    => 'nullable|array',
            'starts_at'         => 'nullable|date',
            'ends_at'           => 'nullable|date|after_or_equal:starts_at',
            'is_active'         => 'boolean',
        ]);

        $coupon->update($validated);

        return back()->with('success', 'Coupon updated.');
    }

    public function destroy(Coupon $coupon): RedirectResponse
    {
        if ($coupon->usages()->exists()) {
            return back()->withErrors(['coupon' => 'Cannot delete a coupon that has been used.']);
        }

        $coupon->delete();

        return back()->with('success', 'Coupon deleted.');
    }

    public function usages(Coupon $coupon, Request $request): Response
    {
        $usages = CouponUsage::where('coupon_id', $coupon->id)
            ->with(['user:id,name,mobile', 'order:id,order_number,total_amount'])
            ->orderByDesc('used_at')
            ->paginate(25);

        return Inertia::render('Admin/Coupons/Usages', compact('coupon', 'usages'));
    }

    public function toggleActive(Coupon $coupon): RedirectResponse
    {
        $coupon->update(['is_active' => ! $coupon->is_active]);

        return back()->with('success', 'Coupon status updated.');
    }
}
