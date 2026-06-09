<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\LoyaltyTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user     = $request->user()->load(['customer', 'addresses']);
        $customer = $user->customer;

        return response()->json(['success' => true, 'data' => [
            'user'      => $user,
            'customer'  => $customer,
            'addresses' => $user->addresses,
        ]]);
    }

    public function notifications(Request $request): JsonResponse
    {
        $notifications = DB::table('notifications')
            ->where('notifiable_id', $request->user()->id)
            ->where('notifiable_type', get_class($request->user()))
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json(['success' => true, 'data' => $notifications]);
    }

    public function markNotificationRead(Request $request, string $id): JsonResponse
    {
        DB::table('notifications')
            ->where('id', $id)
            ->where('notifiable_id', $request->user()->id)
            ->update(['read_at' => now()]);

        return response()->json(['success' => true, 'message' => 'Marked as read.']);
    }

    public function markAllNotificationsRead(Request $request): JsonResponse
    {
        DB::table('notifications')
            ->where('notifiable_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['success' => true, 'message' => 'All notifications marked as read.']);
    }

    public function unreadNotificationCount(Request $request): JsonResponse
    {
        $count = DB::table('notifications')
            ->where('notifiable_id', $request->user()->id)
            ->whereNull('read_at')
            ->count();

        return response()->json(['success' => true, 'data' => ['count' => $count]]);
    }

    public function loyaltyHistory(Request $request): JsonResponse
    {
        $customer = $request->user()->customer;

        if (! $customer) {
            return response()->json(['success' => true, 'data' => ['transactions' => [], 'balance' => 0]]);
        }

        $transactions = LoyaltyTransaction::where('customer_id', $customer->id)
            ->with('order:id,order_number')
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json(['success' => true, 'data' => [
            'balance'      => $customer->loyalty_points,
            'transactions' => $transactions,
        ]]);
    }
}
