import { Head, router } from '@inertiajs/react';
import { ArrowLeft, Loader2, Plus, Save, Search, Trash2, X } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import type { BreadcrumbItem } from '@/types';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type Vendor = {
    id: number;
    name: string;
    phone: string;
    gstin?: string;
};

type Warehouse = {
    id: number;
    name: string;
    location?: string;
};

type TaxCategory = {
    id: number;
    name: string;
    tax_percent: number;
    type: 'inclusive' | 'exclusive';
};

type Product = {
    id: number;
    name: string;
    sku: string;
    unit: string;
    mrp: number;
    min_selling_price: number;
    selling_price: number;
    cost_price: number;
    tax_id: number;
    barcode?: string;
};

type PurchaseItem = {
    id?: number;
    product_variant_id: string;
    product_name?: string;
    quantity: string;
    cost_price: string;
    min_selling_price: string;
    selling_price: string;
    mrp: string;
    tax_id: string;
    batch_no: string;
    expiry_date: string;
};

type Purchase = {
    id: number;
    vendor_id: number;
    warehouse_id?: number;
    vendor?: Vendor;
    invoice_no: string;
    image_path?: string;
    purchase_date: string;
    subtotal: number;
    tax_amount: number;
    total_amount: number;
    status: 'draft' | 'confirmed';
    items?: PurchaseItem[];
    created_at: string;
};

