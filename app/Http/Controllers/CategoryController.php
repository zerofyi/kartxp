<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Services\ImageStorage\ImageStorageService;
use App\Services\ImageStorage\ImageStorageException;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class CategoryController extends Controller
{
    private const IMAGE_FOLDER = 'Category/images';
    private const ICON_FOLDER  = 'Category/icons';
    private const PER_PAGE     = 10;

    // Type hints are updated to the new ImageStorageService
    public function __construct(protected ImageStorageService $imageStorageService) {}

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private function currentWarehouse()
    {
        $warehouse = Auth::user()->ownedWarehouse;

        abort_if(! $warehouse, 403, 'No active warehouse selected.');

        return $warehouse;
    }

    private function formatCategory(Category $category): array
    {
        return [
            'id'          => $category->id,
            'name'        => $category->name,
            'slug'        => $category->slug,
            'status'      => $category->status,
            'sort_order'  => $category->sort_order,
            'parent_id'   => $category->parent_id,
            'parent_name' => $category->parent?->name,
            // Resolves paths cleanly to full public URLs using the default disk
            'image_url'   => $this->imageStorageService->url($category->image_path),
            'icon_url'    => $this->imageStorageService->url($category->icon_path),
        ];
    }

    // -----------------------------------------------------------------------
    // Index
    // -----------------------------------------------------------------------

    public function index(Request $request)
    {
        $warehouse = $this->currentWarehouse();
        $search    = $request->string('search')->trim();

        $categories = Category::query()
            ->with('parent:id,name')
            ->where('warehouse_id', $warehouse->id)
            ->when($search, fn ($q) => $q->where('name', 'like', "%{$search}%"))
            ->latest()
            ->paginate(self::PER_PAGE)
            ->withQueryString()
            ->through(fn ($category) => $this->formatCategory($category));

        $parents = Category::query()
            ->select('id', 'name', 'slug')
            ->where('warehouse_id', $warehouse->id)
            ->whereNull('parent_id')
            ->active()
            ->orderBy('name')
            ->get()
            ->map(fn ($c) => ['id' => $c->id, 'name' => $c->name, 'slug' => $c->slug]);

        return Inertia::render('Warehouse/Category', [
            'categories' => $categories,
            'parents'    => $parents,
            'filters'    => ['search' => (string) $search],
        ]);
    }

    // -----------------------------------------------------------------------
    // Store
    // -----------------------------------------------------------------------

    public function store(Request $request)
    {
        $warehouse = $this->currentWarehouse();

        $validated = $request->validate([
            'name'       => ['required', 'string', 'max:255'],
            'parent_id'  => ['nullable', 'integer', 'exists:categories,id'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'status'     => ['nullable', 'boolean'],
            // Standard validation: note that 'image' rules can break SVGs, so we validate types carefully
            'image'      => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'icon'       => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,svg,xml', 'max:1024'],
        ]);

        DB::beginTransaction();

        try {
            $slug = $this->uniqueSlug($validated['name'], $warehouse->id);

            $imagePath = null;
            if ($request->hasFile('image')) {
                // Upload standard images: restricts to specific types via runtime array
                $imageResult = $this->imageStorageService->upload(
                    file: $request->file('image'),
                    slug: $slug,
                    folder: self::IMAGE_FOLDER,
                    allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
                );
                $imagePath = $imageResult->path;
            }

            $iconPath = null;
            if ($request->hasFile('icon')) {
                // Upload icons: allow SVGs or small standard image graphics
                $iconResult = $this->imageStorageService->upload(
                    file: $request->file('icon'),
                    slug: "{$slug}_icon",
                    folder: self::ICON_FOLDER,
                    allowedTypes: ['image/svg+xml', 'image/png', 'image/jpeg']
                );
                $iconPath = $iconResult->path;
            }

            Category::create([
                'name'         => $validated['name'],
                'slug'         => $slug,
                'parent_id'    => $validated['parent_id'] ?? null,
                'sort_order'   => $validated['sort_order'] ?? 0,
                'status'       => $validated['status'] ?? true,
                'image_path'   => $imagePath,
                'icon_path'    => $iconPath,
                'warehouse_id' => $warehouse->id,
            ]);

            DB::commit();
            return redirect()->back()->with('success', 'Category created successfully.');

        } catch (ImageStorageException $e) {
            DB::rollBack();
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        } catch (\Exception $e) {
            DB::rollBack();
            logger()->error('Category store failed', ['error' => $e->getMessage()]);
            return redirect()->back()->withErrors(['error' => 'Something went wrong while creating the category.']);
        }
    }

    // -----------------------------------------------------------------------
    // Update
    // -----------------------------------------------------------------------

    public function update(Request $request, Category $category)
    {
        $warehouse = $this->currentWarehouse();
        abort_if($category->warehouse_id !== $warehouse->id, 403);

        $validated = $request->validate([
            'name'       => ['required', 'string', 'max:255'],
            'parent_id'  => ['nullable', 'integer', 'exists:categories,id'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'status'     => ['nullable', 'boolean'],
            'image'      => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'icon'       => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,svg,xml', 'max:1024'],
        ]);

        if (! empty($validated['parent_id']) && $validated['parent_id'] === $category->id) {
            return redirect()->back()->withErrors(['parent_id' => 'A category cannot be its own parent.']);
        }

        DB::beginTransaction();

        try {
            $slug = $this->uniqueSlug($validated['name'], $warehouse->id, $category->id);

            if ($request->hasFile('image')) {
                // replace() atomically handles saving the new file and removing the old one on success
                $imageResult = $this->imageStorageService->replace(
                    file: $request->file('image'),
                    slug: $slug,
                    folder: self::IMAGE_FOLDER,
                    existingPath: $category->image_path,
                    allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
                );
                $category->image_path = $imageResult->path;
            }

            if ($request->hasFile('icon')) {
                $iconResult = $this->imageStorageService->replace(
                    file: $request->file('icon'),
                    slug: "{$slug}_icon",
                    folder: self::ICON_FOLDER,
                    existingPath: $category->icon_path,
                    allowedTypes: ['image/svg+xml', 'image/png', 'image/jpeg']
                );
                $category->icon_path = $iconResult->path;
            }

            $category->name       = $validated['name'];
            $category->slug       = $slug;
            $category->parent_id  = $validated['parent_id'] ?? null;
            $category->sort_order = $validated['sort_order'] ?? $category->sort_order;
            $category->status     = $validated['status'] ?? $category->status;
            $category->save();

            DB::commit();
            return redirect()->back()->with('success', 'Category updated successfully.');

        } catch (ImageStorageException $e) {
            DB::rollBack();
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        } catch (\Exception $e) {
            DB::rollBack();
            logger()->error('Category update failed', ['category_id' => $category->id, 'error' => $e->getMessage()]);
            return redirect()->back()->withErrors(['error' => 'Something went wrong while updating the category.']);
        }
    }

    // -----------------------------------------------------------------------
    // Private utilities
    // -----------------------------------------------------------------------

    private function uniqueSlug(string $name, int $warehouseId, ?int $exceptId = null): string
    {
        $base    = Str::slug($name);
        $slug    = $base;
        $counter = 2;

        while (
            Category::where('slug', $slug)
                ->where('warehouse_id', $warehouseId)
                ->when($exceptId, fn ($q) => $q->where('id', '!=', $exceptId))
                ->exists()
        ) {
            $slug = "{$base}-{$counter}";
            $counter++;
        }

        return $slug;
    }
}
