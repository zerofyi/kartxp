<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class CategoryController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $categories = Category::with('parent')
            ->orderBy('sort_order')
            ->get();

        $parentCategories = Category::whereNull('parent_id')
            ->where('status', true)
            ->orderBy('sort_order')
            ->get();

        return Inertia::render('warehouse/Category', [
            'categories' => $categories,
            'parentCategories' => $parentCategories,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('categories', 'name')
                    ->where(function ($query) use ($request) {
                        return $query->where('parent_id', $request->parent_id);
                    }),
            ],
            'parent_id' => [
                'nullable',
                'exists:categories,id',
            ],
            'sort_order' => [
                'required',
                'integer',
                'min:0',
            ],
            'status' => [
                'required',
                'boolean',
            ],
        ], [
            'name.required' => 'Category name is required.',
            'name.max' => 'Category name cannot exceed 255 characters.',
            'name.unique' => 'A category with this name already exists under the same parent.',
            'parent_id.exists' => 'The selected parent category does not exist.',
            'sort_order.required' => 'Sort order is required.',
            'sort_order.integer' => 'Sort order must be a number.',
            'sort_order.min' => 'Sort order must be at least 0.',
            'status.required' => 'Status is required.',
            'status.boolean' => 'Status must be true or false.',
        ]);

        try {
            DB::beginTransaction();

            // Validate parent category doesn't create circular reference
            if ($validated['parent_id']) {
                $parentCategory = Category::find($validated['parent_id']);
                if (!$parentCategory) {
                    return back()->withErrors([
                        'parent_id' => 'The selected parent category does not exist.',
                    ]);
                }
            }

            $category = Category::create($validated);

            DB::commit();

            return back()->with('success', 'Category created successfully.');
        } catch (\Exception $e) {
            DB::rollBack();

            return back()->withErrors([
                'error' => 'Failed to create category. Please try again.',
            ])->withInput();
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(Category $category)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Category $category)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Category $category)
    {
        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('categories', 'name')
                    ->where(function ($query) use ($request) {
                        return $query->where('parent_id', $request->parent_id);
                    })
                    ->ignore($category->id),
            ],
            'parent_id' => [
                'nullable',
                'exists:categories,id',
                function ($attribute, $value, $fail) use ($category) {
                    if ($value == $category->id) {
                        $fail('A category cannot be its own parent.');
                    }
                },
            ],
            'sort_order' => [
                'required',
                'integer',
                'min:0',
            ],
            'status' => [
                'required',
                'boolean',
            ],
        ], [
            'name.required' => 'Category name is required.',
            'name.max' => 'Category name cannot exceed 255 characters.',
            'name.unique' => 'A category with this name already exists under the same parent.',
            'parent_id.exists' => 'The selected parent category does not exist.',
            'sort_order.required' => 'Sort order is required.',
            'sort_order.integer' => 'Sort order must be a number.',
            'sort_order.min' => 'Sort order must be at least 0.',
            'status.required' => 'Status is required.',
            'status.boolean' => 'Status must be true or false.',
        ]);

        try {
            DB::beginTransaction();

            // Prevent circular parent-child relationships
            if ($validated['parent_id']) {
                if ($this->wouldCreateCircularReference($category->id, $validated['parent_id'])) {
                    return back()->withErrors([
                        'parent_id' => 'Cannot set this parent as it would create a circular reference.',
                    ]);
                }
            }

            // If deactivating a category with active children, warn or handle
            if (!$validated['status']) {
                $activeChildrenCount = Category::where('parent_id', $category->id)
                    ->where('status', true)
                    ->count();

                if ($activeChildrenCount > 0) {
                    // Optional: You might want to deactivate children too
                    // or just warn the user
                    Category::where('parent_id', $category->id)
                        ->update(['status' => false]);
                }
            }

            $category->update($validated);

            DB::commit();

            return back()->with('success', 'Category updated successfully.');
        } catch (\Exception $e) {
            DB::rollBack();

            return back()->withErrors([
                'error' => 'Failed to update category. Please try again.',
            ])->withInput();
        }
    }

    /**
     * Check if setting a new parent would create a circular reference
     */
    private function wouldCreateCircularReference(int $categoryId, int $newParentId): bool
    {
        $currentParentId = $newParentId;

        // Traverse up the parent chain
        while ($currentParentId !== null) {
            if ($currentParentId === $categoryId) {
                return true; // Circular reference detected
            }

            $parent = Category::find($currentParentId);
            $currentParentId = $parent ? $parent->parent_id : null;
        }

        return false;
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Category $category)
    {
        //
    }
}
