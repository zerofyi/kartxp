<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Banner;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class BannerController extends Controller
{
    public function index(): Response
    {
        $banners = Banner::with('warehouse:id,name')
            ->orderBy('sort_order')
            ->orderByDesc('created_at')
            ->get();

        return Inertia::render('Admin/Banners/Index', compact('banners'));
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title'       => 'required|string|max:255',
            'image'       => 'required|image|max:5120',
            'link_type'   => 'required|in:none,category,product,brand,url',
            'link_value'  => 'nullable|string|max:500',
            'position'    => 'required|in:home_hero,home_mid,category',
            'sort_order'  => 'nullable|integer|min:0',
            'is_active'   => 'boolean',
            'starts_at'   => 'nullable|date',
            'ends_at'     => 'nullable|date|after_or_equal:starts_at',
            'warehouse_id' => 'nullable|exists:warehouses,id',
        ]);

        $validated['image_path'] = $request->file('image')->store('banners', 'public');
        unset($validated['image']);

        Banner::create($validated);

        return back()->with('success', 'Banner created.');
    }

    public function update(Request $request, Banner $banner): RedirectResponse
    {
        $validated = $request->validate([
            'title'       => 'required|string|max:255',
            'image'       => 'nullable|image|max:5120',
            'link_type'   => 'required|in:none,category,product,brand,url',
            'link_value'  => 'nullable|string|max:500',
            'position'    => 'required|in:home_hero,home_mid,category',
            'sort_order'  => 'nullable|integer|min:0',
            'is_active'   => 'boolean',
            'starts_at'   => 'nullable|date',
            'ends_at'     => 'nullable|date|after_or_equal:starts_at',
        ]);

        if ($request->hasFile('image')) {
            Storage::disk('public')->delete($banner->image_path);
            $validated['image_path'] = $request->file('image')->store('banners', 'public');
            unset($validated['image']);
        }

        $banner->update($validated);

        return back()->with('success', 'Banner updated.');
    }

    public function destroy(Banner $banner): RedirectResponse
    {
        Storage::disk('public')->delete($banner->image_path);
        $banner->delete();

        return back()->with('success', 'Banner deleted.');
    }

    public function reorder(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'order'   => 'required|array',
            'order.*' => 'integer|exists:banners,id',
        ]);

        foreach ($validated['order'] as $position => $id) {
            Banner::where('id', $id)->update(['sort_order' => $position]);
        }

        return back()->with('success', 'Banner order saved.');
    }
}
