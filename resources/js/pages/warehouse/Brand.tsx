import { Head, useForm } from '@inertiajs/react'
import { Edit2, Loader2, Save, Search, X, Tag, ImageIcon, UploadIcon, XIcon } from 'lucide-react'
import { useState, useEffect } from 'react'

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

type Brand = {
    id: number
    name: string
    description: string | null
    logo_url: string | null
}

interface BrandForm {
    name: string
    description: string
    logo: File | null
    _method: string
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: dashboard().url },
    { title: 'Brands', href: '' },
]

export default function BrandPage({ brands = [] }: { brands: Brand[] }) {
    const [searchQuery, setSearchQuery] = useState('')
    const [editingBrand, setEditingBrand] = useState<Brand | null>(null)

    const { data, setData, post, processing, errors, reset, clearErrors } =
        useForm<BrandForm>({
            name: '',
            description: '',
            logo: null,
            _method: 'POST',
        })

    const maxSizeMB = 2

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
        maxSize: maxSizeMB * 1024 * 1024,
    })

    // Sync uploaded file with Inertia form
    useEffect(() => {
        if (files.length > 0) {
            const file = files[0].file
            if (file instanceof File) {
                setData('logo', file)
            }
        } else {
            setData('logo', null)
        }
    }, [files])

    const handleEdit = (brand: Brand) => {
        setEditingBrand(brand)

        setData({
            name: brand.name,
            description: brand.description || '',
            logo: null,
            _method: 'PUT',
        })

        clearErrors()

        if (files.length > 0) {
            removeFile(files[0].id)
        }
    }

    const handleClear = () => {
        setEditingBrand(null)
        reset()
        clearErrors()

        if (files.length > 0) {
            removeFile(files[0].id)
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        const url = editingBrand
            ? `/warehouse/brands/${editingBrand.id}`
            : '/warehouse/brands'

        post(url, {
            forceFormData: true,
            onSuccess: () => handleClear(),
        })
    }

    const filteredBrands = brands.filter((b) =>
        b.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Brands" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6 lg:flex-row">
                {/* LEFT SIDE */}
                <div className="flex flex-1 flex-col gap-6">
                    <Card className="border-sidebar-border/70 shadow-none">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                            <div>
                                <CardTitle className="text-xl font-bold">
                                    Brands
                                </CardTitle>
                                <CardDescription>
                                    Manage your inventory brands
                                </CardDescription>
                            </div>

                            <div className="relative w-64">
                                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search brands..."
                                    value={searchQuery}
                                    onChange={(e) =>
                                        setSearchQuery(e.target.value)
                                    }
                                    className="pl-9 h-9"
                                />
                            </div>
                        </CardHeader>

                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/20">
                                        <TableHead className="w-20">
                                            Logo
                                        </TableHead>
                                        <TableHead>Brand Name</TableHead>
                                        <TableHead className="text-right">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {filteredBrands.map((brand) => (
                                        <TableRow
                                            key={brand.id}
                                            className="hover:bg-muted/50"
                                        >
                                            <TableCell>
                                                <Avatar className="h-10 w-10 border shadow-sm">
                                                    <AvatarImage
                                                        src={
                                                            brand.logo_url ?? ''
                                                        }
                                                    />
                                                    <AvatarFallback className="bg-primary/5 text-primary">
                                                        <ImageIcon className="size-4" />
                                                    </AvatarFallback>
                                                </Avatar>
                                            </TableCell>

                                            <TableCell className="font-medium">
                                                {brand.name}
                                            </TableCell>

                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() =>
                                                        handleEdit(brand)
                                                    }
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}

                                    {filteredBrands.length === 0 && (
                                        <TableRow>
                                            <TableCell
                                                colSpan={3}
                                                className="text-center text-muted-foreground py-6"
                                            >
                                                No brands found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                {/* RIGHT SIDE */}
                <div className="w-full lg:w-100">
                    <Card className="lg:sticky lg:top-6 border-sidebar-border/70 shadow-none">
                        <CardHeader>
                            <CardTitle className="text-md flex items-center gap-2">
                                <Tag className="h-4 w-4 text-primary" />
                                {editingBrand
                                    ? 'Edit Brand'
                                    : 'New Brand'}
                            </CardTitle>
                        </CardHeader>

                        <CardContent>
                            <form
                                onSubmit={handleSubmit}
                                className="space-y-5"
                            >
                                {/* Upload */}
                                <div className="space-y-2">
                                    <Label>Brand Logo</Label>

                                    <div className="relative">
                                        <div
                                            className="relative flex min-h-40 flex-col items-center justify-center overflow-hidden rounded-xl border border-input border-dashed p-4 transition-colors has-[input:focus]:border-ring has-[input:focus]:ring-[3px] has-[input:focus]:ring-ring/50 data-[dragging=true]:bg-accent/50"
                                            data-dragging={
                                                isDragging || undefined
                                            }
                                            onDragEnter={handleDragEnter}
                                            onDragLeave={handleDragLeave}
                                            onDragOver={handleDragOver}
                                            onDrop={handleDrop}
                                        >
                                            <input
                                                {...getInputProps()}
                                                className="sr-only"
                                                aria-label="Upload brand logo"
                                            />

                                            {files[0]?.preview ? (
                                                <div className="absolute inset-0 flex items-center justify-center p-4">
                                                    <img
                                                        src={
                                                            files[0].preview
                                                        }
                                                        className="mx-auto max-h-full rounded object-contain"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center px-4 py-3 text-center">
                                                    <div className="mb-2 flex size-11 items-center justify-center rounded-full border bg-background">
                                                        <ImageIcon className="size-4 opacity-60" />
                                                    </div>

                                                    <p className="mb-1.5 font-medium text-sm">
                                                        Drop logo here
                                                    </p>

                                                    <p className="text-muted-foreground text-xs">
                                                        PNG, JPG, WEBP (max{' '}
                                                        {maxSizeMB}MB)
                                                    </p>

                                                    <Button
                                                        type="button"
                                                        className="mt-4"
                                                        variant="outline"
                                                        onClick={
                                                            openFileDialog
                                                        }
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
                                                    className="flex size-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                                                    onClick={() =>
                                                        removeFile(
                                                            files[0].id
                                                        )
                                                    }
                                                >
                                                    <XIcon className="size-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {errors.logo && (
                                        <p className="text-xs text-destructive font-medium">
                                            {errors.logo}
                                        </p>
                                    )}

                                    {uploadErrors.length > 0 && (
                                        <p className="text-xs text-destructive font-medium">
                                            {uploadErrors[0]}
                                        </p>
                                    )}
                                </div>

                                {/* Name */}
                                <div className="space-y-2">
                                    <Label htmlFor="name">
                                        Brand Name
                                    </Label>
                                    <Input
                                        id="name"
                                        value={data.name}
                                        onChange={(e) =>
                                            setData(
                                                'name',
                                                e.target.value
                                            )
                                        }
                                        placeholder="e.g. Sony"
                                        className={
                                            errors.name
                                                ? 'border-destructive'
                                                : ''
                                        }
                                    />
                                    {errors.name && (
                                        <p className="text-xs text-destructive font-medium">
                                            {errors.name}
                                        </p>
                                    )}
                                </div>

                                {/* Description */}
                                <div className="space-y-2">
                                    <Label htmlFor="description">
                                        Description
                                    </Label>
                                    <Textarea
                                        id="description"
                                        value={data.description}
                                        onChange={(e) =>
                                            setData(
                                                'description',
                                                e.target.value
                                            )
                                        }
                                        placeholder="Brief brand overview..."
                                        rows={3}
                                        className="resize-none"
                                    />
                                </div>

                                {/* Buttons */}
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
                                        {editingBrand
                                            ? 'Update Brand'
                                            : 'Create Brand'}
                                    </Button>

                                    {editingBrand && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleClear}
                                            disabled={processing}
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
    )
}
