<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Warehouse;
use App\Models\WarehouseUser;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class WarehouseController extends Controller
{
    // ──────────────────────────────────────────────────────────────
    // INDEX
    // Props: { warehouses, stats, filters }
    // ──────────────────────────────────────────────────────────────
    public function index(Request $request): Response
    {
        $warehouses = Warehouse::with('owner:id,name,email,mobile,status')
            ->withCount(['orders', 'warehouseUsers'])
            ->when($request->input('search'), function ($q, $s) {
                $q->where('name', 'like', "%{$s}%")
                  ->orWhere('location', 'like', "%{$s}%")
                  ->orWhereHas('user', fn ($u) => $u->where('name', 'like', "%{$s}%"));
            })
            ->when($request->filled('status'), fn ($q) =>
                $q->where('is_active', $request->boolean('status'))
            )
            ->latest()
            ->get();

        $stats = [
            'total'    => Warehouse::count(),
            'active'   => Warehouse::where('is_active', true)->count(),
            'inactive' => Warehouse::where('is_active', false)->count(),
        ];

        return Inertia::render('Admin/Warehouses/Index', [
            'warehouses' => $warehouses,
            'stats'      => $stats,
            'filters'    => $request->only(['search', 'status']),
        ]);
    }

    // ──────────────────────────────────────────────────────────────
    // CREATE — just renders the form, no props needed
    // ──────────────────────────────────────────────────────────────
    public function create(): Response
    {
        return Inertia::render('Admin/Warehouses/Create');
    }

    // ──────────────────────────────────────────────────────────────
    // STORE — creates User + Warehouse + WarehouseUser pivot
    // ──────────────────────────────────────────────────────────────
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name'          => ['required', 'string', 'max:150', 'unique:warehouses,name'],
            'platform'      => ['nullable', 'string', 'max:255'],
            'address'       => ['nullable', 'string', 'max:255'],
            'location'      => ['nullable', 'string', 'max:255'],
            'is_active'     => ['boolean'],
            'user_name'     => ['required', 'string', 'max:150'],
            'user_email'    => ['required', 'email', 'max:150', 'unique:users,email'],
            'user_mobile'   => ['required', 'string', 'max:20'],
            'user_password' => ['required', 'string', 'min:8'],
        ]);

        DB::transaction(function () use ($request) {
            $user = User::create([
                'name'     => $request->user_name,
                'email'    => $request->user_email,
                'mobile'   => $request->user_mobile,
                'password' => Hash::make($request->user_password),
                'status'   => 'active',
                'role'     => 'warehouse',
            ]);

            $warehouse = Warehouse::create([
                'name'      => $request->name,
                'address'   => $request->address,
                'location'  => $request->location,
                'platform'  => $request->platform,
                'is_active' => $request->boolean('is_active', true),
                'user_id'   => $user->id,
            ]);

            WarehouseUser::create([
                'warehouse_id' => $warehouse->id,
                'user_id'      => $user->id,
                'role'         => 'owner',
                'is_active'    => true,
                'joined_at'    => now(),
            ]);
        });

        return redirect()->route('admin.warehouses.index')
                         ->with('success', 'Warehouse created successfully.');
    }

    // ──────────────────────────────────────────────────────────────
    // SHOW
    // Props: { warehouse, stats, recent_orders, staff }
    // ──────────────────────────────────────────────────────────────
    public function show(Warehouse $warehouse): Response
    {
        $warehouse->load('user:id,name,email,mobile,status');

        $stats = [
            'total_orders'   => $warehouse->orders()->count(),
            'pending_orders' => $warehouse->orders()->where('status', 'pending')->count(),
            'total_revenue'  => $warehouse->orders()->where('payment_status', 'paid')->sum('total_amount'),
            'staff_count'    => $warehouse->warehouseUsers()->where('is_active', true)->count(),
        ];

        $recentOrders = $warehouse->orders()
            ->select(['id', 'order_number', 'status', 'payment_status', 'total_amount', 'created_at'])
            ->latest()
            ->limit(10)
            ->get();

        $staff = $warehouse->warehouseUsers()
            ->with('user:id,name,mobile,status')
            ->get(['id', 'user_id', 'role', 'is_active', 'joined_at']);

        return Inertia::render('Admin/Warehouses/Show', [
            'warehouse'     => $warehouse,
            'stats'         => $stats,
            'recent_orders' => $recentOrders,
            'staff'         => $staff,
        ]);
    }

    // ──────────────────────────────────────────────────────────────
    // EDIT
    // Props: { warehouse } with user loaded
    // ──────────────────────────────────────────────────────────────
    public function edit(Warehouse $warehouse): Response
    {
        $warehouse->load('user:id,name,email,mobile,status');

        return Inertia::render('Admin/Warehouses/Edit', [
            'warehouse' => $warehouse,
        ]);
    }

    // ──────────────────────────────────────────────────────────────
    // UPDATE — updates warehouse + linked manager user
    // ──────────────────────────────────────────────────────────────
    public function update(Request $request, Warehouse $warehouse): RedirectResponse
    {
        $request->validate([
            'name'          => ['required', 'string', 'max:150', Rule::unique('warehouses', 'name')->ignore($warehouse->id)],
            'platform'      => ['nullable', 'string', 'max:255'],
            'address'       => ['nullable', 'string', 'max:255'],
            'location'      => ['nullable', 'string', 'max:255'],
            'is_active'     => ['boolean'],
            'user_name'     => ['required', 'string', 'max:150'],
            'user_email'    => ['required', 'email', 'max:150', Rule::unique('users', 'email')->ignore($warehouse->user_id)],
            'user_mobile'   => ['required', 'string', 'max:20'],
            'user_password' => ['nullable', 'string', 'min:8'],
            'user_status'   => ['required', Rule::in(['active', 'inactive'])],
        ]);

        DB::transaction(function () use ($request, $warehouse) {
            $warehouse->update([
                'name'      => $request->name,
                'address'   => $request->address,
                'location'  => $request->location,
                'platform'  => $request->platform,
                'is_active' => $request->boolean('is_active'),
            ]);

            if ($warehouse->user_id) {
                $userPayload = [
                    'name'   => $request->user_name,
                    'email'  => $request->user_email,
                    'mobile' => $request->user_mobile,
                    'status' => $request->user_status,
                ];
                if ($request->filled('user_password')) {
                    $userPayload['password'] = Hash::make($request->user_password);
                }
                User::where('id', $warehouse->user_id)->update($userPayload);
            }
        });

        return redirect()->route('admin.warehouses.index')
                         ->with('success', 'Warehouse updated successfully.');
    }

    // ──────────────────────────────────────────────────────────────
    // TOGGLE STATUS  PATCH /admin/warehouses/{warehouse}/toggle
    // ──────────────────────────────────────────────────────────────
    public function toggleStatus(Warehouse $warehouse): RedirectResponse
    {
        $warehouse->update(['is_active' => !$warehouse->is_active]);

        return redirect()->back()->with('success', 'Warehouse status updated.');
    }

    // ──────────────────────────────────────────────────────────────
    // DESTROY
    // ──────────────────────────────────────────────────────────────
    public function destroy(Warehouse $warehouse): RedirectResponse
    {
        $warehouse->delete();

        return redirect()->route('admin.warehouses.index')
                         ->with('success', 'Warehouse deleted.');
    }
}
