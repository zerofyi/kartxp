<?php

namespace App\Http\Controllers;

use App\Models\Brand;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class BrandController extends Controller
{
    /**
     * Display brand list
     */
    public function index()
    {
        $brands = Brand::latest()->get()->map(fn ($brand) => [
            'id' => $brand->id,
            'name' => $brand->name,
            'description' => $brand->description,
            'logo_url' => $brand->logo_path
                ? asset('storage/' . $brand->logo_path)
                : null,
        ]);

        return Inertia::render('warehouse/Brand', [
            'brands' => $brands
        ]);
    }

    /**
     * Store new brand
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:brands,name'],
            'description' => ['nullable', 'string'],
            'logo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        DB::beginTransaction();

        try {
            $slug = Str::slug($validated['name']);
            $logoPath = null;

            if ($request->hasFile('logo')) {
                $logoPath = $this->uploadBrandLogo($request->file('logo'), $slug);

                if (!$logoPath) {
                    throw new \Exception('Logo upload failed.');
                }
            }

            Brand::create([
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'logo_path' => $logoPath,
            ]);

            DB::commit();

            return redirect()->back()->with('success', 'Brand created successfully.');

        } catch (\Exception $e) {
            DB::rollBack();
            logger()->error('Brand store failed: ' . $e->getMessage());

            return redirect()->back()->withErrors([
                'error' => 'Something went wrong while creating brand.'
            ]);
        }
    }

    /**
     * Update brand
     */
    public function update(Request $request, Brand $brand)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:brands,name,' . $brand->id],
            'description' => ['nullable', 'string'],
            'logo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        DB::beginTransaction();

        try {
            $slug = Str::slug($validated['name']);

            // If new logo uploaded
            if ($request->hasFile('logo')) {

                // Delete old logo if exists
                if ($brand->logo_path && Storage::disk('public_html')->exists($brand->logo_path)) {
                    Storage::disk('public_html')->delete($brand->logo_path);
                }

                $newLogoPath = $this->uploadBrandLogo($request->file('logo'), $slug);

                if (!$newLogoPath) {
                    throw new \Exception('Logo upload failed.');
                }

                $brand->logo_path = $newLogoPath;
            }

            $brand->name = $validated['name'];
            $brand->description = $validated['description'] ?? null;
            $brand->save();

            DB::commit();

            return redirect()->back()->with('success', 'Brand updated successfully.');

        } catch (\Exception $e) {
            DB::rollBack();
            logger()->error('Brand update failed: ' . $e->getMessage());

            return redirect()->back()->withErrors([
                'error' => 'Something went wrong while updating brand.'
            ]);
        }
    }

    /**
     * Upload Brand Logo
     */
    protected function uploadBrandLogo($file, $slug)
    {
        try {
            $extension = $file->getClientOriginalExtension();
            $randomString = Str::random(6);
            $fileName = $slug . '-' . $randomString . '.' . $extension;

            return $file->storeAs('Brand', $fileName, 'public_html');

        } catch (\Exception $e) {
            logger()->error('Brand logo upload failed: ' . $e->getMessage());
            return false;
        }
    }
}
