import { Head, router } from '@inertiajs/react'
import React, { useCallback, useEffect, useId, useRef, useState } from 'react'
import {
    AlertCircleIcon,
    Barcode as BarcodeIcon,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Edit2,
    GripVertical,
    ImageIcon,
    Loader2,
    PackagePlus,
    Plus,
    Save,
    Search,
    Star,
    Trash2,
    UploadIcon,
    X,
    Zap,
} from 'lucide-react'

import AppLayout from '@/layouts/app-layout'
import warehouse from '@/routes/warehouse'
import type { BreadcrumbItem } from '@/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'

// ─── Types ────────────────────────────────────────────────────────────────────

type Category       = { id: number; name: string }
type Brand          = { id: number; name: string }
type TaxCategory    = { id: number; name: string; tax_percent: number }
type Unit           = { id: number; name: string; symbol: string }
type Attribute      = { id: number; name: string; values: AttributeValue[] }
type AttributeValue = { id: number; attribute_id: number; value: string }

type Barcode = { id?: number; barcode: string; is_primary: boolean }

type ProductImage = {
    id: number
    url: string
    is_primary: boolean
    sort_order: number
    _file?: File
    _preview?: string
    _isNew?: boolean
}

type ProductVariant = {
    id?: number
    variant_name: string
    sku: string
    unit_id: number | string
    net_quantity: number | string | null
    mrp: number | string
    selling_price: number | string
    cost_price: number | string
    min_selling_price: number | string | null
    status: boolean
    barcodes?: Barcode[]
    images?: ProductImage[]
}

type Product = {
    id: number
    slug: string
    name: string
    product_code: string
    description?: string
    category_id: number
    brand_id?: number | null
    tax_category_id: number
    category?: Category
    brand?: Brand
    tax_category?: TaxCategory
    variants?: ProductVariant[]
    is_active: boolean
    is_returnable: boolean
}

type PaginationLink = { url: string | null; label: string; active: boolean }

type PaginatedProducts = {
    data: Product[]
    links: PaginationLink[]
    current_page: number
    last_page: number
    per_page: number
    total: number
    from: number | null
    to: number | null
}

// ─── Variant form state (frontend-only) ──────────────────────────────────────

type VariantState = {
    id?: number
    variant_name: string
    sku: string
    unit_id: string
    net_quantity: string
    mrp: string
    selling_price: string
    cost_price: string
    min_selling_price: string
    status: boolean
    barcodes: Barcode[]
    attributes: Record<number, number>
    existingImages: ProductImage[]
    newImages: ProductImage[]
    deletedImageIds: number[]
}

// Quick-add types
type QuickVariant = {
    _id: string
    variant_name: string
    sku: string
    unit_id: string
    net_quantity: string
    mrp: string
    selling_price: string
    cost_price: string
    min_selling_price: string
    barcodes: Barcode[]
}
type QuickProduct = {
    _id: string
    name: string
    brand_id: string
    variants: QuickVariant[]
}

type Props = {
    products: PaginatedProducts
    categories: Category[]
    brands: Brand[]
    taxCategories: TaxCategory[]
    units: Unit[]
    attributes: Attribute[]
    filters: { search: string; per_page: number }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: warehouse.dashboard().url },
    { title: 'Products', href: '' },
]

const MAX_IMAGE_BYTES = 120 * 1024 // 120 KB

const emptyVariant = (): VariantState => ({
    variant_name: '', sku: '', unit_id: '', net_quantity: '',
    mrp: '', selling_price: '', cost_price: '', min_selling_price: '',
    status: true,
    barcodes: [{ barcode: '', is_primary: true }],
    attributes: {},
    existingImages: [], newImages: [], deletedImageIds: [],
})

// FIX #11: Use crypto.randomUUID() instead of Math.random() to avoid ID collisions
const newId = () => crypto.randomUUID()

const emptyQuickVariant = (): QuickVariant => ({
    _id: newId(),
    variant_name: '', sku: '', unit_id: '', net_quantity: '',
    mrp: '', selling_price: '', cost_price: '', min_selling_price: '',
    barcodes: [{ barcode: '', is_primary: true }],
})

// ─── Image compression ────────────────────────────────────────────────────────

