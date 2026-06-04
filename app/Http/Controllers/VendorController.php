<?php

namespace App\Http\Controllers;

use App\Models\Vendor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class VendorController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $vendors = Vendor::orderBy('name')
            ->get();

        return Inertia::render('warehouse/Vendors', [
            'vendors' => $vendors,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate(
            $this->rules(),
            $this->messages(),
        );

        try {
            DB::beginTransaction();
            $data = $this->sanitize($validated);
            $data['user_id'] = Auth::id();
            Vendor::create($data);

            DB::commit();

            return redirect()->back()->with('success', 'Vendor created successfully.');
        } catch (\Exception $e) {
            DB::rollBack();

            return redirect()->back()->withErrors([
                'name' => 'Failed to create vendor. Please try again.',
            ]);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(Vendor $vendor)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Vendor $vendor)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Vendor $vendor)
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
        } catch (\Exception $e) {
            DB::rollBack();

            return redirect()->back()->withErrors([
                'name' => 'Failed to update vendor. Please try again.',
            ]);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Vendor $vendor)
    {
        //
    }

    private function rules(?int $vendorId = null): array
    {
        return [
            'name' => [
                'required',
                'string',
                'min:2',
                'max:255',
            ],
            'phone' => [
                'required',
                'string',
                'min:7',
                'max:15',
                Rule::unique('vendors', 'phone')->ignore($vendorId),
            ],
            'email' => [
                'nullable',
                'string',
                'email:rfc',
                'max:255',
            ],
            'gstin' => [
                'nullable',
                'string',
                'regex:/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}[Z]{1}[A-Z0-9]{1}$/',
                'max:15',
            ],
            'address' => [
                'nullable',
                'string',
                'max:1000',
            ],
        ];
    }

    /**
     * Human-readable validation messages.
     */
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
     * Trim whitespace; convert empty strings to null for
     * nullable columns so the DB stays clean.
     */
    private function sanitize(array $data): array
    {
        foreach (['email', 'gstin', 'address'] as $field) {
            if (isset($data[$field])) {
                $trimmed = trim($data[$field]);
                $data[$field] = $trimmed === '' ? null : $trimmed;
            }
        }

        $data['name']  = trim($data['name']);
        $data['phone'] = trim($data['phone']);

        return $data;
    }
}
