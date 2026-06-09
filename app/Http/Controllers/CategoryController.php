<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Services\ImageUploadService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class CategoryController extends Controller
{
    private const IMAGE_FOLDER = 'Category/images';
    private const ICON_FOLDER  = 'Category/icons';
    private const PER_PAGE     = 10;

    public function __construct(protected ImageUploadService $imageUploadService) {}

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private function currentWarehouse()
    {
        $warehouse = Auth::user()->currentWarehouse();

        abort_if(! $warehouse, 403, 'No active warehouse selected.');

        return $warehouse;
    }

    private function resolveUrl(?string $path): ?string
    {
        return $path ? Storage::disk('public_html')->url($path) : null;
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
            'image_url'   => $this->resolveUrl($category->image_path),
            'icon_url'    => $this->resolveUrl($category->icon_path),
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

        // Flat list of active parent candidates for the dropdown
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
            'image'      => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'icon'       => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp,svg', 'max:1024'],
        ]);

        DB::beginTransaction();

        $imagePath = null;
        $iconPath  = null;

        try {
            $slug = $this->uniqueSlug($validated['name'], $warehouse->id);

            if ($request->hasFile('image')) {
                $imagePath = $this->imageUploadService->upload(
                    file:   $request->file('image'),
                    slug:   $slug,
                    folder: self::IMAGE_FOLDER,
                );

                if (! $imagePath) {
                    throw new \RuntimeException('Category image upload failed.');
                }
            }

            if ($request->hasFile('icon')) {
                $iconPath = $this->imageUploadService->upload(
                    file:   $request->file('icon'),
                    slug:   "{$slug}_icon",
                    folder: self::ICON_FOLDER,
                );

                if (! $iconPath) {
                    throw new \RuntimeException('Category icon upload failed.');
                }
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

        } catch (\Exception $e) {
            DB::rollBack();
            $this->cleanupFiles($imagePath, $iconPath);
            logger()->error('Category store failed', ['error' => $e->getMessage()]);

            return redirect()->back()->withErrors([
                'error' => 'Something went wrong while creating the category.',
            ]);
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
            'image'      => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'icon'       => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp,svg', 'max:1024'],
        ]);

        // Prevent a category from being its own parent
        if (! empty($validated['parent_id']) && $validated['parent_id'] === $category->id) {
            return redirect()->back()->withErrors(['parent_id' => 'A category cannot be its own parent.']);
        }

        DB::beginTransaction();

        $newImagePath = null;
        $newIconPath  = null;

        try {
            $slug = $this->uniqueSlug($validated['name'], $warehouse->id, $category->id);

            if ($request->hasFile('image')) {
                $newImagePath = $this->imageUploadService->upload(
                    file:   $request->file('image'),
                    slug:   $slug,
                    folder: self::IMAGE_FOLDER,
                );

                if (! $newImagePath) {
                    throw new \RuntimeException('Category image upload failed.');
                }

                $this->deleteFileIfExists($category->image_path);
                $category->image_path = $newImagePath;
            }

            if ($request->hasFile('icon')) {
                $newIconPath = $this->imageUploadService->upload(
                    file:   $request->file('icon'),
                    slug:   "{$slug}_icon",
                    folder: self::ICON_FOLDER,
                );

                if (! $newIconPath) {
                    throw new \RuntimeException('Category icon upload failed.');
                }

                $this->deleteFileIfExists($category->icon_path);
                $category->icon_path = $newIconPath;
            }

            $category->name       = $validated['name'];
            $category->slug       = $slug;
            $category->parent_id  = $validated['parent_id'] ?? null;
            $category->sort_order = $validated['sort_order'] ?? $category->sort_order;
            $category->status     = $validated['status'] ?? $category->status;
            $category->save();

            DB::commit();

            return redirect()->back()->with('success', 'Category updated successfully.');

        } catch (\Exception $e) {
            DB::rollBack();
            $this->cleanupFiles($newImagePath, $newIconPath);
            logger()->error('Category update failed', ['category_id' => $category->id, 'error' => $e->getMessage()]);

            return redirect()->back()->withErrors([
                'error' => 'Something went wrong while updating the category.',
            ]);
        }
    }

    // -----------------------------------------------------------------------
    // Private utilities
    // -----------------------------------------------------------------------

    /**
     * Generate a unique slug within the warehouse scope.
     * Appends -2, -3, … if the base slug is already taken (excluding $exceptId).
     */
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

    private function deleteFileIfExists(?string $path): void
    {
        if ($path && Storage::disk('public_html')->exists($path)) {
            Storage::disk('public_html')->delete($path);
        }
    }

    private function cleanupFiles(?string ...$paths): void
    {
        foreach ($paths as $path) {
            $this->deleteFileIfExists($path);
        }
    }
}
