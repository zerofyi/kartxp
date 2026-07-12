import { Head, router, usePage } from '@inertiajs/react';
import { ArrowLeft, Loader2, Plus, Save, Search, Trash2, X, FileText, Calendar, Building2, User, Barcode } from 'lucide-react';
import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
type Vendor = { id: number; name: string; phone: string; gstin?: string };
type Warehouse = { id: number; name: string; location?: string };
type TaxCategory = { id: number; name: string; tax_percent: number; type: 'inclusive' | 'exclusive' };
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
    [key: string]: string | number | undefined; // Safe string index signature mapping
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

const safeFloat = (val: string | number | undefined): number => {
    if (!val) return 0;
    const parsed = typeof val === 'string' ? parseFloat(val) : val;
    return isNaN(parsed) ? 0 : parsed;
};

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export default function EditPurchase({
    purchase,
    vendors = [],
    warehouses = [],
    products = [],
    taxCategories = [],
}: Props) {
    const { errors: pageErrors } = usePage().props as any;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: dashboard().url },
        { title: 'Purchases', href: '/warehouse/purchases' },
        { title: `Edit ${purchase.invoice_no}`, href: '' },
    ];

    // ── guard layout boundary state rule ──
    if (purchase.status === 'confirmed') {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title={`Edit Locked - ${purchase.invoice_no}`} />
                <div className="flex h-full flex-1 items-center justify-center p-6 text-foreground">
                    <Card className="w-full max-w-md shadow-sm bg-card text-card-foreground border-destructive/20 border-t-4 border-t-destructive">
                        <CardHeader>
                            <CardTitle className="text-xl font-bold">Purchase Record Locked</CardTitle>
                            <CardDescription className="text-sm font-medium mt-1">
                                This purchase ledger configuration has already been finalized and confirmed. Changes cannot be applied.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button onClick={() => router.get('/warehouse/purchases')} className="w-full h-10">
                                <ArrowLeft className="mr-2 size-4" /> Back to Register
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </AppLayout>
        );
    }

    // ── Form States ──
    const [formData, setFormData] = useState({
        vendor_id: purchase.vendor_id.toString(),
        invoice_no: purchase.invoice_no,
        purchase_date: stripTime(purchase.purchase_date),
        warehouse_id: purchase.warehouse_id?.toString() ?? warehouses[0]?.id.toString() ?? '',
        status: purchase.status as 'draft' | 'confirmed',
    });

    const [items, setItems] = useState<PurchaseItem[]>(
        (purchase.items ?? []).map((item) => ({
            id: item.id,
            product_variant_id: item.product_variant_id?.toString() ?? '',
            product_name: item.product_name,
            quantity: String(item.quantity ?? ''),
            cost_price: String(item.cost_price ?? ''),
            min_selling_price: String(item.min_selling_price ?? '0'),
            selling_price: String(item.selling_price ?? ''),
            mrp: String(item.mrp ?? ''),
            tax_id: item.tax_id?.toString() ?? '',
            batch_no: item.batch_no ?? '',
            expiry_date: stripTime(item.expiry_date),
        })),
    );

    const [barcodeSearch, setBarcodeSearch] = useState('');
    const [invoiceImage, setInvoiceImage] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const barcodeRef = useRef<HTMLInputElement>(null);

    const taxMap = useMemo(
        () => Object.fromEntries(taxCategories.map((t) => [t.id.toString(), t])),
        [taxCategories],
    );

    // ── Memoized Financial Computation Sheet ──
    const totals = useMemo(() => {
        let subtotal = 0, tax = 0;
        for (const item of items) {
            const qty = safeFloat(item.quantity);
            const cost = safeFloat(item.cost_price);
            const tc = taxMap[item.tax_id];
            const line = qty * cost;

            if (tc?.type === 'inclusive') {
                const base = line / (1 + tc.tax_percent / 100);
                subtotal += base;
                tax += line - base;
            } else {
                subtotal += line;
                tax += tc ? (line * tc.tax_percent / 100) : 0;
            }
        }
        return { subtotal: subtotal.toFixed(2), tax: tax.toFixed(2), total: (subtotal + tax).toFixed(2) };
    }, [items, taxMap]);

    const itemTotal = (item: PurchaseItem): number => {
        const qty = safeFloat(item.quantity);
        const cost = safeFloat(item.cost_price);
        const tc = taxMap[item.tax_id];
        const line = qty * cost;
        if (tc?.type === 'exclusive') return line + (line * tc.tax_percent / 100);
        return line;
    };

    // ── Barcode Interceptor Scanner Loop ──
    const searchBarcode = useCallback((value: string) => {
        const trimmedVal = value.trim();
        const product = products.find(
            (p) =>
                p.barcode?.toLowerCase() === trimmedVal.toLowerCase() ||
                p.sku.toLowerCase() === trimmedVal.toLowerCase(),
        );

        if (product) {
            const existing = items.findIndex((i) => i.product_variant_id === product.id.toString());
            if (existing >= 0) {
                setItems((prev) =>
                    prev.map((item, i) =>
                        i === existing
                            ? { ...item, quantity: (safeFloat(item.quantity) + 1).toString() }
                            : item,
                    ),
                );
            } else {
                setItems((prev) => [
                    ...prev,
                    {
                        product_variant_id: product.id.toString(),
                        product_name: product.name,
                        quantity: '1',
                        cost_price: product.cost_price.toString(),
                        min_selling_price: product.min_selling_price.toString(),
                        selling_price: product.selling_price.toString(),
                        mrp: product.mrp.toString(),
                        tax_id: product.tax_id.toString(),
                        batch_no: generateBatchNo(),
                        expiry_date: '',
                    },
                ]);
            }
        } else {
            barcodeRef.current?.setCustomValidity('Product structure not found in catalog.');
            barcodeRef.current?.reportValidity();
            setTimeout(() => barcodeRef.current?.setCustomValidity(''), 2000);
        }
        setBarcodeSearch('');
    }, [products, items]);

    const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            if (barcodeSearch.trim().length > 1) {
                searchBarcode(barcodeSearch);
            }
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
                    const selectedProd = products.find((p) => p.id.toString() === value);
                    if (selectedProd) {
                        updated.cost_price        = selectedProd.cost_price.toString();
                        updated.min_selling_price = selectedProd.min_selling_price.toString();
                        updated.selling_price     = selectedProd.selling_price.toString();
                        updated.mrp               = selectedProd.mrp.toString();
                        updated.tax_id            = selectedProd.tax_id.toString();
                        updated.product_name      = selectedProd.name;
                    }
                }
                return updated;
            }),
        );
    }, [products]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;
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

        router.post('/warehouse/purchases/' + purchase.id, payload, {
            onError:  () => setIsSubmitting(false),
            onFinish: () => setIsSubmitting(false),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Modify Purchase Order - ${purchase.invoice_no}`} />

            {/* Full-width elastic workspace responsive container wrapper */}
            <div className="flex flex-col gap-4 p-6 w-full max-w-[100vw] lg:max-w-none text-foreground">

                {/* Error Banner Interceptor */}
                {pageErrors?.form && (
                    <Alert variant="destructive" className="animate-in fade-in"><AlertDescription>{pageErrors.form}</AlertDescription></Alert>
                )}

                <Card className="shadow-sm border bg-card text-card-foreground">
                    <CardHeader className="pb-4 border-b">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-2xl font-bold tracking-tight">Modify Purchase Order</CardTitle>
                                <CardDescription className="text-sm font-medium">Update structural line costs or target distribution locations.</CardDescription>
                            </div>
                            <Button variant="outline" onClick={() => router.get('/warehouse/purchases')} className="h-10 bg-card">
                                <ArrowLeft className="mr-2 size-4" /> Back Register
                            </Button>
                        </div>
                    </CardHeader>

                    <CardContent className="pt-6">
                        <form onSubmit={handleSubmit} noValidate className="space-y-6">

                            {/* Metadata input stack */}
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1"><User className="size-3" /> Target Supplier Vendor *</Label>
                                    <Select value={formData.vendor_id} onValueChange={(v) => setFormData((p) => ({ ...p, vendor_id: v }))}>
                                        <SelectTrigger className="h-10 bg-card border-border"><SelectValue placeholder="Select Vendor" /></SelectTrigger>
                                        <SelectContent>
                                            {vendors.map((v) => (
                                                <SelectItem key={v.id} value={v.id.toString()}>{v.name} — {v.phone}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-invoice-no" className="text-xs font-bold text-muted-foreground flex items-center gap-1"><FileText className="size-3" /> Invoice Identification # *</Label>
                                    <Input id="edit-invoice-no" value={formData.invoice_no} onChange={(e) => setFormData((p) => ({ ...p, invoice_no: e.target.value }))} className="h-10" required />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-date" className="text-xs font-bold text-muted-foreground flex items-center gap-1"><Calendar className="size-3" /> Operational Transaction Date *</Label>
                                    <Input id="edit-date" type="date" value={formData.purchase_date} onChange={(e) => setFormData((p) => ({ ...p, purchase_date: e.target.value }))} className="h-10" required />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1"><Building2 className="size-3" /> Storage Warehouse Location *</Label>
                                    <Select value={formData.warehouse_id} onValueChange={(v) => setFormData((p) => ({ ...p, warehouse_id: v }))}>
                                        <SelectTrigger className="h-10 bg-card border-border"><SelectValue placeholder="Select Warehouse" /></SelectTrigger>
                                        <SelectContent>
                                            {warehouses.map((w) => (
                                                <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Barcode scanner panel loop node */}
                            <div className="p-4 border rounded-xl bg-muted/10 space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="edit-barcode" className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                        <Barcode className="size-4 text-primary" /> Active Hardware Scanner Terminal
                                    </Label>
                                    <Button type="button" onClick={addBlankItem} size="sm" variant="outline" className="h-8 text-xs font-medium">
                                        <Plus className="mr-1 size-3.5" /> Manual Empty Row
                                    </Button>
                                </div>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="edit-barcode" ref={barcodeRef} value={barcodeSearch}
                                        onChange={(e) => setBarcodeSearch(e.target.value)}
                                        onKeyDown={handleBarcodeKeyDown}
                                        placeholder="Scan barcode laser or input SKU value... (Hit Enter key)"
                                        className="pl-9 h-11 text-base focus-visible:ring-primary border-border bg-card"
                                        autoComplete="off"
                                    />
                                    {barcodeSearch && (
                                        <button type="button" onClick={() => setBarcodeSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                            <X className="size-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Manifest grid mapping array matrix layout table */}
                            <div className="space-y-3">
                                <Label className="text-sm font-bold tracking-tight block">Inbound SKUs Line Configuration Matrix</Label>
                                <div className="overflow-x-auto rounded-xl border border-border shadow-sm">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead className="min-w-[220px] font-semibold">Product Variant Designation</TableHead>
                                                <TableHead className="w-20 text-right font-semibold">Qty</TableHead>
                                                <TableHead className="w-24 text-right font-semibold">Cost Price</TableHead>
                                                <TableHead className="w-24 text-right font-semibold">Min Sell</TableHead>
                                                <TableHead className="w-24 text-right font-semibold">Selling Price</TableHead>
                                                <TableHead className="w-24 text-right font-semibold">MRP</TableHead>
                                                <TableHead className="min-w-[150px] font-semibold">Tax Bracket</TableHead>
                                                <TableHead className="w-28 font-semibold">Batch No</TableHead>
                                                <TableHead className="w-32 font-semibold">Expiry Date</TableHead>
                                                <TableHead className="w-28 text-right font-semibold">Line Gross</TableHead>
                                                <TableHead className="w-10 text-center"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody className="bg-card">
                                            {items.map((item, index) => (
                                                <TableRow key={index} className="hover:bg-muted/30 border-b border-border">
                                                    <TableCell>
                                                        {item.product_name ? (
                                                            <div className="font-semibold text-sm pl-1 text-foreground">{item.product_name}</div>
                                                        ) : (
                                                            <Select value={item.product_variant_id} onValueChange={(v) => updateItem(index, 'product_variant_id', v)}>
                                                                <SelectTrigger className="h-9 bg-card border-border"><SelectValue placeholder="Choose SKU allocation" /></SelectTrigger>
                                                                <SelectContent>
                                                                    {products.map((p) => (
                                                                        <SelectItem key={p.id} value={p.id.toString()}>{p.name} ({p.sku})</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        )}
                                                    </TableCell>
                                                    <TableCell><Input type="number" min="1" step="1" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} className="h-9 text-right font-mono font-medium" required /></TableCell>
                                                    <TableCell><Input type="number" step="0.01" value={item.cost_price} onChange={(e) => updateItem(index, 'cost_price', e.target.value)} className="h-9 text-right font-mono" required /></TableCell>
                                                    <TableCell><Input type="number" step="0.01" value={item.min_selling_price} onChange={(e) => updateItem(index, 'min_selling_price', e.target.value)} className="h-9 text-right font-mono" /></TableCell>
                                                    <TableCell><Input type="number" step="0.01" value={item.selling_price} onChange={(e) => updateItem(index, 'selling_price', e.target.value)} className="h-9 text-right font-mono" required /></TableCell>
                                                    <TableCell><Input type="number" step="0.01" value={item.mrp} onChange={(e) => updateItem(index, 'mrp', e.target.value)} className="h-9 text-right font-mono" required /></TableCell>
                                                    <TableCell>
                                                        <Select value={item.tax_id} onValueChange={(v) => updateItem(index, 'tax_id', v)}>
                                                            <SelectTrigger className="h-9 bg-card border-border"><SelectValue placeholder="Tax" /></SelectTrigger>
                                                            <SelectContent>
                                                                {taxCategories.map((t) => (
                                                                    <SelectItem key={t.id} value={t.id.toString()}>{t.name} ({t.tax_percent}%)</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                    <TableCell><Input value={item.batch_no} onChange={(e) => updateItem(index, 'batch_no', e.target.value)} className="h-9 font-mono text-xs uppercase" required /></TableCell>
                                                    <TableCell><Input type="date" min={today()} value={item.expiry_date} onChange={(e) => updateItem(index, 'expiry_date', e.target.value)} className="h-9 text-xs" /></TableCell>
                                                    <TableCell className="text-right font-mono font-bold text-sm text-foreground pr-3">₹{itemTotal(item).toFixed(2)}</TableCell>
                                                    <TableCell className="text-center">
                                                        {items.length > 1 && (
                                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} className="h-8 w-8 text-destructive hover:bg-destructive/10">
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

                            {/* Cumulative summary display panel sheet */}
                            <div className="flex justify-end">
                                <Card className="w-full max-w-sm border shadow-sm bg-muted/20 text-foreground">
                                    <CardContent className="p-4 space-y-2 text-sm">
                                        <div className="flex justify-between text-muted-foreground"><span className="font-medium">Net Base Subtotal</span><span className="font-semibold font-mono">₹{totals.subtotal}</span></div>
                                        <div className="flex justify-between text-muted-foreground"><span className="font-medium">Tax Mass Collected</span><span className="font-semibold font-mono">₹{totals.tax}</span></div>
                                        <div className="flex justify-between border-t pt-2 text-base font-bold text-foreground"><span>Grand Total Value</span><span className="text-lg text-primary font-mono">₹{totals.total}</span></div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Bottom Context controls action footer bar panel */}
                            <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4">
                                <div className="flex items-center gap-4 flex-wrap">
                                    <div className="flex items-center gap-2.5 h-10">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Lifecycle State</Label>
                                        <Select value={formData.status} onValueChange={(v: 'draft' | 'confirmed') => setFormData((p) => ({ ...p, status: v }))}>
                                            <SelectTrigger className="w-44 h-10 bg-card border-border"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="draft">Save as Draft</SelectItem>
                                                <SelectItem value="confirmed">Confirm & Commit Stock</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex items-center gap-2.5 h-10">
                                        <Label htmlFor="edit-image" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Invoice File Attachment Scan</Label>
                                        <Input id="edit-image" type="file" accept="image/*" onChange={(e) => setInvoiceImage(e.target.files?.[0] ?? null)} className="w-56 h-10 bg-card cursor-pointer" />
                                    </div>

                                    {purchase.image_path && !invoiceImage && (
                                        <span className="text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded border">Current attachment persisted</span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button type="button" variant="outline" onClick={() => router.get('/warehouse/purchases')} disabled={isSubmitting} className="h-10 bg-card">Cancel</Button>
                                    <Button type="submit" disabled={isSubmitting} className="h-10 font-semibold shadow-sm bg-primary text-primary-foreground hover:bg-primary/90">
                                        {isSubmitting ? (
                                            <><Loader2 className="mr-2 size-4 animate-spin" />Syncing Manifest...</>
                                        ) : (
                                            <><Save className="mr-2 size-4" />Update Inbound Purchase</>
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
