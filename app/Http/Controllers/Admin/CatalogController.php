<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Attribute;
use App\Models\AttributeValue;
use App\Models\Brand;
use App\Models\Category;
use App\Models\TaxCategory;
use App\Models\Unit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CatalogController extends Controller
{
    // =========================================================================
    // MAIN INDEX
    // =========================================================================

    /**
     * Display the full catalog management dashboard.
     */
    public function index(): Response
    {
        return Inertia::render('Admin/Catalog/Index', [
            'categories'    => Category::withCount('children')->whereNull('parent_id')->orderBy('name')->get(),
            'brands'        => Brand::withCount('products')->orderBy('name')->paginate(20, ['*'], 'brands_page'),
            'attributes'    => Attribute::with('values')->orderBy('name')->get(),
            'tax_categories' => TaxCategory::orderBy('name')->get(),
            'units'         => Unit::orderBy('name')->get(),
        ]);
    }

    // =========================================================================
    // CATEGORIES
    // =========================================================================

    public function categoriesIndex(Request $request): Response
    {
        $categories = Category::with('parent')
            ->withCount('products')
            ->when($request->search, fn ($q, $s) => $q->where('name', 'like', "%{$s}%"))
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/Catalog/Categories/Index', [
            'categories' => $categories,
            'parents'    => Category::whereNull('parent_id')->orderBy('name')->get(['id', 'name']),
            'filters'    => $request->only(['search']),
        ]);
    }

    public function categoryStore(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name'        => ['required', 'string', 'max:150', 'unique:categories,name'],
            'parent_id'   => ['nullable', 'exists:categories,id'],
            'description' => ['nullable', 'string', 'max:500'],
            'image'       => ['nullable', 'image', 'max:2048'],
            'is_active'   => ['boolean'],
            'sort_order'  => ['nullable', 'integer', 'min:0'],
        ]);

        DB::transaction(function () use ($data, $request) {
            $imagePath = null;
            if ($request->hasFile('image')) {
                $imagePath = $request->file('image')->store('categories', 'public');
            }

            $category = Category::create([
                'name'        => $data['name'],
                'slug'        => Str::slug($data['name']),
                'parent_id'   => $data['parent_id'] ?? null,
                'description' => $data['description'] ?? null,
                'image_path'  => $imagePath,
                'is_active'   => $data['is_active'] ?? true,
                'sort_order'  => $data['sort_order'] ?? 0,
            ]);

            activity()->causedBy(Auth::user())->performedOn($category)->log('Admin created category');
        });

        return redirect()->back()->with('success', 'Category created.');
    }

    public function categoryUpdate(Request $request, Category $category): RedirectResponse
    {
        $data = $request->validate([
            'name'        => ['required', 'string', 'max:150', Rule::unique('categories', 'name')->ignore($category->id)],
            'parent_id'   => ['nullable', 'exists:categories,id', Rule::notIn([$category->id])],
            'description' => ['nullable', 'string', 'max:500'],
            'image'       => ['nullable', 'image', 'max:2048'],
            'is_active'   => ['boolean'],
            'sort_order'  => ['nullable', 'integer', 'min:0'],
        ]);

        DB::transaction(function () use ($data, $request, $category) {
            $imagePath = $category->image_path;
            if ($request->hasFile('image')) {
                if ($imagePath) {
                    Storage::disk('public')->delete($imagePath);
                }
                $imagePath = $request->file('image')->store('categories', 'public');
            }

            $category->update([
                'name'        => $data['name'],
                'slug'        => Str::slug($data['name']),
                'parent_id'   => $data['parent_id'] ?? null,
                'description' => $data['description'] ?? null,
                'image_path'  => $imagePath,
                'is_active'   => $data['is_active'] ?? $category->is_active,
                'sort_order'  => $data['sort_order'] ?? $category->sort_order,
            ]);

            activity()->causedBy(Auth::user())->performedOn($category)->log('Admin updated category');
        });

        return redirect()->back()->with('success', 'Category updated.');
    }

    public function categoryDestroy(Category $category): RedirectResponse
    {
        if ($category->children()->exists()) {
            return redirect()->back()->with('error', 'Cannot delete category with subcategories.');
        }

        if ($category->products()->exists()) {
            return redirect()->back()->with('error', 'Cannot delete category with products assigned.');
        }

        DB::transaction(function () use ($category) {
            if ($category->image_path) {
                Storage::disk('public')->delete($category->image_path);
            }
            activity()->causedBy(Auth::user())->performedOn($category)->log('Admin deleted category');
            $category->delete();
        });

        return redirect()->back()->with('success', 'Category deleted.');
    }

    // =========================================================================
    // BRANDS
    // =========================================================================

    public function brandsIndex(Request $request): Response
    {
        $brands = Brand::withCount('products')
            ->when($request->search, fn ($q, $s) => $q->where('name', 'like', "%{$s}%"))
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/Catalog/Brands/Index', [
            'brands'  => $brands,
            'filters' => $request->only(['search']),
        ]);
    }

    public function brandStore(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name'        => ['required', 'string', 'max:150', 'unique:brands,name'],
            'description' => ['nullable', 'string', 'max:500'],
            'logo'        => ['nullable', 'image', 'max:2048'],
            'is_active'   => ['boolean'],
        ]);

        DB::transaction(function () use ($data, $request) {
            $logoPath = null;
            if ($request->hasFile('logo')) {
                $logoPath = $request->file('logo')->store('brands', 'public');
            }

            $brand = Brand::create([
                'name'        => $data['name'],
                'slug'        => Str::slug($data['name']),
                'description' => $data['description'] ?? null,
                'logo_path'   => $logoPath,
                'is_active'   => $data['is_active'] ?? true,
            ]);

            activity()->causedBy(Auth::user())->performedOn($brand)->log('Admin created brand');
        });

        return redirect()->back()->with('success', 'Brand created.');
    }

    public function brandUpdate(Request $request, Brand $brand): RedirectResponse
    {
        $data = $request->validate([
            'name'        => ['required', 'string', 'max:150', Rule::unique('brands', 'name')->ignore($brand->id)],
            'description' => ['nullable', 'string', 'max:500'],
            'logo'        => ['nullable', 'image', 'max:2048'],
            'is_active'   => ['boolean'],
        ]);

        DB::transaction(function () use ($data, $request, $brand) {
            $logoPath = $brand->logo_path;
            if ($request->hasFile('logo')) {
                if ($logoPath) {
                    Storage::disk('public')->delete($logoPath);
                }
                $logoPath = $request->file('logo')->store('brands', 'public');
            }

            $brand->update([
                'name'        => $data['name'],
                'slug'        => Str::slug($data['name']),
                'description' => $data['description'] ?? $brand->description,
                'logo_path'   => $logoPath,
                'is_active'   => $data['is_active'] ?? $brand->is_active,
            ]);

            activity()->causedBy(Auth::user())->performedOn($brand)->log('Admin updated brand');
        });

        return redirect()->back()->with('success', 'Brand updated.');
    }

    public function brandDestroy(Brand $brand): RedirectResponse
    {
        if ($brand->products()->exists()) {
            return redirect()->back()->with('error', 'Cannot delete brand with products assigned.');
        }

        DB::transaction(function () use ($brand) {
            if ($brand->logo_path) {
                Storage::disk('public')->delete($brand->logo_path);
            }
            activity()->causedBy(Auth::user())->performedOn($brand)->log('Admin deleted brand');
            $brand->delete();
        });

        return redirect()->back()->with('success', 'Brand deleted.');
    }

    // =========================================================================
    // ATTRIBUTES
    // =========================================================================

    public function attributesIndex(): Response
    {
        return Inertia::render('Admin/Catalog/Attributes/Index', [
            'attributes' => Attribute::with('values')->orderBy('name')->get(),
        ]);
    }

    public function attributeStore(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name'   => ['required', 'string', 'max:100', 'unique:attributes,name'],
            'type'   => ['nullable', 'string', Rule::in(['text', 'color', 'select', 'radio'])],
            'values' => ['nullable', 'array'],
            'values.*' => ['string', 'max:100'],
        ]);

        DB::transaction(function () use ($data) {
            $attribute = Attribute::create([
                'name' => $data['name'],
                'type' => $data['type'] ?? 'text',
            ]);

            foreach ($data['values'] ?? [] as $value) {
                AttributeValue::create([
                    'attribute_id' => $attribute->id,
                    'value'        => $value,
                ]);
            }

            activity()->causedBy(Auth::user())->performedOn($attribute)->log('Admin created attribute');
        });

        return redirect()->back()->with('success', 'Attribute created.');
    }

    public function attributeUpdate(Request $request, Attribute $attribute): RedirectResponse
    {
        $data = $request->validate([
            'name'     => ['required', 'string', 'max:100', Rule::unique('attributes', 'name')->ignore($attribute->id)],
            'type'     => ['nullable', 'string', Rule::in(['text', 'color', 'select', 'radio'])],
            'values'   => ['nullable', 'array'],
            'values.*' => ['string', 'max:100'],
        ]);

        DB::transaction(function () use ($data, $attribute) {
            $attribute->update([
                'name' => $data['name'],
                'type' => $data['type'] ?? $attribute->type,
            ]);

            if (isset($data['values'])) {
                $attribute->values()->delete();
                foreach ($data['values'] as $value) {
                    AttributeValue::create([
                        'attribute_id' => $attribute->id,
                        'value'        => $value,
                    ]);
                }
            }

            activity()->causedBy(Auth::user())->performedOn($attribute)->log('Admin updated attribute');
        });

        return redirect()->back()->with('success', 'Attribute updated.');
    }

    public function attributeDestroy(Attribute $attribute): RedirectResponse
    {
        DB::transaction(function () use ($attribute) {
            $attribute->values()->delete();
            activity()->causedBy(Auth::user())->performedOn($attribute)->log('Admin deleted attribute');
            $attribute->delete();
        });

        return redirect()->back()->with('success', 'Attribute deleted.');
    }

    // =========================================================================
    // TAX CATEGORIES
    // =========================================================================

    public function taxCategoriesIndex(): Response
    {
        return Inertia::render('Admin/Catalog/TaxCategories/Index', [
            'taxCategories' => TaxCategory::withCount('products')->orderBy('name')->get(),
        ]);
    }

    public function taxCategoryStore(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150', 'unique:tax_categories,name'],
            'rate' => ['required', 'numeric', 'min:0', 'max:100'],
        ]);

        $taxCategory = TaxCategory::create($data);

        activity()->causedBy(Auth::user())->performedOn($taxCategory)->log('Admin created tax category');

        return redirect()->back()->with('success', 'Tax category created.');
    }

    public function taxCategoryUpdate(Request $request, TaxCategory $taxCategory): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150', Rule::unique('tax_categories', 'name')->ignore($taxCategory->id)],
            'rate' => ['required', 'numeric', 'min:0', 'max:100'],
        ]);

        $taxCategory->update($data);

        activity()->causedBy(Auth::user())->performedOn($taxCategory)->log('Admin updated tax category');

        return redirect()->back()->with('success', 'Tax category updated.');
    }

    public function taxCategoryDestroy(TaxCategory $taxCategory): RedirectResponse
    {
        if ($taxCategory->products()->exists()) {
            return redirect()->back()->with('error', 'Cannot delete tax category with products assigned.');
        }

        activity()->causedBy(Auth::user())->performedOn($taxCategory)->log('Admin deleted tax category');
        $taxCategory->delete();

        return redirect()->back()->with('success', 'Tax category deleted.');
    }

    // =========================================================================
    // UNITS
    // =========================================================================

    public function unitsIndex(): Response
    {
        return Inertia::render('Admin/Catalog/Units/Index', [
            'units' => Unit::withCount('products')->orderBy('name')->get(),
        ]);
    }

    public function unitStore(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name'         => ['required', 'string', 'max:100', 'unique:units,name'],
            'abbreviation' => ['nullable', 'string', 'max:20'],
        ]);

        $unit = Unit::create($data);

        activity()->causedBy(Auth::user())->performedOn($unit)->log('Admin created unit');

        return redirect()->back()->with('success', 'Unit created.');
    }

    public function unitUpdate(Request $request, Unit $unit): RedirectResponse
    {
        $data = $request->validate([
            'name'         => ['required', 'string', 'max:100', Rule::unique('units', 'name')->ignore($unit->id)],
            'abbreviation' => ['nullable', 'string', 'max:20'],
        ]);

        $unit->update($data);

        activity()->causedBy(Auth::user())->performedOn($unit)->log('Admin updated unit');

        return redirect()->back()->with('success', 'Unit updated.');
    }

    public function unitDestroy(Unit $unit): RedirectResponse
    {
        if ($unit->products()->exists()) {
            return redirect()->back()->with('error', 'Cannot delete unit with products assigned.');
        }

        activity()->causedBy(Auth::user())->performedOn($unit)->log('Admin deleted unit');
        $unit->delete();

        return redirect()->back()->with('success', 'Unit deleted.');
    }
}
