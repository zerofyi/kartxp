import { Head, useForm, router } from '@inertiajs/react'
import { Edit2, Loader2, Save, Search, X, Tag, ImageIcon, UploadIcon, XIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useEffect, useCallback, useRef } from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { useFileUpload } from '@/hooks/use-file-upload'
import AppLayout from '@/layouts/app-layout'
import { dashboard } from '@/routes'
import type { BreadcrumbItem } from '@/types'
import warehouse from '@/routes/warehouse'

// ─── Types ───────────────────────────────────────────────────────────────────

type Brand = {
    id: number
    name: string
    slug: string
    description: string | null
    logo_url: string | null
}

interface PaginationLink {
    url: string | null
    label: string
    active: boolean
}

interface PaginatedBrands {
    data: Brand[]
    current_page: number
    last_page: number
    per_page: number
    total: number
    from: number | null
    to: number | null
    links: PaginationLink[]
}

interface BrandForm {
    name: string
    description: string
    logo: File | null
    _method: string
    [key: string]: string | File | null  // index signature so Inertia's FormDataErrors<BrandForm> allows any string key
}

interface Filters {
    search: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_SIZE_MB = 2

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: dashboard().url },
    { title: 'Brands', href: '' },
]

// ─── Sub-components ──────────────────────────────────────────────────────────

