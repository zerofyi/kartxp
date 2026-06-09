import { Head, router } from '@inertiajs/react';
import { ArrowLeft, Loader2, Plus, Save, Search, Trash2, X, Zap } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
// Breadcrumbs
// ─────────────────────────────────────────────
const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: dashboard().url },
    { title: 'Purchases', href: '/warehouse/purchases' },
    { title: 'New Purchase', href: '' },
];

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
// Helpers
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
    return `BN-${ym}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
};

const EMPTY_QUICK: QuickFormData = {
    quantity: '1', cost_price: '', min_selling_price: '',
    selling_price: '', mrp: '', tax_id: '', batch_no: '', expiry_date: '',
};

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────
export default function AddPurchase({ vendors = [], warehouses = [], products = [], taxCategories = [] }: Props) {
    // ── form header ──
    const [formData, setFormData] = useState({
        vendor_id:     '',
        invoice_no:    generateInvoiceNo(),
        purchase_date: today(),
        warehouse_id:  warehouses[0]?.id.toString() ?? '',
        status:        'draft' as 'draft' | 'confirmed',
    });

    // ── items ──
    const [items, setItems]             = useState<PurchaseItem[]>([]);
    const [invoiceImage, setInvoiceImage] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ── barcode scanner ──
    const [barcodeSearch, setBarcodeSearch]     = useState('');
    const [quickEntryEnabled, setQuickEnabled]  = useState(true);

    // ── quick entry modal ──
    const [showQuickModal, setShowQuickModal]   = useState(false);
    const [currentProduct, setCurrentProduct]  = useState<Product | null>(null);
    const [quickForm, setQuickForm]             = useState<QuickFormData>(EMPTY_QUICK);

    // ── refs ──
    const barcodeRef = useRef<HTMLInputElement>(null);
    const qtyRef     = useRef<HTMLInputElement>(null);

    // Auto-focus barcode on mount
    useEffect(() => { barcodeRef.current?.focus(); }, []);

    // ── tax lookup map (memoised) ──
    const taxMap = useMemo(
        () => Object.fromEntries(taxCategories.map((t) => [t.id.toString(), t])),
        [taxCategories],
    );

    // ── totals (memoised) ──
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
        return {
            subtotal: subtotal.toFixed(2),
            tax:      tax.toFixed(2),
            total:    (subtotal + tax).toFixed(2),
        };
    }, [items, taxMap]);

    // ── item total (per row) ──
    const itemTotal = (item: PurchaseItem): number => {
        const qty = parseFloat(item.quantity) || 0;
        const cost = parseFloat(item.cost_price) || 0;
        const tc = taxMap[item.tax_id];
        const line = qty * cost;
        if (tc?.type === 'exclusive') return line + (line * tc.tax_percent / 100);
        return line; // inclusive total = cost * qty
    };

    // ── barcode search ──
    const searchBarcode = useCallback((value: string) => {
        const product = products.find(
            (p) =>
                p.barcode?.toLowerCase() === value.toLowerCase() ||
                p.sku.toLowerCase() === value.toLowerCase(),
        );

        if (!product) {
            setBarcodeSearch('');
            // Non-blocking: highlight the input red briefly instead of alert()
            barcodeRef.current?.setCustomValidity('Product not found');
            barcodeRef.current?.reportValidity();
            setTimeout(() => barcodeRef.current?.setCustomValidity(''), 2000);
            return;
        }

        setBarcodeSearch('');

        if (quickEntryEnabled) {
            setCurrentProduct(product);
            setQuickForm({
                quantity:          '1',
                cost_price:        product.cost_price.toString(),
                min_selling_price: product.min_selling_price.toString(),
                selling_price:     product.selling_price.toString(),
                mrp:               product.mrp.toString(),
                tax_id:            product.tax_id.toString(),
                batch_no:          generateBatchNo(),
                expiry_date:       '',
            });
            setShowQuickModal(true);
            setTimeout(() => qtyRef.current?.focus(), 100);
        } else {
            addProductToItems(product);
        }
    }, [products, quickEntryEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && barcodeSearch.length > 2) {
            e.preventDefault();
            searchBarcode(barcodeSearch);
        }
    };

    // ── add / update items ──
    const addProductToItems = (product: Product, custom?: QuickFormData) => {
        const batchNo = custom?.batch_no || generateBatchNo();
        const idx = items.findIndex(
            (i) => i.product_variant_id === product.id.toString() && i.batch_no === batchNo,
        );

        if (idx >= 0 && !custom) {
            // Same product + same batch: increment qty
            setItems((prev) =>
                prev.map((item, i) =>
                    i === idx
                        ? { ...item, quantity: (parseFloat(item.quantity) + 1).toString() }
                        : item,
                ),
            );
        } else {
            setItems((prev) => [
                ...prev,
                {
                    product_variant_id: product.id.toString(),
                    product_name:       product.name,
                    quantity:           custom?.quantity           ?? '1',
                    cost_price:         custom?.cost_price         ?? product.cost_price.toString(),
                    min_selling_price:  custom?.min_selling_price  ?? product.min_selling_price.toString(),
                    selling_price:      custom?.selling_price      ?? product.selling_price.toString(),
                    mrp:                custom?.mrp                ?? product.mrp.toString(),
                    tax_id:             custom?.tax_id             ?? product.tax_id.toString(),
                    batch_no:           batchNo,
                    expiry_date:        custom?.expiry_date        ?? '',
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

    const removeItem = (index: number) =>
        setItems((prev) => prev.filter((_, i) => i !== index));

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
                        if (!updated.batch_no) updated.batch_no = generateBatchNo();
                    }
                }
                return updated;
            }),
        );
    }, [products]);

    // ── quick modal submit ──
    const handleQuickSubmit = () => {
        if (!currentProduct) return;
        const qty = parseFloat(quickForm.quantity);
        if (!qty || qty <= 0) { qtyRef.current?.focus(); return; }
        addProductToItems(currentProduct, quickForm);
        setShowQuickModal(false);
        setCurrentProduct(null);
        setTimeout(() => barcodeRef.current?.focus(), 100);
    };

    // ── keyboard shortcuts ──
    // Use a ref for the handler so it always captures latest state without re-registering.
    const quickSubmitRef = useRef(handleQuickSubmit);
    useEffect(() => { quickSubmitRef.current = handleQuickSubmit; });

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'F2') { e.preventDefault(); barcodeRef.current?.focus(); }
            if (e.key === 'F3' && showQuickModal) { e.preventDefault(); quickSubmitRef.current(); }
            if (e.key === 'Escape' && showQuickModal) {
                setShowQuickModal(false);
                setTimeout(() => barcodeRef.current?.focus(), 100);
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [showQuickModal]);

    // ── submit ──
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.vendor_id || items.length === 0) return;

        setIsSubmitting(true);
        const payload = new FormData();
        payload.append('vendor_id',     formData.vendor_id);
        payload.append('invoice_no',    formData.invoice_no);
        payload.append('purchase_date', formData.purchase_date);
        payload.append('warehouse_id',  formData.warehouse_id);
        payload.append('status',        formData.status);
        if (invoiceImage) payload.append('invoice_image', invoiceImage);

        items.forEach((item, idx) => {
            const prefix = `items[${idx}]`;
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

        router.post('/warehouse/purchases', payload, {
            onError:  () => setIsSubmitting(false),
            onFinish: () => setIsSubmitting(false),
        });
    };

    // ─────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="New Purchase" />

            {/* Quick Entry Modal */}
            <Dialog open={showQuickModal} onOpenChange={setShowQuickModal}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-emerald-600" aria-hidden />
                            Quick Entry
                        </DialogTitle>
                        <DialogDescription>
                            {currentProduct && (
                                <span className="font-semibold text-emerald-700">{currentProduct.name}</span>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 space-y-1">
                            <Label htmlFor="q-qty">Quantity <span className="text-destructive" aria-hidden>*</span></Label>
                            <Input
                                id="q-qty" ref={qtyRef} type="number" min="1" step="1"
                                value={quickForm.quantity}
                                onChange={(e) => setQuickForm((p) => ({ ...p, quantity: e.target.value }))}
                                className="border-2 border-emerald-200 text-lg font-bold focus:border-emerald-500"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="q-cost">Cost Price</Label>
                            <Input id="q-cost" type="number" step="0.01"
                                value={quickForm.cost_price}
                                onChange={(e) => setQuickForm((p) => ({ ...p, cost_price: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="q-mrp">MRP</Label>
                            <Input id="q-mrp" type="number" step="0.01"
                                value={quickForm.mrp}
                                onChange={(e) => setQuickForm((p) => ({ ...p, mrp: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="q-sell">Selling Price</Label>
                            <Input id="q-sell" type="number" step="0.01"
                                value={quickForm.selling_price}
                                onChange={(e) => setQuickForm((p) => ({ ...p, selling_price: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="q-min-sell">Min Selling</Label>
                            <Input id="q-min-sell" type="number" step="0.01"
                                value={quickForm.min_selling_price}
                                onChange={(e) => setQuickForm((p) => ({ ...p, min_selling_price: e.target.value }))}
                            />
                        </div>
                        <div className="col-span-2 space-y-1">
                            <Label htmlFor="q-batch">Batch Number</Label>
                            <Input id="q-batch"
                                value={quickForm.batch_no}
                                onChange={(e) => setQuickForm((p) => ({ ...p, batch_no: e.target.value }))}
                                placeholder="BN-0000"
                            />
                        </div>
                        <div className="col-span-2 space-y-1">
                            <Label htmlFor="q-expiry">Expiry Date</Label>
                            <Input id="q-expiry" type="date" min={today()}
                                value={quickForm.expiry_date}
                                onChange={(e) => setQuickForm((p) => ({ ...p, expiry_date: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 border-t pt-4">
                        <Button
                            onClick={() => { setShowQuickModal(false); setTimeout(() => barcodeRef.current?.focus(), 100); }}
                            variant="outline"
                        >
                            Cancel (ESC)
                        </Button>
                        <Button onClick={handleQuickSubmit} className="bg-emerald-600 hover:bg-emerald-700">
                            Add to Purchase (F3)
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-2xl">New Purchase</CardTitle>
                                <CardDescription>Quick entry with barcode scanning</CardDescription>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 rounded-lg border-2 border-emerald-200 bg-emerald-50 px-4 py-2">
                                    <Zap className={`h-4 w-4 ${quickEntryEnabled ? 'text-emerald-600' : 'text-muted-foreground'}`} aria-hidden />
                                    <Label htmlFor="quick-toggle" className="cursor-pointer text-sm font-medium">Quick Entry</Label>
                                    <Switch
                                        id="quick-toggle"
                                        checked={quickEntryEnabled}
                                        onCheckedChange={setQuickEnabled}
                                        className="data-[state=checked]:bg-emerald-600"
                                    />
                                </div>
                                <Button variant="outline" onClick={() => router.get('/warehouse/purchases')}>
                                    <ArrowLeft className="mr-2 size-4" aria-hidden />
                                    Back
                                </Button>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleSubmit} noValidate className="space-y-6">
                            {/* Header fields */}
                            <div className="grid gap-4 md:grid-cols-4">
                                <div className="space-y-2">
                                    <Label htmlFor="vendor">Vendor <span className="text-destructive" aria-hidden>*</span></Label>
                                    <Select value={formData.vendor_id} onValueChange={(v) => setFormData((p) => ({ ...p, vendor_id: v }))}>
                                        <SelectTrigger className="w-full border-2 border-emerald-200">
                                            <SelectValue placeholder="Select Vendor" />
                                        </SelectTrigger>
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
                                    <Label htmlFor="invoice_no">Invoice No <span className="text-destructive" aria-hidden>*</span></Label>
                                    <Input
                                        id="invoice_no"
                                        value={formData.invoice_no}
                                        onChange={(e) => setFormData((p) => ({ ...p, invoice_no: e.target.value }))}
                                        className="border-2 border-emerald-200"
                                        placeholder="INV-001"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="purchase_date">Purchase Date <span className="text-destructive" aria-hidden>*</span></Label>
                                    <Input
                                        id="purchase_date" type="date"
                                        value={formData.purchase_date}
                                        onChange={(e) => setFormData((p) => ({ ...p, purchase_date: e.target.value }))}
                                        className="border-2 border-emerald-200"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="warehouse">Warehouse <span className="text-destructive" aria-hidden>*</span></Label>
                                    <Select value={formData.warehouse_id} onValueChange={(v) => setFormData((p) => ({ ...p, warehouse_id: v }))}>
                                        <SelectTrigger className="w-full border-2 border-emerald-200">
                                            <SelectValue placeholder="Select Warehouse" />
                                        </SelectTrigger>
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

                            {/* Barcode scanner */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="barcode-input">Scan Barcode / SKU</Label>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="bg-blue-50 text-blue-700">F2 to focus</Badge>
                                        <Button type="button" onClick={addBlankItem} size="sm" variant="outline">
                                            <Plus className="mr-2 size-4" aria-hidden />
                                            Add Manually
                                        </Button>
                                    </div>
                                </div>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                                    <Input
                                        id="barcode-input"
                                        ref={barcodeRef}
                                        value={barcodeSearch}
                                        onChange={(e) => setBarcodeSearch(e.target.value)}
                                        onKeyDown={handleBarcodeKeyDown}
                                        placeholder="Scan or type barcode/SKU… (Enter to search)"
                                        className="border-2 border-emerald-300 pl-9 text-lg focus:border-emerald-500"
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

                            {/* Items */}
                            {items.length === 0 ? (
                                <div className="rounded-lg border-2 border-dashed border-emerald-200 bg-emerald-50 p-12 text-center">
                                    <Zap className="mx-auto h-12 w-12 text-emerald-400" aria-hidden />
                                    <h3 className="mt-2 text-lg font-semibold text-emerald-900">No items yet</h3>
                                    <p className="mt-1 text-sm text-emerald-600">
                                        Scan a barcode or click "Add Manually" to begin
                                    </p>
                                    <Button type="button" onClick={addBlankItem} className="mt-4" variant="outline">
                                        <Plus className="mr-2 size-4" aria-hidden />
                                        Add First Item
                                    </Button>
                                </div>
                            ) : (
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

                                    <div className="overflow-x-auto rounded-md border-2 border-emerald-200">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-emerald-50">
                                                    <TableHead className="w-8">#</TableHead>
                                                    <TableHead className="min-w-[200px]">Product</TableHead>
                                                    <TableHead className="w-20">Qty</TableHead>
                                                    <TableHead className="w-24">Cost</TableHead>
                                                    <TableHead className="w-24">Min Sell</TableHead>
                                                    <TableHead className="w-24">Selling</TableHead>
                                                    <TableHead className="w-24">MRP</TableHead>
                                                    <TableHead className="w-28">Batch</TableHead>
                                                    <TableHead className="w-32">Expiry</TableHead>
                                                    <TableHead className="w-24 text-right">Amount</TableHead>
                                                    <TableHead className="w-10"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {items.map((item, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell className="font-medium">{index + 1}</TableCell>
                                                        <TableCell>
                                                            {item.product_name ? (
                                                                <div className="font-medium">{item.product_name}</div>
                                                            ) : (
                                                                <Select
                                                                    value={item.product_variant_id}
                                                                    onValueChange={(v) => updateItem(index, 'product_variant_id', v)}
                                                                >
                                                                    <SelectTrigger className="h-9 border-emerald-200">
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
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input type="number" min="1" step="1"
                                                                value={item.quantity}
                                                                onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                                                className="h-9 w-20 border-emerald-200"
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input type="number" step="0.01"
                                                                value={item.cost_price}
                                                                onChange={(e) => updateItem(index, 'cost_price', e.target.value)}
                                                                className="h-9 w-24 border-emerald-200"
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input type="number" step="0.01"
                                                                value={item.min_selling_price}
                                                                onChange={(e) => updateItem(index, 'min_selling_price', e.target.value)}
                                                                className="h-9 w-24 border-emerald-200"
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input type="number" step="0.01"
                                                                value={item.selling_price}
                                                                onChange={(e) => updateItem(index, 'selling_price', e.target.value)}
                                                                className="h-9 w-24 border-emerald-200"
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input type="number" step="0.01"
                                                                value={item.mrp}
                                                                onChange={(e) => updateItem(index, 'mrp', e.target.value)}
                                                                className="h-9 w-24 border-emerald-200"
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                value={item.batch_no}
                                                                onChange={(e) => updateItem(index, 'batch_no', e.target.value)}
                                                                className="h-9 w-28 border-emerald-200"
                                                                placeholder="BN-0000"
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input type="date" min={today()}
                                                                value={item.expiry_date}
                                                                onChange={(e) => updateItem(index, 'expiry_date', e.target.value)}
                                                                className="h-9 border-emerald-200"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold text-emerald-700">
                                                            ₹{itemTotal(item).toFixed(2)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button
                                                                type="button" variant="ghost" size="icon"
                                                                onClick={() => removeItem(index)}
                                                                className="h-9 w-9 text-destructive"
                                                                aria-label={`Remove item ${index + 1}`}
                                                            >
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

                            {/* Totals */}
                            {items.length > 0 && (
                                <Card className="border-2 border-emerald-300 bg-emerald-50">
                                    <CardContent className="p-4">
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-emerald-700">Subtotal:</span>
                                                <span className="font-medium text-emerald-900">₹{totals.subtotal}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-emerald-700">Tax Amount:</span>
                                                <span className="font-medium text-emerald-900">₹{totals.tax}</span>
                                            </div>
                                            <div className="flex justify-between border-t-2 border-emerald-300 pt-2 text-lg">
                                                <span className="font-bold text-emerald-700">Total Amount:</span>
                                                <span className="text-xl font-bold text-emerald-900">₹{totals.total}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Status & Actions */}
                            <div className="flex flex-wrap items-center justify-between gap-4 border-t-2 border-emerald-200 pt-4">
                                <div className="flex items-center gap-3">
                                    <Label htmlFor="status">Status:</Label>
                                    <Select
                                        value={formData.status}
                                        onValueChange={(v: 'draft' | 'confirmed') => setFormData((p) => ({ ...p, status: v }))}
                                    >
                                        <SelectTrigger className="w-44 border-2 border-emerald-200">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="draft">Save as Draft</SelectItem>
                                            <SelectItem value="confirmed">Confirm Purchase</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center gap-3">
                                    <Label htmlFor="invoice_image">Invoice Image</Label>
                                    <Input
                                        id="invoice_image" type="file" accept="image/*"
                                        onChange={(e) => setInvoiceImage(e.target.files?.[0] ?? null)}
                                        className="w-56 border-2 border-emerald-200"
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <Button
                                        type="button" variant="outline"
                                        onClick={() => router.get('/warehouse/purchases')}
                                        disabled={isSubmitting}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="bg-emerald-600 hover:bg-emerald-700"
                                        disabled={isSubmitting || !formData.vendor_id || items.length === 0}
                                    >
                                        {isSubmitting ? (
                                            <><Loader2 className="mr-2 size-4 animate-spin" aria-hidden />Creating…</>
                                        ) : (
                                            <><Save className="mr-2 size-4" aria-hidden />Create Purchase</>
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
