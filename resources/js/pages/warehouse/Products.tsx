import { Head, router } from '@inertiajs/react';
import React, { useCallback, useState } from 'react';
import {
    Search,
    Plus,
    Edit2,
    Zap,
    X,
    Save,
    Trash2,
    PackagePlus,
    Barcode as BarcodeIcon,
    ChevronDown,
    ChevronRight,
    ImageIcon,
    UploadIcon,
    AlertCircleIcon,
    GripVertical,
    Star,
    ChevronLeft,
    ChevronRight as ChevronRightIcon,
} from 'lucide-react';

import AppLayout from '@/layouts/app-layout';
import warehouse from '@/routes/warehouse';
import type { BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: warehouse.dashboard().url },
    { title: 'Products', href: '' },
];

type Category = { id: number; name: string };
type Brand = { id: number; name: string };
type TaxCategory = { id: number; name: string; tax_percent: number };
type Unit = { id: number; name: string; symbol: string };
type Attribute = { id: number; name: string; values: AttributeValue[] };
type AttributeValue = { id: number; attribute_id: number; value: string };

type Barcode = { id?: number; barcode: string; is_primary: boolean };

type ProductImage = {
    id: number;
    url: string;
    is_primary: boolean;
    sort_order: number;
    // For new (not-yet-uploaded) images, we store the File locally
    _file?: File;
    _preview?: string;
    _isNew?: boolean;
};

type ProductVariant = {
    id?: number;
    variant_name: string;
    sku: string;
    unit_id: string | number;
    net_quantity: string | number;
    mrp: string | number;
    selling_price: string | number;
    cost_price: string | number;
    min_selling_price: string | number;
    status: boolean;
    barcodes?: Barcode[];
    attributes?: { [key: number]: number };
    images?: ProductImage[];
};

type Product = {
    id: number;
    name: string;
    product_code: string;
    description?: string;
    category_id: number;
    brand_id?: number;
    tax_category_id: number;
    category?: Category;
    brand?: Brand;
    tax_category?: TaxCategory;
    variants?: ProductVariant[];
    is_active: boolean;
    is_returnable: boolean;
};

type PaginationLink = { url: string | null; label: string; active: boolean };
type PaginatedProducts = {
    data: Product[];
    links: PaginationLink[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
};

type QuickProduct = {
    id: string;
    name: string;
    brand_id: string;
    variants: QuickVariant[];
};

type QuickVariant = {
    id: string;
    variant_name: string;
    sku: string;
    unit_id: string;
    net_quantity: string;
    mrp: string;
    selling_price: string;
    cost_price: string;
    min_selling_price: string;
    barcodes: Barcode[];
};

type Props = {
    products: PaginatedProducts;
    categories: Category[];
    brands: Brand[];
    taxCategories: TaxCategory[];
    units: Unit[];
    attributes: Attribute[];
    filters: { search: string; per_page: number };
};

type EditVariant = {
    id?: number;
    variant_name: string;
    sku: string;
    unit_id: string;
    net_quantity: string;
    mrp: string;
    selling_price: string;
    cost_price: string;
    min_selling_price: string;
    status: boolean;
    barcodes: Barcode[];
    attributes: { [key: number]: number };
    // Existing images (from server)
    existingImages: ProductImage[];
    // New images staged locally (not yet uploaded)
    newImages: ProductImage[];
    // IDs of existing images the user wants to delete
    deletedImageIds: number[];
};

// ─────────────────────────────────────────────
// Image compression helper (client-side, max 120 KB)
// ─────────────────────────────────────────────
const MAX_IMAGE_BYTES = 120 * 1024; // 120 KB

async function compressImage(file: File): Promise<File> {
    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);

            const canvas = document.createElement('canvas');
            let { width, height } = img;

            // Downsample if very large
            const MAX_DIM = 1200;
            if (width > MAX_DIM || height > MAX_DIM) {
                const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0, width, height);

            // Binary search for quality that keeps file <= 120 KB
            let lo = 0.1;
            let hi = 0.92;
            let result: Blob | null = null;

            const tryQuality = (q: number): Promise<Blob> =>
                new Promise((res) =>
                    canvas.toBlob((b) => res(b!), 'image/jpeg', q),
                );

            (async () => {
                // Quick check: at max quality, is it already small enough?
                const maxBlob = await tryQuality(hi);
                if (maxBlob.size <= MAX_IMAGE_BYTES) {
                    result = maxBlob;
                } else {
                    // Binary search
                    for (let i = 0; i < 8; i++) {
                        const mid = (lo + hi) / 2;
                        const blob = await tryQuality(mid);
                        if (blob.size <= MAX_IMAGE_BYTES) {
                            result = blob;
                            lo = mid;
                        } else {
                            hi = mid;
                        }
                    }
                    // Fallback: use lowest quality if still too big
                    if (!result) {
                        result = await tryQuality(lo);
                    }
                }

                const compressed = new File([result!], file.name.replace(/\.[^.]+$/, '.jpg'), {
                    type: 'image/jpeg',
                });
                resolve(compressed);
            })();
        };

        img.src = url;
    });
}

