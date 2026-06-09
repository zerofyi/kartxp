<?php

namespace App\Http\Controllers;

use App\Models\Vendor;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class VendorController extends Controller
{
    /**
     * Display a listing of vendors.
     * Only fetch columns the UI actually renders.
     */
    public function index(): Response
    {
        $vendors = Vendor::select('id', 'name', 'phone', 'email', 'gstin', 'address', 'created_at', 'updated_at')
            ->orderBy('name')
            ->get();

        return Inertia::render('Warehouse/Vendors', [
            'vendors' => $vendors,
        ]);
    }

    /**
     * Store a newly created vendor.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate(
            $this->rules(),
            $this->messages(),
        );

        try {
            DB::beginTransaction();

            Vendor::create([
                ...$this->sanitize($validated),
                'user_id' => Auth::id(),
            ]);

            DB::commit();

            return redirect()->back()->with('success', 'Vendor created successfully.');
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Vendor store failed', ['error' => $e->getMessage(), 'user' => Auth::id()]);

            return redirect()->back()->withErrors([
                'form' => 'Failed to create vendor. Please try again.',
            ])->withInput();
        }
    }

    /**
     * Update an existing vendor.
     */
    public function update(Request $request, Vendor $vendor): RedirectResponse
    {
        $validated = $request->validate(
            $this->rules($vendor->id),
            $this->messages(),
        );

        try {
            DB::beginTransaction();

            $vendor->update($this->sanitize($validated));

            DB::commit();

            return redirect()->back()->with('success', 'Vendor updated successfully.');
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Vendor update failed', ['vendor' => $vendor->id, 'error' => $e->getMessage()]);

            return redirect()->back()->withErrors([
                'form' => 'Failed to update vendor. Please try again.',
            ])->withInput();
        }
    }

    /**
     * Delete a vendor.
     * Guard against vendors that have associated purchase orders or stock entries.
     */
    public function destroy(Vendor $vendor): RedirectResponse
    {
        // Uncomment and adapt once relationships are defined on the Vendor model:
        // if ($vendor->purchaseOrders()->exists()) {
        //     return redirect()->back()->withErrors([
        //         'form' => 'Cannot delete a vendor with existing purchase orders.',
        //     ]);
        // }

        try {
            $vendor->delete();

            return redirect()->back()->with('success', 'Vendor deleted successfully.');
        } catch (\Throwable $e) {
            Log::error('Vendor delete failed', ['vendor' => $vendor->id, 'error' => $e->getMessage()]);

            return redirect()->back()->withErrors([
                'form' => 'Failed to delete vendor. Please try again.',
            ]);
        }
    }

    // ─────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────

    private function rules(?int $vendorId = null): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:255'],

            'phone' => [
                'required',
                'string',
                'min:7',
                'max:15',
                Rule::unique('vendors', 'phone')->ignore($vendorId),
            ],

            'email' => ['nullable', 'string', 'email:rfc', 'max:255'],

            'gstin' => [
                'nullable',
                'string',
                'regex:/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}[Z]{1}[A-Z0-9]{1}$/',
                'max:15',
            ],

            'address' => ['nullable', 'string', 'max:1000'],
        ];
    }

    private function messages(): array
    {
        return [
            'name.required'  => 'Vendor name is required.',
            'name.min'       => 'Vendor name must be at least 2 characters.',
            'name.max'       => 'Vendor name must not exceed 255 characters.',

            'phone.required' => 'Phone number is required.',
            'phone.min'      => 'Phone number must be at least 7 digits.',
            'phone.max'      => 'Phone number must not exceed 15 digits.',
            'phone.unique'   => 'This phone number is already registered.',

            'email.email'    => 'Please enter a valid email address.',
            'email.max'      => 'Email must not exceed 255 characters.',

            'gstin.regex'    => 'Invalid GSTIN format. Example: 22AAAAA0000A1Z5',
            'gstin.max'      => 'GSTIN must not exceed 15 characters.',

            'address.max'    => 'Address must not exceed 1000 characters.',
        ];
    }

    /**
     * Trim whitespace; normalise empty strings → null for nullable columns.
     */
    private function sanitize(array $data): array
    {
        foreach (['email', 'gstin', 'address'] as $field) {
            if (array_key_exists($field, $data)) {
                $trimmed = trim((string) $data[$field]);
                $data[$field] = $trimmed === '' ? null : $trimmed;
            }
        }

        $data['name']  = trim($data['name']);
        $data['phone'] = trim($data['phone']);

        return $data;
    }
}
