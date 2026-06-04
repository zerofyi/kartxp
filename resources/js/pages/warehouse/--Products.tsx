import { Head, router } from '@inertiajs/react';
import React, { useState } from 'react';
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
} from 'lucide-react';

import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
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
import warehouse from '@/routes/warehouse';

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
    products: Product[];
    categories: Category[];
    brands: Brand[];
    taxCategories: TaxCategory[];
    units: Unit[];
    attributes: Attribute[];
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
};

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
            status: v.status,
            barcodes: v.barcodes?.length ? v.barcodes : [{ barcode: '', is_primary: true }],
            attributes: v.attributes || {},
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
            },
        ],
    );

    const [expandedVariants, setExpandedVariants] = useState<Set<number>>(new Set([0]));

    const toggleVariantExpand = (index: number) => {
        setExpandedVariants((prev) => {
            const next = new Set(prev);
            next.has(index) ? next.delete(index) : next.add(index);
            return next;
        });
    };

    const updateVariant = (index: number, field: string, value: unknown) => {
        setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, [field]: value } : v)));
    };

    const addVariant = () => {
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
            },
        ]);
    };

    const removeVariant = (index: number) => {
        if (variants.length > 1) {
            setVariants((prev) => prev.filter((_, i) => i !== index));
        }
    };

    const addBarcode = (vIdx: number) => {
        setVariants((prev) =>
            prev.map((v, i) =>
                i === vIdx ? { ...v, barcodes: [...v.barcodes, { barcode: '', is_primary: false }] } : v,
            ),
        );
    };

    const updateBarcode = (vIdx: number, bIdx: number, field: string, value: unknown) => {
        setVariants((prev) =>
            prev.map((v, i) =>
                i === vIdx
                    ? { ...v, barcodes: v.barcodes.map((b, bi) => (bi === bIdx ? { ...b, [field]: value } : b)) }
                    : v,
            ),
        );
    };

    const removeBarcode = (vIdx: number, bIdx: number) => {
        setVariants((prev) =>
            prev.map((v, i) =>
                i === vIdx && v.barcodes.length > 1
                    ? { ...v, barcodes: v.barcodes.filter((_, bi) => bi !== bIdx) }
                    : v,
            ),
        );
    };

    const updateAttribute = (vIdx: number, attrId: number, valId: number) => {
        setVariants((prev) =>
            prev.map((v, i) =>
                i === vIdx ? { ...v, attributes: { ...v.attributes, [attrId]: valId } } : v,
            ),
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

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
                })),
            },
            { onSuccess: () => onClose() },
        );
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
                                        <Label htmlFor="name">Product Name *</Label>
                                        <Input
                                            id="name"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="product_code">Product Code *</Label>
                                        <Input
                                            id="product_code"
                                            value={formData.product_code}
                                            onChange={(e) => setFormData({ ...formData, product_code: e.target.value })}
                                            className="font-mono"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="category">Category *</Label>
                                        <Select
                                            value={formData.category_id}
                                            onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {categories.map((cat) => (
                                                    <SelectItem key={cat.id} value={cat.id.toString()}>
                                                        {cat.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="brand">Brand</Label>
                                        <Select
                                            value={formData.brand_id || undefined}
                                            onValueChange={(value) => setFormData({ ...formData, brand_id: value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Brand (Optional)" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {brands.map((brand) => (
                                                    <SelectItem key={brand.id} value={brand.id.toString()}>
                                                        {brand.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="tax">Tax Category *</Label>
                                        <Select
                                            value={formData.tax_category_id}
                                            onValueChange={(value) => setFormData({ ...formData, tax_category_id: value })}
                                        >
                                            <SelectTrigger>
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
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="description">Description</Label>
                                        <Textarea
                                            id="description"
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
                                                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked as boolean })}
                                            />
                                            <Label htmlFor="is_active">Active</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="is_returnable"
                                                checked={formData.is_returnable}
                                                onCheckedChange={(checked) => setFormData({ ...formData, is_returnable: checked as boolean })}
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
                                                            onValueChange={(value) => updateVariant(vIndex, 'unit_id', value)}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select Unit" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {units.map((unit) => (
                                                                    <SelectItem key={unit.id} value={unit.id.toString()}>
                                                                        {unit.name} ({unit.symbol})
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Net Quantity</Label>
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            value={variant.net_quantity}
                                                            onChange={(e) => updateVariant(vIndex, 'net_quantity', e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>MRP *</Label>
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            value={variant.mrp}
                                                            onChange={(e) => updateVariant(vIndex, 'mrp', e.target.value)}
                                                            required
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Selling Price *</Label>
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            value={variant.selling_price}
                                                            onChange={(e) => updateVariant(vIndex, 'selling_price', e.target.value)}
                                                            required
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Cost Price *</Label>
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            value={variant.cost_price}
                                                            onChange={(e) => updateVariant(vIndex, 'cost_price', e.target.value)}
                                                            required
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Min Selling Price</Label>
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            value={variant.min_selling_price}
                                                            onChange={(e) => updateVariant(vIndex, 'min_selling_price', e.target.value)}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Barcodes */}
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <Label className="flex items-center gap-2">
                                                            <BarcodeIcon className="size-4" />
                                                            Barcodes
                                                        </Label>
                                                        <Button
                                                            type="button"
                                                            variant="link"
                                                            size="sm"
                                                            onClick={() => addBarcode(vIndex)}
                                                        >
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
                                                                    onCheckedChange={(checked) =>
                                                                        updateBarcode(vIndex, bIdx, 'is_primary', checked)
                                                                    }
                                                                />
                                                                <Label
                                                                    htmlFor={`primary-${vIndex}-${bIdx}`}
                                                                    className="text-xs text-muted-foreground"
                                                                >
                                                                    Primary
                                                                </Label>
                                                            </div>
                                                            {variant.barcodes.length > 1 && (
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => removeBarcode(vIndex, bIdx)}
                                                                >
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
                                                                        onValueChange={(value) =>
                                                                            updateAttribute(vIndex, attr.id, Number(value))
                                                                        }
                                                                    >
                                                                        <SelectTrigger>
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

                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`status-${vIndex}`}
                                                        checked={variant.status}
                                                        onCheckedChange={(checked) => updateVariant(vIndex, 'status', checked)}
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
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit">
                                <Save className="mr-2 size-4" />
                                Update Product
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
    products = [],
    categories = [],
    brands = [],
    taxCategories = [],
    units = [],
    attributes = [],
}: Props) {
    const [view, setView] = useState<'list' | 'quick'>('list');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedProducts, setExpandedProducts] = useState<Set<number>>(new Set());
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedTaxCategory, setSelectedTaxCategory] = useState('');
    const [quickProducts, setQuickProducts] = useState<QuickProduct[]>([]);

    const filteredProducts = products.filter(
        (p) =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.product_code.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    const toggleExpand = (id: number) => {
        setExpandedProducts((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const addQuickProduct = () => {
        const id = Date.now().toString();
        setQuickProducts((prev) => [
            ...prev,
            {
                id,
                name: '',
                brand_id: '',
                variants: [
                    {
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
                    },
                ],
            },
        ]);
    };

    const removeQuickProduct = (productId: string) => {
        setQuickProducts((prev) => prev.filter((p) => p.id !== productId));
    };

    const updateQuickProduct = (productId: string, field: string, value: unknown) => {
        setQuickProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, [field]: value } : p)));
    };

    const addQuickVariant = (productId: string) => {
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
    };

    const updateQuickVariant = (productId: string, variantId: string, field: string, value: unknown) => {
        setQuickProducts((prev) =>
            prev.map((p) =>
                p.id === productId
                    ? { ...p, variants: p.variants.map((v) => (v.id === variantId ? { ...v, [field]: value } : v)) }
                    : p,
            ),
        );
    };

    const removeQuickVariant = (productId: string, variantId: string) => {
        setQuickProducts((prev) =>
            prev.map((p) =>
                p.id === productId ? { ...p, variants: p.variants.filter((v) => v.id !== variantId) } : p,
            ),
        );
    };

    const addQuickBarcode = (productId: string, variantId: string) => {
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
    };

    const updateQuickBarcode = (productId: string, variantId: string, barcodeIdx: number, field: string, value: unknown) => {
        setQuickProducts((prev) =>
            prev.map((p) =>
                p.id === productId
                    ? {
                          ...p,
                          variants: p.variants.map((v) =>
                              v.id === variantId
                                  ? {
                                        ...v,
                                        barcodes: v.barcodes.map((b, idx) =>
                                            idx === barcodeIdx ? { ...b, [field]: value } : b,
                                        ),
                                    }
                                  : v,
                          ),
                      }
                    : p,
            ),
        );
    };

    const removeQuickBarcode = (productId: string, variantId: string, barcodeIdx: number) => {
        setQuickProducts((prev) =>
            prev.map((p) =>
                p.id === productId
                    ? {
                          ...p,
                          variants: p.variants.map((v) =>
                              v.id === variantId && v.barcodes.length > 1
                                  ? { ...v, barcodes: v.barcodes.filter((_, idx) => idx !== barcodeIdx) }
                                  : v,
                          ),
                      }
                    : p,
            ),
        );
    };

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
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search products..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9"
                                />
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
                                    {filteredProducts.length > 0 ? (
                                        filteredProducts.map((product) => (
                                            <React.Fragment key={product.id}>
                                                <TableRow className="hover:bg-accent/50">
                                                    <TableCell>
                                                        {product.variants && product.variants.length > 0 && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => toggleExpand(product.id)}
                                                            >
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
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setEditingProduct(product)}
                                                        >
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
                                                                            <TableHead className="text-center">Status</TableHead>
                                                                        </TableRow>
                                                                    </TableHeader>
                                                                    <TableBody>
                                                                        {product.variants.map((variant) => (
                                                                            <TableRow key={variant.id} className="border-b last:border-0">
                                                                                <TableCell className="text-sm">
                                                                                    <div className='flex gap-2'>{variant.variant_name}
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
                                                                                <TableCell className="text-right text-sm">
                                                                                    ₹{Number(variant.mrp).toFixed(2)}
                                                                                </TableCell>
                                                                                <TableCell className="text-right text-sm">
                                                                                    ₹{Number(variant.selling_price).toFixed(2)}
                                                                                </TableCell>
                                                                                <TableCell className="text-right text-sm">
                                                                                    ₹{Number(variant.cost_price).toFixed(2)}
                                                                                </TableCell>
                                                                                <TableCell className="text-center">
                                                                                    <div
                                                                                        className={`mx-auto size-2 rounded-full ${variant.status ? 'bg-green-500' : 'bg-red-500'}`}
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
                                            <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                                {searchQuery ? 'No products match your search.' : 'No products yet.'}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
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
                                    <SelectTrigger className='w-full'>
                                        <SelectValue placeholder="Select Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((cat) => (
                                            <SelectItem key={cat.id} value={cat.id.toString()}>
                                                {cat.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={selectedTaxCategory} onValueChange={setSelectedTaxCategory}>
                                    <SelectTrigger className='w-full'>
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
                                        <Card key={product.id} className='bg-gray-50'>
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
                                                                onValueChange={(value) => updateQuickProduct(product.id, 'brand_id', value)}
                                                            >
                                                                <SelectTrigger className='w-full'>
                                                                    <SelectValue placeholder="Select Brand (Optional)" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {brands.map((brand) => (
                                                                        <SelectItem key={brand.id} value={brand.id.toString()}>
                                                                            {brand.name}
                                                                        </SelectItem>
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
                                                        <Button
                                                            type="button"
                                                            variant="link"
                                                            size="sm"
                                                            onClick={() => addQuickVariant(product.id)}
                                                        >
                                                            + Add Variant
                                                        </Button>
                                                    </div>

                                                    <div className="space-y-3">
                                                        {product.variants.map((variant, vIdx) => (
                                                            <Card key={variant.id} className='bg-gray-50'>
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
                                                                            <Input
                                                                                value={variant.variant_name}
                                                                                onChange={(e) =>
                                                                                    updateQuickVariant(product.id, variant.id, 'variant_name', e.target.value)
                                                                                }
                                                                                placeholder="1kg"
                                                                                className="h-9"
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <Label className="text-xs">SKU *</Label>
                                                                            <Input
                                                                                value={variant.sku}
                                                                                onChange={(e) =>
                                                                                    updateQuickVariant(product.id, variant.id, 'sku', e.target.value)
                                                                                }
                                                                                placeholder="SKU"
                                                                                className="h-9 font-mono"
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <Label className="text-xs">Unit *</Label>
                                                                            <Select
                                                                                value={variant.unit_id}
                                                                                onValueChange={(value) =>
                                                                                    updateQuickVariant(product.id, variant.id, 'unit_id', value)
                                                                                }
                                                                            >
                                                                                <SelectTrigger className='w-full'>
                                                                                    <SelectValue placeholder="Unit" />
                                                                                </SelectTrigger>
                                                                                <SelectContent>
                                                                                    {units.map((unit) => (
                                                                                        <SelectItem key={unit.id} value={unit.id.toString()}>
                                                                                            {unit.symbol} ({unit.name})
                                                                                        </SelectItem>
                                                                                    ))}
                                                                                </SelectContent>
                                                                            </Select>
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <Label className="text-xs">Qty</Label>
                                                                            <Input
                                                                                type="number"
                                                                                step="0.01"
                                                                                value={variant.net_quantity}
                                                                                onChange={(e) =>
                                                                                    updateQuickVariant(product.id, variant.id, 'net_quantity', e.target.value)
                                                                                }
                                                                                placeholder="1"
                                                                                className="h-9"
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <Label className="text-xs">MRP *</Label>
                                                                            <Input
                                                                                type="number"
                                                                                step="0.01"
                                                                                value={variant.mrp}
                                                                                onChange={(e) =>
                                                                                    updateQuickVariant(product.id, variant.id, 'mrp', e.target.value)
                                                                                }
                                                                                placeholder="0.00"
                                                                                className="h-9"
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <Label className="text-xs">Selling *</Label>
                                                                            <Input
                                                                                type="number"
                                                                                step="0.01"
                                                                                value={variant.selling_price}
                                                                                onChange={(e) =>
                                                                                    updateQuickVariant(product.id, variant.id, 'selling_price', e.target.value)
                                                                                }
                                                                                placeholder="0.00"
                                                                                className="h-9"
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <Label className="text-xs">Min Selling *</Label>
                                                                            <Input
                                                                                type="number"
                                                                                step="0.01"
                                                                                value={variant.min_selling_price}
                                                                                onChange={(e) =>
                                                                                    updateQuickVariant(
                                                                                        product.id,
                                                                                        variant.id,
                                                                                        'min_selling_price',
                                                                                        e.target.value,
                                                                                    )
                                                                                }
                                                                                placeholder="0.00"
                                                                                className="h-9"
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <Label className="text-xs">Cost *</Label>
                                                                            <Input
                                                                                type="number"
                                                                                step="0.01"
                                                                                value={variant.cost_price}
                                                                                onChange={(e) =>
                                                                                    updateQuickVariant(product.id, variant.id, 'cost_price', e.target.value)
                                                                                }
                                                                                placeholder="0.00"
                                                                                className="h-9"
                                                                            />
                                                                        </div>
                                                                    </div>

                                                                    {/* Barcodes for Quick Add */}
                                                                    <div className="space-y-2">
                                                                        <div className="flex items-center justify-between">
                                                                            <Label className="text-xs">Barcodes</Label>
                                                                            <Button
                                                                                type="button"
                                                                                variant="link"
                                                                                size="sm"
                                                                                onClick={() => addQuickBarcode(product.id, variant.id)}
                                                                                className="h-auto p-0 text-xs"
                                                                            >
                                                                                + Add Barcode
                                                                            </Button>
                                                                        </div>
                                                                        {variant.barcodes.map((barcode, bIdx) => (
                                                                            <div key={bIdx} className="flex items-center gap-2">
                                                                                <Input
                                                                                    value={barcode.barcode}
                                                                                    onChange={(e) =>
                                                                                        updateQuickBarcode(
                                                                                            product.id,
                                                                                            variant.id,
                                                                                            bIdx,
                                                                                            'barcode',
                                                                                            e.target.value,
                                                                                        )
                                                                                    }
                                                                                    placeholder="Enter barcode"
                                                                                    className="h-9 flex-1 font-mono"
                                                                                />
                                                                                <div className="flex items-center space-x-1.5">
                                                                                    <Checkbox
                                                                                        id={`quick-primary-${product.id}-${variant.id}-${bIdx}`}
                                                                                        checked={barcode.is_primary}
                                                                                        onCheckedChange={(checked) =>
                                                                                            updateQuickBarcode(
                                                                                                product.id,
                                                                                                variant.id,
                                                                                                bIdx,
                                                                                                'is_primary',
                                                                                                checked,
                                                                                            )
                                                                                        }
                                                                                    />
                                                                                    <Label
                                                                                        htmlFor={`quick-primary-${product.id}-${variant.id}-${bIdx}`}
                                                                                        className="text-xs text-muted-foreground"
                                                                                    >
                                                                                        Primary
                                                                                    </Label>
                                                                                </div>
                                                                                {variant.barcodes.length > 1 && (
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="icon"
                                                                                        onClick={() =>
                                                                                            removeQuickBarcode(product.id, variant.id, bIdx)
                                                                                        }
                                                                                        className="h-9 w-9"
                                                                                    >
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
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setQuickProducts([]);
                                    setView('list');
                                }}
                            >
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
