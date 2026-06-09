<?php

namespace App\Http\Controllers;

use App\Models\Brand;
use App\Services\ImageUploadService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class BrandController extends Controller
{
    private const LOGO_FOLDER = 'Brand';
    private const PER_PAGE = 10;

    public function __construct(protected ImageUploadService $imageUploadService) {}

    /**
     * Display paginated brand list.
     */
    public function index(Request $request)
    {
        $search = $request->string('search')->trim();

        $brands = Brand::query()
            ->when($search, fn ($q) => $q->where('name', 'like', "%{$search}%"))
            ->latest()
            ->paginate(self::PER_PAGE)
            ->withQueryString()
            ->through(fn ($brand) => [
                'id'          => $brand->id,
                'name'        => $brand->name,
                'slug'        => $brand->slug,
                'description' => $brand->description,
                'logo_url'    => $brand->logo_path
                    ? Storage::disk('public_html')->url($brand->logo_path)
                    : null,
            ]);

        return Inertia::render('Warehouse/Brand', [
            'brands' => $brands,
            'filters' => ['search' => $search],
        ]);
    }

    /**
     * Store a new brand.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'        => ['required', 'string', 'max:255', 'unique:brands,name'],
            'description' => ['nullable', 'string', 'max:1000'],
            'logo'        => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        DB::beginTransaction();

        try {
            $slug     = Str::slug($validated['name']);
            $logoPath = null;

            if ($request->hasFile('logo')) {
                $logoPath = $this->imageUploadService->upload(
                    file:   $request->file('logo'),
                    slug:   $slug,
                    folder: self::LOGO_FOLDER,
                );

                if (! $logoPath) {
                    throw new \RuntimeException('Logo upload failed.');
                }
            }

            Brand::create([
                'name'        => $validated['name'],
                'slug'        => $slug,
                'description' => $validated['description'] ?? null,
                'logo_path'   => $logoPath,
            ]);

            DB::commit();

            return redirect()->back()->with('success', 'Brand created successfully.');

        } catch (\Exception $e) {
            DB::rollBack();
            $this->cleanupOrphanedLogo($logoPath ?? null);
            logger()->error('Brand store failed', ['error' => $e->getMessage()]);

            return redirect()->back()->withErrors([
                'error' => 'Something went wrong while creating the brand.',
            ]);
        }
    }

    /**
     * Update an existing brand.
     */
    public function update(Request $request, Brand $brand)
    {
        $validated = $request->validate([
            'name'        => ['required', 'string', 'max:255', 'unique:brands,name,' . $brand->id],
            'description' => ['nullable', 'string', 'max:1000'],
            'logo'        => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        DB::beginTransaction();

        $newLogoPath = null;

        try {
            $slug = Str::slug($validated['name']);

            if ($request->hasFile('logo')) {
                $newLogoPath = $this->imageUploadService->upload(
                    file:   $request->file('logo'),
                    slug:   $slug,
                    folder: self::LOGO_FOLDER,
                );

                if (! $newLogoPath) {
                    throw new \RuntimeException('Logo upload failed.');
                }

                $this->deleteLogoIfExists($brand->logo_path);

                $brand->logo_path = $newLogoPath;
            }

            $brand->name        = $validated['name'];
            $brand->slug        = $slug;
            $brand->description = $validated['description'] ?? null;
            $brand->save();

            DB::commit();

            return redirect()->back()->with('success', 'Brand updated successfully.');

        } catch (\Exception $e) {
            DB::rollBack();
            $this->cleanupOrphanedLogo($newLogoPath);
            logger()->error('Brand update failed', ['brand_id' => $brand->id, 'error' => $e->getMessage()]);

            return redirect()->back()->withErrors([
                'error' => 'Something went wrong while updating the brand.',
            ]);
        }
    }

    /**
     * Delete a logo from storage if it exists.
     */
    private function deleteLogoIfExists(?string $path): void
    {
        if ($path && Storage::disk('public_html')->exists($path)) {
            Storage::disk('public_html')->delete($path);
        }
    }

    /**
     * Clean up a newly uploaded logo if the transaction failed.
     * Prevents orphaned files on a DB rollback.
     */
    private function cleanupOrphanedLogo(?string $path): void
    {
        if ($path) {
            $this->deleteLogoIfExists($path);
        }
    }
}
