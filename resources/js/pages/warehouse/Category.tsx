import { Head, useForm, router } from '@inertiajs/react'
import {
    Edit2, Loader2, Save, Search, X, Layers, ImageIcon,
    UploadIcon, XIcon, ChevronLeft, ChevronRight, ToggleLeft, ToggleRight,
} from 'lucide-react'
import { useState, useEffect, useCallback, useRef } from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { useFileUpload } from '@/hooks/use-file-upload'
import AppLayout from '@/layouts/app-layout'
import { dashboard } from '@/routes'
import type { BreadcrumbItem } from '@/types'
import warehouse from '@/routes/warehouse'

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = {
    id: number
    name: string
    slug: string
    status: boolean
    sort_order: number
    parent_id: number | null
    parent_name: string | null
    image_url: string | null
    icon_url: string | null
}

type ParentOption = {
    id: number
    name: string
    slug: string
}

interface PaginationLink {
    url: string | null
    label: string
    active: boolean
}

interface PaginatedCategories {
    data: Category[]
    current_page: number
    last_page: number
    per_page: number
    total: number
    from: number | null
    to: number | null
    links: PaginationLink[]
}

interface CategoryForm {
    name: string
    parent_id: string         // select value is always a string; cast server-side
    sort_order: string
    status: boolean
    image: File | null
    icon: File | null
    _method: string
    [key: string]: string | boolean | File | null
}

