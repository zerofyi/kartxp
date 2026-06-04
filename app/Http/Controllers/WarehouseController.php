<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class WarehouseController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $warehouses = Warehouse::with('user:id,name,email,mobile,status')
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('admin/Warehouses', [
            'warehouses' => $warehouses,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'address' => 'nullable|string',
            'location' => 'nullable|string|max:255',
            'user_name' => 'required|string|max:255',
            'user_email' => 'required|email|unique:users,email',
            'user_mobile' => 'required|string|max:20|unique:users,mobile',
            'user_password' => 'required|string|min:8',
        ]);

        DB::beginTransaction();
        try {
            // Create user for warehouse
            $user = User::create([
                'name' => $validated['user_name'],
                'email' => $validated['user_email'],
                'mobile' => $validated['user_mobile'],
                'password' => Hash::make($validated['user_password']),
                'role' => 'warehouse',
                'status' => 'active',
            ]);

            // Create warehouse
            $warehouse = Warehouse::create([
                'name' => $validated['name'],
                'address' => $validated['address'] ?? null,
                'location' => $validated['location'] ?? null,
                'user_id' => $user->id,
            ]);

            DB::commit();
            return redirect()->back()->with('success', 'Warehouse created successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->withErrors(['error' => 'Failed to create warehouse: ' . $e->getMessage()]);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update2(Request $request, Warehouse $warehouse)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'address' => 'nullable|string',
            'location' => 'nullable|string|max:255',
            'user_name' => 'required|string|max:255',
            'user_email' => [
                'required',
                'email',
                Rule::unique('users', 'email')->ignore($warehouse->user_id),
            ],
            'user_mobile' => [
                'required',
                'string',
                'max:20',
                Rule::unique('users', 'mobile')->ignore($warehouse->user_id),
            ],
            'user_password' => 'nullable|string|min:8',
            'user_status' => 'boolean',
        ]);

        DB::beginTransaction();
        try {
            // Update warehouse
            $warehouse->update([
                'name' => $validated['name'],
                'address' => $validated['address'] ?? null,
                'location' => $validated['location'] ?? null,
            ]);

            // Update user
            $userData = [
                'name' => $validated['user_name'],
                'email' => $validated['user_email'],
                'mobile' => $validated['user_mobile'],
                'status' => $validated['user_status'] ?? true,
            ];

            // Update password only if provided
            if (!empty($validated['user_password'])) {
                $userData['password'] = Hash::make($validated['user_password']);
            }

            $warehouse->user->update($userData);

            DB::commit();
            return redirect()->back()->with('success', 'Warehouse updated successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->withErrors(['error' => 'Failed to update warehouse: ' . $e->getMessage()]);
        }
    }

    public function update(Request $request, $id)
    {
        $warehouse = Warehouse::with('user')->findOrFail($id);

        // Validate with proper rules
        $rules = [
            'name' => 'required|string|max:255',
            'address' => 'nullable|string',
            'location' => 'nullable|string|max:255',
            'user_name' => 'required|string|max:255',
            'user_email' => [
                'required',
                'email',
                Rule::unique('users', 'email')->ignore($warehouse->user_id),
            ],
            'user_mobile' => [
                'required',
                'string',
                'max:20',
                Rule::unique('users', 'mobile')->ignore($warehouse->user_id),
            ],
        ];

        // Only validate password if it's provided
        if ($request->filled('user_password')) {
            $rules['user_password'] = 'string|min:8';
        }

        $validated = $request->validate($rules);

        DB::beginTransaction();
        try {
            // Update warehouse
            $warehouse->update([
                'name' => $validated['name'],
                'address' => $validated['address'] ?? null,
                'location' => $validated['location'] ?? null,
            ]);

            // Update user
            $userData = [
                'name' => $validated['user_name'],
                'email' => $validated['user_email'],
                'mobile' => $validated['user_mobile'],
            ];

            // Update password only if provided
            if ($request->filled('user_password')) {
                $userData['password'] = Hash::make($validated['user_password']);
            }

            // Update status - get from request directly
            if ($request->has('user_status')) {
                $userData['status'] = $request['user_status'];
            }

            $warehouse->user->update($userData);

            DB::commit();

            return redirect()->back()->with('success', 'Warehouse updated successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Warehouse update failed: ' . $e->getMessage());
            return redirect()->back()->withErrors(['error' => 'Failed to update warehouse: ' . $e->getMessage()]);
        }
    }
}
