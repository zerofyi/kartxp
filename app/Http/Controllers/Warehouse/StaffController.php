<?php

namespace App\Http\Controllers\Warehouse;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\WarehouseUser;
use App\Models\Delivery;
use App\Models\Order;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class StaffController extends Controller
{
    /**
     * Resolve the active warehouse ID context for the session safely.
     */
    private function currentWarehouseId(): int
    {
        return Auth::user()->ownedWarehouse()->value('warehouses.id')
            ?? abort(403, 'Warehouse session context missing or invalid.');
    }

    /**
     * Display a listing of staff and analytics parameters.
     */
    public function index(): Response
    {
        $warehouseId = $this->currentWarehouseId();

        $staff = WarehouseUser::where('warehouse_id', $warehouseId)
            ->select(['id', 'warehouse_id', 'user_id', 'role', 'is_active', 'joined_at'])
            ->with(['user:id,name,mobile,status,email'])
            ->orderByDesc('joined_at')
            ->get();

        $agents = WarehouseUser::where('warehouse_id', $warehouseId)
            ->where('role', 'delivery_agent')
            ->select(['id', 'user_id', 'warehouse_id'])
            ->with(['user:id,name,mobile'])
            ->withCount([
                'deliveries as assigned_count',
                'deliveries as delivered_count' => fn($q) => $q->where('status', 'delivered'),
                'deliveries as pending_count' => fn($q) => $q->whereNotIn('status', ['delivered', 'cancelled'])
            ])
            ->get()
            ->map(fn($item) => [
                'id'              => (int) $item->id,
                'user_id'         => (int) $item->user_id,
                'name'            => $item->user->name ?? 'Unregistered Identity Account',
                'mobile'          => $item->user->mobile ?? '—',
                'assigned_count'  => (int) $item->assigned_count,
                'delivered_count' => (int) $item->delivered_count,
                'pending_count'   => (int) $item->pending_count,
            ]);

        return Inertia::render('Warehouse/Staff/Index', [
            'staff'  => $staff,
            'agents' => $agents,
            'stats'  => [
                'total'  => $staff->count(),
                'active' => $staff->where('is_active', true)->count(),
                'agents' => $agents->count(),
            ],
        ]);
    }

    /**
     * Provision and bind a fresh user profile under database transactions.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name'     => 'required|string|max:255',
            'mobile'   => 'required|string|unique:users,mobile',
            'email'    => 'nullable|email|unique:users,email',
            'role'     => 'required|in:staff,manager,delivery_agent',
            'password' => 'required|string|min:8',
        ]);

        $warehouseId = $this->currentWarehouseId();

        DB::transaction(function () use ($validated, $warehouseId) {
            $user = User::create([
                'name'     => $validated['name'],
                'mobile'   => $validated['mobile'],
                'email'    => $validated['email'] ?? 'user_' . time() . '_' . mt_rand(100, 999) . '@kartxp.com',
                'password' => Hash::make($validated['password']),
                'role'     => $validated['role'],
                'status'   => 'active',
            ]);

            WarehouseUser::create([
                'warehouse_id' => $warehouseId,
                'user_id'      => $user->id,
                'role'         => $validated['role'],
                'is_active'    => true,
                'joined_at'    => now(),
            ]);
        });

        return back()->with('success', 'Team member provisioned and bound successfully.');
    }

    /**
     * Detach an existing relationship link after validating route bindings.
     */
    public function destroy(WarehouseUser $warehouseUser): RedirectResponse
    {
        if ($warehouseUser->warehouse_id !== $this->currentWarehouseId()) {
            abort(403, 'Unauthorized warehouse asset modification access request.');
        }

        if ($warehouseUser->user_id === Auth::id()) {
            abort(403, 'Self-detachment from warehouse context is not allowed.');
        }
        if ($warehouseUser->role === 'owner'){
            abort(403, 'Detachment of owner role is not allowed. Please transfer ownership before detaching this user.');
        }

        $warehouseUser->delete();
        return back()->with('success', 'Staff relation detached from warehouse successfully.');
    }

    /**
     * Route mapping entry point for distinct logistic dispatch screens.
     * Aligned with: Route::get('/agents')
     */
    public function agentIndex(): Response
    {
        $warehouseId = $this->currentWarehouseId();

        $agents = WarehouseUser::where('warehouse_id', $warehouseId)
            ->where('role', 'delivery_agent')
            ->select(['id', 'user_id', 'warehouse_id', 'role', 'is_active'])
            ->with(['user:id,name,mobile,status'])
            ->withCount([
                'deliveries as active_deliveries' => fn($q) => $q->whereIn('status', ['assigned', 'picked', 'out_for_delivery'])
            ])
            ->get();

        return Inertia::render('Warehouse/Staff/Agents', [
            'agents' => $agents
        ]);
    }

    /**
     * Fallback macro wrapper to map agent specialized submissions to standard store method logic lines.
     */
    public function agentStore(Request $request): RedirectResponse
    {
        $request->merge(['role' => 'delivery_agent']);
        return $this->store($request);
    }

    /**
     * Display shipment logs for a specific driver context.
     * Aligned with: Route::get('/agents/{user}')
     */
    public function agentShow(User $user): Response
    {
        $warehouseId = $this->currentWarehouseId();

        $isAssociated = WarehouseUser::where('warehouse_id', $warehouseId)
            ->where('user_id', $user->id)
            ->exists();

        if (!$isAssociated) {
            abort(403, 'Requested agent context is out of current managed warehouse bounds.');
        }

        $deliveries = Delivery::where('agent_id', $user->id)
            ->with(['order:id,order_number,status,total_amount'])
            ->orderByDesc('created_at')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Warehouse/Staff/AgentShow', [
            'agent'      => $user->only(['id', 'name', 'mobile', 'status']),
            'deliveries' => $deliveries
        ]);
    }

    /**
     * Bulk assign shipment payloads to a designated vehicle line.
     */
    public function bulkAssign(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'agent_id'    => 'required|exists:users,id',
            'order_ids'   => 'required|array',
            'order_ids.*' => 'integer|exists:orders,id',
        ]);

        $warehouseId = $this->currentWarehouseId();

        DB::transaction(function () use ($validated, $warehouseId) {
            foreach ($validated['order_ids'] as $orderId) {
                $updated = Order::where('id', $orderId)
                    ->where('warehouse_id', $warehouseId)
                    ->update(['assigned_agent_id' => $validated['agent_id']]);

                if ($updated) {
                    Delivery::updateOrCreate(
                        ['order_id' => $orderId],
                        [
                            'agent_id'    => $validated['agent_id'],
                            'status'      => 'assigned',
                            'assigned_at' => now()
                        ]
                    );
                }
            }
        });

        return back()->with('success', 'Bulk shipment logs assigned to agent lines successfully.');
    }
}