// ─────────────────────────────────────────────
// VariantImageUploader
// ─────────────────────────────────────────────
function VariantImageUploader({
    existingImages,
    newImages,
    deletedImageIds,
    onExistingDelete,
    onNewAdd,
    onNewRemove,
    onReorder,
}: {
    existingImages: ProductImage[];
    newImages: ProductImage[];
    deletedImageIds: number[];
    onExistingDelete: (id: number) => void;
    onNewAdd: (imgs: ProductImage[]) => void;
    onNewRemove: (idx: number) => void;
    onReorder: (imgs: ProductImage[]) => void;
}) {
    const [isDragging, setIsDragging] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const [compressing, setCompressing] = useState(false);
    const [dragOver, setDragOver] = useState<number | null>(null);

    const visibleExisting = existingImages.filter((img) => !deletedImageIds.includes(img.id));
    const totalCount = visibleExisting.length + newImages.length;

    const processFiles = useCallback(
        async (files: File[]) => {
            setErrors([]);

            const imageFiles = files.filter((f) => f.type.startsWith('image/'));
            if (imageFiles.length === 0) {
                setErrors(['Please select image files (JPEG, PNG, WebP).']);
                return;
            }

            const canAdd = 4 - totalCount;
            if (canAdd <= 0) {
                setErrors(['Maximum 4 images per variant reached.']);
                return;
            }

            const toProcess = imageFiles.slice(0, canAdd);
            if (imageFiles.length > canAdd) {
                setErrors([`Only ${canAdd} more image(s) can be added (max 4 total).`]);
            }

            setCompressing(true);
            try {
                const compressed = await Promise.all(toProcess.map(compressImage));
                const staged: ProductImage[] = compressed.map((file, i) => ({
                    id: 0, // placeholder
                    url: '',
                    is_primary: totalCount + i === 0,
                    sort_order: totalCount + i,
                    _file: file,
                    _preview: URL.createObjectURL(file),
                    _isNew: true,
                }));
                onNewAdd(staged);
            } finally {
                setCompressing(false);
            }
        },
        [totalCount, onNewAdd],
    );

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) processFiles(Array.from(e.target.files));
        e.target.value = '';
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files) processFiles(Array.from(e.dataTransfer.files));
    };

    // Drag-to-reorder among the combined list (existing + new)
    const allImages: Array<{ type: 'existing'; img: ProductImage } | { type: 'new'; img: ProductImage; idx: number }> = [
        ...visibleExisting.map((img) => ({ type: 'existing' as const, img })),
        ...newImages.map((img, idx) => ({ type: 'new' as const, img, idx })),
    ];

    const handleItemDragOver = (e: React.DragEvent, order: number) => {
        e.preventDefault();
        setDragOver(order);
    };

    const handleItemDrop = (e: React.DragEvent, targetOrder: number) => {
        e.preventDefault();
        setDragOver(null);
        const srcOrder = Number(e.dataTransfer.getData('sort_order'));
        if (srcOrder === targetOrder) return;

        // Rebuild combined ordered list and swap
        const sorted = [...allImages].sort(
            (a, b) => a.img.sort_order - b.img.sort_order,
        );
        const srcIdx = sorted.findIndex((x) => x.img.sort_order === srcOrder);
        const dstIdx = sorted.findIndex((x) => x.img.sort_order === targetOrder);
        if (srcIdx === -1 || dstIdx === -1) return;

        const copy = [...sorted];
        const [moved] = copy.splice(srcIdx, 1);
        copy.splice(dstIdx, 0, moved);

        // Re-assign sort_order and is_primary
        const reordered = copy.map((x, i) => ({ ...x, img: { ...x.img, sort_order: i, is_primary: i === 0 } }));
        onReorder(reordered.map((x) => x.img));
    };

    return (
        <div className="space-y-3">
            {/* Drop zone */}
            {totalCount < 4 && (
                <div
                    className={`relative flex min-h-28 flex-col items-center justify-center rounded-xl border border-dashed p-4 transition-colors ${
                        isDragging ? 'border-primary bg-primary/5' : 'border-input hover:border-primary/50'
                    }`}
                    onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={(e) => { e.preventDefault(); if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false); }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                >
                    <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        multiple
                        className="sr-only"
                        id="img-upload"
                        onChange={handleFileInput}
                        disabled={compressing}
                    />
                    <div className="flex size-10 items-center justify-center rounded-full border bg-background">
                        {compressing ? (
                            <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        ) : (
                            <ImageIcon className="size-4 opacity-60" />
                        )}
                    </div>
                    <p className="mt-2 text-sm font-medium">
                        {compressing ? 'Compressing images…' : 'Drop images here'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        JPEG, PNG, WebP · Auto-compressed to ≤120 KB · {4 - totalCount} slot(s) left
                    </p>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => document.getElementById('img-upload')?.click()}
                        disabled={compressing}
                    >
                        <UploadIcon className="mr-2 size-3.5" />
                        Select Images
                    </Button>
                </div>
            )}

            {errors.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-destructive" role="alert">
                    <AlertCircleIcon className="size-3.5 shrink-0" />
                    <span>{errors[0]}</span>
                </div>
            )}

            {/* Image grid (drag to reorder) */}
            {allImages.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                    {allImages
                        .sort((a, b) => a.img.sort_order - b.img.sort_order)
                        .map((item, order) => {
                            const isExisting = item.type === 'existing';
                            const src = isExisting ? item.img.url : item.img._preview;
                            const isPrimary = order === 0;

                            return (
                                <div
                                    key={isExisting ? `e-${item.img.id}` : `n-${(item as { type: 'new'; img: ProductImage; idx: number }).idx}`}
                                    className={`group relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                                        isPrimary ? 'border-primary' : 'border-border'
                                    } ${dragOver === item.img.sort_order ? 'opacity-50 scale-95' : ''}`}
                                    draggable
                                    onDragStart={(e) => {
                                        e.dataTransfer.setData('sort_order', String(item.img.sort_order));
                                    }}
                                    onDragOver={(e) => handleItemDragOver(e, item.img.sort_order)}
                                    onDragLeave={() => setDragOver(null)}
                                    onDrop={(e) => handleItemDrop(e, item.img.sort_order)}
                                >
                                    <img
                                        src={src}
                                        alt={`Image ${order + 1}`}
                                        className="size-full object-cover"
                                    />

                                    {/* Primary badge */}
                                    {isPrimary && (
                                        <div className="absolute left-1 top-1">
                                            <Badge className="gap-1 px-1.5 py-0 text-[10px]">
                                                <Star className="size-2.5" />
                                                Primary
                                            </Badge>
                                        </div>
                                    )}

                                    {/* Drag handle */}
                                    <div className="absolute right-1 top-1 cursor-grab opacity-0 transition-opacity group-hover:opacity-100">
                                        <div className="rounded bg-black/50 p-0.5">
                                            <GripVertical className="size-3 text-white" />
                                        </div>
                                    </div>

                                    {/* Delete button */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (isExisting) {
                                                onExistingDelete(item.img.id);
                                            } else {
                                                onNewRemove((item as { type: 'new'; img: ProductImage; idx: number }).idx);
                                            }
                                        }}
                                        className="absolute bottom-1 right-1 flex size-6 items-center justify-center rounded-full bg-destructive/90 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive"
                                    >
                                        <X className="size-3" />
                                    </button>

                                    {/* New indicator */}
                                    {!isExisting && (
                                        <div className="absolute bottom-1 left-1">
                                            <Badge variant="secondary" className="px-1 py-0 text-[10px]">New</Badge>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                </div>
            )}

            {allImages.length > 1 && (
                <p className="text-center text-xs text-muted-foreground">
                    Drag images to reorder · First image becomes the primary
                </p>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────
// Pagination Component
// ─────────────────────────────────────────────
function Pagination({
    data,
    onPageChange,
}: {
    data: PaginatedProducts;
    onPageChange: (url: string) => void;
}) {
    if (data.last_page <= 1) return null;

    return (
        <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">
                Showing {data.from}–{data.to} of {data.total} products
            </p>
            <div className="flex items-center gap-1">
                {/* Prev */}
                <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    disabled={data.current_page === 1}
                    onClick={() => {
                        const prev = data.links.find((l) => l.label === '&laquo; Previous');
                        if (prev?.url) onPageChange(prev.url);
                    }}
                >
                    <ChevronLeft className="size-4" />
                </Button>

                {/* Page numbers */}
                {data.links
                    .filter((l) => !l.label.includes('&laquo;') && !l.label.includes('&raquo;'))
                    .map((link, i) => (
                        <Button
                            key={i}
                            variant={link.active ? 'default' : 'outline'}
                            size="icon"
                            className="size-8 text-xs"
                            disabled={!link.url || link.active}
                            onClick={() => link.url && onPageChange(link.url)}
                            dangerouslySetInnerHTML={{ __html: link.label }}
                        />
                    ))}

                {/* Next */}
                <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    disabled={data.current_page === data.last_page}
                    onClick={() => {
                        const next = data.links.find((l) => l.label === 'Next &raquo;');
                        if (next?.url) onPageChange(next.url);
                    }}
                >
                    <ChevronRightIcon className="size-4" />
                </Button>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// EditProductModal
// ─────────────────────────────────────────────
function EditProductModal({
    product,
    categories,
    brands,
    taxCategories,
    units,
    attributes,
    onClose,
}: {
    product: Product;
    categories: Category[];
    brands: Brand[];
    taxCategories: TaxCategory[];
    units: Unit[];
    attributes: Attribute[];
    onClose: () => void;
}) {
    const [formData, setFormData] = useState({
        name: product.name,
        product_code: product.product_code,
        description: product.description || '',
        category_id: product.category_id.toString(),
        brand_id: product.brand_id?.toString() || '',
        tax_category_id: product.tax_category_id.toString(),
        is_active: product.is_active,
        is_returnable: product.is_returnable,
    });

    const [variants, setVariants] = useState<EditVariant[]>(
        product.variants?.map((v) => ({
            id: v.id,
            variant_name: v.variant_name,
            sku: v.sku,
            unit_id: v.unit_id.toString(),
            net_quantity: v.net_quantity?.toString() || '',
            mrp: v.mrp.toString(),
            selling_price: v.selling_price.toString(),
            cost_price: v.cost_price.toString(),
            min_selling_price: v.min_selling_price?.toString() || '',
            status: Boolean(v.status),
            barcodes: v.barcodes?.length ? v.barcodes : [{ barcode: '', is_primary: true }],
            attributes: v.attributes || {},
            existingImages: (v.images || []).sort((a, b) => a.sort_order - b.sort_order),
            newImages: [],
            deletedImageIds: [],
        })) ?? [
            {
                variant_name: '',
                sku: '',
                unit_id: '',
                net_quantity: '',
                mrp: '',
                selling_price: '',
                cost_price: '',
                min_selling_price: '',
                status: true,
                barcodes: [{ barcode: '', is_primary: true }],
                attributes: {},
                existingImages: [],
                newImages: [],
                deletedImageIds: [],
            },
        ],
    );

    const [expandedVariants, setExpandedVariants] = useState<Set<number>>(new Set([0]));
    const [isSubmitting, setIsSubmitting] = useState(false);

    const toggleVariantExpand = (index: number) =>
        setExpandedVariants((prev) => {
            const next = new Set(prev);
            next.has(index) ? next.delete(index) : next.add(index);
            return next;
        });

    const updateVariant = (index: number, field: string, value: unknown) =>
        setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, [field]: value } : v)));

    const addVariant = () =>
        setVariants((prev) => [
            ...prev,
            {
                variant_name: '',
                sku: '',
                unit_id: '',
                net_quantity: '',
                mrp: '',
                selling_price: '',
                cost_price: '',
                min_selling_price: '',
                status: true,
                barcodes: [{ barcode: '', is_primary: true }],
                attributes: {},
                existingImages: [],
                newImages: [],
                deletedImageIds: [],
            },
        ]);

    const removeVariant = (index: number) => {
        if (variants.length > 1) setVariants((prev) => prev.filter((_, i) => i !== index));
    };

    const addBarcode = (vIdx: number) =>
        setVariants((prev) =>
            prev.map((v, i) =>
                i === vIdx ? { ...v, barcodes: [...v.barcodes, { barcode: '', is_primary: false }] } : v,
            ),
        );

    const updateBarcode = (vIdx: number, bIdx: number, field: string, value: unknown) =>
        setVariants((prev) =>
            prev.map((v, i) =>
                i === vIdx
                    ? { ...v, barcodes: v.barcodes.map((b, bi) => (bi === bIdx ? { ...b, [field]: value } : b)) }
                    : v,
            ),
        );

    const removeBarcode = (vIdx: number, bIdx: number) =>
        setVariants((prev) =>
            prev.map((v, i) =>
                i === vIdx && v.barcodes.length > 1
                    ? { ...v, barcodes: v.barcodes.filter((_, bi) => bi !== bIdx) }
                    : v,
            ),
        );

    const updateAttribute = (vIdx: number, attrId: number, valId: number) =>
        setVariants((prev) =>
            prev.map((v, i) =>
                i === vIdx ? { ...v, attributes: { ...v.attributes, [attrId]: valId } } : v,
            ),
        );

    // Image handlers
    const handleExistingImageDelete = (vIdx: number, imgId: number) =>
        setVariants((prev) =>
            prev.map((v, i) =>
                i === vIdx ? { ...v, deletedImageIds: [...v.deletedImageIds, imgId] } : v,
            ),
        );

    const handleNewImagesAdd = (vIdx: number, imgs: ProductImage[]) =>
        setVariants((prev) =>
            prev.map((v, i) => {
                if (i !== vIdx) return v;
                const base = v.existingImages.filter((x) => !v.deletedImageIds.includes(x.id)).length + v.newImages.length;
                const withOrder = imgs.map((img, j) => ({
                    ...img,
                    sort_order: base + j,
                    is_primary: base + j === 0,
                }));
                return { ...v, newImages: [...v.newImages, ...withOrder] };
            }),
        );

    const handleNewImageRemove = (vIdx: number, imgIdx: number) =>
        setVariants((prev) =>
            prev.map((v, i) => {
                if (i !== vIdx) return v;
                const next = v.newImages.filter((_, j) => j !== imgIdx);
                return { ...v, newImages: next };
            }),
        );

    const handleImagesReorder = (vIdx: number, allReordered: ProductImage[]) => {
        // allReordered is the merged/reordered list from the uploader
        // Split back into existing and new
        setVariants((prev) =>
            prev.map((v, i) => {
                if (i !== vIdx) return v;
                const existingIds = new Set(v.existingImages.map((x) => x.id));
                const nextExisting = allReordered
                    .filter((img) => !img._isNew && existingIds.has(img.id))
                    .map((img, order) => ({ ...img, sort_order: order, is_primary: order === 0 }));
                const nextNew = allReordered
                    .filter((img) => img._isNew)
                    .map((img, _order) => img); // keep order already set by reorder
                return { ...v, existingImages: nextExisting, newImages: nextNew };
            }),
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // 1. Submit product data (text fields + deleted_image_ids)
            await new Promise<void>((resolve, reject) => {
                router.put(
                    `/warehouse/products/${product.id}`,
                    {
                        ...formData,
                        category_id: Number(formData.category_id),
                        brand_id: formData.brand_id ? Number(formData.brand_id) : null,
                        tax_category_id: Number(formData.tax_category_id),
                        variants: variants.map((v) => ({
                            id: v.id ?? null,
                            variant_name: v.variant_name,
                            sku: v.sku,
                            unit_id: Number(v.unit_id),
                            net_quantity: v.net_quantity !== '' ? Number(v.net_quantity) : null,
                            mrp: Number(v.mrp),
                            selling_price: Number(v.selling_price),
                            cost_price: Number(v.cost_price),
                            min_selling_price: v.min_selling_price !== '' ? Number(v.min_selling_price) : null,
                            status: v.status,
                            barcodes: v.barcodes.filter((b) => b.barcode.trim() !== ''),
                            attributes: v.attributes,
                            deleted_image_ids: v.deletedImageIds,
                        })),
                    },
                    {
                        onSuccess: () => resolve(),
                        onError: () => reject(new Error('Product update failed')),
                    },
                );
            });

            // 2. Upload new images for each variant that has staged images
            // axios is used here (not fetch) because it automatically sends the
            // XSRF-TOKEN cookie as X-XSRF-TOKEN, satisfying Laravel's CSRF check.
            const axios = (await import('axios')).default;

            for (const variant of variants) {
                if (!variant.id || variant.newImages.length === 0) continue;

                const formDataImg = new FormData();
                for (const img of variant.newImages) {
                    if (img._file) formDataImg.append('images[]', img._file);
                }

                await axios.post(
                    `/warehouse/products/variants/${variant.id}/images`,
                    formDataImg,
                    { headers: { 'Content-Type': 'multipart/form-data' } },
                );
            }

            onClose();
        } catch {
            // errors are shown by Inertia
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50">
            <div className="min-h-screen px-4 py-8">
                <Card className="mx-auto max-w-6xl">
                    <CardHeader className="border-b">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-2xl">Edit Product</CardTitle>
                                <CardDescription>Update product information and variants</CardDescription>
                            </div>
                            <Button variant="ghost" size="icon" onClick={onClose}>
                                <X className="size-4" />
                            </Button>
                        </div>
                    </CardHeader>

                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-6 p-6">
                            {/* Basic Info */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">Basic Information</h3>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>Product Name *</Label>
                                        <Input
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Product Code *</Label>
                                        <Input
                                            value={formData.product_code}
                                            onChange={(e) => setFormData({ ...formData, product_code: e.target.value })}
                                            className="font-mono"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Category *</Label>
                                        <Select
                                            value={formData.category_id}
                                            onValueChange={(v) => setFormData({ ...formData, category_id: v })}
                                        >
                                            <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                                            <SelectContent>
                                                {categories.map((cat) => (
                                                    <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Brand</Label>
                                        <Select
                                            value={formData.brand_id || undefined}
                                            onValueChange={(v) => setFormData({ ...formData, brand_id: v })}
                                        >
                                            <SelectTrigger><SelectValue placeholder="Select Brand (Optional)" /></SelectTrigger>
                                            <SelectContent>
                                                {brands.map((b) => (
                                                    <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Tax Category *</Label>
                                        <Select
                                            value={formData.tax_category_id}
                                            onValueChange={(v) => setFormData({ ...formData, tax_category_id: v })}
                                        >
                                            <SelectTrigger><SelectValue placeholder="Select Tax" /></SelectTrigger>
                                            <SelectContent>
                                                {taxCategories.map((t) => (
                                                    <SelectItem key={t.id} value={t.id.toString()}>
                                                        {t.name} ({t.tax_percent}%)
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label>Description</Label>
                                        <Textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            rows={3}
                                        />
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="is_active"
                                                checked={formData.is_active}
                                                onCheckedChange={(c) => setFormData({ ...formData, is_active: c as boolean })}
                                            />
                                            <Label htmlFor="is_active">Active</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="is_returnable"
                                                checked={formData.is_returnable}
                                                onCheckedChange={(c) => setFormData({ ...formData, is_returnable: c as boolean })}
                                            />
                                            <Label htmlFor="is_returnable">Returnable</Label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Variants */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold">Product Variants</h3>
                                    <Button type="button" onClick={addVariant} size="sm">
                                        <Plus className="mr-2 size-4" />
                                        Add Variant
                                    </Button>
                                </div>

                                {variants.map((variant, vIndex) => (
                                    <Card key={vIndex}>
                                        <div className="flex items-center justify-between bg-muted/30 p-4">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                onClick={() => toggleVariantExpand(vIndex)}
                                                className="h-auto p-0"
                                            >
                                                {expandedVariants.has(vIndex) ? (
                                                    <ChevronDown className="mr-2 size-4" />
                                                ) : (
                                                    <ChevronRight className="mr-2 size-4" />
                                                )}
                                                <span className="font-medium">Variant {vIndex + 1}</span>
                                                {variant.variant_name && (
                                                    <span className="ml-2 text-muted-foreground">— {variant.variant_name}</span>
                                                )}
                                                {/* Image count badge */}
                                                {(() => {
                                                    const count =
                                                        variant.existingImages.filter((x) => !variant.deletedImageIds.includes(x.id)).length +
                                                        variant.newImages.length;
                                                    return count > 0 ? (
                                                        <Badge variant="secondary" className="ml-2 gap-1">
                                                            <ImageIcon className="size-3" />
                                                            {count}/4
                                                        </Badge>
                                                    ) : null;
                                                })()}
                                            </Button>
                                            {variants.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeVariant(vIndex)}
                                                    className="text-destructive hover:text-destructive"
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            )}
                                        </div>

                                        {expandedVariants.has(vIndex) && (
                                            <CardContent className="space-y-4 p-4">
                                                {/* Fields */}
                                                <div className="grid gap-3 md:grid-cols-3">
                                                    <div className="space-y-2">
                                                        <Label>Variant Name *</Label>
                                                        <Input
                                                            value={variant.variant_name}
                                                            onChange={(e) => updateVariant(vIndex, 'variant_name', e.target.value)}
                                                            required
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>SKU *</Label>
                                                        <Input
                                                            value={variant.sku}
                                                            onChange={(e) => updateVariant(vIndex, 'sku', e.target.value)}
                                                            className="font-mono"
                                                            required
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Unit *</Label>
                                                        <Select
                                                            value={variant.unit_id}
                                                            onValueChange={(v) => updateVariant(vIndex, 'unit_id', v)}
                                                        >
                                                            <SelectTrigger><SelectValue placeholder="Select Unit" /></SelectTrigger>
                                                            <SelectContent>
                                                                {units.map((u) => (
                                                                    <SelectItem key={u.id} value={u.id.toString()}>
                                                                        {u.name} ({u.symbol})
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Net Quantity</Label>
                                                        <Input
                                                            type="number" step="0.01"
                                                            value={variant.net_quantity}
                                                            onChange={(e) => updateVariant(vIndex, 'net_quantity', e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>MRP *</Label>
                                                        <Input
                                                            type="number" step="0.01"
                                                            value={variant.mrp}
                                                            onChange={(e) => updateVariant(vIndex, 'mrp', e.target.value)}
                                                            required
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Selling Price *</Label>
                                                        <Input
                                                            type="number" step="0.01"
                                                            value={variant.selling_price}
                                                            onChange={(e) => updateVariant(vIndex, 'selling_price', e.target.value)}
                                                            required
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Cost Price *</Label>
                                                        <Input
                                                            type="number" step="0.01"
                                                            value={variant.cost_price}
                                                            onChange={(e) => updateVariant(vIndex, 'cost_price', e.target.value)}
                                                            required
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Min Selling Price</Label>
                                                        <Input
                                                            type="number" step="0.01"
                                                            value={variant.min_selling_price}
                                                            onChange={(e) => updateVariant(vIndex, 'min_selling_price', e.target.value)}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Images */}
                                                <div className="space-y-2">
                                                    <Label className="flex items-center gap-2">
                                                        <ImageIcon className="size-4" />
                                                        Images
                                                        <span className="font-normal text-muted-foreground">(max 4 per variant)</span>
                                                    </Label>
                                                    <VariantImageUploader
                                                        existingImages={variant.existingImages}
                                                        newImages={variant.newImages}
                                                        deletedImageIds={variant.deletedImageIds}
                                                        onExistingDelete={(id) => handleExistingImageDelete(vIndex, id)}
                                                        onNewAdd={(imgs) => handleNewImagesAdd(vIndex, imgs)}
                                                        onNewRemove={(idx) => handleNewImageRemove(vIndex, idx)}
                                                        onReorder={(all) => handleImagesReorder(vIndex, all)}
                                                    />
                                                </div>

                                                {/* Barcodes */}
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <Label className="flex items-center gap-2">
                                                            <BarcodeIcon className="size-4" />
                                                            Barcodes
                                                        </Label>
                                                        <Button type="button" variant="link" size="sm" onClick={() => addBarcode(vIndex)}>
                                                            + Add Barcode
                                                        </Button>
                                                    </div>
                                                    {variant.barcodes.map((bc, bIdx) => (
                                                        <div key={bIdx} className="flex items-center gap-2">
                                                            <Input
                                                                value={bc.barcode}
                                                                onChange={(e) => updateBarcode(vIndex, bIdx, 'barcode', e.target.value)}
                                                                className="flex-1 font-mono"
                                                                placeholder="Enter barcode"
                                                            />
                                                            <div className="flex items-center space-x-2">
                                                                <Checkbox
                                                                    id={`primary-${vIndex}-${bIdx}`}
                                                                    checked={bc.is_primary}
                                                                    onCheckedChange={(c) => updateBarcode(vIndex, bIdx, 'is_primary', c)}
                                                                />
                                                                <Label htmlFor={`primary-${vIndex}-${bIdx}`} className="text-xs text-muted-foreground">
                                                                    Primary
                                                                </Label>
                                                            </div>
                                                            {variant.barcodes.length > 1 && (
                                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeBarcode(vIndex, bIdx)}>
                                                                    <X className="size-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Attributes */}
                                                {attributes.length > 0 && (
                                                    <div className="space-y-2">
                                                        <Label>Attributes</Label>
                                                        <div className="grid gap-3 md:grid-cols-2">
                                                            {attributes.map((attr) => (
                                                                <div key={attr.id} className="space-y-1.5">
                                                                    <Label className="text-xs text-muted-foreground">{attr.name}</Label>
                                                                    <Select
                                                                        value={variant.attributes[attr.id]?.toString() || ''}
                                                                        onValueChange={(v) => updateAttribute(vIndex, attr.id, Number(v))}
                                                                    >
                                                                        <SelectTrigger><SelectValue placeholder={`Select ${attr.name}`} /></SelectTrigger>
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

                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`status-${vIndex}`}
                                                        checked={variant.status}
                                                        onCheckedChange={(c) => updateVariant(vIndex, 'status', c)}
                                                    />
                                                    <Label htmlFor={`status-${vIndex}`}>Variant Active</Label>
                                                </div>
                                            </CardContent>
                                        )}
                                    </Card>
                                ))}
                            </div>
                        </CardContent>

                        <div className="flex justify-end gap-3 border-t p-6">
                            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <div className="mr-2 size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Saving…
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 size-4" />
                                        Update Product
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// Products (Main Component)
// ─────────────────────────────────────────────
export default function Products({
    products,
    categories = [],
    brands = [],
    taxCategories = [],
    units = [],
    attributes = [],
    filters,
}: Props) {
    const [view, setView] = useState<'list' | 'quick'>('list');
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [expandedProducts, setExpandedProducts] = useState<Set<number>>(new Set());
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedTaxCategory, setSelectedTaxCategory] = useState('');
    const [quickProducts, setQuickProducts] = useState<QuickProduct[]>([]);

    // Debounced search via Inertia
    const handleSearch = (q: string) => {
        setSearchQuery(q);
        router.get('/warehouse/products', { search: q, per_page: filters.per_page }, {
            preserveState: true,
            replace: true,
        });
    };

    const handlePageChange = (url: string) => {
        router.visit(url, { preserveState: true });
    };

    const handlePerPageChange = (value: string) => {
        router.get('/warehouse/products', { search: searchQuery, per_page: Number(value) }, {
            preserveState: true,
            replace: true,
        });
    };

    const toggleExpand = (id: number) =>
        setExpandedProducts((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

    // ── Quick Add helpers ────────────────────────────────────────────────────
    const addQuickProduct = () => {
        const id = Date.now().toString();
        setQuickProducts((prev) => [
            ...prev,
            {
                id,
                name: '',
                brand_id: '',
                variants: [{
                    id: `${id}-v1`,
                    variant_name: '',
                    sku: '',
                    unit_id: '',
                    net_quantity: '',
                    mrp: '',
                    selling_price: '',
                    cost_price: '',
                    min_selling_price: '',
                    barcodes: [{ barcode: '', is_primary: true }],
                }],
            },
        ]);
    };

    const removeQuickProduct = (productId: string) =>
        setQuickProducts((prev) => prev.filter((p) => p.id !== productId));

    const updateQuickProduct = (productId: string, field: string, value: unknown) =>
        setQuickProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, [field]: value } : p)));

    const addQuickVariant = (productId: string) =>
        setQuickProducts((prev) =>
            prev.map((p) =>
                p.id === productId
                    ? {
                          ...p,
                          variants: [
                              ...p.variants,
                              {
                                  id: `${productId}-v${p.variants.length + 1}`,
                                  variant_name: '',
                                  sku: '',
                                  unit_id: '',
                                  net_quantity: '',
                                  mrp: '',
                                  selling_price: '',
                                  cost_price: '',
                                  min_selling_price: '',
                                  barcodes: [{ barcode: '', is_primary: true }],
                              },
                          ],
                      }
                    : p,
            ),
        );

    const updateQuickVariant = (productId: string, variantId: string, field: string, value: unknown) =>
        setQuickProducts((prev) =>
            prev.map((p) =>
                p.id === productId
                    ? { ...p, variants: p.variants.map((v) => (v.id === variantId ? { ...v, [field]: value } : v)) }
                    : p,
            ),
        );

    const removeQuickVariant = (productId: string, variantId: string) =>
        setQuickProducts((prev) =>
            prev.map((p) =>
                p.id === productId ? { ...p, variants: p.variants.filter((v) => v.id !== variantId) } : p,
            ),
        );

    const addQuickBarcode = (productId: string, variantId: string) =>
        setQuickProducts((prev) =>
            prev.map((p) =>
                p.id === productId
                    ? {
                          ...p,
                          variants: p.variants.map((v) =>
                              v.id === variantId
                                  ? { ...v, barcodes: [...v.barcodes, { barcode: '', is_primary: false }] }
                                  : v,
                          ),
                      }
                    : p,
            ),
        );

    const updateQuickBarcode = (productId: string, variantId: string, bIdx: number, field: string, value: unknown) =>
        setQuickProducts((prev) =>
            prev.map((p) =>
                p.id === productId
                    ? {
                          ...p,
                          variants: p.variants.map((v) =>
                              v.id === variantId
                                  ? {
                                        ...v,
                                        barcodes: v.barcodes.map((b, i) =>
                                            i === bIdx ? { ...b, [field]: value } : b,
                                        ),
                                    }
                                  : v,
                          ),
                      }
                    : p,
            ),
        );

    const removeQuickBarcode = (productId: string, variantId: string, bIdx: number) =>
        setQuickProducts((prev) =>
            prev.map((p) =>
                p.id === productId
                    ? {
                          ...p,
                          variants: p.variants.map((v) =>
                              v.id === variantId && v.barcodes.length > 1
                                  ? { ...v, barcodes: v.barcodes.filter((_, i) => i !== bIdx) }
                                  : v,
                          ),
                      }
                    : p,
            ),
        );

    const handleQuickSubmit = () => {
        if (!selectedCategory || !selectedTaxCategory) {
            alert('Please select category and tax category');
            return;
        }

        router.post(
            '/warehouse/products/quick',
            {
                category_id: Number(selectedCategory),
                tax_category_id: Number(selectedTaxCategory),
                products: quickProducts.map((p) => ({
                    name: p.name,
                    brand_id: p.brand_id ? Number(p.brand_id) : null,
                    variants: p.variants.map((v) => ({
                        variant_name: v.variant_name,
                        sku: v.sku,
                        unit_id: Number(v.unit_id),
                        net_quantity: v.net_quantity !== '' ? Number(v.net_quantity) : null,
                        mrp: Number(v.mrp),
                        selling_price: Number(v.selling_price),
                        cost_price: Number(v.cost_price),
                        min_selling_price: v.min_selling_price !== '' ? Number(v.min_selling_price) : null,
                        barcodes: v.barcodes.filter((b) => b.barcode.trim() !== ''),
                    })),
                })),
            },
            {
                onSuccess: () => {
                    setView('list');
                    setQuickProducts([]);
                    setSelectedCategory('');
                    setSelectedTaxCategory('');
                },
            },
        );
    };

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Products" />

            {view === 'list' && (
                <div className="flex h-full flex-1 flex-col gap-4 p-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-2xl">Products</CardTitle>
                                    <CardDescription>Manage your product inventory</CardDescription>
                                </div>
                                <Button onClick={() => setView('quick')}>
                                    <Zap className="mr-2 size-4" />
                                    Quick Add Products
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-3">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        placeholder="Search products by name or code…"
                                        value={searchQuery}
                                        onChange={(e) => handleSearch(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                                <Select value={String(filters.per_page)} onValueChange={handlePerPageChange}>
                                    <SelectTrigger className="w-32">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[10, 20, 50, 100].map((n) => (
                                            <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="flex-1 overflow-hidden">
                        <div className="h-full overflow-auto">
                            <Table>
                                <TableHeader className="sticky top-0 bg-muted/50">
                                    <TableRow>
                                        <TableHead className="w-12"></TableHead>
                                        <TableHead>Code</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Brand</TableHead>
                                        <TableHead>Variants</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {products.data.length > 0 ? (
                                        products.data.map((product) => (
                                            <React.Fragment key={product.id}>
                                                <TableRow className="hover:bg-accent/50">
                                                    <TableCell>
                                                        {product.variants && product.variants.length > 0 && (
                                                            <Button variant="ghost" size="icon" onClick={() => toggleExpand(product.id)}>
                                                                {expandedProducts.has(product.id) ? (
                                                                    <ChevronDown className="size-4" />
                                                                ) : (
                                                                    <ChevronRight className="size-4" />
                                                                )}
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="font-mono text-sm">{product.product_code}</TableCell>
                                                    <TableCell className="font-medium">{product.name}</TableCell>
                                                    <TableCell className="text-muted-foreground">{product.category?.name || '-'}</TableCell>
                                                    <TableCell className="text-muted-foreground">{product.brand?.name || '-'}</TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        {product.variants?.length || 0} variant(s)
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={product.is_active ? 'default' : 'destructive'}>
                                                            {product.is_active ? 'Active' : 'Inactive'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="icon" onClick={() => setEditingProduct(product)}>
                                                            <Edit2 className="size-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>

                                                {expandedProducts.has(product.id) && product.variants && product.variants.length > 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={8} className="bg-muted/30 p-0">
                                                            <div className="p-4">
                                                                <Table>
                                                                    <TableHeader>
                                                                        <TableRow className="text-xs">
                                                                            <TableHead>Variant</TableHead>
                                                                            <TableHead>SKU</TableHead>
                                                                            <TableHead>Unit</TableHead>
                                                                            <TableHead className="text-right">Qty</TableHead>
                                                                            <TableHead className="text-right">MRP</TableHead>
                                                                            <TableHead className="text-right">Selling</TableHead>
                                                                            <TableHead className="text-right">Cost</TableHead>
                                                                            <TableHead>Images</TableHead>
                                                                            <TableHead className="text-center">Status</TableHead>
                                                                        </TableRow>
                                                                    </TableHeader>
                                                                    <TableBody>
                                                                        {product.variants.map((variant) => (
                                                                            <TableRow key={variant.id} className="border-b last:border-0">
                                                                                <TableCell className="text-sm">
                                                                                    <div className="flex gap-2">
                                                                                        {variant.variant_name}
                                                                                        {variant.barcodes && variant.barcodes.length > 0 && (
                                                                                            <div className="flex flex-wrap gap-1">
                                                                                                {variant.barcodes.map((barcode, bIdx) => (
                                                                                                    <Badge key={bIdx} variant="outline" className="text-xs font-mono">
                                                                                                        <BarcodeIcon className="mr-1 size-3" />
                                                                                                        {barcode.barcode}
                                                                                                    </Badge>
                                                                                                ))}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </TableCell>
                                                                                <TableCell className="font-mono text-sm">{variant.sku}</TableCell>
                                                                                <TableCell className="text-sm">
                                                                                    {units.find((u) => u.id === Number(variant.unit_id))?.symbol || '-'}
                                                                                </TableCell>
                                                                                <TableCell className="text-right text-sm">{variant.net_quantity}</TableCell>
                                                                                <TableCell className="text-right text-sm">₹{Number(variant.mrp).toFixed(2)}</TableCell>
                                                                                <TableCell className="text-right text-sm">₹{Number(variant.selling_price).toFixed(2)}</TableCell>
                                                                                <TableCell className="text-right text-sm">₹{Number(variant.cost_price).toFixed(2)}</TableCell>
                                                                                <TableCell>
                                                                                    <div className="flex gap-1">
                                                                                        {variant.images && variant.images.length > 0 ? (
                                                                                            variant.images
                                                                                                .sort((a, b) => a.sort_order - b.sort_order)
                                                                                                .slice(0, 4)
                                                                                                .map((img) => (
                                                                                                    <div
                                                                                                        key={img.id}
                                                                                                        className={`size-8 overflow-hidden rounded border-2 ${img.is_primary ? 'border-primary' : 'border-border'}`}
                                                                                                    >
                                                                                                        <img
                                                                                                            src={img.url}
                                                                                                            alt=""
                                                                                                            className="size-full object-cover"
                                                                                                        />
                                                                                                    </div>
                                                                                                ))
                                                                                        ) : (
                                                                                            <span className="text-xs text-muted-foreground">—</span>
                                                                                        )}
                                                                                    </div>
                                                                                </TableCell>
                                                                                <TableCell className="text-center">
                                                                                    <div className={`mx-auto size-2 rounded-full ${variant.status ? 'bg-green-500' : 'bg-red-500'}`} />
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
                                            <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                                                {searchQuery ? 'No products match your search.' : 'No products yet.'}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        <Pagination data={products} onPageChange={handlePageChange} />
                    </Card>
                </div>
            )}

            {view === 'quick' && (
                <div className="flex h-full flex-1 flex-col gap-4 p-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-2xl">Quick Add Products</CardTitle>
                                    <CardDescription>Add multiple products of a single category at once</CardDescription>
                                </div>
                                <Button variant="outline" onClick={() => setView('list')}>
                                    <X className="mr-2 size-4" />
                                    Cancel
                                </Button>
                            </div>
                        </CardHeader>
                    </Card>

                    <Card className="flex-1 overflow-hidden">
                        <CardHeader className="border-b">
                            <div className="flex gap-2">
                                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((cat) => (
                                            <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={selectedTaxCategory} onValueChange={setSelectedTaxCategory}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select Tax" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {taxCategories.map((tax) => (
                                            <SelectItem key={tax.id} value={tax.id.toString()}>
                                                {tax.name} ({tax.tax_percent}%)
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button onClick={addQuickProduct} disabled={!selectedCategory || !selectedTaxCategory} size="sm">
                                    <Plus className="mr-2 size-4" />
                                    Add Product
                                </Button>
                            </div>
                        </CardHeader>

                        <div className="h-full overflow-auto p-4">
                            {quickProducts.length === 0 ? (
                                <div className="flex h-48 items-center justify-center text-muted-foreground">
                                    <div className="text-center">
                                        <PackagePlus className="mx-auto mb-2 size-12 opacity-50" />
                                        <p>No products added yet</p>
                                        <p className="text-sm">Click "Add Product" to start</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {quickProducts.map((product) => (
                                        <Card key={product.id} className="bg-gray-50">
                                            <CardContent className="space-y-3 p-4">
                                                <div className="flex items-start gap-3">
                                                    <div className="grid flex-1 gap-3 md:grid-cols-2">
                                                        <div className="space-y-2">
                                                            <Label>Product Name *</Label>
                                                            <Input
                                                                value={product.name}
                                                                onChange={(e) => updateQuickProduct(product.id, 'name', e.target.value)}
                                                                placeholder="Enter product name"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>Brand</Label>
                                                            <Select
                                                                value={product.brand_id || undefined}
                                                                onValueChange={(v) => updateQuickProduct(product.id, 'brand_id', v)}
                                                            >
                                                                <SelectTrigger className="w-full">
                                                                    <SelectValue placeholder="Select Brand (Optional)" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {brands.map((b) => (
                                                                        <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => removeQuickProduct(product.id)}
                                                        className="text-destructive"
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </Button>
                                                </div>

                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <Label>Variants</Label>
                                                        <Button type="button" variant="link" size="sm" onClick={() => addQuickVariant(product.id)}>
                                                            + Add Variant
                                                        </Button>
                                                    </div>

                                                    <div className="space-y-3">
                                                        {product.variants.map((variant, vIdx) => (
                                                            <Card key={variant.id} className="bg-gray-50">
                                                                <CardContent className="space-y-3 p-3">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-sm font-medium">Variant {vIdx + 1}</span>
                                                                        {product.variants.length > 1 && (
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                onClick={() => removeQuickVariant(product.id, variant.id)}
                                                                                className="h-8 w-8 text-destructive"
                                                                            >
                                                                                <X className="size-4" />
                                                                            </Button>
                                                                        )}
                                                                    </div>

                                                                    <div className="grid gap-2 md:grid-cols-4">
                                                                        <div className="space-y-1">
                                                                            <Label className="text-xs">Variant *</Label>
                                                                            <Input value={variant.variant_name} onChange={(e) => updateQuickVariant(product.id, variant.id, 'variant_name', e.target.value)} placeholder="1kg" className="h-9" />
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <Label className="text-xs">SKU *</Label>
                                                                            <Input value={variant.sku} onChange={(e) => updateQuickVariant(product.id, variant.id, 'sku', e.target.value)} placeholder="SKU" className="h-9 font-mono" />
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <Label className="text-xs">Unit *</Label>
                                                                            <Select value={variant.unit_id} onValueChange={(v) => updateQuickVariant(product.id, variant.id, 'unit_id', v)}>
                                                                                <SelectTrigger className="w-full"><SelectValue placeholder="Unit" /></SelectTrigger>
                                                                                <SelectContent>
                                                                                    {units.map((u) => <SelectItem key={u.id} value={u.id.toString()}>{u.symbol} ({u.name})</SelectItem>)}
                                                                                </SelectContent>
                                                                            </Select>
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <Label className="text-xs">Qty</Label>
                                                                            <Input type="number" step="0.01" value={variant.net_quantity} onChange={(e) => updateQuickVariant(product.id, variant.id, 'net_quantity', e.target.value)} placeholder="1" className="h-9" />
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <Label className="text-xs">MRP *</Label>
                                                                            <Input type="number" step="0.01" value={variant.mrp} onChange={(e) => updateQuickVariant(product.id, variant.id, 'mrp', e.target.value)} placeholder="0.00" className="h-9" />
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <Label className="text-xs">Selling *</Label>
                                                                            <Input type="number" step="0.01" value={variant.selling_price} onChange={(e) => updateQuickVariant(product.id, variant.id, 'selling_price', e.target.value)} placeholder="0.00" className="h-9" />
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <Label className="text-xs">Min Selling</Label>
                                                                            <Input type="number" step="0.01" value={variant.min_selling_price} onChange={(e) => updateQuickVariant(product.id, variant.id, 'min_selling_price', e.target.value)} placeholder="0.00" className="h-9" />
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <Label className="text-xs">Cost *</Label>
                                                                            <Input type="number" step="0.01" value={variant.cost_price} onChange={(e) => updateQuickVariant(product.id, variant.id, 'cost_price', e.target.value)} placeholder="0.00" className="h-9" />
                                                                        </div>
                                                                    </div>

                                                                    {/* Barcodes */}
                                                                    <div className="space-y-2">
                                                                        <div className="flex items-center justify-between">
                                                                            <Label className="text-xs">Barcodes</Label>
                                                                            <Button type="button" variant="link" size="sm" onClick={() => addQuickBarcode(product.id, variant.id)} className="h-auto p-0 text-xs">
                                                                                + Add Barcode
                                                                            </Button>
                                                                        </div>
                                                                        {variant.barcodes.map((barcode, bIdx) => (
                                                                            <div key={bIdx} className="flex items-center gap-2">
                                                                                <Input value={barcode.barcode} onChange={(e) => updateQuickBarcode(product.id, variant.id, bIdx, 'barcode', e.target.value)} placeholder="Enter barcode" className="h-9 flex-1 font-mono" />
                                                                                <div className="flex items-center space-x-1.5">
                                                                                    <Checkbox checked={barcode.is_primary} onCheckedChange={(c) => updateQuickBarcode(product.id, variant.id, bIdx, 'is_primary', c)} />
                                                                                    <Label className="text-xs text-muted-foreground">Primary</Label>
                                                                                </div>
                                                                                {variant.barcodes.length > 1 && (
                                                                                    <Button variant="ghost" size="icon" onClick={() => removeQuickBarcode(product.id, variant.id, bIdx)} className="h-9 w-9">
                                                                                        <X className="size-4" />
                                                                                    </Button>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </CardContent>
                                                            </Card>
                                                        ))}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Card>

                    {quickProducts.length > 0 && (
                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => { setQuickProducts([]); setView('list'); }}>
                                Cancel
                            </Button>
                            <Button onClick={handleQuickSubmit}>
                                <Save className="mr-2 size-4" />
                                Save All Products
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {editingProduct && (
                <EditProductModal
                    product={editingProduct}
                    categories={categories}
                    brands={brands}
                    taxCategories={taxCategories}
                    units={units}
                    attributes={attributes}
                    onClose={() => setEditingProduct(null)}
                />
            )}
        </AppLayout>
    );
}
