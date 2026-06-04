import { Head, router } from '@inertiajs/react';
import {
    ChevronDown,
    ChevronRight,
    Edit2,
    FolderTree,
    Loader2,
    Save,
    Search,
    X,
} from 'lucide-react';
import { useState } from 'react';

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
    {
        title: 'Categories',
        href: '',
    },
];

type Category = {
    id: number;
    name: string;
    parent_id: number | null;
    sort_order: number;
    status: boolean;
    created_at: string;
    updated_at: string;
    parent?: {
        id: number;
        name: string;
    };
    children?: Category[];
};

type Props = {
    categories: Category[];
    parentCategories: Category[];
};

export default function Category({
    categories = [],
    parentCategories = [],
}: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [editingCategory, setEditingCategory] = useState<Category | null>(
        null,
    );
    const [expandedCategories, setExpandedCategories] = useState<Set<number>>(
        new Set(),
    );
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        parent_id: '',
        sort_order: 0,
        status: true,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    // Filter categories based on search
    const isSearching = searchQuery.trim().length > 0;
    const searchResults = categories.filter((category) =>
        category.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    const handleEdit = (category: Category) => {
        setEditingCategory(category);
        setFormData({
            name: category.name,
            parent_id: category.parent_id?.toString() || '',
            sort_order: category.sort_order,
            status: category.status,
        });
        setErrors({});
    };

    const handleClear = () => {
        setEditingCategory(null);
        setFormData({
            name: '',
            parent_id: '',
            sort_order: 0,
            status: true,
        });
        setErrors({});
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const data = {
            name: formData.name,
            parent_id: formData.parent_id ? Number(formData.parent_id) : null,
            sort_order: formData.sort_order,
            status: formData.status,
        };

        if (editingCategory) {
            router.put(`/warehouse/categories/${editingCategory.id}`, data, {
                onSuccess: () => {
                    handleClear();
                    setIsSubmitting(false);
                },
                onError: (errors) => {
                    setErrors(errors as Record<string, string>);
                    setIsSubmitting(false);
                },
            });
        } else {
            router.post('/warehouse/categories', data, {
                onSuccess: () => {
                    handleClear();
                    setIsSubmitting(false);
                },
                onError: (errors) => {
                    setErrors(errors as Record<string, string>);
                    setIsSubmitting(false);
                },
            });
        }
    };

    const toggleExpand = (categoryId: number) => {
        const newExpanded = new Set(expandedCategories);
        if (newExpanded.has(categoryId)) {
            newExpanded.delete(categoryId);
        } else {
            newExpanded.add(categoryId);
        }
        setExpandedCategories(newExpanded);
    };

    // Build hierarchical tree
    const buildTree = (
        items: Category[],
        parentId: number | null = null,
    ): Category[] => {
        return items
            .filter((item) => item.parent_id === parentId)
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((item) => ({
                ...item,
                children: buildTree(items, item.id),
            }));
    };

    const renderCategoryRow = (
        category: Category,
        level: number = 0,
    ): React.ReactNode => {
        const hasChildren = category.children && category.children.length > 0;
        const isExpanded = expandedCategories.has(category.id);

        return (
            <>
                <TableRow key={category.id}>
                    <TableCell>
                        <div
                            className="flex items-center gap-2"
                            style={{ paddingLeft: `${level * 24}px` }}
                        >
                            {hasChildren ? (
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 shrink-0"
                                    onClick={() => toggleExpand(category.id)}
                                >
                                    {isExpanded ? (
                                        <ChevronDown className="h-4 w-4" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4" />
                                    )}
                                </Button>
                            ) : (
                                <div className="w-6 shrink-0" />
                            )}

                            <FolderTree className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="font-medium">{category.name}</span>
                        </div>
                    </TableCell>

                    <TableCell className="text-muted-foreground">
                        {category.parent?.name || '-'}
                    </TableCell>

                    <TableCell>
                        <Badge
                            variant={category.status ? 'default' : 'secondary'}
                        >
                            {category.status ? 'Active' : 'Inactive'}
                        </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(category)}
                            disabled={isSubmitting}
                        >
                            <Edit2 className="h-4 w-4" />
                        </Button>
                    </TableCell>
                </TableRow>

                {hasChildren &&
                    isExpanded &&
                    category.children?.map((child) =>
                        renderCategoryRow(child, level + 1),
                    )}
            </>
        );
    };

    const categoryTree = buildTree(categories);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Categories" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6 lg:flex-row">
                {/* LEFT SIDE */}
                <div className="flex flex-1 flex-col gap-6">
                    {/* Header */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl">
                                Categories
                            </CardTitle>
                            <CardDescription>
                                Manage your product categories in a hierarchical
                                structure
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="relative">
                                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search categories..."
                                    value={searchQuery}
                                    onChange={(e) =>
                                        setSearchQuery(e.target.value)
                                    }
                                    className="pl-9"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Table */}
                    <Card className="flex-1 overflow-hidden">
                        <CardContent className="h-full overflow-auto p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[40%]">
                                            Category Name
                                        </TableHead>
                                        <TableHead className="w-[30%]">
                                            Parent Category
                                        </TableHead>
                                        <TableHead className="w-[20%]">
                                            Status
                                        </TableHead>
                                        <TableHead className="w-[10%] text-right">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isSearching ? (
                                        /* SEARCH VIEW: Render a flat list of matching categories */
                                        searchResults.length > 0 ? (
                                            searchResults.map((category) => (
                                                <TableRow
                                                    key={`search-${category.id}`}
                                                >
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <FolderTree className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                            <span className="font-medium">
                                                                {category.name}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        {category.parent
                                                            ?.name || (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="text-[10px]"
                                                                >
                                                                    ROOT
                                                                </Badge>
                                                            )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant={
                                                                category.status
                                                                    ? 'default'
                                                                    : 'secondary'
                                                            }
                                                        >
                                                            {category.status
                                                                ? 'Active'
                                                                : 'Inactive'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() =>
                                                                handleEdit(
                                                                    category,
                                                                )
                                                            }
                                                            disabled={
                                                                isSubmitting
                                                            }
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            /* Empty State for Search */
                                            <TableRow>
                                                <TableCell
                                                    colSpan={4}
                                                    className="h-32 text-center text-muted-foreground"
                                                >
                                                    No categories match "
                                                    {searchQuery}"
                                                </TableCell>
                                            </TableRow>
                                        )
                                    ) : /* TREE VIEW: Original recursive rendering */
                                        categoryTree.length > 0 ? (
                                            categoryTree.map((category) =>
                                                renderCategoryRow(category),
                                            )
                                        ) : (
                                            /* Empty State for Table */
                                            <TableRow>
                                                <TableCell
                                                    colSpan={4}
                                                    className="h-32 text-center text-muted-foreground"
                                                >
                                                    <div className="flex flex-col items-center justify-center gap-2">
                                                        <FolderTree className="h-8 w-8" />
                                                        <p>
                                                            No categories yet.
                                                            Create your first one!
                                                        </p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                {/* RIGHT SIDE FORM */}
                <div className="w-full lg:w-100">
                    <Card className="lg:sticky lg:top-6">
                        <CardHeader className="space-y-1">
                            <CardTitle>
                                {editingCategory
                                    ? 'Edit Category'
                                    : 'Add Category'}
                            </CardTitle>
                            <CardDescription>
                                {editingCategory
                                    ? 'Update category details'
                                    : 'Create a new category'}
                            </CardDescription>
                        </CardHeader>

                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Category Name */}
                                <div className="space-y-2">
                                    <Label htmlFor="name">
                                        Category Name{' '}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                name: e.target.value,
                                            })
                                        }
                                        placeholder="Enter category name"
                                        disabled={isSubmitting}
                                        className={
                                            errors.name
                                                ? 'border-destructive'
                                                : ''
                                        }
                                    />
                                    {errors.name && (
                                        <p className="text-sm text-destructive">
                                            {errors.name}
                                        </p>
                                    )}
                                </div>

                                {/* Parent Category */}
                                <div className="space-y-2">
                                    <Label htmlFor="parent">
                                        Parent Category
                                    </Label>
                                    <Select
                                        value={formData.parent_id || 'none'}
                                        onValueChange={(value) =>
                                            setFormData({
                                                ...formData,
                                                parent_id:
                                                    value === 'none'
                                                        ? ''
                                                        : value,
                                            })
                                        }
                                        disabled={isSubmitting}
                                    >
                                        <SelectTrigger
                                            id="parent"
                                            className="w-full"
                                        >
                                            <SelectValue placeholder="None (Top Level)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">
                                                None (Top Level)
                                            </SelectItem>
                                            {parentCategories
                                                .filter(
                                                    (cat) =>
                                                        cat.id !==
                                                        editingCategory?.id,
                                                )
                                                .map((category) => (
                                                    <SelectItem
                                                        key={category.id}
                                                        value={category.id.toString()}
                                                    >
                                                        {category.name}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.parent_id && (
                                        <p className="text-sm text-destructive">
                                            {errors.parent_id}
                                        </p>
                                    )}
                                </div>

                                {/* Sort Order */}
                                <div className="space-y-2">
                                    <Label htmlFor="sort_order">
                                        Sort Order
                                    </Label>
                                    <Input
                                        id="sort_order"
                                        type="number"
                                        min="0"
                                        value={formData.sort_order}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                sort_order: Number(
                                                    e.target.value,
                                                ),
                                            })
                                        }
                                        disabled={isSubmitting}
                                    />
                                    {errors.sort_order && (
                                        <p className="text-sm text-destructive">
                                            {errors.sort_order}
                                        </p>
                                    )}
                                </div>

                                {/* Status */}
                                <div className="flex items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">
                                            Active
                                        </Label>
                                        <p className="text-sm text-muted-foreground">
                                            Enable or disable this category
                                        </p>
                                    </div>
                                    <Switch
                                        checked={formData.status}
                                        onCheckedChange={(checked) =>
                                            setFormData({
                                                ...formData,
                                                status: checked,
                                            })
                                        }
                                        disabled={isSubmitting}
                                    />
                                </div>

                                {/* Buttons */}
                                <div className="flex gap-3 pt-2">
                                    <Button
                                        type="submit"
                                        className="flex-1"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                {editingCategory
                                                    ? 'Updating...'
                                                    : 'Creating...'}
                                            </>
                                        ) : (
                                            <>
                                                <Save className="mr-2 h-4 w-4" />
                                                {editingCategory
                                                    ? 'Update'
                                                    : 'Create'}
                                            </>
                                        )}
                                    </Button>

                                    {editingCategory && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleClear}
                                            disabled={isSubmitting}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
