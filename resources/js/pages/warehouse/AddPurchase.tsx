import { Head, router, usePage } from '@inertiajs/react';
import { ArrowLeft, Loader2, Plus, Save, Search, Trash2, X, Zap, Barcode, Calendar, Building2, User, FileText } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
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
    [key: string]: string | undefined; // Index signature for type-safe dynamic object updates
};

type QuickFormData = {
    quantity: string;
    cost_price: string;
    min_selling_price: string;
    selling_price: string;
    mrp: string;
    tax_id: string;
    batch_no: string;
    expiry_date: string;
};

type Props = {
    vendors: Vendor[];
    warehouses: Warehouse[];
    products: Product[];
    taxCategories: TaxCategory[];
};

// ─────────────────────────────────────────────
// Utility Helpers
// ─────────────────────────────────────────────
const today = () => new Date().toISOString().split('T')[0];

const generateInvoiceNo = () => {
    const d = new Date();
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    return `INV-${ymd}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
};

const generateBatchNo = () => {
    const d = new Date();
    const ym = `${String(d.getFullYear()).slice(-2)}${String(d.getMonth() + 1).padStart(2, '0')}`;
    return `BN-${ym}-${String(Math.floor(Math.random() * 100)).padStart(3, '0')}`;
};

const EMPTY_QUICK: QuickFormData = {
    quantity: '1', cost_price: '', min_selling_price: '',
    selling_price: '', mrp: '', tax_id: '', batch_no: '', expiry_date: '',
};

const safeFloat = (val: string | number | undefined): number => {
    if (!val) return 0;
    const parsed = typeof val === 'string' ? parseFloat(val) : val;
    return isNaN(parsed) ? 0 : parsed;
};

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export default function AddPurchase({ vendors = [], warehouses = [], products = [], taxCategories = [] }: Props) {
    const { errors: pageErrors } = usePage().props as any;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: dashboard().url },
        { title: 'Purchases', href: '/warehouse/purchases' },
        { title: 'New Purchase', href: '' },
    ];

    // ── Form Header States ──
    const [formData, setFormData] = useState({
        vendor_id: '',
        invoice_no: generateInvoiceNo(),
        purchase_date: today(),
        warehouse_id: warehouses[0]?.id.toString() ?? '',
        status: 'draft' as 'draft' | 'confirmed',
    });

    const [items, setItems] = useState<PurchaseItem[]>([]);
    const [invoiceImage, setInvoiceImage] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ── Barcode Scanner Configurations ──
    const [barcodeSearch, setBarcodeSearch] = useState('');
    const [quickEntryEnabled, setQuickEnabled] = useState(true);

    // ── Quick Entry Modal States ──
    const [showQuickModal, setShowQuickModal] = useState(false);
    const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
    const [quickForm, setQuickForm] = useState<QuickFormData>(EMPTY_QUICK);

    // ── Input Element References ──
    const barcodeRef = useRef<HTMLInputElement>(null);
    const qtyRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        barcodeRef.current?.focus();
    }, []);

    const taxMap = useMemo(
        () => Object.fromEntries(taxCategories.map((t) => [t.id.toString(), t])),
        [taxCategories],
    );

    // ── Memoized Financial Summary Totals ──
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
        return {
            subtotal: subtotal.toFixed(2),
            tax: tax.toFixed(2),
            total: (subtotal + tax).toFixed(2),
        };
    }, [items, taxMap]);

    const itemTotal = (item: PurchaseItem): number => {
        const qty = safeFloat(item.quantity);
        const cost = safeFloat(item.cost_price);
        const tc = taxMap[item.tax_id];
        const line = qty * cost;
        if (tc?.type === 'exclusive') return line + (line * tc.tax_percent / 100);
        return line;
    };

    // ── Barcode Scanning Matching Logic ──
    const searchBarcode = useCallback((value: string) => {
        const trimmedVal = value.trim();
        const product = products.find(
            (p) =>
                p.barcode?.toLowerCase() === trimmedVal.toLowerCase() ||
                p.sku.toLowerCase() === trimmedVal.toLowerCase(),
        );

        if (!product) {
            setBarcodeSearch('');
            barcodeRef.current?.setCustomValidity('Product structure not found in registry catalog.');
            barcodeRef.current?.reportValidity();
            setTimeout(() => barcodeRef.current?.setCustomValidity(''), 2000);
            return;
        }

        setBarcodeSearch('');

        if (quickEntryEnabled) {
            setCurrentProduct(product);
            setQuickForm({
                quantity: '1',
                cost_price: product.cost_price.toString(),
                min_selling_price: product.min_selling_price.toString(),
                selling_price: product.selling_price.toString(),
                mrp: product.mrp.toString(),
                tax_id: product.tax_id.toString(),
                batch_no: generateBatchNo(),
                expiry_date: '',
            });
            setShowQuickModal(true);
            setTimeout(() => qtyRef.current?.focus(), 120);
        } else {
            addProductToItems(product);
        }
    }, [products, quickEntryEnabled]);

    const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            if (barcodeSearch.trim().length > 1) {
                searchBarcode(barcodeSearch);
            }
        }
    };

    // ── Items Array Mutation Handlers ──
    const addProductToItems = (product: Product, custom?: QuickFormData) => {
        const batchNo = custom?.batch_no || generateBatchNo();

        const idx = items.findIndex(
            (i) => i.product_variant_id === product.id.toString() && i.batch_no.trim() === batchNo.trim(),
        );

        if (idx >= 0 && !custom) {
            setItems((prev) =>
                prev.map((item, i) =>
                    i === idx
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
                    quantity: custom?.quantity ?? '1',
                    cost_price: custom?.cost_price ?? product.cost_price.toString(),
                    min_selling_price: custom?.min_selling_price ?? product.min_selling_price.toString(),
                    selling_price: custom?.selling_price ?? product.selling_price.toString(),
                    mrp: custom?.mrp ?? product.mrp.toString(),
                    tax_id: custom?.tax_id ?? product.tax_id.toString(),
                    batch_no: batchNo,
                    expiry_date: custom?.expiry_date ?? '',
                },
            ]);
        }
    };

    const addBlankItem = () => {
        setItems((prev) => [
            ...prev,
            {
                product_variant_id: '', quantity: '', cost_price: '',
                min_selling_price: '', selling_price: '', mrp: '',
                tax_id: '', batch_no: generateBatchNo(), expiry_date: '',
            },
        ]);
    };

    const removeItem = (index: number) => {
        setItems((prev) => prev.filter((_, i) => i !== index));
    };

    const updateItem = useCallback((index: number, field: keyof PurchaseItem, value: string) => {
        setItems((prev) =>
            prev.map((item, i) => {
                if (i !== index) return item;
                const updated = { ...item, [field]: value };

                if (field === 'product_variant_id' && value) {
                    // Fixed loop closure naming collision from 'p' to 'selectedProduct'
                    const selectedProduct = products.find((prod) => prod.id.toString() === value);
                    if (selectedProduct) {
                        updated.cost_price = selectedProduct.cost_price.toString();
                        updated.min_selling_price = selectedProduct.min_selling_price.toString();
                        updated.selling_price = selectedProduct.selling_price.toString();
                        updated.mrp = selectedProduct.mrp.toString();
                        updated.tax_id = selectedProduct.tax_id.toString();
                        updated.product_name = selectedProduct.name;
                        if (!updated.batch_no) updated.batch_no = generateBatchNo();
                    }
                }
                return updated;
            }),
        );
    }, [products]);

    const handleQuickSubmit = () => {
        if (!currentProduct) return;
        const qty = safeFloat(quickForm.quantity);
        if (qty <= 0) { qtyRef.current?.focus(); return; }
        addProductToItems(currentProduct, quickForm);
        setShowQuickModal(false);
        setCurrentProduct(null);
        setTimeout(() => barcodeRef.current?.focus(), 80);
    };

    // Keyboard Shortcut Interceptors
    const quickSubmitRef = useRef(handleQuickSubmit);
    useEffect(() => { quickSubmitRef.current = handleQuickSubmit; });

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'F2') { e.preventDefault(); barcodeRef.current?.focus(); }
            if (e.key === 'F3' && showQuickModal) { e.preventDefault(); quickSubmitRef.current(); }
            if (e.key === 'Escape' && showQuickModal) {
                setShowQuickModal(false);
                setTimeout(() => barcodeRef.current?.focus(), 80);
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [showQuickModal]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.vendor_id || items.length === 0 || isSubmitting) return;

        setIsSubmitting(true);
        const payload = new FormData();
        payload.append('vendor_id', formData.vendor_id);
        payload.append('invoice_no', formData.invoice_no);
        payload.append('purchase_date', formData.purchase_date);
        payload.append('warehouse_id', formData.warehouse_id);
        payload.append('status', formData.status);
        if (invoiceImage) payload.append('invoice_image', invoiceImage);

        items.forEach((item, idx) => {
            const prefix = `items[${idx}]`;
            payload.append(`${prefix}[product_variant_id]`, item.product_variant_id);
            payload.append(`${prefix}[quantity]`, item.quantity);
            payload.append(`${prefix}[cost_price]`, item.cost_price);
            payload.append(`${prefix}[min_selling_price]`, item.min_selling_price);
            payload.append(`${prefix}[selling_price]`, item.selling_price);
            payload.append(`${prefix}[mrp]`, item.mrp);
            payload.append(`${prefix}[tax_id]`, item.tax_id);
            payload.append(`${prefix}[batch_no]`, item.batch_no);
            if (item.expiry_date) payload.append(`${prefix}[expiry_date]`, item.expiry_date);
        });

        router.post('/warehouse/purchases', payload, {
            onError: () => setIsSubmitting(false),
            onFinish: () => setIsSubmitting(false),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Purchase Manifest" />

            {/* Quick Entry Dialog Frame Overlay */}
            <Dialog open={showQuickModal} onOpenChange={(open) => {
                setShowQuickModal(open);
                if(!open) setTimeout(() => barcodeRef.current?.focus(), 80);
            }}>
                <DialogContent className="sm:max-w-lg bg-card text-card-foreground border">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                            <Zap className="h-5 w-5 text-amber-500 fill-amber-500" />
                            Quick Entry Scanner Node
                        </DialogTitle>
                        <DialogDescription className="text-sm font-medium mt-1">
                            {currentProduct && (
                                <span className="text-primary font-bold block bg-primary/5 p-2 rounded-lg border border-primary/10">{currentProduct.name}</span>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-4 py-2">
                        <div className="col-span-2 space-y-1.5">
                            <Label htmlFor="q-qty" className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Inbound Batch Quantity *</Label>
                            <Input
                                id="q-qty" ref={qtyRef} type="number" min="1" step="1"
                                value={quickForm.quantity}
                                onChange={(e) => setQuickForm((p) => ({ ...p, quantity: e.target.value }))}
                                className="h-11 border-2 border-primary/30 text-lg font-bold focus-visible:ring-primary"
                                onKeyDown={(e) => e.key === 'Enter' && handleQuickSubmit()}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="q-cost" className="text-xs font-semibold text-muted-foreground">Cost Price</Label>
                            <Input id="q-cost" type="number" step="0.01" value={quickForm.cost_price} onChange={(e) => setQuickForm((p) => ({ ...p, cost_price: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="q-mrp" className="text-xs font-semibold text-muted-foreground">MRP Valuation</Label>
                            <Input id="q-mrp" type="number" step="0.01" value={quickForm.mrp} onChange={(e) => setQuickForm((p) => ({ ...p, mrp: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="q-sell" className="text-xs font-semibold text-muted-foreground">Retail Selling Price</Label>
                            <Input id="q-sell" type="number" step="0.01" value={quickForm.selling_price} onChange={(e) => setQuickForm((p) => ({ ...p, selling_price: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="q-min-sell" className="text-xs font-semibold text-muted-foreground">Minimum Floor Limit</Label>
                            <Input id="q-min-sell" type="number" step="0.01" value={quickForm.min_selling_price} onChange={(e) => setQuickForm((p) => ({ ...p, min_selling_price: e.target.value }))} />
                        </div>
                        <div className="col-span-2 space-y-1.5">
                            <Label htmlFor="q-batch" className="text-xs font-semibold text-muted-foreground">Allocated Batch Number</Label>
                            <Input id="q-batch" value={quickForm.batch_no} onChange={(e) => setQuickForm((p) => ({ ...p, batch_no: e.target.value }))} placeholder="BN-0000" />
                        </div>
                        <div className="col-span-2 space-y-1.5">
                            <Label htmlFor="q-expiry" className="text-xs font-semibold text-muted-foreground">Batch Quality Expiry Date</Label>
                            <Input id="q-expiry" type="date" min={today()} value={quickForm.expiry_date} onChange={(e) => setQuickForm((p) => ({ ...p, expiry_date: e.target.value }))} />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 border-t pt-4 mt-2">
                        <Button onClick={() => setShowQuickModal(false)} variant="outline" className="h-10">Cancel (ESC)</Button>
                        <Button onClick={handleQuickSubmit} className="h-10 font-semibold bg-emerald-600 dark:bg-emerald-600 text-white hover:bg-emerald-700">Add to Table Matrix (F3)</Button>
                    </div>
                </DialogContent>
            </Dialog>

            <div className="flex flex-col gap-4 p-6 w-full max-w-[100vw] lg:max-w-none">

                {/* Global Validation Alert Bag Banner Interceptor */}
                {pageErrors?.form && (
                    <Alert variant="destructive" className="animate-in fade-in"><AlertDescription>{pageErrors.form}</AlertDescription></Alert>
                )}

                <Card className="shadow-sm border bg-card text-card-foreground">
                    <CardHeader className="pb-4 border-b">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-2xl font-bold tracking-tight">Procurement Inbound Manifest</CardTitle>
                                <CardDescription className="text-sm font-medium">Record ledger purchase orders with active hardware barcode matching scans.</CardDescription>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2.5 rounded-xl border bg-muted/40 px-4 h-10 shadow-inner">
                                    <Zap className={`h-4 w-4 transition-colors ${quickEntryEnabled ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'}`} />
                                    <Label htmlFor="quick-toggle" className="cursor-pointer text-xs font-bold uppercase tracking-wide text-muted-foreground select-none">Automated Modal Pop</Label>
                                    <Switch
                                        id="quick-toggle" checked={quickEntryEnabled} onCheckedChange={setQuickEnabled}
                                        className="data-[state=checked]:bg-primary"
                                    />
                                </div>
                                <Button variant="outline" onClick={() => router.get('/warehouse/purchases')} className="h-10 bg-card text-card-foreground">
                                    <ArrowLeft className="mr-2 size-4" /> Back Register
                                </Button>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="pt-6">
                        <form onSubmit={handleSubmit} noValidate className="space-y-6">

                            {/* Inbound Metadata configuration panel */}
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="vendor" className="text-xs font-bold text-muted-foreground flex items-center gap-1"><User className="size-3" /> Target Supplier Vendor *</Label>
                                    <Select value={formData.vendor_id} onValueChange={(v) => setFormData((p) => ({ ...p, vendor_id: v }))}>
                                        <SelectTrigger className="w-full h-10 border-border bg-card">
                                            <SelectValue placeholder="Select Supplier" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {vendors.map((v) => (
                                                <SelectItem key={v.id} value={v.id.toString()}>{v.name} ({v.phone})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="invoice_no" className="text-xs font-bold text-muted-foreground flex items-center gap-1"><FileText className="size-3" /> Invoice Identification # *</Label>
                                    <Input
                                        id="invoice_no" value={formData.invoice_no}
                                        onChange={(e) => setFormData((p) => ({ ...p, invoice_no: e.target.value }))}
                                        className="h-10" placeholder="INV-0000" required
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="purchase_date" className="text-xs font-bold text-muted-foreground flex items-center gap-1"><Calendar className="size-3" /> Operational Transaction Date *</Label>
                                    <Input id="purchase_date" type="date" value={formData.purchase_date} onChange={(e) => setFormData((p) => ({ ...p, purchase_date: e.target.value }))} className="h-10" required />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="warehouse" className="text-xs font-bold text-muted-foreground flex items-center gap-1"><Building2 className="size-3" /> Destination Storage Warehouse *</Label>
                                    <Select value={formData.warehouse_id} onValueChange={(v) => setFormData((p) => ({ ...p, warehouse_id: v }))}>
                                        <SelectTrigger className="w-full h-10 border-border bg-card">
                                            <SelectValue placeholder="Select Destination" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {warehouses.map((w) => (
                                                <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Main Barcode Scanner Input */}
                            <div className="p-4 border rounded-xl bg-muted/10 space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <Label htmlFor="barcode-input" className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                        <Barcode className="size-4 text-primary" /> Active Hardware Scanner Terminal
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="h-6 font-mono text-[10px] bg-primary/5 text-primary border-primary/20 select-none">Press F2 to focus</Badge>
                                        <Button type="button" onClick={addBlankItem} size="sm" variant="outline" className="h-8 text-xs font-medium">
                                            <Plus className="mr-1 size-3.5" /> Manual Empty Row
                                        </Button>
                                    </div>
                                </div>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="barcode-input" ref={barcodeRef} value={barcodeSearch}
                                        onChange={(e) => setBarcodeSearch(e.target.value)}
                                        onKeyDown={handleBarcodeKeyDown}
                                        placeholder="Aim laser scanner or type dynamic code... (Hit Enter to execute row push)"
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

                            {/* Batch items dataset matrix table block */}
                            {items.length === 0 ? (
                                <div className="rounded-xl border-2 border-dashed p-12 text-center bg-muted/10 space-y-3">
                                    <Barcode className="mx-auto h-12 w-12 text-muted-foreground opacity-30 animate-pulse" />
                                    <div className="space-y-1">
                                        <h3 className="text-base font-bold tracking-tight">Ledger Table Matrix Empty</h3>
                                        <p className="text-xs text-muted-foreground font-medium max-w-sm mx-auto">Fire the laser scanner or click the manual append button above to build the cost list.</p>
                                    </div>
                                    <Button type="button" onClick={addBlankItem} variant="outline" className="h-9 text-xs">
                                        <Plus className="mr-1 size-3.5" /> Append First Manual Row
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <Label className="text-sm font-bold tracking-tight block">Inbound SKUs Composition Line ({items.length})</Label>
                                    <div className="overflow-x-auto rounded-xl border border-border shadow-sm">
                                        <Table>
                                            <TableHeader className="bg-muted/50">
                                                <TableRow>
                                                    <TableHead className="w-10 text-center font-semibold">#</TableHead>
                                                    <TableHead className="min-w-[220px] font-semibold">Product Variant Designation</TableHead>
                                                    <TableHead className="w-20 text-right font-semibold">Qty</TableHead>
                                                    <TableHead className="w-24 text-right font-semibold">Cost Price</TableHead>
                                                    <TableHead className="w-24 text-right font-semibold">Min Selling</TableHead>
                                                    <TableHead className="w-24 text-right font-semibold">Selling Price</TableHead>
                                                    <TableHead className="w-24 text-right font-semibold">MRP</TableHead>
                                                    <TableHead className="min-w-[120px] font-semibold">Batch No</TableHead>
                                                    <TableHead className="min-w-[140px] font-semibold">Expiry Date</TableHead>
                                                    <TableHead className="w-28 text-right font-semibold">Line Gross</TableHead>
                                                    <TableHead className="w-10 text-center"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody className="bg-card">
                                                {items.map((item, index) => (
                                                    <TableRow key={index} className="hover:bg-muted/30 border-b">
                                                        <TableCell className="text-center font-medium text-muted-foreground">{index + 1}</TableCell>
                                                        <TableCell>
                                                            {item.product_name ? (
                                                                <div className="font-semibold text-sm pl-1 text-foreground">{item.product_name}</div>
                                                            ) : (
                                                                <Select value={item.product_variant_id} onValueChange={(v) => updateItem(index, 'product_variant_id', v)}>
                                                                    <SelectTrigger className="h-9 bg-card border-border"><SelectValue placeholder="Choose product SKU" /></SelectTrigger>
                                                                    <SelectContent>
                                                                        {products.map((p) => (
                                                                            <SelectItem key={p.id} value={p.id.toString()}>{p.name} [{p.sku}]</SelectItem>
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
                                                        <TableCell><Input value={item.batch_no} onChange={(e) => updateItem(index, 'batch_no', e.target.value)} className="h-9 font-mono text-xs uppercase" placeholder="BN-0000" required /></TableCell>
                                                        <TableCell><Input type="date" min={today()} value={item.expiry_date} onChange={(e) => updateItem(index, 'expiry_date', e.target.value)} className="h-9 text-xs" /></TableCell>
                                                        <TableCell className="text-right font-mono font-bold text-sm text-foreground pr-3">₹{itemTotal(item).toFixed(2)}</TableCell>
                                                        <TableCell className="text-center">
                                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                                                                <Trash2 className="size-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            )}

                            {/* Summary Totals Balance Card */}
                            {items.length > 0 && (
                                <div className="flex justify-end">
                                    <Card className="w-full max-w-sm border shadow-sm bg-muted/20 text-foreground">
                                        <CardContent className="p-4 space-y-2 text-sm">
                                            <div className="flex justify-between text-muted-foreground"><span className="font-medium">Net Base Subtotal</span><span className="font-semibold font-mono">₹{totals.subtotal}</span></div>
                                            <div className="flex justify-between text-muted-foreground"><span className="font-medium">Tax Mass Collected</span><span className="font-semibold font-mono">₹{totals.tax}</span></div>
                                            <div className="flex justify-between border-t pt-2 text-base font-bold text-foreground"><span>Grand Total Value</span><span className="text-lg text-primary font-mono">₹{totals.total}</span></div>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}

                            {/* Flow Control Actions footer bar */}
                            <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4">
                                <div className="flex items-center gap-4 flex-wrap">
                                    <div className="flex items-center gap-2.5 h-10">
                                        <Label htmlFor="status" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Lifecycle State</Label>
                                        <Select value={formData.status} onValueChange={(v: 'draft' | 'confirmed') => setFormData((p) => ({ ...p, status: v }))}>
                                            <SelectTrigger className="w-44 h-10 bg-card border-border"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="draft">Save as Draft</SelectItem>
                                                <SelectItem value="confirmed">Confirm & Ingest Stock</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex items-center gap-2.5 h-10">
                                        <Label htmlFor="invoice_image" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Invoice Document Image</Label>
                                        <Input id="invoice_image" type="file" accept="image/*" onChange={(e) => setInvoiceImage(e.target.files?.[0] ?? null)} className="w-56 h-10 bg-card cursor-pointer" />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button type="button" variant="outline" onClick={() => router.get('/warehouse/purchases')} disabled={isSubmitting} className="h-10 bg-card">Cancel</Button>
                                    <Button
                                        type="submit" disabled={isSubmitting || !formData.vendor_id || items.length === 0}
                                        className="h-10 font-semibold shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
                                    >
                                        {isSubmitting ? (
                                            <><Loader2 className="mr-2 size-4 animate-spin" />Processing Manifest...</>
                                        ) : (
                                            <><Save className="mr-2 size-4" />Create Purchase Manifest</>
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
