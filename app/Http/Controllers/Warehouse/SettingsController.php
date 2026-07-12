<?php

namespace App\Http\Controllers\Warehouse;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\ShippingZone;
use App\Models\Warehouse;
use App\Services\ImageStorage\ImageStorageService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    /**
     // Inject the infrastructure storage service into the controller context
     */
    public function __construct(
        protected ImageStorageService $imageStorage
    ) {}

    private function currentWarehouseId(): int
    {
        return Auth::user()->ownedWarehouse()->value('warehouses.id')
            ?? abort(403, 'Warehouse session context missing or invalid.');
    }

    public function index(): Response
    {
        $warehouseId = $this->currentWarehouseId();
        $warehouse = Warehouse::findOrFail($warehouseId);

        // Fetch warehouse-specific configurations directly mapped key->value
        $settings = Setting::where('warehouse_id', $warehouseId)
            ->pluck('value', 'key')
            ->toArray();

        // Provision complete fallback configurations dictionary parameters
        $defaults = [
            'receipt_footer'      => '',
            'default_tax_rate'    => 'GST 5% (Inclusive)',
            'low_stock_threshold' => '5',
            'auto_confirm_orders' => '0',
            'gst_enabled'         => '0',
            'invoice_layout'      => 'thermal_classic',
            'upi_id'              => '',
            'is_qz_enabled'        => '0',
            'thermal_printer_name' => '',
            'a4_printer_name'      => '',
        ];

        return Inertia::render('Warehouse/Settings/Index', [
            'settings'   => array_merge($defaults, $settings),
            'warehouse'  => $warehouse,
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $warehouseId = $this->currentWarehouseId();

        // Strict request validation guarding against structural database pollution
        $validated = $request->validate([
            'receipt_footer'      => 'nullable|string|max:1000',
            'default_tax_rate'    => 'required|string|max:50',
            'low_stock_threshold' => 'required|integer|min:0|max:99999',
            'auto_confirm_orders' => 'required|in:0,1',
            'gst_enabled'         => 'required|in:0,1',
            'invoice_layout'      => 'required|in:thermal_classic,thermal_modern,a4_standard,a4_modern',
            'upi_id'              => 'nullable|string|max:100',
            'is_qz_enabled'        => 'required|in:0,1',
            'thermal_printer_name' => 'nullable|string|max:255',
            'a4_printer_name'      => 'nullable|string|max:255',
        ]);

        // Wrap execution contexts in an atomic transaction statement to optimize performance
        DB::transaction(function () use ($validated, $warehouseId) {
            foreach ($validated as $key => $value) {
                Setting::updateOrCreate(
                    ['key' => $key, 'warehouse_id' => $warehouseId],
                    ['value' => is_bool($value) ? ($value ? '1' : '0') : strval($value ?? '')]
                );
            }
        });

        Cache::forget("settings:warehouse:{$warehouseId}");

        return back()->with('success', 'General configurations committed successfully.');
    }

    public function businessProfile(): Response
    {
        $warehouseId = $this->currentWarehouseId();
        $warehouse   = Warehouse::findOrFail($warehouseId);

        return Inertia::render('Warehouse/Settings/BusinessProfile', [
            'warehouse' => [
                'id'         => $warehouse->id,
                'name'       => $warehouse->name,
                'platform'   => $warehouse->platform ?? 'ghorerbazar',
                'address'    => $warehouse->address,
                'location'   => $warehouse->location,
                'phone'      => $warehouse->phone,
                'email'      => $warehouse->email,
                'logo_path'  => $warehouse->logo_path,
                'gstin'      => $warehouse->gstin,
                'lat'        => $warehouse->lat !== null ? (float) $warehouse->lat : null,
                'lng'        => $warehouse->lng !== null ? (float) $warehouse->lng : null,
                'timezone'   => $warehouse->timezone ?? 'Asia/Kolkata',
                'currency'   => $warehouse->currency ?? 'INR',
            ]
        ]);
    }

    public function updateBusinessProfile(Request $request, Warehouse $warehouse): RedirectResponse
    {
        if ($warehouse->id !== $this->currentWarehouseId()) {
            abort(403, 'Cross-tenant profile mutation target unauthorized.');
        }

        // Platform is removed entirely from request input validation fields to ensure immutability
        $validated = $request->validate([
            'name'      => 'required|string|max:255',
            'address'   => 'required|string',
            'location'  => 'nullable|string|max:1000', // Captures shareable map URL strings smoothly
            'phone'     => 'nullable|string|max:20',
            'email'     => 'nullable|email|max:255',
            'gstin'     => 'nullable|string|max:20',
            'logo'      => 'nullable|image|max:2048',
            'lat'       => 'nullable|numeric|between:-90,90',
            'lng'       => 'nullable|numeric|between:-180,180',
            'timezone'  => 'required|string|max:100',
            'currency'  => 'required|string|max:10',
        ]);

        // Atomic swap engine utilizing specialized ImageStorageService framework
        if ($request->hasFile('logo')) {
            $storageResult = $this->imageStorage->replace(
                file: $request->file('logo'),
                slug: $warehouse->name,
                folder: "Warehouses",
                existingPath: $warehouse->logo_path
            );

            // Persist the clean relative storage path to the database
            $validated['logo_path'] = $storageResult->path;
        }

        unset($validated['logo']);
        $warehouse->update($validated);

        // Flush cached profile entries to update components across system instances instantly
        Cache::forget("warehouse:profile:{$warehouse->id}");

        return back()->with('success', 'Operational warehouse hub configurations committed successfully.');
    }

    public function shippingZones(): Response
    {
        $warehouseId = $this->currentWarehouseId();
        $zones       = ShippingZone::where('warehouse_id', $warehouseId)->orderBy('name')->get();
        $warehouse   = Warehouse::select('id', 'lat', 'lng')->findOrFail($warehouseId);

        return Inertia::render('Warehouse/Settings/ShippingZones', [
            'zones'     => $zones,
            'warehouse' => [
                'id'  => $warehouse->id,
                'lat' => $warehouse->lat !== null ? (float) $warehouse->lat : null,
                'lng' => $warehouse->lng !== null ? (float) $warehouse->lng : null,
            ],
        ]);
    }

    public function storeShippingZone(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name'       => 'required|string|max:100',
            'pincodes'   => 'nullable|array',
            'pincodes.*' => 'string|max:20',
            'radius_km'  => 'nullable|numeric|min:0|max:500',
            'charge'     => 'required|numeric|min:0',
            'free_above' => 'nullable|numeric|min:0',
            'is_active'  => 'required|boolean',
        ]);

        $isRadiusStrategy = !empty($validated['radius_km']);

        // Check for conflicting selection bounds
        if ($isRadiusStrategy && !empty($validated['pincodes'])) {
            return back()
                ->withErrors(['name' => 'A zone can be targeted by postcodes or by radius, not both.'])
                ->withInput();
        }

        // Clean values by selected strategy profile to avoid field drift from background tabs
        if ($isRadiusStrategy) {
            $validated['pincodes'] = null;
        } else {
            $validated['radius_km'] = null;
        }

        $warehouseId = $this->currentWarehouseId();

        ShippingZone::create(array_merge($validated, ['warehouse_id' => $warehouseId]));

        return back()->with('success', 'Logistics dispatch zone region appended.');
    }

    public function updateShippingZone(Request $request, ShippingZone $zone): RedirectResponse
    {
        if ($zone->warehouse_id !== $this->currentWarehouseId()) {
            abort(403, 'Cross-tenant mutation target unauthorized.');
        }

        $validated = $request->validate([
            'name'       => 'required|string|max:100',
            'pincodes'   => 'nullable|array',
            'pincodes.*' => 'string|max:20',
            'radius_km'  => 'nullable|numeric|min:0|max:500',
            'charge'     => 'required|numeric|min:0',
            'free_above' => 'nullable|numeric|min:0',
            'is_active'  => 'required|boolean',
        ]);

        $isRadiusStrategy = !empty($validated['radius_km']);

        if ($isRadiusStrategy && !empty($validated['pincodes'])) {
            return back()
                ->withErrors(['name' => 'A zone can be targeted by postcodes or by radius, not both.'])
                ->withInput();
        }

        if ($isRadiusStrategy) {
            $validated['pincodes'] = null;
        } else {
            $validated['radius_km'] = null;
        }

        $zone->update($validated);

        return back()->with('success', 'Logistics zone properties updated.');
    }

    public function deleteShippingZone(ShippingZone $zone): RedirectResponse
    {
        if ($zone->warehouse_id !== $this->currentWarehouseId()) {
            abort(403, 'Cross-tenant deletion target unauthorized.');
        }

        $zone->delete();

        return back()->with('success', 'Logistics zone removed successfully.');
    }
}
