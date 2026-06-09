<?php

namespace App\Http\Controllers\Api\V1\Agent;

use App\Http\Controllers\Controller;
use App\Models\Delivery;
use App\Models\DeliveryAttempt;
use App\Models\UserDevice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class DeliveryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $deliveries = Delivery::where('agent_id', $request->user()->id)
            ->with(['order:id,order_number,status,address_snapshot'])
            ->orderByDesc('assigned_at')
            ->paginate(20);

        return response()->json(['success' => true, 'data' => $deliveries]);
    }

    public function show(Request $request, Delivery $delivery): JsonResponse
    {
        if ($delivery->agent_id !== $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 403);
        }

        $delivery->load(['order.items.variant.product', 'attempts']);

        return response()->json(['success' => true, 'data' => $delivery]);
    }

    public function updateStatus(Request $request, Delivery $delivery): JsonResponse
    {
        if ($delivery->agent_id !== $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 403);
        }

        $validated = $request->validate([
            'status' => 'required|in:picked,out_for_delivery,delivered,failed',
            'notes'  => 'nullable|string|max:500',
        ]);

        $updateData = [
            'status' => $validated['status'],
            'notes'  => $validated['notes'] ?? $delivery->notes,
        ];

        match ($validated['status']) {
            'picked'    => $updateData['picked_at'] = now(),
            'delivered' => $updateData['delivered_at'] = now(),
            default     => null,
        };

        $delivery->update($updateData);

        if ($validated['status'] === 'delivered') {
            $delivery->order->update(['status' => 'delivered', 'delivered_at' => now()]);
        }

        return response()->json(['success' => true, 'data' => $delivery->fresh()]);
    }

    public function uploadProof(Request $request, Delivery $delivery): JsonResponse
    {
        if ($delivery->agent_id !== $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 403);
        }

        $request->validate(['proof_image' => 'required|image|max:5120']);

        $path = $request->file('proof_image')->store("deliveries/{$delivery->id}/proof", 'public');
        $delivery->update(['proof_image' => $path]);

        return response()->json(['success' => true, 'data' => ['proof_url' => Storage::url($path)]]);
    }

    public function logAttempt(Request $request, Delivery $delivery): JsonResponse
    {
        if ($delivery->agent_id !== $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 403);
        }

        $validated = $request->validate([
            'reason' => 'required|string|max:500',
            'lat'    => 'nullable|numeric',
            'lng'    => 'nullable|numeric',
        ]);

        $attempt = DeliveryAttempt::create(array_merge($validated, [
            'delivery_id'  => $delivery->id,
            'attempted_at' => now(),
        ]));

        return response()->json(['success' => true, 'data' => $attempt], 201);
    }

    public function updateLocation(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'lat'       => 'required|numeric',
            'lng'       => 'required|numeric',
            'device_id' => 'required|string',
        ]);

        UserDevice::where('user_id', $request->user()->id)
            ->where('device_id', $validated['device_id'])
            ->update([
                'lat'            => $validated['lat'],
                'lng'            => $validated['lng'],
                'last_active_at' => now(),
            ]);

        return response()->json(['success' => true, 'message' => 'Location updated.']);
    }
}