function Pagination({ brands }: { brands: PaginatedBrands }) {
    if (brands.last_page <= 1) return null

    return (
        <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-xs text-muted-foreground">
                {brands.from != null && brands.to != null ? (
                    <>Showing <span className="font-medium">{brands.from}–{brands.to}</span> of <span className="font-medium">{brands.total}</span></>
                ) : (
                    'No results'
                )}
            </p>

            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={brands.current_page === 1}
                    onClick={() => router.get(brands.links[0].url ?? '', {}, { preserveState: true })}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                {brands.links.slice(1, -1).map((link) => (
                    <Button
                        key={link.label}
                        variant={link.active ? 'default' : 'ghost'}
                        size="icon"
                        className="h-8 w-8 text-xs"
                        disabled={!link.url || link.active}
                        onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                        dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                ))}

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={brands.current_page === brands.last_page}
                    onClick={() => router.get(brands.links[brands.links.length - 1].url ?? '', {}, { preserveState: true })}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function BrandPage({
    brands,
    filters,
}: {
    brands: PaginatedBrands
    filters: Filters
}) {
    const [searchQuery, setSearchQuery] = useState(filters.search ?? '')
    const [editingBrand, setEditingBrand] = useState<Brand | null>(null)

    // Server-side search with debounce (no external dependency)
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setSearchQuery(value)

        if (searchTimer.current) clearTimeout(searchTimer.current)
        searchTimer.current = setTimeout(() => {
            router.get(
                '/warehouse/brands',
                { search: value || undefined },
                { preserveState: true, replace: true },
            )
        }, 350)
    }

    const clearSearch = () => {
        setSearchQuery('')
        if (searchTimer.current) clearTimeout(searchTimer.current)
        router.get('/warehouse/brands', {}, { preserveState: true, replace: true })
    }

    // ─── Form ───────────────────────────────────────────────────────────────

    const { data, setData, post, processing, errors, reset, clearErrors } =
        useForm<BrandForm>({
            name: '',
            description: '',
            logo: null,
            _method: 'POST',
        })

    const [
        { files, isDragging, errors: uploadErrors },
        {
            handleDragEnter,
            handleDragLeave,
            handleDragOver,
            handleDrop,
            openFileDialog,
            removeFile,
            getInputProps,
        },
    ] = useFileUpload({
        accept: 'image/png,image/jpeg,image/jpg,image/webp',
        maxSize: MAX_SIZE_MB * 1024 * 1024,
    })

    // Sync file picker → Inertia form
    useEffect(() => {
        const file = files[0]?.file
        setData('logo', file instanceof File ? file : null)
    }, [files])

    // ─── Handlers ───────────────────────────────────────────────────────────

    const clearFileUpload = useCallback(() => {
        if (files.length > 0) removeFile(files[0].id)
    }, [files, removeFile])

    const handleEdit = (brand: Brand) => {
        setEditingBrand(brand)
        setData({ name: brand.name, description: brand.description ?? '', logo: null, _method: 'PUT' })
        clearErrors()
        clearFileUpload()
    }

    const handleClear = useCallback(() => {
        setEditingBrand(null)
        reset()
        clearErrors()
        clearFileUpload()
    }, [reset, clearErrors, clearFileUpload])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        const url = editingBrand
            ? warehouse.brands.update(editingBrand.slug).url
            : warehouse.brands.store().url

        post(url, {
            forceFormData: true,
            onSuccess: () => handleClear(),
        })
    }

    // ─── Render ──────────────────────────────────────────────────────────────

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Brands" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6 lg:flex-row">
                {/* ── LEFT: Table ─────────────────────────────────────────── */}
                <div className="flex flex-1 flex-col gap-6 min-w-0">
                    <Card className="border-sidebar-border/70 shadow-none">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                            <div>
                                <CardTitle className="text-xl font-bold">Brands</CardTitle>
                                <CardDescription>
                                    {brands.total} brand{brands.total !== 1 ? 's' : ''} total
                                </CardDescription>
                            </div>

                            <div className="relative w-64">
                                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search brands..."
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
                                        <TableHead className="w-16 pl-4">Logo</TableHead>
                                        <TableHead>Brand Name</TableHead>
                                        <TableHead className="hidden md:table-cell">Description</TableHead>
                                        <TableHead className="text-right pr-4">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {brands.data.map((brand) => (
                                        <TableRow
                                            key={brand.id}
                                            className={`hover:bg-muted/50 ${editingBrand?.id === brand.id ? 'bg-primary/5' : ''}`}
                                        >
                                            <TableCell className="pl-4">
                                                <Avatar className="h-9 w-9 border shadow-sm">
                                                    <AvatarImage src={brand.logo_url ?? ''} alt={brand.name} />
                                                    <AvatarFallback className="bg-primary/5 text-primary text-xs">
                                                        {brand.name.slice(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                            </TableCell>

                                            <TableCell className="font-medium">{brand.name}</TableCell>

                                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-xs truncate">
                                                {brand.description ?? <span className="italic opacity-40">No description</span>}
                                            </TableCell>

                                            <TableCell className="text-right pr-4">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => handleEdit(brand)}
                                                    aria-label={`Edit ${brand.name}`}
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}

                                    {brands.data.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                                                <ImageIcon className="mx-auto mb-2 h-8 w-8 opacity-20" />
                                                <p className="text-sm">
                                                    {searchQuery ? `No brands matching "${searchQuery}"` : 'No brands yet.'}
                                                </p>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>

                            <Pagination brands={brands} />
                        </CardContent>
                    </Card>
                </div>

                {/* ── RIGHT: Form ─────────────────────────────────────────── */}
                <div className="w-full lg:w-96 shrink-0">
                    <Card className="lg:sticky lg:top-6 border-sidebar-border/70 shadow-none">
                        <CardHeader>
                            <CardTitle className="text-md flex items-center gap-2">
                                <Tag className="h-4 w-4 text-primary" />
                                {editingBrand ? 'Edit Brand' : 'New Brand'}
                            </CardTitle>
                        </CardHeader>

                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* Logo upload */}
                                <div className="space-y-2">
                                    <Label>Brand Logo</Label>

                                    <div className="relative">
                                        <div
                                            className="relative flex min-h-40 flex-col items-center justify-center overflow-hidden rounded-xl border border-input border-dashed p-4 transition-colors has-[input:focus]:border-ring has-[input:focus]:ring-[3px] has-[input:focus]:ring-ring/50 data-[dragging=true]:bg-accent/50"
                                            data-dragging={isDragging || undefined}
                                            onDragEnter={handleDragEnter}
                                            onDragLeave={handleDragLeave}
                                            onDragOver={handleDragOver}
                                            onDrop={handleDrop}
                                        >
                                            <input {...getInputProps()} className="sr-only" aria-label="Upload brand logo" />

                                            {files[0]?.preview ? (
                                                <div className="absolute inset-0 flex items-center justify-center p-4">
                                                    <img
                                                        src={files[0].preview}
                                                        alt="Preview"
                                                        className="mx-auto max-h-full rounded object-contain"
                                                    />
                                                </div>
                                            ) : editingBrand?.logo_url ? (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
                                                    <img
                                                        src={editingBrand.logo_url}
                                                        alt={editingBrand.name}
                                                        className="mx-auto max-h-24 rounded object-contain opacity-60"
                                                    />
                                                    <p className="text-xs text-muted-foreground">Current logo — upload to replace</p>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center px-4 py-3 text-center">
                                                    <div className="mb-2 flex size-11 items-center justify-center rounded-full border bg-background">
                                                        <ImageIcon className="size-4 opacity-60" />
                                                    </div>
                                                    <p className="mb-1.5 font-medium text-sm">Drop logo here</p>
                                                    <p className="text-muted-foreground text-xs">PNG, JPG, WEBP (max {MAX_SIZE_MB}MB)</p>
                                                    <Button
                                                        type="button"
                                                        className="mt-4"
                                                        variant="outline"
                                                        onClick={openFileDialog}
                                                    >
                                                        <UploadIcon className="size-4 opacity-60 mr-1" />
                                                        Select image
                                                    </Button>
                                                </div>
                                            )}
                                        </div>

                                        {files[0] && (
                                            <div className="absolute top-3 right-3">
                                                <button
                                                    type="button"
                                                    className="flex size-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                                                    onClick={() => removeFile(files[0].id)}
                                                    aria-label="Remove image"
                                                >
                                                    <XIcon className="size-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {errors.logo && (
                                        <p className="text-xs text-destructive font-medium">{errors.logo}</p>
                                    )}
                                    {uploadErrors.length > 0 && (
                                        <p className="text-xs text-destructive font-medium">{uploadErrors[0]}</p>
                                    )}
                                </div>

                                {/* Name */}
                                <div className="space-y-2">
                                    <Label htmlFor="name">Brand Name</Label>
                                    <Input
                                        id="name"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        placeholder="e.g. Sony"
                                        className={errors.name ? 'border-destructive' : ''}
                                        autoComplete="off"
                                    />
                                    {errors.name && (
                                        <p className="text-xs text-destructive font-medium">{errors.name}</p>
                                    )}
                                </div>

                                {/* Description */}
                                <div className="space-y-2">
                                    <Label htmlFor="description">
                                        Description
                                        <span className="ml-1 text-muted-foreground font-normal text-xs">(optional)</span>
                                    </Label>
                                    <Textarea
                                        id="description"
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                        placeholder="Brief brand overview..."
                                        rows={3}
                                        className="resize-none"
                                        maxLength={1000}
                                    />
                                    {data.description.length > 900 && (
                                        <p className="text-xs text-muted-foreground text-right">
                                            {data.description.length}/1000
                                        </p>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 pt-2">
                                    <Button
                                        type="submit"
                                        className="flex-1"
                                        disabled={processing}
                                    >
                                        {processing ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Save className="mr-2 h-4 w-4" />
                                        )}
                                        {editingBrand ? 'Update Brand' : 'Create Brand'}
                                    </Button>

                                    {editingBrand && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleClear}
                                            disabled={processing}
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
