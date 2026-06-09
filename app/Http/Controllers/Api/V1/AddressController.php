<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Address;
use App\Models\ShippingZone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AddressController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $addresses = Address::where('user_id', $request->user()->id)
            ->orderByDesc('is_default')
            ->get();

        return response()->json(['success' => true, 'data' => $addresses]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'label'      => 'required|string|max:50',
            'name'       => 'required|string|max:255',
            'phone'      => 'required|string|max:20',
            'line1'      => 'required|string|max:255',
            'line2'      => 'nullable|string|max:255',
            'city'       => 'required|string|max:100',
            'state'      => 'required|string|max:100',
            'pincode'    => 'required|string|max:10',
            'is_default' => 'nullable|boolean',
        ]);

        if ($validated['is_default'] ?? false) {
            Address::where('user_id', $request->user()->id)->update(['is_default' => false]);
        }

        $address = Address::create(array_merge($validated, [
            'user_id' => $request->user()->id,
            'country' => 'IN',
        ]));

        return response()->json(['success' => true, 'data' => $address], 201);
    }

    public function update(Request $request, Address $address): JsonResponse
    {
        if ($address->user_id !== $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 403);
        }

        $validated = $request->validate([
            'label'   => 'required|string|max:50',
            'name'    => 'required|string|max:255',
            'phone'   => 'required|string|max:20',
            'line1'   => 'required|string|max:255',
            'line2'   => 'nullable|string|max:255',
            'city'    => 'required|string|max:100',
            'state'   => 'required|string|max:100',
            'pincode' => 'required|string|max:10',
        ]);

        $address->update($validated);

        return response()->json(['success' => true, 'data' => $address->fresh()]);
    }

    public function destroy(Request $request, Address $address): JsonResponse
    {
        if ($address->user_id !== $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 403);
        }

        $address->delete();

        return response()->json(['success' => true, 'message' => 'Address deleted.']);
    }

    public function setDefault(Request $request, Address $address): JsonResponse
    {
        if ($address->user_id !== $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 403);
        }

        Address::where('user_id', $request->user()->id)->update(['is_default' => false]);
        $address->update(['is_default' => true]);

        return response()->json(['success' => true, 'message' => 'Default address set.']);
    }

    public function checkServiceable(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'pincode'      => 'required|string',
            'warehouse_id' => 'nullable|integer',
        ]);

        $warehouseId = $validated['warehouse_id'] ?? null;

        $query = ShippingZone::where('is_active', true);
        if ($warehouseId) {
            $query->where('warehouse_id', $warehouseId);
        }

        $serviceable = $query->get()
            ->filter(fn ($z) => $z->coversAddress($validated['pincode']))
            ->isNotEmpty();

        return response()->json(['success' => true, 'data' => ['serviceable' => $serviceable]]);
    }
}
