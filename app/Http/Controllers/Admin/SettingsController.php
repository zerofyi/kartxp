<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
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
     * Groups of settings managed at admin level (global scope).
     */
    private const SETTING_GROUPS = [
        'general',
        'appearance',
        'mail',
        'payment',
        'shipping',
        'notification',
        'loyalty',
        'invoice',
        'seo',
    ];

    /**
     * Show admin settings page with all global settings grouped.
     */
    public function index(Request $request): Response
    {
        $group = $request->get('group', 'general');

        // Retrieve all global settings
        $allSettings = Setting::global()
                              ->when(in_array($group, self::SETTING_GROUPS, true), fn ($q) => $q->where('group', $group))
                              ->orderBy('key')
                              ->get()
                              ->keyBy('key')
                              ->map(fn (Setting $s) => $s->value);

        return Inertia::render('Admin/Settings/Index', [
            'settings'       => $allSettings,
            'currentGroup'   => $group,
            'settingGroups'  => self::SETTING_GROUPS,
        ]);
    }

    /**
     * Update admin-level global settings.
     */
    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'group'    => ['required', 'string', 'in:' . implode(',', self::SETTING_GROUPS)],
            'settings' => ['required', 'array'],
            'settings.*' => ['nullable', 'string', 'max:5000'],
            'logo'     => ['nullable', 'image', 'max:2048'],
            'favicon'  => ['nullable', 'image', 'max:512'],
        ]);

        // Handle logo upload
        if ($request->hasFile('logo')) {
            $oldLogo = Setting::get('logo_path');
            if ($oldLogo) {
                Storage::disk('public')->delete($oldLogo);
            }
            $logoPath = $request->file('logo')->store('settings', 'public');
            Setting::set('logo_path', $logoPath);
        }

        // Handle favicon upload
        if ($request->hasFile('favicon')) {
            $oldFavicon = Setting::get('favicon_path');
            if ($oldFavicon) {
                Storage::disk('public')->delete($oldFavicon);
            }
            $faviconPath = $request->file('favicon')->store('settings', 'public');
            Setting::set('favicon_path', $faviconPath);
        }

        foreach ($data['settings'] as $key => $value) {
            Setting::updateOrCreate(
                ['key' => $key, 'warehouse_id' => null],
                ['value' => $value, 'group' => $data['group']]
            );

            // Bust specific cache keys
            Cache::forget('setting:global:' . $key);
        }

        // Bust full settings cache
        Cache::forget('admin_settings_' . $data['group']);

        activity()
            ->causedBy(Auth::user())
            ->withProperties(['group' => $data['group'], 'keys' => array_keys($data['settings'])])
            ->log('Admin updated settings');

        return redirect()->back()
                         ->with('success', 'Settings saved successfully.');
    }

    /**
     * Reset a settings group to default values.
     */
    public function reset(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'group' => ['required', 'string', 'in:' . implode(',', self::SETTING_GROUPS)],
        ]);

        Setting::global()->where('group', $data['group'])->delete();

        // Flush entire settings cache for group
        Cache::forget('admin_settings_' . $data['group']);

        activity()
            ->causedBy(Auth::user())
            ->withProperties(['group' => $data['group']])
            ->log('Admin reset settings group');

        return redirect()->back()
                         ->with('success', "Settings for group '{$data['group']}' reset to defaults.");
    }
}
