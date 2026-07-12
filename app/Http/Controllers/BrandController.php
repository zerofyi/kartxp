<?php

namespace App\Http\Controllers;

use App\Models\Brand;
use App\Services\ImageStorage\ImageStorageException;
use App\Services\ImageStorage\ImageStorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class BrandController extends Controller
{
    private const LOGO_FOLDER = 'Brand';
    private const PER_PAGE = 15;

    public function __construct(protected ImageStorageService $imageStorageService) {}

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
                'logo_url'    => $this->imageStorageService->url($brand->logo_path),
            ]);

        return Inertia::render('Warehouse/Brand', [
            'brands' => $brands,
            'filters' => ['search' => (string) $search],
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
            'logo'        => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        DB::beginTransaction();
        $logoPath = null;

        try {
            $slug = Str::slug($validated['name']);

            if ($request->hasFile('logo')) {
                $imageResult = $this->imageStorageService->upload(
                    file: $request->file('logo'),
                    slug: $slug,
                    folder: self::LOGO_FOLDER,
                    allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
                );
                $logoPath = $imageResult->path;
            }

            Brand::create([
                'name'        => $validated['name'],
                'slug'        => $slug,
                'description' => $validated['description'] ?? null,
                'logo_path'   => $logoPath,
            ]);

            DB::commit();
            return redirect()->back()->with('success', 'Brand created successfully.');

        } catch (ImageStorageException $e) {
            DB::rollBack();
            // Emergency disk cleanup: Delete file if DB insert failed after upload completed
            if ($logoPath) {
                $this->imageStorageService->delete($logoPath);
            }
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        } catch (\Exception $e) {
            DB::rollBack();
            if ($logoPath) {
                $this->imageStorageService->delete($logoPath);
            }
            logger()->error('Brand store failed', ['error' => $e->getMessage()]);
            return redirect()->back()->withErrors(['error' => 'Something went wrong while creating the brand.']);
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
            'logo'        => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        DB::beginTransaction();

        try {
            $slug = Str::slug($validated['name']);

            if ($request->hasFile('logo')) {
                $imageResult = $this->imageStorageService->replace(
                    file: $request->file('logo'),
                    slug: $slug,
                    folder: self::LOGO_FOLDER,
                    existingPath: $brand->logo_path,
                    allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
                );

                $brand->logo_path = $imageResult->path;
            }

            $brand->name        = $validated['name'];
            $brand->slug        = $slug;
            $brand->description = $validated['description'] ?? null;
            $brand->save();

            DB::commit();
            return redirect()->back()->with('success', 'Brand updated successfully.');

        } catch (ImageStorageException $e) {
            DB::rollBack();
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        } catch (\Exception $e) {
            DB::rollBack();
            logger()->error('Brand update failed', ['brand_id' => $brand->id, 'error' => $e->getMessage()]);
            return redirect()->back()->withErrors(['error' => 'Something went wrong while updating the brand.']);
        }
    }
}