interface Filters {
    search: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_IMAGE_MB = 2
const MAX_ICON_MB  = 1

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: dashboard().url },
    { title: 'Categories', href: '' },
]

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ categories }: { categories: PaginatedCategories }) {
    if (categories.last_page <= 1) return null

    return (
        <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-xs text-muted-foreground">
                {categories.from != null && categories.to != null ? (
                    <>
                        Showing <span className="font-medium">{categories.from}–{categories.to}</span>{' '}
                        of <span className="font-medium">{categories.total}</span>
                    </>
                ) : (
                    'No results'
                )}
            </p>

            <div className="flex items-center gap-1">
                <Button
                    variant="ghost" size="icon" className="h-8 w-8"
                    disabled={categories.current_page === 1}
                    onClick={() => router.get(categories.links[0].url ?? '', {}, { preserveState: true })}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                {categories.links.slice(1, -1).map((link) => (
                    <Button
                        key={link.label}
                        variant={link.active ? 'default' : 'ghost'}
                        size="icon" className="h-8 w-8 text-xs"
                        disabled={!link.url || link.active}
                        onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                        dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                ))}

                <Button
                    variant="ghost" size="icon" className="h-8 w-8"
                    disabled={categories.current_page === categories.last_page}
                    onClick={() => router.get(categories.links[categories.links.length - 1].url ?? '', {}, { preserveState: true })}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}

// ─── Upload zone ──────────────────────────────────────────────────────────────

interface UploadZoneProps {
    label: string
    maxMb: number
    accept: string
    currentUrl?: string | null
    currentAlt?: string
    onFile: (file: File | null) => void
    error?: string
}

function UploadZone({ label, maxMb, accept, currentUrl, currentAlt, onFile, error }: UploadZoneProps) {
    const [
        { files, isDragging, errors: uploadErrors },
        { handleDragEnter, handleDragLeave, handleDragOver, handleDrop, openFileDialog, removeFile, getInputProps },
    ] = useFileUpload({ accept, maxSize: maxMb * 1024 * 1024 })

    useEffect(() => {
        const file = files[0]?.file
        onFile(file instanceof File ? file : null)
    }, [files])

    return (
        <div className="space-y-1.5">
            {/* <Label className="text-xs text-muted-foreground">{label}</Label> */}

            <div className="relative">
                <div
                    className="relative flex min-h-32 flex-col items-center justify-center overflow-hidden rounded-xl border border-input border-dashed p-3 transition-colors has-[input:focus]:border-ring has-[input:focus]:ring-[3px] has-[input:focus]:ring-ring/50 data-[dragging=true]:bg-accent/50"
                    data-dragging={isDragging || undefined}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                    <input {...getInputProps()} className="sr-only" aria-label={`Upload ${label}`} />

                    {files[0]?.preview ? (
                        <div className="absolute inset-0 flex items-center justify-center p-3">
                            <img
                                src={files[0].preview}
                                alt="Preview"
                                className="mx-auto max-h-full rounded object-contain"
                            />
                        </div>
                    ) : currentUrl ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-3">
                            <img
                                src={currentUrl}
                                alt={currentAlt}
                                className="mx-auto max-h-20 rounded object-contain opacity-60"
                            />
                            <p className="text-xs text-muted-foreground">Upload to replace</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-1.5 text-center">
                            <div className="flex size-9 items-center justify-center rounded-full border bg-background">
                                <ImageIcon className="size-3.5 opacity-60" />
                            </div>
                            <p className="text-xs font-medium">Drop {label.toLowerCase()}</p>
                            <p className="text-xs text-muted-foreground">PNG, JPG, WEBP (max {maxMb}MB)</p>
                            <Button type="button" variant="outline" size="sm" className="mt-1 w-full" onClick={openFileDialog}>
                                <UploadIcon className="size-3.5 mr-1 opacity-60" />
                                Select
                            </Button>
                        </div>
                    )}
                </div>

                {files[0] && (
                    <div className="absolute top-2 right-2">
                        <button
                            type="button"
                            className="flex size-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                            onClick={() => removeFile(files[0].id)}
                            aria-label={`Remove ${label}`}
                        >
                            <XIcon className="size-3.5" />
                        </button>
                    </div>
                )}
            </div>

            {error && <p className="text-xs text-destructive font-medium">{error}</p>}
            {uploadErrors.length > 0 && <p className="text-xs text-destructive font-medium">{uploadErrors[0]}</p>}
        </div>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CategoryPage({
    categories,
    parents,
    filters,
}: {
    categories: PaginatedCategories
    parents: ParentOption[]
    filters: Filters
}) {
    const [searchQuery, setSearchQuery]   = useState(filters.search ?? '')
    const [editingCategory, setEditingCategory] = useState<Category | null>(null)
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    // ─── Search ───────────────────────────────────────────────────────────────

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setSearchQuery(value)
        if (searchTimer.current) clearTimeout(searchTimer.current)
        searchTimer.current = setTimeout(() => {
            router.get(
                '/warehouse/categories',
                { search: value || undefined },
                { preserveState: true, replace: true },
            )
        }, 350)
    }

    const clearSearch = () => {
        setSearchQuery('')
        if (searchTimer.current) clearTimeout(searchTimer.current)
        router.get('/warehouse/categories', {}, { preserveState: true, replace: true })
    }

    // ─── Form ─────────────────────────────────────────────────────────────────

    const { data, setData, post, processing, errors, reset, clearErrors } =
        useForm<CategoryForm>({
            name:       '',
            parent_id:  '',
            sort_order: '0',
            status:     true,
            image:      null,
            icon:       null,
            _method:    'POST',
        })

    // ─── Handlers ─────────────────────────────────────────────────────────────

    const handleEdit = (category: Category) => {
        setEditingCategory(category)
        setData({
            name:       category.name,
            parent_id:  category.parent_id?.toString() ?? '',
            sort_order: category.sort_order.toString(),
            status:     category.status,
            image:      null,
            icon:       null,
            _method:    'PUT',
        })
        clearErrors()
    }

    const [uploadKey, setUploadKey] = useState(0)
    const handleClear = useCallback(() => {
        setEditingCategory(null)
        reset()
        clearErrors()
        setUploadKey(k => k + 1)
    }, [reset, clearErrors])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        const url = editingCategory
            ? warehouse.categories.update(editingCategory.slug).url
            : warehouse.categories.store().url

        post(url, {
            forceFormData: true,
            onSuccess: () => handleClear(),
        })
    }

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Categories" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6 lg:flex-row">

                {/* ── LEFT: Table ────────────────────────────────────────────── */}
                <div className="flex flex-1 flex-col gap-6 min-w-0">
                    <Card className="border-sidebar-border/70 shadow-none">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                            <div>
                                <CardTitle className="text-xl font-bold">Categories</CardTitle>
                                <CardDescription>
                                    {categories.total} categor{categories.total !== 1 ? 'ies' : 'y'} total
                                </CardDescription>
                            </div>

                            <div className="relative w-64">
                                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search categories..."
                                    value={searchQuery}
                                    onChange={handleSearchChange}
                                    className="pl-9 h-9"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        onClick={clearSearch}
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                        </CardHeader>

                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/20">
                                        <TableHead className="w-16 pl-4">Image</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead className="hidden md:table-cell">Parent</TableHead>
                                        <TableHead className="hidden lg:table-cell w-20 text-center">Order</TableHead>
                                        <TableHead className="w-24 text-center">Status</TableHead>
                                        <TableHead className="text-right pr-4">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {categories.data.map((category) => (
                                        <TableRow
                                            key={category.id}
                                            className={`hover:bg-muted/50 ${editingCategory?.id === category.id ? 'bg-primary/5' : ''}`}
                                        >
                                            <TableCell className="pl-4">
                                                <Avatar className="h-9 w-9 border shadow-sm">
                                                    <AvatarImage src={category.image_url ?? ''} alt={category.name} />
                                                    <AvatarFallback className="bg-primary/5 text-primary text-xs">
                                                        {category.name.slice(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                            </TableCell>

                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {category.icon_url && (
                                                        <img
                                                            src={category.icon_url}
                                                            alt=""
                                                            className="h-4 w-4 object-contain opacity-70"
                                                        />
                                                    )}
                                                    <span className="font-medium">{category.name}</span>
                                                </div>
                                            </TableCell>

                                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                                {category.parent_name ?? (
                                                    <span className="italic opacity-40">Root</span>
                                                )}
                                            </TableCell>

                                            <TableCell className="hidden lg:table-cell text-center text-sm text-muted-foreground">
                                                {category.sort_order}
                                            </TableCell>

                                            <TableCell className="text-center">
                                                <Badge
                                                    variant={category.status ? 'default' : 'secondary'}
                                                    className="text-xs"
                                                >
                                                    {category.status ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </TableCell>

                                            <TableCell className="text-right pr-4">
                                                <Button
                                                    variant="ghost" size="icon" className="h-8 w-8"
                                                    onClick={() => handleEdit(category)}
                                                    aria-label={`Edit ${category.name}`}
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}

                                    {categories.data.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                                                <Layers className="mx-auto mb-2 h-8 w-8 opacity-20" />
                                                <p className="text-sm">
                                                    {searchQuery
                                                        ? `No categories matching "${searchQuery}"`
                                                        : 'No categories yet.'}
                                                </p>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>

                            <Pagination categories={categories} />
                        </CardContent>
                    </Card>
                </div>

                {/* ── RIGHT: Form ────────────────────────────────────────────── */}
                <div className="w-full lg:w-96 shrink-0">
                    <Card className="lg:sticky lg:top-6 border-sidebar-border/70 shadow-none">
                        <CardHeader>
                            <CardTitle className="text-md flex items-center gap-2">
                                <Layers className="h-4 w-4 text-primary" />
                                {editingCategory ? 'Edit Category' : 'New Category'}
                            </CardTitle>
                        </CardHeader>

                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-5">

                                {/* Images row */}
                                <div className="grid grid-cols-2 gap-3">
                                    <UploadZone
                                        key={`image-${uploadKey}`}
                                        label="Category Image"
                                        maxMb={MAX_IMAGE_MB}
                                        accept="image/png,image/jpeg,image/jpg,image/webp"
                                        currentUrl={editingCategory?.image_url}
                                        currentAlt={editingCategory?.name}
                                        onFile={(file) => setData('image', file)}
                                        error={errors.image}
                                    />
                                    <UploadZone
                                        key={`icon-${uploadKey}`}
                                        label="Category Icon"
                                        maxMb={MAX_ICON_MB}
                                        accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                                        currentUrl={editingCategory?.icon_url}
                                        currentAlt={`${editingCategory?.name} icon`}
                                        onFile={(file) => setData('icon', file)}
                                        error={errors.icon}
                                    />
                                </div>

                                {/* Name */}
                                <div className="space-y-2">
                                    <Label htmlFor="name">Category Name</Label>
                                    <Input
                                        id="name"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        placeholder="e.g. Electronics"
                                        className={errors.name ? 'border-destructive' : ''}
                                        autoComplete="off"
                                    />
                                    {errors.name && (
                                        <p className="text-xs text-destructive font-medium">{errors.name}</p>
                                    )}
                                </div>

                                {/* Parent */}
                                <div className="space-y-2">
                                    <Label htmlFor="parent_id">
                                        Parent Category
                                        <span className="ml-1 text-muted-foreground font-normal text-xs">(optional)</span>
                                    </Label>
                                    <Select
                                        value={data.parent_id}
                                        onValueChange={(val) => setData('parent_id', val === 'none' ? '' : val)}
                                    >
                                        <SelectTrigger
                                            id="parent_id"
                                            className={`w-full ${errors.parent_id ? 'border-destructive' : ''}`}
                                        >
                                            <SelectValue placeholder="Root category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">— Root category —</SelectItem>
                                            {parents
                                                .filter((p) => p.id !== editingCategory?.id)
                                                .map((parent) => (
                                                    <SelectItem key={parent.id} value={parent.id.toString()}>
                                                        {parent.name}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.parent_id && (
                                        <p className="text-xs text-destructive font-medium">{errors.parent_id}</p>
                                    )}
                                </div>

                                {/* Sort order + Status */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label htmlFor="sort_order">Sort Order</Label>
                                        <Input
                                            id="sort_order"
                                            type="number"
                                            min={0}
                                            value={data.sort_order}
                                            onChange={(e) => setData('sort_order', e.target.value)}
                                            className={errors.sort_order ? 'border-destructive' : ''}
                                        />
                                        {errors.sort_order && (
                                            <p className="text-xs text-destructive font-medium">{errors.sort_order}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Status</Label>
                                        <button
                                            type="button"
                                            onClick={() => setData('status', !data.status)}
                                            className={`flex h-9 w-full items-center justify-between rounded-md border px-3 text-sm transition-colors
                                                ${data.status
                                                    ? 'border-primary/40 bg-primary/5 text-primary'
                                                    : 'border-input bg-background text-muted-foreground'
                                                }`}
                                        >
                                            <span>{data.status ? 'Active' : 'Inactive'}</span>
                                            {data.status
                                                ? <ToggleRight className="h-4 w-4" />
                                                : <ToggleLeft className="h-4 w-4" />
                                            }
                                        </button>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 pt-2">
                                    <Button type="submit" className="flex-1" disabled={processing}>
                                        {processing
                                            ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            : <Save className="mr-2 h-4 w-4" />
                                        }
                                        {editingCategory ? 'Update Category' : 'Create Category'}
                                    </Button>

                                    {editingCategory && (
                                        <Button
                                            type="button" variant="outline"
                                            onClick={handleClear} disabled={processing}
                                            aria-label="Cancel edit"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>

                                {errors.error && (
                                    <p className="text-xs text-destructive font-medium text-center">{errors.error}</p>
                                )}
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    )
}