async function compressImage(file: File): Promise<File> {
    return new Promise((resolve) => {
        const img = new Image()
        const url = URL.createObjectURL(file)

        img.onload = () => {
            // FIX #10: Revoke object URL immediately after image loads
            URL.revokeObjectURL(url)

            let { width, height } = img
            const MAX_DIM = 1200
            if (width > MAX_DIM || height > MAX_DIM) {
                const ratio = Math.min(MAX_DIM / width, MAX_DIM / height)
                width  = Math.round(width * ratio)
                height = Math.round(height * ratio)
            }

            const canvas = document.createElement('canvas')
            canvas.width  = width
            canvas.height = height
            canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)

            const tryQ = (q: number): Promise<Blob> =>
                new Promise((res) => canvas.toBlob((b) => res(b!), 'image/jpeg', q))

            ;(async () => {
                let lo = 0.1, hi = 0.92, result: Blob | null = null
                const maxBlob = await tryQ(hi)

                if (maxBlob.size <= MAX_IMAGE_BYTES) {
                    result = maxBlob
                } else {
                    for (let i = 0; i < 8; i++) {
                        const mid  = (lo + hi) / 2
                        const blob = await tryQ(mid)
                        if (blob.size <= MAX_IMAGE_BYTES) { result = blob; lo = mid } else { hi = mid }
                    }
                    if (! result) result = await tryQ(lo)
                }

                resolve(new File([result!], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
            })()
        }

        img.src = url
    })
}

// ─── VariantImageUploader ─────────────────────────────────────────────────────

function VariantImageUploader({
    variantIndex,
    existingImages,
    newImages,
    deletedImageIds,
    onExistingDelete,
    onNewAdd,
    onNewRemove,
    onReorder,
}: {
    variantIndex: number
    existingImages: ProductImage[]
    newImages: ProductImage[]
    deletedImageIds: number[]
    onExistingDelete: (id: number) => void
    onNewAdd: (imgs: ProductImage[]) => void
    onNewRemove: (idx: number) => void
    onReorder: (all: ProductImage[]) => void
}) {
    const [isDragging, setIsDragging]   = useState(false)
    const [error, setError]             = useState<string | null>(null)
    const [compressing, setCompressing] = useState(false)
    const [dragOver, setDragOver]       = useState<number | null>(null)
    // FIX #18: Stable ID for the file input (useId is stable across renders)
    // FIX #11: No Math.random() for IDs
    const inputId = useId()

    const visibleExisting = existingImages.filter((img) => ! deletedImageIds.includes(img.id))
    const totalCount      = visibleExisting.length + newImages.length

    // FIX #12: Serialize processing so concurrent async calls can't race past the 4-image limit
    const processingRef = useRef(false)

    const processFiles = useCallback(async (files: File[]) => {
        if (processingRef.current) return
        processingRef.current = true
        setError(null)

        try {
            const imageFiles = files.filter((f) => f.type.startsWith('image/'))
            if (! imageFiles.length) { setError('Please select image files.'); return }

            // Re-read totalCount at execution time to handle race
            const currentTotal = visibleExisting.length + newImages.length
            const canAdd = 4 - currentTotal
            if (canAdd <= 0) { setError('Maximum 4 images per variant.'); return }

            const toProcess = imageFiles.slice(0, canAdd)
            if (imageFiles.length > canAdd) {
                setError(`Only ${canAdd} slot(s) left — extra files ignored.`)
            }

            setCompressing(true)
            const compressed = await Promise.all(toProcess.map(compressImage))

            onNewAdd(compressed.map((file, i) => ({
                id: 0,
                url: '',
                is_primary: currentTotal + i === 0,
                sort_order: currentTotal + i,
                _file: file,
                // FIX #10: Preview URLs are created here; caller is responsible for revoking on unmount
                _preview: URL.createObjectURL(file),
                _isNew: true,
            })))
        } finally {
            setCompressing(false)
            processingRef.current = false
        }
    }, [visibleExisting.length, newImages.length, onNewAdd])

    // FIX #10: Revoke preview URLs when new images are removed/changed
    useEffect(() => {
        return () => {
            newImages.forEach((img) => {
                if (img._preview) URL.revokeObjectURL(img._preview)
            })
        }
    }, []) // Only on unmount — intentional

    const allImages = [
        ...visibleExisting.map((img) => ({ type: 'existing' as const, img })),
        ...newImages.map((img, idx) => ({ type: 'new' as const, img, idx })),
    ].sort((a, b) => a.img.sort_order - b.img.sort_order)

    const handleItemDrop = (e: React.DragEvent, targetOrder: number) => {
        e.preventDefault()
        setDragOver(null)
        const srcOrder = Number(e.dataTransfer.getData('sort_order'))
        if (srcOrder === targetOrder) return

        const sorted = [...allImages]
        const srcIdx = sorted.findIndex((x) => x.img.sort_order === srcOrder)
        const dstIdx = sorted.findIndex((x) => x.img.sort_order === targetOrder)
        if (srcIdx === -1 || dstIdx === -1) return

        const copy = [...sorted]
        const [moved] = copy.splice(srcIdx, 1)
        copy.splice(dstIdx, 0, moved)

        onReorder(copy.map((x, i) => ({ ...x.img, sort_order: i, is_primary: i === 0 })))
    }

    return (
        <div className="space-y-3">
            {totalCount < 4 && (
                <div
                    role="region"
                    aria-label={`Image upload area for variant ${variantIndex + 1}`}
                    className={`relative flex min-h-28 flex-col items-center justify-center rounded-xl border border-dashed p-4 transition-colors ${
                        isDragging ? 'border-primary bg-primary/5' : 'border-input hover:border-primary/50'
                    }`}
                    onDragEnter={(e) => { e.preventDefault(); setIsDragging(true) }}
                    onDragLeave={(e) => {
                        e.preventDefault()
                        if (! e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false)
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                        e.preventDefault()
                        setIsDragging(false)
                        processFiles(Array.from(e.dataTransfer.files))
                    }}
                >
                    {/* FIX #18: aria-label on input, stable htmlFor via useId */}
                    <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        multiple
                        className="sr-only"
                        id={inputId}
                        aria-label={`Upload images for variant ${variantIndex + 1}`}
                        onChange={(e) => {
                            if (e.target.files) processFiles(Array.from(e.target.files))
                            e.target.value = ''
                        }}
                        disabled={compressing}
                    />
                    <div className="flex size-9 items-center justify-center rounded-full border bg-background">
                        {compressing
                            ? <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden="true" />
                            : <ImageIcon className="size-3.5 opacity-60" aria-hidden="true" />
                        }
                    </div>
                    <p className="mt-2 text-xs font-medium">
                        {compressing ? 'Compressing…' : 'Drop images here'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        JPEG, PNG, WebP · ≤120 KB after compression · {4 - totalCount} slot(s) left
                    </p>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        // FIX #11: Use the stable inputId, not Math.random()
                        onClick={() => document.getElementById(inputId)?.click()}
                        disabled={compressing}
                    >
                        <UploadIcon className="mr-1.5 size-3.5" aria-hidden="true" /> Select
                    </Button>
                </div>
            )}

            {error && (
                <p className="flex items-center gap-1.5 text-xs text-destructive" role="alert">
                    <AlertCircleIcon className="size-3.5 shrink-0" aria-hidden="true" /> {error}
                </p>
            )}

            {allImages.length > 0 && (
                <div className="grid grid-cols-4 gap-2" role="list" aria-label="Product images">
                    {allImages.map((item, order) => {
                        const isExisting = item.type === 'existing'
                        const src        = isExisting ? item.img.url : item.img._preview
                        const isPrimary  = order === 0
                        const key        = isExisting
                            ? `e-${item.img.id}`
                            : `n-${(item as { type: 'new'; img: ProductImage; idx: number }).idx}`

                        return (
                            <div
                                key={key}
                                role="listitem"
                                aria-label={`${isPrimary ? 'Primary image' : `Image ${order + 1}`}${! isExisting ? ' (new, not saved yet)' : ''}`}
                                className={`group relative aspect-square overflow-hidden rounded-lg border-2 transition-all cursor-grab ${
                                    isPrimary ? 'border-primary' : 'border-border'
                                } ${dragOver === item.img.sort_order ? 'opacity-50 scale-95' : ''}`}
                                draggable
                                onDragStart={(e) => e.dataTransfer.setData('sort_order', String(item.img.sort_order))}
                                onDragOver={(e) => { e.preventDefault(); setDragOver(item.img.sort_order) }}
                                onDragLeave={() => setDragOver(null)}
                                onDrop={(e) => handleItemDrop(e, item.img.sort_order)}
                            >
                                <img src={src} alt={isPrimary ? 'Primary product image' : `Product image ${order + 1}`} className="size-full object-cover" />

                                {isPrimary && (
                                    <div className="absolute left-1 top-1">
                                        <Badge className="gap-1 px-1.5 py-0 text-[10px]">
                                            <Star className="size-2" aria-hidden="true" /> Primary
                                        </Badge>
                                    </div>
                                )}

                                <div className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true">
                                    <div className="rounded bg-black/50 p-0.5">
                                        <GripVertical className="size-3 text-white" />
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    aria-label={`Remove ${isPrimary ? 'primary' : `image ${order + 1}`}`}
                                    onClick={() => isExisting
                                        ? onExistingDelete(item.img.id)
                                        : onNewRemove((item as { type: 'new'; img: ProductImage; idx: number }).idx)
                                    }
                                    className="absolute bottom-1 right-1 flex size-6 items-center justify-center rounded-full bg-destructive/90 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive"
                                >
                                    <X className="size-3" aria-hidden="true" />
                                </button>

                                {! isExisting && (
                                    <div className="absolute bottom-1 left-1">
                                        <Badge variant="secondary" className="px-1 py-0 text-[10px]">New</Badge>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {allImages.length > 1 && (
                <p className="text-center text-xs text-muted-foreground">
                    Drag to reorder · First image becomes primary
                </p>
            )}
        </div>
    )
}

// ─── VariantForm ──────────────────────────────────────────────────────────────
// FIX #17: Single source of truth for variant form used in both modal and quick-add

function VariantForm({
    variant,
    index,
    units,
    attributes,
    isOnly,
    onChange,
    onRemove,
}: {
    variant: VariantState
    index: number
    units: Unit[]
    attributes: Attribute[]
    isOnly: boolean
    onChange: (field: keyof VariantState, value: unknown) => void
    onRemove: () => void
}) {
    const [expanded, setExpanded] = useState(index === 0)

    const imageCount =
        variant.existingImages.filter((x) => ! variant.deletedImageIds.includes(x.id)).length +
        variant.newImages.length

    const headerId = useId()

    return (
        <Card>
            <div
                className="flex cursor-pointer items-center justify-between bg-muted/30 px-4 py-3"
                onClick={() => setExpanded((v) => ! v)}
                role="button"
                aria-expanded={expanded}
                aria-controls={`variant-content-${headerId}`}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' || e.key === ' ' ? setExpanded((v) => ! v) : undefined}
            >
                <div className="flex items-center gap-2 text-sm font-medium">
                    <ChevronDown
                        className={`size-4 transition-transform ${expanded ? '' : '-rotate-90'}`}
                        aria-hidden="true"
                    />
                    Variant {index + 1}
                    {variant.variant_name && (
                        <span className="text-muted-foreground">— {variant.variant_name}</span>
                    )}
                    {imageCount > 0 && (
                        <Badge variant="secondary" className="gap-1 text-[11px]">
                            <ImageIcon className="size-3" aria-hidden="true" /> {imageCount}/4
                        </Badge>
                    )}
                </div>
                {! isOnly && (
                    <button
                        type="button"
                        aria-label={`Remove variant ${index + 1}`}
                        onClick={(e) => { e.stopPropagation(); onRemove() }}
                        className="rounded p-1 text-destructive hover:bg-destructive/10"
                    >
                        <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                )}
            </div>

            {expanded && (
                <CardContent id={`variant-content-${headerId}`} className="space-y-4 p-4">
                    {/* Core fields */}
                    <div className="grid gap-3 md:grid-cols-3">
                        {(
                            [
                                { label: 'Variant Name *', field: 'variant_name', placeholder: 'e.g. 1kg' },
                                { label: 'SKU *',          field: 'sku',          placeholder: 'Unique SKU', mono: true },
                            ] as { label: string; field: keyof VariantState; placeholder: string; mono?: boolean }[]
                        ).map(({ label, field, placeholder, mono }) => (
                            <div key={field} className="space-y-1.5">
                                <Label htmlFor={`${field}-${headerId}`} className="text-xs">{label}</Label>
                                <Input
                                    id={`${field}-${headerId}`}
                                    value={variant[field] as string}
                                    onChange={(e) => onChange(field, e.target.value)}
                                    placeholder={placeholder}
                                    className={mono ? 'font-mono' : ''}
                                    aria-required="true"
                                />
                            </div>
                        ))}

                        <div className="space-y-1.5">
                            <Label htmlFor={`unit-${headerId}`} className="text-xs">Unit *</Label>
                            <Select value={variant.unit_id} onValueChange={(v) => onChange('unit_id', v)}>
                                <SelectTrigger id={`unit-${headerId}`} aria-required="true">
                                    <SelectValue placeholder="Select Unit" />
                                </SelectTrigger>
                                <SelectContent>
                                    {units.map((u) => (
                                        <SelectItem key={u.id} value={u.id.toString()}>
                                            {u.name} ({u.symbol})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {(
                            [
                                { label: 'Net Qty',     field: 'net_quantity' },
                                { label: 'MRP *',       field: 'mrp' },
                                { label: 'Selling *',   field: 'selling_price' },
                                { label: 'Cost *',      field: 'cost_price' },
                                { label: 'Min Selling', field: 'min_selling_price' },
                            ] as { label: string; field: keyof VariantState }[]
                        ).map(({ label, field }) => (
                            <div key={field} className="space-y-1.5">
                                <Label htmlFor={`${field}-${headerId}`} className="text-xs">{label}</Label>
                                <Input
                                    id={`${field}-${headerId}`}
                                    type="number"
                                    step="0.01"
                                    value={variant[field] as string}
                                    onChange={(e) => onChange(field, e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                        ))}
                    </div>

                    {/* Images */}
                    <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5 text-xs">
                            <ImageIcon className="size-3.5" aria-hidden="true" /> Images
                            <span className="font-normal text-muted-foreground">(max 4)</span>
                        </Label>
                        <VariantImageUploader
                            variantIndex={index}
                            existingImages={variant.existingImages}
                            newImages={variant.newImages}
                            deletedImageIds={variant.deletedImageIds}
                            onExistingDelete={(id) =>
                                onChange('deletedImageIds', [...variant.deletedImageIds, id])
                            }
                            onNewAdd={(imgs) => {
                                const base =
                                    variant.existingImages.filter(
                                        (x) => ! variant.deletedImageIds.includes(x.id),
                                    ).length + variant.newImages.length
                                onChange('newImages', [
                                    ...variant.newImages,
                                    ...imgs.map((img, j) => ({
                                        ...img,
                                        sort_order: base + j,
                                        is_primary: base + j === 0,
                                    })),
                                ])
                            }}
                            onNewRemove={(idx) =>
                                onChange(
                                    'newImages',
                                    variant.newImages.filter((_, j) => j !== idx),
                                )
                            }
                            onReorder={(all) => {
                                const existingIds = new Set(variant.existingImages.map((x) => x.id))
                                onChange(
                                    'existingImages',
                                    all.filter((img) => ! img._isNew && existingIds.has(img.id)),
                                )
                                onChange('newImages', all.filter((img) => img._isNew))
                            }}
                        />
                    </div>

                    {/* Barcodes */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-1.5 text-xs">
                                <BarcodeIcon className="size-3.5" aria-hidden="true" /> Barcodes
                            </Label>
                            <button
                                type="button"
                                onClick={() =>
                                    onChange('barcodes', [
                                        ...variant.barcodes,
                                        { barcode: '', is_primary: false },
                                    ])
                                }
                                className="text-xs text-primary hover:underline"
                                aria-label="Add barcode"
                            >
                                + Add Barcode
                            </button>
                        </div>
                        {variant.barcodes.map((bc, bIdx) => (
                            <div key={bIdx} className="flex items-center gap-2">
                                <Input
                                    value={bc.barcode}
                                    onChange={(e) =>
                                        onChange(
                                            'barcodes',
                                            variant.barcodes.map((b, i) =>
                                                i === bIdx ? { ...b, barcode: e.target.value } : b,
                                            ),
                                        )
                                    }
                                    className="flex-1 font-mono text-sm"
                                    placeholder="Barcode value"
                                    aria-label={`Barcode ${bIdx + 1}`}
                                />
                                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Checkbox
                                        checked={bc.is_primary}
                                        onCheckedChange={(c) =>
                                            onChange(
                                                'barcodes',
                                                variant.barcodes.map((b, i) => ({
                                                    ...b,
                                                    is_primary: c ? i === bIdx : false,
                                                })),
                                            )
                                        }
                                        aria-label={`Set barcode ${bIdx + 1} as primary`}
                                    />
                                    Primary
                                </label>
                                {variant.barcodes.length > 1 && (
                                    <button
                                        type="button"
                                        aria-label={`Remove barcode ${bIdx + 1}`}
                                        onClick={() =>
                                            onChange(
                                                'barcodes',
                                                variant.barcodes.filter((_, i) => i !== bIdx),
                                            )
                                        }
                                        className="text-muted-foreground hover:text-destructive"
                                    >
                                        <X className="size-4" aria-hidden="true" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Attributes */}
                    {attributes.length > 0 && (
                        <div className="space-y-2">
                            <Label className="text-xs">Attributes</Label>
                            <div className="grid gap-2 md:grid-cols-2">
                                {attributes.map((attr) => (
                                    <div key={attr.id} className="space-y-1">
                                        <Label
                                            htmlFor={`attr-${attr.id}-${headerId}`}
                                            className="text-xs text-muted-foreground"
                                        >
                                            {attr.name}
                                        </Label>
                                        <Select
                                            value={variant.attributes[attr.id]?.toString() ?? ''}
                                            onValueChange={(v) =>
                                                onChange('attributes', {
                                                    ...variant.attributes,
                                                    [attr.id]: Number(v),
                                                })
                                            }
                                        >
                                            <SelectTrigger id={`attr-${attr.id}-${headerId}`}>
                                                <SelectValue placeholder={`Select ${attr.name}`} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {attr.values.map((val) => (
                                                    <SelectItem key={val.id} value={val.id.toString()}>
                                                        {val.value}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                            checked={variant.status}
                            onCheckedChange={(c) => onChange('status', !! c)}
                            aria-label="Variant active status"
                        />
                        Variant Active
                    </label>
                </CardContent>
            )}
        </Card>
    )
}

// ─── ProductFormModal (create + edit) ─────────────────────────────────────────

function ProductFormModal({
    product,
    categories,
    brands,
    taxCategories,
    units,
    attributes,
    onClose,
}: {
    product: Product | null
    categories: Category[]
    brands: Brand[]
    taxCategories: TaxCategory[]
    units: Unit[]
    attributes: Attribute[]
    onClose: () => void
}) {
    const isEdit = product !== null

    // FIX #1 & #2 & #14: Drop useForm entirely.
    // useForm's put(url, options) ignores the `data` option — options are event callbacks only.
    // We manage all state ourselves and call router.post / router.visit directly.
    const [processing, setProcessing] = useState(false)
    // FIX #16: Field-level errors from server
    const [errors, setErrors] = useState<Record<string, string>>({})

    const [formData, setFormData] = useState({
        name:            product?.name ?? '',
        product_code:    product?.product_code ?? '',
        description:     product?.description ?? '',
        category_id:     product?.category_id?.toString() ?? '',
        brand_id:        product?.brand_id?.toString() ?? '',
        tax_category_id: product?.tax_category_id?.toString() ?? '',
        is_active:       product?.is_active ?? true,
        is_returnable:   product?.is_returnable ?? true,
    })

    // FIX #3: Safe initialisation — always fall back to [emptyVariant()] when no variants
    const [variants, setVariants] = useState<VariantState[]>(() =>
        product?.variants?.length
            ? product.variants.map((v) => ({
                id:                v.id,
                variant_name:      v.variant_name,
                sku:               v.sku,
                unit_id:           v.unit_id?.toString() ?? '',
                net_quantity:      v.net_quantity?.toString() ?? '',
                mrp:               v.mrp?.toString() ?? '',
                selling_price:     v.selling_price?.toString() ?? '',
                cost_price:        v.cost_price?.toString() ?? '',
                min_selling_price: v.min_selling_price?.toString() ?? '',
                status:            Boolean(v.status),
                barcodes:          v.barcodes?.length
                    ? v.barcodes
                    : [{ barcode: '', is_primary: true }],
                attributes:       {},
                existingImages:   (v.images ?? []).sort((a, b) => a.sort_order - b.sort_order),
                newImages:        [],
                deletedImageIds:  [],
            }))
            : [emptyVariant()],
    )

    const updateVariant = useCallback(
        (index: number, field: keyof VariantState, value: unknown) => {
            setVariants((prev) =>
                prev.map((v, i) => (i === index ? { ...v, [field]: value } : v)),
            )
        },
        [],
    )

    const addVariant    = () => setVariants((v) => [...v, emptyVariant()])
    const removeVariant = (i: number) => setVariants((v) => v.filter((_, j) => j !== i))

    /**
     * Build FormData manually.
     * FIX #22: Explicitly append empty arrays so Laravel sees `variants[i][barcodes]` = []
     * and doesn't treat it as missing/null. Using router.post with forceFormData.
     */
    const buildFormData = (): FormData => {
        const fd = new FormData()

        fd.append('name',            formData.name)
        fd.append('product_code',    formData.product_code)
        fd.append('description',     formData.description)
        fd.append('category_id',     formData.category_id)
        fd.append('brand_id',        formData.brand_id)
        fd.append('tax_category_id', formData.tax_category_id)
        fd.append('is_active',       formData.is_active ? '1' : '0')
        fd.append('is_returnable',   formData.is_returnable ? '1' : '0')

        variants.forEach((v, i) => {
            const p = `variants[${i}]`
            if (v.id) fd.append(`${p}[id]`, String(v.id))
            fd.append(`${p}[variant_name]`,  v.variant_name)
            fd.append(`${p}[sku]`,           v.sku)
            fd.append(`${p}[unit_id]`,       v.unit_id)
            fd.append(`${p}[net_quantity]`,  v.net_quantity)
            fd.append(`${p}[mrp]`,           v.mrp)
            fd.append(`${p}[selling_price]`, v.selling_price)
            fd.append(`${p}[cost_price]`,    v.cost_price)
            fd.append(`${p}[min_selling_price]`, v.min_selling_price)
            fd.append(`${p}[status]`,        v.status ? '1' : '0')

            // FIX #22: Always send barcodes array (even if empty placeholder)
            const filteredBarcodes = v.barcodes.filter((b) => b.barcode.trim() !== '')
            if (filteredBarcodes.length === 0) {
                // Send a sentinel so Laravel sees the key as an array (won't match non-empty filter)
                fd.append(`${p}[barcodes]`, '')
            } else {
                filteredBarcodes.forEach((bc, bIdx) => {
                    fd.append(`${p}[barcodes][${bIdx}][barcode]`,    bc.barcode)
                    fd.append(`${p}[barcodes][${bIdx}][is_primary]`, bc.is_primary ? '1' : '0')
                })
            }

            // Deleted image IDs (edit mode)
            v.deletedImageIds.forEach((id, dIdx) => {
                fd.append(`${p}[deleted_image_ids][${dIdx}]`, String(id))
            })

            // New image files
            v.newImages.forEach((img) => {
                if (img._file) fd.append(`${p}[images][]`, img._file)
            })
        })

        // Laravel METHOD spoofing for PUT via FormData
        if (isEdit) fd.append('_method', 'PUT')

        return fd
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setErrors({})
        setProcessing(true)

        const fd  = buildFormData()
        // FIX #1: Use router.post for both create and update (PUT spoofed via _method).
        // This correctly sends FormData including the variants array.
        const url = isEdit
            ? warehouse.products.update(product!.slug).url
            : warehouse.products.store().url

        router.post(url, fd, {
            forceFormData: true,
            onSuccess: () => {
                // FIX #4: Reset variants state on success
                setVariants([emptyVariant()])
                setFormData({
                    name: '', product_code: '', description: '',
                    category_id: '', brand_id: '', tax_category_id: '',
                    is_active: true, is_returnable: true,
                })
                onClose()
            },
            // FIX #16: Map server validation errors to fields
            onError: (errs) => setErrors(errs),
            onFinish: () => setProcessing(false),
        })
    }

    const titleId = useId()

    return (
        <div
            className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
        >
            <div className="min-h-screen px-4 py-8">
                <Card className="mx-auto max-w-5xl shadow-2xl">
                    <CardHeader className="border-b">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle id={titleId}>
                                    {isEdit ? 'Edit Product' : 'New Product'}
                                </CardTitle>
                                <CardDescription>
                                    {isEdit
                                        ? 'Update product details and variants'
                                        : 'Fill in product details and add variants'}
                                </CardDescription>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                aria-label="Close dialog"
                            >
                                <X className="size-4" aria-hidden="true" />
                            </Button>
                        </div>
                    </CardHeader>

                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-6 p-6">

                            {/* Global error */}
                            {errors.error && (
                                <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                                    {errors.error}
                                </p>
                            )}

                            {/* Product info */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                                    Basic Information
                                </h3>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="prod-name">Product Name *</Label>
                                        <Input
                                            id="prod-name"
                                            value={formData.name}
                                            onChange={(e) => setFormData((d) => ({ ...d, name: e.target.value }))}
                                            placeholder="e.g. Basmati Rice"
                                            aria-required="true"
                                            aria-describedby={errors.name ? 'prod-name-err' : undefined}
                                        />
                                        {errors.name && (
                                            <p id="prod-name-err" className="text-xs text-destructive" role="alert">
                                                {errors.name}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="prod-code">
                                            Product Code
                                            {! isEdit && (
                                                <span className="ml-1 text-xs font-normal text-muted-foreground">
                                                    (auto-generated if blank)
                                                </span>
                                            )}
                                        </Label>
                                        <Input
                                            id="prod-code"
                                            value={formData.product_code}
                                            onChange={(e) => setFormData((d) => ({ ...d, product_code: e.target.value }))}
                                            placeholder="PRD-XXXXXXXX"
                                            className="font-mono"
                                        />
                                        {errors.product_code && (
                                            <p className="text-xs text-destructive" role="alert">{errors.product_code}</p>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="prod-category">Category *</Label>
                                        <Select
                                            value={formData.category_id}
                                            onValueChange={(v) => setFormData((d) => ({ ...d, category_id: v }))}
                                        >
                                            <SelectTrigger id="prod-category" aria-required="true">
                                                <SelectValue placeholder="Select Category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {categories.map((c) => (
                                                    <SelectItem key={c.id} value={c.id.toString()}>
                                                        {c.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.category_id && (
                                            <p className="text-xs text-destructive" role="alert">{errors.category_id}</p>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="prod-brand">
                                            Brand{' '}
                                            <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                                        </Label>
                                        <Select
                                            value={formData.brand_id || undefined}
                                            onValueChange={(v) =>
                                                setFormData((d) => ({ ...d, brand_id: v === 'none' ? '' : v }))
                                            }
                                        >
                                            <SelectTrigger id="prod-brand">
                                                <SelectValue placeholder="Select Brand" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">— None —</SelectItem>
                                                {brands.map((b) => (
                                                    <SelectItem key={b.id} value={b.id.toString()}>
                                                        {b.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="prod-tax">Tax Category *</Label>
                                        <Select
                                            value={formData.tax_category_id}
                                            onValueChange={(v) =>
                                                setFormData((d) => ({ ...d, tax_category_id: v }))
                                            }
                                        >
                                            <SelectTrigger id="prod-tax" aria-required="true">
                                                <SelectValue placeholder="Select Tax" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {taxCategories.map((t) => (
                                                    <SelectItem key={t.id} value={t.id.toString()}>
                                                        {t.name} ({t.tax_percent}%)
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.tax_category_id && (
                                            <p className="text-xs text-destructive" role="alert">{errors.tax_category_id}</p>
                                        )}
                                    </div>

                                    <div className="space-y-1.5 md:col-span-2">
                                        <Label htmlFor="prod-desc">
                                            Description{' '}
                                            <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                                        </Label>
                                        <Textarea
                                            id="prod-desc"
                                            value={formData.description}
                                            onChange={(e) =>
                                                setFormData((d) => ({ ...d, description: e.target.value }))
                                            }
                                            rows={3}
                                            className="resize-none"
                                            placeholder="Short product description…"
                                        />
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <label className="flex items-center gap-2 text-sm">
                                            <Checkbox
                                                checked={formData.is_active}
                                                onCheckedChange={(c) =>
                                                    setFormData((d) => ({ ...d, is_active: !! c }))
                                                }
                                                aria-label="Product is active"
                                            />
                                            Active
                                        </label>
                                        <label className="flex items-center gap-2 text-sm">
                                            <Checkbox
                                                checked={formData.is_returnable}
                                                onCheckedChange={(c) =>
                                                    setFormData((d) => ({ ...d, is_returnable: !! c }))
                                                }
                                                aria-label="Product is returnable"
                                            />
                                            Returnable
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Variants */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                                        Variants
                                    </h3>
                                    <Button type="button" size="sm" variant="outline" onClick={addVariant}>
                                        <Plus className="mr-1.5 size-3.5" aria-hidden="true" /> Add Variant
                                    </Button>
                                </div>

                                {/* FIX #16: Surface per-variant server errors */}
                                {Object.entries(errors)
                                    .filter(([k]) => k.startsWith('variants.'))
                                    .map(([k, v]) => (
                                        <p key={k} className="text-xs text-destructive" role="alert">
                                            {k}: {v}
                                        </p>
                                    ))}

                                {variants.map((v, i) => (
                                    <VariantForm
                                        key={i}
                                        index={i}
                                        variant={v}
                                        units={units}
                                        attributes={attributes}
                                        isOnly={variants.length === 1}
                                        onChange={(field, value) => updateVariant(i, field, value)}
                                        onRemove={() => removeVariant(i)}
                                    />
                                ))}
                            </div>
                        </CardContent>

                        <div className="flex justify-end gap-3 border-t p-6">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                disabled={processing}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing
                                    ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                                    : <Save className="mr-2 size-4" aria-hidden="true" />
                                }
                                {isEdit ? 'Update Product' : 'Create Product'}
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    )
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ data }: { data: PaginatedProducts }) {
    if (data.last_page <= 1) return null

    return (
        <nav aria-label="Product list pagination" className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-xs text-muted-foreground">
                {data.from != null && data.to != null ? (
                    <>
                        Showing <span className="font-medium">{data.from}–{data.to}</span> of{' '}
                        <span className="font-medium">{data.total}</span>
                    </>
                ) : (
                    'No results'
                )}
            </p>
            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={data.current_page === 1}
                    aria-label="Previous page"
                    onClick={() =>
                        router.get(data.links[0].url ?? '', {}, { preserveState: true })
                    }
                >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                </Button>
                {data.links.slice(1, -1).map((link) => (
                    <Button
                        key={link.label}
                        variant={link.active ? 'default' : 'ghost'}
                        size="icon"
                        className="h-8 w-8 text-xs"
                        disabled={! link.url || link.active}
                        aria-label={`Page ${link.label}`}
                        aria-current={link.active ? 'page' : undefined}
                        onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                        dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                ))}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={data.current_page === data.last_page}
                    aria-label="Next page"
                    onClick={() =>
                        router.get(
                            data.links[data.links.length - 1].url ?? '',
                            {},
                            { preserveState: true },
                        )
                    }
                >
                    <ChevronRight className="size-4" aria-hidden="true" />
                </Button>
            </div>
        </nav>
    )
}

// ─── Quick-add panel ──────────────────────────────────────────────────────────
// FIX #17: QuickVariantForm reuses VariantForm — no duplicated variant form code

function QuickAddPanel({
    categories,
    brands,
    taxCategories,
    units,
    onDone,
}: {
    categories: Category[]
    brands: Brand[]
    taxCategories: TaxCategory[]
    units: Unit[]
    onDone: () => void
}) {
    const [selectedCategory, setSelectedCategory]       = useState('')
    const [selectedTaxCategory, setSelectedTaxCategory] = useState('')
    const [quickProducts, setQuickProducts]             = useState<QuickProduct[]>([])
    const [submitting, setSubmitting]                   = useState(false)
    const [errors, setErrors]                           = useState<Record<string, string>>({})

    const addProduct = () => {
        const _id = newId()
        setQuickProducts((p) => [
            ...p,
            { _id, name: '', brand_id: '', variants: [emptyQuickVariant()] },
        ])
    }

    const updateProduct = (_id: string, field: keyof QuickProduct, value: unknown) =>
        setQuickProducts((p) => p.map((x) => (x._id === _id ? { ...x, [field]: value } : x)))

    const removeProduct = (_id: string) =>
        setQuickProducts((p) => p.filter((x) => x._id !== _id))

    const addVariant = (productId: string) =>
        setQuickProducts((p) =>
            p.map((x) =>
                x._id === productId
                    ? { ...x, variants: [...x.variants, emptyQuickVariant()] }
                    : x,
            ),
        )

    const updateVariant = (
        productId: string,
        variantId: string,
        field: keyof QuickVariant,
        value: unknown,
    ) =>
        setQuickProducts((p) =>
            p.map((x) =>
                x._id === productId
                    ? {
                        ...x,
                        variants: x.variants.map((v) =>
                            v._id === variantId ? { ...v, [field]: value } : v,
                        ),
                    }
                    : x,
            ),
        )

    const removeVariant = (productId: string, variantId: string) =>
        setQuickProducts((p) =>
            p.map((x) =>
                x._id === productId
                    ? { ...x, variants: x.variants.filter((v) => v._id !== variantId) }
                    : x,
            ),
        )

    const handleSubmit = () => {
        setSubmitting(true)
        setErrors({})
        router.post(
            warehouse.products.quick().url,
            {
                category_id:     Number(selectedCategory),
                tax_category_id: Number(selectedTaxCategory),
                products: quickProducts.map((p) => ({
                    name:     p.name,
                    brand_id: p.brand_id ? Number(p.brand_id) : null,
                    variants: p.variants.map((v) => ({
                        variant_name:      v.variant_name,
                        sku:               v.sku,
                        unit_id:           Number(v.unit_id),
                        net_quantity:      v.net_quantity !== '' ? Number(v.net_quantity) : null,
                        mrp:               Number(v.mrp),
                        selling_price:     Number(v.selling_price),
                        cost_price:        Number(v.cost_price),
                        min_selling_price: v.min_selling_price !== '' ? Number(v.min_selling_price) : null,
                        barcodes:          v.barcodes.filter((b) => b.barcode.trim() !== ''),
                    })),
                })),
            },
            {
                onSuccess: () => onDone(),
                onError:   (errs) => setErrors(errs),
                onFinish:  () => setSubmitting(false),
            },
        )
    }

    const ready = selectedCategory && selectedTaxCategory

    return (
        <div className="flex h-full flex-1 flex-col gap-4 p-4">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Quick Add Products</CardTitle>
                            <CardDescription>Bulk-add multiple products under one category</CardDescription>
                        </div>
                        <Button variant="outline" onClick={onDone}>
                            <X className="mr-2 size-4" aria-hidden="true" /> Cancel
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="w-56 space-y-1.5">
                            <Label htmlFor="qp-category" className="text-xs">Category *</Label>
                            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                <SelectTrigger id="qp-category" aria-required="true">
                                    <SelectValue placeholder="Select Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((c) => (
                                        <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-56 space-y-1.5">
                            <Label htmlFor="qp-tax" className="text-xs">Tax Category *</Label>
                            <Select value={selectedTaxCategory} onValueChange={setSelectedTaxCategory}>
                                <SelectTrigger id="qp-tax" aria-required="true">
                                    <SelectValue placeholder="Select Tax" />
                                </SelectTrigger>
                                <SelectContent>
                                    {taxCategories.map((t) => (
                                        <SelectItem key={t.id} value={t.id.toString()}>
                                            {t.name} ({t.tax_percent}%)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={addProduct} disabled={! ready} size="sm">
                            <Plus className="mr-1.5 size-3.5" aria-hidden="true" /> Add Product Row
                        </Button>
                    </div>
                    {errors.error && (
                        <p className="mt-3 text-sm text-destructive" role="alert">{errors.error}</p>
                    )}
                </CardContent>
            </Card>

            {quickProducts.length === 0 ? (
                <div className="flex flex-1 items-center justify-center text-center text-muted-foreground">
                    <div>
                        <PackagePlus className="mx-auto mb-2 size-10 opacity-30" aria-hidden="true" />
                        <p className="text-sm">
                            No products yet — select a category and click "Add Product Row"
                        </p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4 overflow-auto">
                    {quickProducts.map((product) => (
                        <Card key={product._id}>
                            <CardContent className="space-y-4 p-4">
                                <div className="flex items-start gap-3">
                                    <div className="grid flex-1 gap-3 md:grid-cols-2">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Product Name *</Label>
                                            <Input
                                                value={product.name}
                                                onChange={(e) =>
                                                    updateProduct(product._id, 'name', e.target.value)
                                                }
                                                placeholder="e.g. Tata Salt"
                                                aria-required="true"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Brand</Label>
                                            <Select
                                                value={product.brand_id || undefined}
                                                onValueChange={(v) =>
                                                    updateProduct(
                                                        product._id,
                                                        'brand_id',
                                                        v === 'none' ? '' : v,
                                                    )
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Brand (optional)" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">— None —</SelectItem>
                                                    {brands.map((b) => (
                                                        <SelectItem key={b.id} value={b.id.toString()}>
                                                            {b.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        aria-label={`Remove product ${product.name || product._id}`}
                                        onClick={() => removeProduct(product._id)}
                                        className="mt-6 rounded p-1.5 text-destructive hover:bg-destructive/10"
                                    >
                                        <Trash2 className="size-4" aria-hidden="true" />
                                    </button>
                                </div>

                                {product.variants.map((variant, vIdx) => (
                                    <div key={variant._id} className="rounded-lg border bg-muted/20 p-3">
                                        <div className="mb-2 flex items-center justify-between">
                                            <span className="text-xs font-medium">Variant {vIdx + 1}</span>
                                            {product.variants.length > 1 && (
                                                <button
                                                    type="button"
                                                    aria-label={`Remove variant ${vIdx + 1}`}
                                                    onClick={() => removeVariant(product._id, variant._id)}
                                                    className="text-destructive hover:opacity-80"
                                                >
                                                    <X className="size-3.5" aria-hidden="true" />
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid gap-2 md:grid-cols-4 lg:grid-cols-8">
                                            {(
                                                [
                                                    { label: 'Name *',    field: 'variant_name',     placeholder: '1kg' },
                                                    { label: 'SKU *',     field: 'sku',              placeholder: 'SKU', mono: true },
                                                    { label: 'Qty',       field: 'net_quantity',     placeholder: '1',   num: true },
                                                    { label: 'MRP *',     field: 'mrp',              placeholder: '0.00', num: true },
                                                    { label: 'Selling *', field: 'selling_price',    placeholder: '0.00', num: true },
                                                    { label: 'Min Sell',  field: 'min_selling_price', placeholder: '0.00', num: true },
                                                    { label: 'Cost *',    field: 'cost_price',       placeholder: '0.00', num: true },
                                                ] as { label: string; field: keyof QuickVariant; placeholder: string; mono?: boolean; num?: boolean }[]
                                            ).map(({ label, field, placeholder, mono, num }) => (
                                                <div key={field} className="space-y-1">
                                                    <Label className="text-[11px]">{label}</Label>
                                                    <Input
                                                        type={num ? 'number' : 'text'}
                                                        step={num ? '0.01' : undefined}
                                                        value={variant[field] as string}
                                                        onChange={(e) =>
                                                            updateVariant(
                                                                product._id,
                                                                variant._id,
                                                                field,
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder={placeholder}
                                                        className={`h-8 text-xs ${mono ? 'font-mono' : ''}`}
                                                        aria-label={label.replace(' *', '')}
                                                    />
                                                </div>
                                            ))}

                                            <div className="space-y-1">
                                                <Label className="text-[11px]">Unit *</Label>
                                                <Select
                                                    value={variant.unit_id}
                                                    onValueChange={(v) =>
                                                        updateVariant(product._id, variant._id, 'unit_id', v)
                                                    }
                                                >
                                                    <SelectTrigger className="h-8 text-xs" aria-label="Unit">
                                                        <SelectValue placeholder="Unit" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {units.map((u) => (
                                                            <SelectItem key={u.id} value={u.id.toString()}>
                                                                {u.symbol}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Barcodes */}
                                            <div className="space-y-1.5 md:col-span-full">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-[11px]">Barcodes</Label>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            updateVariant(
                                                                product._id,
                                                                variant._id,
                                                                'barcodes',
                                                                [
                                                                    ...variant.barcodes,
                                                                    { barcode: '', is_primary: false },
                                                                ],
                                                            )
                                                        }
                                                        className="text-[11px] text-primary hover:underline"
                                                        aria-label="Add barcode"
                                                    >
                                                        + Add
                                                    </button>
                                                </div>
                                                {variant.barcodes.map((bc, bIdx) => (
                                                    <div key={bIdx} className="flex items-center gap-2">
                                                        <Input
                                                            value={bc.barcode}
                                                            onChange={(e) =>
                                                                updateVariant(
                                                                    product._id,
                                                                    variant._id,
                                                                    'barcodes',
                                                                    variant.barcodes.map((b, i) =>
                                                                        i === bIdx
                                                                            ? { ...b, barcode: e.target.value }
                                                                            : b,
                                                                    ),
                                                                )
                                                            }
                                                            placeholder="Barcode value"
                                                            className="h-8 flex-1 font-mono text-xs"
                                                            aria-label={`Barcode ${bIdx + 1}`}
                                                        />
                                                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                            <Checkbox
                                                                checked={bc.is_primary}
                                                                onCheckedChange={(c) =>
                                                                    updateVariant(
                                                                        product._id,
                                                                        variant._id,
                                                                        'barcodes',
                                                                        variant.barcodes.map((b, i) => ({
                                                                            ...b,
                                                                            is_primary: c ? i === bIdx : false,
                                                                        })),
                                                                    )
                                                                }
                                                                aria-label={`Set barcode ${bIdx + 1} as primary`}
                                                            />
                                                            Primary
                                                        </label>
                                                        {variant.barcodes.length > 1 && (
                                                            <button
                                                                type="button"
                                                                aria-label={`Remove barcode ${bIdx + 1}`}
                                                                onClick={() =>
                                                                    updateVariant(
                                                                        product._id,
                                                                        variant._id,
                                                                        'barcodes',
                                                                        variant.barcodes.filter(
                                                                            (_, i) => i !== bIdx,
                                                                        ),
                                                                    )
                                                                }
                                                                className="text-muted-foreground hover:text-destructive"
                                                            >
                                                                <X className="size-3.5" aria-hidden="true" />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => addVariant(product._id)}
                                    className="text-xs"
                                >
                                    <Plus className="mr-1 size-3.5" aria-hidden="true" /> Add Variant
                                </Button>
                            </CardContent>
                        </Card>
                    ))}

                    <div className="flex justify-end gap-3 pb-4">
                        <Button variant="outline" onClick={onDone} disabled={submitting}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={submitting || ! ready}>
                            {submitting ? (
                                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                            ) : (
                                <Save className="mr-2 size-4" aria-hidden="true" />
                            )}
                            Save {quickProducts.length} Product
                            {quickProducts.length !== 1 ? 's' : ''}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Products (main page) ─────────────────────────────────────────────────────

export default function Products({
    products,
    categories = [],
    brands = [],
    taxCategories = [],
    units = [],
    attributes = [],
    filters,
}: Props) {
    const [view, setView]               = useState<'list' | 'quick'>('list')
    const [searchQuery, setSearchQuery] = useState(filters.search ?? '')
    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
    const [modalProduct, setModalProduct] = useState<Product | null | 'new'>(null)

    // FIX #20: Proper debounce cleanup using useRef + useEffect
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    useEffect(() => {
        return () => {
            if (searchTimer.current) clearTimeout(searchTimer.current)
        }
    }, [])

    const handleSearch = (q: string) => {
        setSearchQuery(q)
        if (searchTimer.current) clearTimeout(searchTimer.current)
        searchTimer.current = setTimeout(() => {
            router.get(
                '/warehouse/products',
                { search: q || undefined, per_page: filters.per_page },
                { preserveState: true, replace: true },
            )
        }, 350)
    }

    const toggleExpand = (id: number) =>
        setExpandedIds((prev) => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })

    if (view === 'quick') {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Quick Add Products" />
                <QuickAddPanel
                    categories={categories}
                    brands={brands}
                    taxCategories={taxCategories}
                    units={units}
                    onDone={() => setView('list')}
                />
            </AppLayout>
        )
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Products" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                {/* Toolbar */}
                <Card className="border-sidebar-border/70 shadow-none">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                        <div>
                            <CardTitle className="text-xl font-bold">Products</CardTitle>
                            <CardDescription>
                                {products.total} product{products.total !== 1 ? 's' : ''} total
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setView('quick')}>
                                <Zap className="mr-1.5 size-3.5" aria-hidden="true" /> Quick Add
                            </Button>
                            <Button size="sm" onClick={() => setModalProduct('new')}>
                                <Plus className="mr-1.5 size-3.5" aria-hidden="true" /> New Product
                            </Button>
                        </div>
                    </CardHeader>

                    <CardContent className="pb-4">
                        <div className="flex items-center gap-3">
                            <div className="relative max-w-sm flex-1">
                                <Search
                                    className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                                    aria-hidden="true"
                                />
                                <Input
                                    placeholder="Search by name or code…"
                                    value={searchQuery}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    className="h-9 pl-9"
                                    aria-label="Search products"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        onClick={() => handleSearch('')}
                                        aria-label="Clear search"
                                    >
                                        <X className="size-3.5" aria-hidden="true" />
                                    </button>
                                )}
                            </div>
                            <Select
                                value={String(filters.per_page)}
                                onValueChange={(v) =>
                                    router.get(
                                        '/warehouse/products',
                                        { search: searchQuery, per_page: Number(v) },
                                        { preserveState: true, replace: true },
                                    )
                                }
                            >
                                <SelectTrigger className="h-9 w-28" aria-label="Items per page">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[10, 20, 50, 100].map((n) => (
                                        <SelectItem key={n} value={String(n)}>
                                            {n} / page
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Table */}
                <Card className="flex-1 border-sidebar-border/70 shadow-none">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/20">
                                <TableHead className="w-10 pl-4" />
                                <TableHead>Code</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead className="hidden md:table-cell">Category</TableHead>
                                <TableHead className="hidden md:table-cell">Brand</TableHead>
                                <TableHead className="hidden lg:table-cell">Variants</TableHead>
                                <TableHead className="w-20 text-center">Status</TableHead>
                                <TableHead className="pr-4 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {products.data.length > 0 ? (
                                products.data.map((product) => (
                                    <React.Fragment key={product.id}>
                                        <TableRow className="hover:bg-muted/50">
                                            <TableCell className="pl-4">
                                                {(product.variants?.length ?? 0) > 0 && (
                                                    <button
                                                        type="button"
                                                        aria-label={
                                                            expandedIds.has(product.id)
                                                                ? `Collapse ${product.name}`
                                                                : `Expand ${product.name}`
                                                        }
                                                        aria-expanded={expandedIds.has(product.id)}
                                                        onClick={() => toggleExpand(product.id)}
                                                        className="rounded p-1 hover:bg-muted"
                                                    >
                                                        <ChevronDown
                                                            className={`size-4 transition-transform ${expandedIds.has(product.id) ? '' : '-rotate-90'}`}
                                                            aria-hidden="true"
                                                        />
                                                    </button>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs text-muted-foreground">
                                                {product.product_code}
                                            </TableCell>
                                            <TableCell className="font-medium">{product.name}</TableCell>
                                            <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                                                {product.category?.name ?? '—'}
                                            </TableCell>
                                            <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                                                {product.brand?.name ?? '—'}
                                            </TableCell>
                                            <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                                                {product.variants?.length ?? 0} variant
                                                {(product.variants?.length ?? 0) !== 1 ? 's' : ''}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge
                                                    variant={product.is_active ? 'default' : 'secondary'}
                                                    className="text-xs"
                                                >
                                                    {product.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="pr-4 text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    aria-label={`Edit ${product.name}`}
                                                    onClick={() => setModalProduct(product)}
                                                >
                                                    <Edit2 className="size-4" aria-hidden="true" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>

                                        {expandedIds.has(product.id) &&
                                            (product.variants?.length ?? 0) > 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={8} className="bg-muted/20 p-0">
                                                        <div className="px-6 py-3">
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow className="border-0 text-xs">
                                                                        <TableHead className="h-8 pl-0">Variant</TableHead>
                                                                        <TableHead className="h-8">SKU</TableHead>
                                                                        <TableHead className="h-8">Unit</TableHead>
                                                                        <TableHead className="h-8 text-right">MRP</TableHead>
                                                                        <TableHead className="h-8 text-right">Selling</TableHead>
                                                                        <TableHead className="h-8 text-right">Cost</TableHead>
                                                                        <TableHead className="h-8">Images</TableHead>
                                                                        <TableHead className="h-8 text-center">Active</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {product.variants!.map((v) => (
                                                                        <TableRow
                                                                            key={v.id}
                                                                            className="border-0 last:border-0"
                                                                        >
                                                                            <TableCell className="py-1.5 pl-0 text-sm font-medium">
                                                                                {v.variant_name}
                                                                            </TableCell>
                                                                            <TableCell className="py-1.5 font-mono text-xs text-muted-foreground">
                                                                                {v.sku}
                                                                            </TableCell>
                                                                            <TableCell className="py-1.5 text-xs">
                                                                                {units.find(
                                                                                    (u) => u.id === Number(v.unit_id),
                                                                                )?.symbol ?? '—'}
                                                                            </TableCell>
                                                                            <TableCell className="py-1.5 text-right text-xs">
                                                                                ₹{Number(v.mrp).toFixed(2)}
                                                                            </TableCell>
                                                                            <TableCell className="py-1.5 text-right text-xs">
                                                                                ₹{Number(v.selling_price).toFixed(2)}
                                                                            </TableCell>
                                                                            <TableCell className="py-1.5 text-right text-xs">
                                                                                ₹{Number(v.cost_price).toFixed(2)}
                                                                            </TableCell>
                                                                            <TableCell className="py-1.5">
                                                                                <div
                                                                                    className="flex gap-1"
                                                                                    aria-label={`${v.images?.length ?? 0} images`}
                                                                                >
                                                                                    {v.images?.length ? (
                                                                                        v.images.slice(0, 4).map((img) => (
                                                                                            <Avatar
                                                                                                key={img.id}
                                                                                                className={`h-7 w-7 border-2 ${img.is_primary ? 'border-primary' : 'border-border'}`}
                                                                                            >
                                                                                                <AvatarImage
                                                                                                    src={img.url}
                                                                                                    alt={img.is_primary ? 'Primary image' : 'Product image'}
                                                                                                />
                                                                                                <AvatarFallback className="text-[8px]">
                                                                                                    IMG
                                                                                                </AvatarFallback>
                                                                                            </Avatar>
                                                                                        ))
                                                                                    ) : (
                                                                                        <span className="text-xs text-muted-foreground">
                                                                                            —
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            </TableCell>
                                                                            <TableCell className="py-1.5 text-center">
                                                                                <div
                                                                                    className={`mx-auto size-2 rounded-full ${v.status ? 'bg-green-500' : 'bg-muted-foreground/40'}`}
                                                                                    aria-label={v.status ? 'Active' : 'Inactive'}
                                                                                />
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                    </React.Fragment>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={8} className="py-16 text-center text-muted-foreground">
                                        <PackagePlus
                                            className="mx-auto mb-2 size-8 opacity-20"
                                            aria-hidden="true"
                                        />
                                        <p className="text-sm">
                                            {searchQuery
                                                ? `No products matching "${searchQuery}"`
                                                : 'No products yet.'}
                                        </p>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>

                    <Pagination data={products} />
                </Card>
            </div>

            {/* Create / Edit modal */}
            {modalProduct !== null && (
                <ProductFormModal
                    product={modalProduct === 'new' ? null : modalProduct}
                    categories={categories}
                    brands={brands}
                    taxCategories={taxCategories}
                    units={units}
                    attributes={attributes}
                    onClose={() => setModalProduct(null)}
                />
            )}
        </AppLayout>
    )
}
