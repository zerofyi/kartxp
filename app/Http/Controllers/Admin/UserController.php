<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Auth\Events\Login;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;
use Symfony\Component\HttpFoundation\StreamedResponse;

class UserController extends Controller
{
    /**
     * List all users with search, role and status filters.
     */
    public function index(Request $request): Response
    {
        $query = User::with('roles')
            ->when($request->search, function ($q, $search) {
                $q->where(function ($inner) use ($search) {
                    $inner->where('name', 'like', "%{$search}%")
                          ->orWhere('email', 'like', "%{$search}%")
                          ->orWhere('mobile', 'like', "%{$search}%");
                });
            })
            ->when($request->role, function ($q, $role) {
                $q->role($role);
            })
            ->when($request->filled('status'), function ($q) use ($request) {
                $q->where('status', (bool) $request->status);
            });

        $users = $query->latest()->paginate(20)->withQueryString();

        return Inertia::render('Admin/Users/Index', [
            'users'   => $users,
            'roles'   => Role::orderBy('name')->pluck('name'),
            'filters' => $request->only(['search', 'role', 'status']),
        ]);
    }

    /**
     * Show the create user form.
     */
    public function create(): Response
    {
        return Inertia::render('Admin/Users/Create', [
            'roles'      => Role::orderBy('name')->get(['id', 'name']),
            'warehouses' => Warehouse::active()->orderBy('name')->get(['id', 'name']),
        ]);
    }

    /**
     * Store a new user.
     */
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name'       => ['required', 'string', 'max:100'],
            'email'      => ['required', 'email', 'unique:users,email'],
            'mobile'     => ['nullable', 'string', 'max:20'],
            'password'   => ['required', 'string', 'min:8', 'confirmed'],
            'role'       => ['required', 'string', 'exists:roles,name'],
            'status'     => ['boolean'],
        ]);

        DB::transaction(function () use ($data, $request) {
            $user = User::create([
                'name'     => $data['name'],
                'email'    => $data['email'],
                'mobile'   => $data['mobile'] ?? null,
                'password' => Hash::make($data['password']),
                'status'   => $data['status'] ?? true,
            ]);

            $user->assignRole($data['role']);

            activity()
                ->causedBy(Auth::user())
                ->performedOn($user)
                ->withProperties(['role' => $data['role']])
                ->log('Admin created user');
        });

        return redirect()->route('admin.users.index')
                         ->with('success', 'User created successfully.');
    }

    /**
     * Show a single user profile.
     */
    public function show(User $user): Response
    {
        $user->load(['roles', 'customer', 'warehouseUsers.warehouse']);

        return Inertia::render('Admin/Users/Show', [
            'user' => $user,
        ]);
    }

    /**
     * Show the edit user form.
     */
    public function edit(User $user): Response
    {
        $user->load('roles');

        return Inertia::render('Admin/Users/Edit', [
            'user'       => $user,
            'roles'      => Role::orderBy('name')->get(['id', 'name']),
            'warehouses' => Warehouse::active()->orderBy('name')->get(['id', 'name']),
        ]);
    }

    /**
     * Update a user's details.
     */
    public function update(Request $request, User $user): RedirectResponse
    {
        $data = $request->validate([
            'name'     => ['required', 'string', 'max:100'],
            'email'    => ['required', 'email', Rule::unique('users', 'email')->ignore($user->id)],
            'mobile'   => ['nullable', 'string', 'max:20'],
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
            'role'     => ['required', 'string', 'exists:roles,name'],
            'status'   => ['boolean'],
        ]);

        DB::transaction(function () use ($data, $user) {
            $updatePayload = [
                'name'   => $data['name'],
                'email'  => $data['email'],
                'mobile' => $data['mobile'] ?? $user->mobile,
                'status' => $data['status'] ?? $user->status,
            ];

            if (! empty($data['password'])) {
                $updatePayload['password'] = Hash::make($data['password']);
            }

            $user->update($updatePayload);
            $user->syncRoles([$data['role']]);

            activity()
                ->causedBy(Auth::user())
                ->performedOn($user)
                ->log('Admin updated user');
        });

        return redirect()->route('admin.users.index')
                         ->with('success', 'User updated successfully.');
    }

    /**
     * Toggle user active/inactive status.
     */
    public function toggleStatus(User $user): RedirectResponse
    {
        $user->update(['status' => ! $user->status]);

        activity()
            ->causedBy(Auth::user())
            ->performedOn($user)
            ->withProperties(['status' => $user->status])
            ->log('Admin toggled user status');

        return redirect()->back()
                         ->with('success', 'User status updated.');
    }

    /**
     * Impersonate a user — only super-admin may do this.
     */
    public function impersonate(User $user): RedirectResponse
    {
        /** @var User $admin */
        $admin = Auth::user();

        if ($admin->id === $user->id) {
            return redirect()->back()->with('error', 'You cannot impersonate yourself.');
        }

        // Store the original admin ID in session
        session(['impersonating_as' => $user->id, 'impersonator_id' => $admin->id]);

        Auth::login($user);

        Log::info('Admin impersonated user', [
            'admin_id' => $admin->id,
            'user_id'  => $user->id,
        ]);

        activity()
            ->causedBy($admin)
            ->performedOn($user)
            ->log('Admin impersonated user');

        return redirect()->route('dashboard')
                         ->with('info', "You are now impersonating {$user->name}.");
    }

    /**
     * Soft-delete a user.
     */
    public function destroy(User $user): RedirectResponse
    {
        /** @var User $admin */
        $admin = Auth::user();

        if ($admin->id === $user->id) {
            return redirect()->back()->with('error', 'You cannot delete yourself.');
        }

        DB::transaction(function () use ($user, $admin) {
            $user->delete();

            activity()
                ->causedBy($admin)
                ->performedOn($user)
                ->log('Admin deleted user');
        });

        return redirect()->route('admin.users.index')
                         ->with('success', 'User deleted.');
    }

    /**
     * Export users as CSV.
     */
    public function export(Request $request): StreamedResponse
    {
        $users = User::with('roles')
            ->when($request->role, fn ($q, $role) => $q->role($role))
            ->when($request->filled('status'), fn ($q) => $q->where('status', (bool) $request->status))
            ->orderBy('created_at')
            ->get();

        $headers = [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="users_' . now()->format('Ymd_His') . '.csv"',
        ];

        $callback = function () use ($users) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['ID', 'Name', 'Email', 'Mobile', 'Role', 'Status', 'Registered At']);

            foreach ($users as $user) {
                fputcsv($handle, [
                    $user->id,
                    $user->name,
                    $user->email,
                    $user->mobile,
                    $user->roles->pluck('name')->implode(', '),
                    $user->status ? 'Active' : 'Inactive',
                    $user->created_at->format('Y-m-d H:i:s'),
                ]);
            }

            fclose($handle);
        };

        return response()->stream($callback, 200, $headers);
    }
}