type Props = {
    purchase: Purchase;
    vendors: Vendor[];
    warehouses: Warehouse[];
    products: Product[];
    taxCategories: TaxCategory[];
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const today = () => new Date().toISOString().split('T')[0];

const stripTime = (dateStr?: string) => (dateStr ? dateStr.split('T')[0] : '');

const generateBatchNo = () => {
    const d = new Date();
    const ym = `${String(d.getFullYear()).slice(-2)}${String(d.getMonth() + 1).padStart(2, '0')}`;
    return `BN-${ym}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
};

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────
export default function EditPurchase({
    purchase,
    vendors = [],
    warehouses = [],
    products = [],
    taxCategories = [],
}: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: dashboard().url },
        { title: 'Purchases', href: '/warehouse/purchases' },
        { title: `Edit ${purchase.invoice_no}`, href: '' },
    ];

    // ── guard: confirmed purchases can't be edited ──
    if (purchase.status === 'confirmed') {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title={`Edit ${purchase.invoice_no}`} />
                <div className="flex h-full flex-1 items-center justify-center p-4">
                    <Card className="w-full max-w-md">
                        <CardHeader>
                            <CardTitle>Cannot Edit Purchase</CardTitle>
                            <CardDescription>
                                This purchase has already been confirmed and cannot be edited.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button onClick={() => router.get('/warehouse/purchases')} className="w-full">
                                <ArrowLeft className="mr-2 size-4" aria-hidden />
                                Back to Purchases
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </AppLayout>
        );
    }

    // ── state ──
    const [formData, setFormData] = useState({
        vendor_id:     purchase.vendor_id.toString(),
        invoice_no:    purchase.invoice_no,
        purchase_date: stripTime(purchase.purchase_date),
        // Use the purchase's own warehouse; fall back to first warehouse in list
        warehouse_id:  purchase.warehouse_id?.toString() ?? warehouses[0]?.id.toString() ?? '',
        status:        purchase.status as 'draft' | 'confirmed',
    });

    const [items, setItems] = useState<PurchaseItem[]>(
        (purchase.items ?? []).map((item) => ({
            id:                 item.id,
            product_variant_id: (item as any).product_variant_id?.toString() ?? '',
            product_name:       (item as any).product_name,
            quantity:           String((item as any).quantity ?? ''),
            cost_price:         String((item as any).cost_price ?? ''),
            min_selling_price:  String((item as any).min_selling_price ?? '0'),
            selling_price:      String((item as any).selling_price ?? ''),
            mrp:                String((item as any).mrp ?? ''),
            tax_id:             (item as any).tax_id?.toString() ?? (item as any).tax_category?.id?.toString() ?? '',
            batch_no:           (item as any).batch_no ?? '',
            expiry_date:        stripTime((item as any).expiry_date),
        })),
    );

    const [barcodeSearch, setBarcodeSearch] = useState('');
    const [invoiceImage, setInvoiceImage]   = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting]   = useState(false);

    const barcodeRef = useRef<HTMLInputElement>(null);

    // ── tax lookup map ──
    const taxMap = useMemo(
        () => Object.fromEntries(taxCategories.map((t) => [t.id.toString(), t])),
        [taxCategories],
    );

    // ── totals ──
    const totals = useMemo(() => {
        let subtotal = 0, tax = 0;
        for (const item of items) {
            const qty  = parseFloat(item.quantity)   || 0;
            const cost = parseFloat(item.cost_price) || 0;
            const tc   = taxMap[item.tax_id];
            const line = qty * cost;
            if (tc?.type === 'inclusive') {
                const base = line / (1 + tc.tax_percent / 100);
                subtotal += base;
                tax      += line - base;
            } else {
                subtotal += line;
                tax      += tc ? (line * tc.tax_percent / 100) : 0;
            }
        }
        return { subtotal: subtotal.toFixed(2), tax: tax.toFixed(2), total: (subtotal + tax).toFixed(2) };
    }, [items, taxMap]);

    // ── item total (per row) ──
    const itemTotal = (item: PurchaseItem): number => {
        const qty = parseFloat(item.quantity) || 0;
        const cost = parseFloat(item.cost_price) || 0;
        const tc = taxMap[item.tax_id];
        const line = qty * cost;
        if (tc?.type === 'exclusive') return line + (line * tc.tax_percent / 100);
        return line;
    };

    // ── barcode scan (Enter key only — no useEffect on every keystroke) ──
    const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && barcodeSearch.length > 2) {
            e.preventDefault();
            const product = products.find(
                (p) =>
                    p.barcode?.toLowerCase() === barcodeSearch.toLowerCase() ||
                    p.sku.toLowerCase() === barcodeSearch.toLowerCase(),
            );
            if (product) {
                addProductToItems(product);
            } else {
                barcodeRef.current?.setCustomValidity('Product not found');
                barcodeRef.current?.reportValidity();
                setTimeout(() => barcodeRef.current?.setCustomValidity(''), 2000);
            }
            setBarcodeSearch('');
        }
    };

    const addProductToItems = (product: Product) => {
        const existing = items.findIndex((i) => i.product_variant_id === product.id.toString());
        if (existing >= 0) {
            updateItem(existing, 'quantity', (parseFloat(items[existing].quantity) + 1).toString());
        } else {
            setItems((prev) => [
                ...prev,
                {
                    product_variant_id: product.id.toString(),
                    product_name:       product.name,
                    quantity:           '1',
                    cost_price:         product.cost_price.toString(),
                    min_selling_price:  product.min_selling_price.toString(),
                    selling_price:      product.selling_price.toString(),
                    mrp:                product.mrp.toString(),
                    tax_id:             product.tax_id.toString(),
                    batch_no:           generateBatchNo(),
                    expiry_date:        '',
                },
            ]);
        }
    };

    const addBlankItem = () =>
        setItems((prev) => [
            ...prev,
            {
                product_variant_id: '', quantity: '', cost_price: '',
                min_selling_price: '', selling_price: '', mrp: '',
                tax_id: '', batch_no: generateBatchNo(), expiry_date: '',
            },
        ]);

    const removeItem = (index: number) => {
        if (items.length > 1) setItems((prev) => prev.filter((_, i) => i !== index));
    };

    const updateItem = useCallback((index: number, field: keyof PurchaseItem, value: string) => {
        setItems((prev) =>
            prev.map((item, i) => {
                if (i !== index) return item;
                const updated = { ...item, [field]: value };
                if (field === 'product_variant_id' && value) {
                    const p = products.find((p) => p.id.toString() === value);
                    if (p) {
                        updated.cost_price        = p.cost_price.toString();
                        updated.min_selling_price = p.min_selling_price.toString();
                        updated.selling_price     = p.selling_price.toString();
                        updated.mrp               = p.mrp.toString();
                        updated.tax_id            = p.tax_id.toString();
                        updated.product_name      = p.name;
                    }
                }
                return updated;
            }),
        );
    }, [products]);

    // ── submit ──
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const payload = new FormData();
        payload.append('vendor_id',     formData.vendor_id);
        payload.append('invoice_no',    formData.invoice_no);
        payload.append('purchase_date', formData.purchase_date);
        payload.append('warehouse_id',  formData.warehouse_id);
        payload.append('status',        formData.status);
        payload.append('_method',       'PUT');
        if (invoiceImage) payload.append('invoice_image', invoiceImage);

        items.forEach((item, idx) => {
            const prefix = `items[${idx}]`;
            if (item.id) payload.append(`${prefix}[id]`, item.id.toString());
            payload.append(`${prefix}[product_variant_id]`, item.product_variant_id);
            payload.append(`${prefix}[quantity]`,           item.quantity);
            payload.append(`${prefix}[cost_price]`,         item.cost_price);
            payload.append(`${prefix}[min_selling_price]`,  item.min_selling_price);
            payload.append(`${prefix}[selling_price]`,      item.selling_price);
            payload.append(`${prefix}[mrp]`,                item.mrp);
            payload.append(`${prefix}[tax_id]`,             item.tax_id);
            payload.append(`${prefix}[batch_no]`,           item.batch_no);
            if (item.expiry_date) payload.append(`${prefix}[expiry_date]`, item.expiry_date);
        });

        router.post(`/warehouse/purchases/${purchase.id}`, payload, {
            onError:  () => setIsSubmitting(false),
            onFinish: () => setIsSubmitting(false),
        });
    };

    // ─────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit ${purchase.invoice_no}`} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-2xl">Edit Purchase</CardTitle>
                                <CardDescription>Update purchase details</CardDescription>
                            </div>
                            <Button variant="outline" onClick={() => router.get('/warehouse/purchases')}>
                                <ArrowLeft className="mr-2 size-4" aria-hidden />
                                Back to List
                            </Button>
                        </div>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleSubmit} noValidate className="space-y-6">
                            {/* Header fields */}
                            <div className="grid gap-4 md:grid-cols-4">
                                <div className="space-y-2">
                                    <Label>Vendor <span className="text-destructive" aria-hidden>*</span></Label>
                                    <Select value={formData.vendor_id} onValueChange={(v) => setFormData((p) => ({ ...p, vendor_id: v }))}>
                                        <SelectTrigger><SelectValue placeholder="Select Vendor" /></SelectTrigger>
                                        <SelectContent>
                                            {vendors.map((v) => (
                                                <SelectItem key={v.id} value={v.id.toString()}>
                                                    {v.name} — {v.phone}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="edit-invoice-no">Invoice No <span className="text-destructive" aria-hidden>*</span></Label>
                                    <Input
                                        id="edit-invoice-no"
                                        value={formData.invoice_no}
                                        onChange={(e) => setFormData((p) => ({ ...p, invoice_no: e.target.value }))}
                                        placeholder="INV-001"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="edit-date">Purchase Date <span className="text-destructive" aria-hidden>*</span></Label>
                                    <Input
                                        id="edit-date" type="date"
                                        value={formData.purchase_date}
                                        onChange={(e) => setFormData((p) => ({ ...p, purchase_date: e.target.value }))}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Warehouse <span className="text-destructive" aria-hidden>*</span></Label>
                                    <Select value={formData.warehouse_id} onValueChange={(v) => setFormData((p) => ({ ...p, warehouse_id: v }))}>
                                        <SelectTrigger><SelectValue placeholder="Select Warehouse" /></SelectTrigger>
                                        <SelectContent>
                                            {warehouses.map((w) => (
                                                <SelectItem key={w.id} value={w.id.toString()}>
                                                    {w.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Invoice Image */}
                            <div className="space-y-2">
                                <Label htmlFor="edit-image">Invoice Image</Label>
                                <Input
                                    id="edit-image" type="file" accept="image/*"
                                    onChange={(e) => setInvoiceImage(e.target.files?.[0] ?? null)}
                                />
                                {purchase.image_path && !invoiceImage && (
                                    <p className="text-sm text-muted-foreground">
                                        Current: {purchase.image_path.split('/').pop()}
                                    </p>
                                )}
                            </div>

                            {/* Barcode */}
                            <div className="space-y-2">
                                <Label htmlFor="edit-barcode">Scan Barcode / SKU</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                                    <Input
                                        id="edit-barcode"
                                        ref={barcodeRef}
                                        value={barcodeSearch}
                                        onChange={(e) => setBarcodeSearch(e.target.value)}
                                        onKeyDown={handleBarcodeKeyDown}
                                        placeholder="Scan or type barcode/SKU… (Enter to search)"
                                        className="pl-9 pr-9"
                                        autoComplete="off"
                                    />
                                    {barcodeSearch && (
                                        <button
                                            type="button"
                                            onClick={() => setBarcodeSearch('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            aria-label="Clear barcode"
                                        >
                                            <X className="size-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Items table */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-base font-semibold">
                                        Purchase Items ({items.length})
                                    </Label>
                                    <Button type="button" onClick={addBlankItem} size="sm" variant="outline">
                                        <Plus className="mr-2 size-4" aria-hidden />
                                        Add Item
                                    </Button>
                                </div>

                                <div className="overflow-x-auto rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="min-w-[180px]">Product</TableHead>
                                                <TableHead className="w-20">Qty</TableHead>
                                                <TableHead className="w-24">Cost</TableHead>
                                                <TableHead className="w-24">Min Sell</TableHead>
                                                <TableHead className="w-24">Selling</TableHead>
                                                <TableHead className="w-24">MRP</TableHead>
                                                <TableHead className="w-36">Tax</TableHead>
                                                <TableHead className="w-28">Batch No</TableHead>
                                                <TableHead className="w-32">Expiry</TableHead>
                                                <TableHead className="w-24 text-right">Amount</TableHead>
                                                <TableHead className="w-10"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {items.map((item, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>
                                                        <Select
                                                            value={item.product_variant_id}
                                                            onValueChange={(v) => updateItem(index, 'product_variant_id', v)}
                                                        >
                                                            <SelectTrigger className="h-9">
                                                                <SelectValue placeholder="Select Product" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {products.map((p) => (
                                                                    <SelectItem key={p.id} value={p.id.toString()}>
                                                                        {p.name} ({p.sku})
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input type="number" min="1" step="1"
                                                            value={item.quantity}
                                                            onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                                            className="h-9 w-20"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input type="number" step="0.01"
                                                            value={item.cost_price}
                                                            onChange={(e) => updateItem(index, 'cost_price', e.target.value)}
                                                            className="h-9 w-24"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input type="number" step="0.01"
                                                            value={item.min_selling_price}
                                                            onChange={(e) => updateItem(index, 'min_selling_price', e.target.value)}
                                                            className="h-9 w-24"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input type="number" step="0.01"
                                                            value={item.selling_price}
                                                            onChange={(e) => updateItem(index, 'selling_price', e.target.value)}
                                                            className="h-9 w-24"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input type="number" step="0.01"
                                                            value={item.mrp}
                                                            onChange={(e) => updateItem(index, 'mrp', e.target.value)}
                                                            className="h-9 w-24"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Select
                                                            value={item.tax_id}
                                                            onValueChange={(v) => updateItem(index, 'tax_id', v)}
                                                        >
                                                            <SelectTrigger className="h-9">
                                                                <SelectValue placeholder="Tax" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {taxCategories.map((t) => (
                                                                    <SelectItem key={t.id} value={t.id.toString()}>
                                                                        {t.name} ({t.tax_percent}% {t.type === 'inclusive' ? 'Inc' : 'Exc'})
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            value={item.batch_no}
                                                            onChange={(e) => updateItem(index, 'batch_no', e.target.value)}
                                                            className="h-9 w-28"
                                                            placeholder="BN-0000"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input type="date" min={today()}
                                                            value={item.expiry_date}
                                                            onChange={(e) => updateItem(index, 'expiry_date', e.target.value)}
                                                            className="h-9"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">
                                                        ₹{itemTotal(item).toFixed(2)}
                                                    </TableCell>
                                                    <TableCell>
                                                        {items.length > 1 && (
                                                            <Button
                                                                type="button" variant="ghost" size="icon"
                                                                onClick={() => removeItem(index)}
                                                                className="h-9 w-9 text-destructive"
                                                                aria-label={`Remove item ${index + 1}`}
                                                            >
                                                                <Trash2 className="size-4" />
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>

                            {/* Totals */}
                            <Card>
                                <CardContent className="p-4">
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Subtotal:</span>
                                            <span className="font-medium">₹{totals.subtotal}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Tax Amount:</span>
                                            <span className="font-medium">₹{totals.tax}</span>
                                        </div>
                                        <div className="flex justify-between border-t pt-2 text-base font-semibold">
                                            <span>Total Amount:</span>
                                            <span>₹{totals.total}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Status & Actions */}
                            <div className="flex items-center justify-between gap-4 border-t pt-4">
                                <div className="flex items-center gap-3">
                                    <Label>Status:</Label>
                                    <Select
                                        value={formData.status}
                                        onValueChange={(v: 'draft' | 'confirmed') => setFormData((p) => ({ ...p, status: v }))}
                                    >
                                        <SelectTrigger className="w-44">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="draft">Save as Draft</SelectItem>
                                            <SelectItem value="confirmed">Confirm Purchase</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex gap-3">
                                    <Button
                                        type="button" variant="outline"
                                        onClick={() => router.get('/warehouse/purchases')}
                                        disabled={isSubmitting}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting ? (
                                            <><Loader2 className="mr-2 size-4 animate-spin" aria-hidden />Updating…</>
                                        ) : (
                                            <><Save className="mr-2 size-4" aria-hidden />Update Purchase</>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
