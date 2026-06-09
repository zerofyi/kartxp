<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolePermissionController extends Controller
{
    /**
     * List all roles with their permissions.
     */
    public function index(): Response
    {
        $roles = Role::with('permissions')
                     ->orderBy('name')
                     ->get()
                     ->map(function (Role $role) {
                         return [
                             'id'          => $role->id,
                             'name'        => $role->name,
                             'guard_name'  => $role->guard_name,
                             'permissions' => $role->permissions->pluck('name'),
                             'users_count' => DB::table('model_has_roles')
                                               ->where('role_id', $role->id)
                                               ->count(),
                         ];
                     });

        $permissions = Permission::orderBy('name')
                                 ->get()
                                 ->groupBy(fn (Permission $p) => explode('.', $p->name)[0] ?? 'general')
                                 ->map(fn ($group) => $group->pluck('name'));

        return Inertia::render('Admin/RolePermissions/Index', [
            'roles'       => $roles,
            'permissions' => $permissions,
        ]);
    }

    /**
     * Create a new role with optional permissions.
     */
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name'        => ['required', 'string', 'max:100', 'unique:roles,name'],
            'guard_name'  => ['nullable', 'string', 'max:50'],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ]);

        DB::transaction(function () use ($data) {
            $role = Role::create([
                'name'       => $data['name'],
                'guard_name' => $data['guard_name'] ?? 'web',
            ]);

            if (! empty($data['permissions'])) {
                $role->syncPermissions($data['permissions']);
            }

            activity()
                ->causedBy(Auth::user())
                ->performedOn($role)
                ->withProperties(['permissions' => $data['permissions'] ?? []])
                ->log('Admin created role');
        });

        return redirect()->back()
                         ->with('success', 'Role created successfully.');
    }

    /**
     * Update a role's permissions.
     */
    public function update(Request $request, Role $role): RedirectResponse
    {
        $data = $request->validate([
            'name'          => ['required', 'string', 'max:100'],
            'permissions'   => ['nullable', 'array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ]);

        DB::transaction(function () use ($data, $role) {
            $role->update(['name' => $data['name']]);
            $role->syncPermissions($data['permissions'] ?? []);

            activity()
                ->causedBy(Auth::user())
                ->performedOn($role)
                ->withProperties(['permissions' => $data['permissions'] ?? []])
                ->log('Admin updated role permissions');
        });

        return redirect()->back()
                         ->with('success', 'Role updated.');
    }

    /**
     * Delete a role (prevent deleting system roles).
     */
    public function destroy(Role $role): RedirectResponse
    {
        $protected = ['admin', 'customer', 'warehouse', 'manager', 'staff', 'delivery_agent'];

        if (in_array($role->name, $protected, true)) {
            return redirect()->back()
                             ->with('error', 'System roles cannot be deleted.');
        }

        $usersCount = DB::table('model_has_roles')->where('role_id', $role->id)->count();

        if ($usersCount > 0) {
            return redirect()->back()
                             ->with('error', "Cannot delete role '{$role->name}' — {$usersCount} user(s) still assigned.");
        }

        DB::transaction(function () use ($role) {
            activity()
                ->causedBy(Auth::user())
                ->withProperties(['role' => $role->name])
                ->log('Admin deleted role');

            $role->delete();
        });

        return redirect()->back()
                         ->with('success', 'Role deleted.');
    }

    /**
     * Create a new permission.
     */
    public function storePermission(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name'       => ['required', 'string', 'max:150', 'unique:permissions,name'],
            'guard_name' => ['nullable', 'string', 'max:50'],
        ]);

        Permission::create([
            'name'       => $data['name'],
            'guard_name' => $data['guard_name'] ?? 'web',
        ]);

        activity()
            ->causedBy(Auth::user())
            ->log("Admin created permission: {$data['name']}");

        return redirect()->back()
                         ->with('success', 'Permission created.');
    }
}
