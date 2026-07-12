<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class PosController extends Controller
{
    /**
     * Customer-facing display screen at /warehouse/pos/display.
     * Runs inside the auth middleware group — the cashier must be logged in
     * on the POS machine for this page to load on the second monitor.
     * After load, all updates come via BroadcastChannel (no further requests).
     */
    public function index(): Response
    {
        $warehouse = Auth::user()->ownedWarehouse;

        $warehouseData = $warehouse ? [
            'id'      => $warehouse->id,
            'name'    => $warehouse->name,
            'address' => $warehouse->address,
            'phone'   => $warehouse->phone,
            'gstin'   => $warehouse->gstin,
        ] : [
            'id'      => 0,
            'name'    => config('app.name'),
            'address' => null,
            'phone'   => null,
            'gstin'   => null,
        ];

        $logoBase64 = null;
        if ($warehouse?->logo_path && Storage::disk('public')->exists($warehouse->logo_path)) {
            $fileContent = Storage::disk('public')->get($warehouse->logo_path);
            $mimeType = Storage::disk('public')->mimeType($warehouse->logo_path);
            $logoBase64 = 'data:' . $mimeType . ';base64,' . base64_encode($fileContent);
        }

        $warehouseId = $warehouse?->id;

        $settings = [
            'upi_id'          => Setting::get('upi_id', '', $warehouseId),
            'receipt_footer'  => Setting::get('receipt_footer', 'Thank you for shopping with us!', $warehouseId),
            'welcome_message' => Setting::get('welcome_message', "Welcome! We're glad you're here.", $warehouseId),
        ];

        return Inertia::render('Warehouse/Pos/Display', [
            'warehouse' => $warehouseData,
            'logoUrl'   => $logoBase64,
            'settings'  => $settings,
        ]);
    }

    public function flushCache()
    {
        Cache::forget('pos_categories');

        $userWarehouse = Auth::user()?->ownedWarehouse;
        if ($userWarehouse) {
            Cache::forget("pos_catalog_w{$userWarehouse->id}");

            return redirect()->back()->with('success', "POS Cache for [{$userWarehouse->name}] cleared successfully.");
        }

        return redirect()->back()->with('success', 'Global POS Category cache cleared.');
    }
}
