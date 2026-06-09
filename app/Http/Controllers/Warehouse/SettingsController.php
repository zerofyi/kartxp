<?php

namespace App\Http\Controllers\Warehouse;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\ShippingZone;
use App\Models\Warehouse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    /**
     * Resolve the active warehouse ID context safely.
     */
    private function currentWarehouseId(): int
    {
        return Auth::user()->currentWarehouse()->value('warehouses.id')
            ?? abort(403, 'Warehouse session context missing or invalid.');
    }

    /**
     * Display general system preference arrays.
     */
    public function index(): Response
    {
        $warehouseId = $this->currentWarehouseId();

        $rawSettings = Setting::where('warehouse_id', $warehouseId)
            ->orWhereNull('warehouse_id')
            ->get();

        // Flatten database rows into a direct key => value array for simpler UI form binding
        $settings = [];
        foreach ($rawSettings as $setting) {
            $settings[$setting->key] = $setting->value;
        }

        // Ensure defaults exist for forms if database keys aren't provisioned yet
        $defaults = [
            'receipt_footer'      => '',
            'default_tax_rate'    => '0',
            'low_stock_threshold' => '10',
            'auto_confirm_orders' => '0'
        ];
        $settings = array_merge($defaults, $settings);

        return Inertia::render('Warehouse/Settings/Index', [
            'settings'  => $settings,
            'warehouse' => Warehouse::findOrFail($warehouseId),
        ]);
    }

    /**
     * Batch update general system preferences.
     */
    public function update(Request $request): RedirectResponse
    {
        $warehouseId = $this->currentWarehouseId();
        $incoming = $request->all();

        foreach ($incoming as $key => $value) {
            // Guard against saving Inertia processing metadata fields
            if (in_array($key, ['errors', 'processing'])) continue;

            Setting::updateOrCreate(
                ['key' => $key, 'warehouse_id' => $warehouseId],
                ['value' => is_bool($value) ? ($value ? '1' : '0') : strval($value ?? '')]
            );
        }

        Cache::forget("settings:warehouse:{$warehouseId}");

        return back()->with('success', 'General configurations committed successfully.');
    }

    /**
     * Display corporate business profile properties.
     */
    public function businessProfile(): Response
    {
        $warehouseId = $this->currentWarehouseId();
        $warehouse   = Warehouse::findOrFail($warehouseId);

        return Inertia::render('Warehouse/Settings/BusinessProfile', compact('warehouse'));
    }

    /**
     * Update corporate profile attributes with secure image uploads.
     */
    public function updateBusinessProfile(Request $request): RedirectResponse
    {
        $warehouseId = $this->currentWarehouseId();
        $warehouse   = Warehouse::findOrFail($warehouseId);

        $validated = $request->validate([
            'name'    => 'required|string|max:255',
            'address' => 'required|string',
            'phone'   => 'nullable|string|max:20',
            'email'   => 'nullable|email|max:255',
            'gstin'   => 'nullable|string|max:20',
            'logo'    => 'nullable|image|max:2048',
            'lat'     => 'nullable|numeric',
            'lng'     => 'nullable|numeric',
        ]);

        if ($request->hasFile('logo')) {
            if ($warehouse->logo_path) {
                Storage::disk('public')->delete($warehouse->logo_path);
            }
            $validated['logo_path'] = $request->file('logo')->store("warehouses/{$warehouseId}/logo", 'public');
        }

        unset($validated['logo']);
        $warehouse->update($validated);

        return back()->with('success', 'Business profile attributes updated.');
    }

    /**
     * Display logistic dispatch zone regions.
     */
    public function shippingZones(): Response
    {
        $warehouseId = $this->currentWarehouseId();
        $zones       = ShippingZone::where('warehouse_id', $warehouseId)->orderBy('name')->get();

        return Inertia::render('Warehouse/Settings/ShippingZones', compact('zones'));
    }

    /**
     * Create a logistics dispatch zone region.
     */
    public function storeShippingZone(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name'       => 'required|string|max:100',
            'pincodes'   => 'nullable|array',
            'pincodes.*' => 'string',
            'charge'     => 'required|numeric|min:0',
            'free_above' => 'nullable|numeric|min:0',
            'is_active'  => 'required|boolean',
        ]);

        $warehouseId = $this->currentWarehouseId();

        ShippingZone::create(array_merge($validated, ['warehouse_id' => $warehouseId]));

        return back()->with('success', 'Logistics dispatch zone region appended.');
    }

    /**
     * Modify active logistics zone parameters.
     */
    public function updateShippingZone(Request $request, ShippingZone $zone): RedirectResponse
    {
        $warehouseId = $this->currentWarehouseId();
        if ($zone->warehouse_id !== $warehouseId) {
            abort(403, 'Cross-tenant mutation target unauthorized.');
        }

        $validated = $request->validate([
            'name'       => 'required|string|max:100',
            'pincodes'   => 'nullable|array',
            'pincodes.*' => 'string',
            'charge'     => 'required|numeric|min:0',
            'free_above' => 'nullable|numeric|min:0',
            'is_active'  => 'required|boolean',
        ]);

        $zone->update($validated);

        return back()->with('success', 'Logistics zone properties updated.');
    }

    /**
     * Remove an inactive shipping zone.
     */
    public function deleteShippingZone(ShippingZone $zone): RedirectResponse
    {
        if ($zone->warehouse_id !== $this->currentWarehouseId()) {
            abort(403, 'Cross-tenant deletion target unauthorized.');
        }

        $zone->delete();

        return back()->with('success', 'Logistics zone removed successfully.');
    }
}
