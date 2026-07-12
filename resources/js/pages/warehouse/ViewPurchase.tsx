import { Head, router } from '@inertiajs/react';
import { ArrowLeft, Edit2, Printer, Building2, UserSquare, CalendarDays, FileText, BadgePercent, ShieldAlert } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    email?: string;
    address?: string;
};

type TaxCategory = {
    id: number;
    name: string;
    tax_percent: number;
    type: 'inclusive' | 'exclusive';
};

type PurchaseItem = {
    id: number;
    product_variant_id: number;
    product_name?: string;
    quantity: number;
    cost_price: number;
    selling_price: number;
    mrp: number;
    tax_id: number;
    tax_category?: TaxCategory;
    batch_no: string;
    expiry_date?: string;
};

type Purchase = {
    id: number;
    vendor_id: number;
    vendor?: Vendor;
    invoice_no: string;
    image_url?: string; // Pointing to the new structured ImageStorageService asset path resolving URL
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
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const INR = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(n);

const localeDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

function itemBreakdown(item: PurchaseItem) {
    const tc    = item.tax_category;
    const gross = item.quantity * item.cost_price;

    if (!tc) return { subtotal: gross, tax: 0, total: gross };

    if (tc.type === 'inclusive') {
        const base = gross / (1 + tc.tax_percent / 100);
        return { subtotal: base, tax: gross - base, total: gross };
    }

    const tax = (gross * tc.tax_percent) / 100;
    return { subtotal: gross, tax, total: gross + tax };
}

// ─────────────────────────────────────────────
// Page Component
// ─────────────────────────────────────────────
export default function ViewPurchase({ purchase }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: dashboard().url },
        { title: 'Purchases', href: '/warehouse/purchases' },
        { title: purchase.invoice_no, href: '' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Purchase Order - ${purchase.invoice_no}`} />

            <div className="flex flex-col gap-4 p-6 text-foreground max-w-7xl mx-auto w-full">

                {/* Header Actions - Hidden on Print */}
                <div className="flex items-center justify-between print:hidden gap-3">
                    <Button variant="outline" onClick={() => router.get('/warehouse/purchases')} className="h-10 bg-card text-card-foreground">
                        <ArrowLeft className="mr-2 size-4" /> Back to List
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => window.print()} className="h-10 bg-card text-card-foreground">
                            <Printer className="mr-2 size-4" /> Print Document
                        </Button>
                        {purchase.status === 'draft' && (
                            <Button onClick={() => router.get(`/warehouse/purchases/${purchase.id}/edit`)} className="h-10 shadow-sm font-medium">
                                <Edit2 className="mr-2 size-4" /> Edit Order Configuration
                            </Button>
                        )}
                    </div>
                </div>

                {/* Core Split Dashboard Grid */}
                <div className="grid gap-4 lg:grid-cols-3 items-start">

                    {/* Left/Middle Column: Details Manifest Block */}
                    <div className="lg:col-span-2 space-y-4">
                        <Card className="shadow-sm bg-card text-card-foreground">
                            <CardHeader className="pb-4 border-b">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <CardTitle className="text-2xl font-bold tracking-tight">Purchase Manifest</CardTitle>
                                        <CardDescription className="font-medium font-mono text-primary flex items-center gap-1.5 mt-1">
                                            <FileText className="size-4 text-muted-foreground" /> Invoice ID: {purchase.invoice_no}
                                        </CardDescription>
                                    </div>
                                    <Badge
                                        variant={purchase.status === 'confirmed' ? 'default' : 'secondary'}
                                        className={`px-3 py-1 text-xs tracking-wide font-semibold capitalize ${purchase.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}`}
                                    >
                                        {purchase.status}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="grid gap-6 sm:grid-cols-2">

                                    {/* Supplier Vendor card segment */}
                                    <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
                                        <h3 className="text-sm font-bold tracking-wider uppercase text-muted-foreground flex items-center gap-1.5">
                                            <UserSquare className="size-4 text-primary" /> Supplier Details
                                        </h3>
                                        <dl className="space-y-2 text-sm">
                                            <div className="flex justify-between border-b pb-1.5"><dt className="text-muted-foreground">Name</dt><dd className="font-semibold">{purchase.vendor?.name}</dd></div>
                                            <div className="flex justify-between border-b pb-1.5"><dt className="text-muted-foreground">Contact Phone</dt><dd className="font-medium font-mono">{purchase.vendor?.phone}</dd></div>
                                            {purchase.vendor?.gstin && <div className="flex justify-between border-b pb-1.5"><dt className="text-muted-foreground">GSTIN Code</dt><dd className="font-mono font-semibold text-primary">{purchase.vendor.gstin}</dd></div>}
                                            {purchase.vendor?.email && <div className="flex justify-between border-b pb-1.5"><dt className="text-muted-foreground">Email</dt><dd className="font-medium">{purchase.vendor.email}</dd></div>}
                                            {purchase.vendor?.address && <div className="flex flex-col pt-0.5"><dt className="text-muted-foreground pb-0.5">Address</dt><dd className="text-xs font-medium leading-relaxed">{purchase.vendor.address}</dd></div>}
                                        </dl>
                                    </div>

                                    {/* Order Dates segment */}
                                    <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
                                        <h3 className="text-sm font-bold tracking-wider uppercase text-muted-foreground flex items-center gap-1.5">
                                            <CalendarDays className="size-4 text-primary" /> Audit Timelines
                                        </h3>
                                        <dl className="space-y-2 text-sm">
                                            <div className="flex justify-between border-b pb-1.5"><dt className="text-muted-foreground">Invoice Date</dt><dd className="font-semibold">{localeDate(purchase.purchase_date)}</dd></div>
                                            <div className="flex justify-between border-b pb-1.5"><dt className="text-muted-foreground">System Log Date</dt><dd className="font-medium">{localeDate(purchase.created_at)}</dd></div>
                                            <div className="flex justify-between border-b pb-1.5"><dt className="text-muted-foreground">Operational Status</dt><dd className="font-bold uppercase tracking-wider text-xs">{purchase.status}</dd></div>
                                        </dl>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Physical Invoice Image Scan Attachment Frame */}
                    <div className="space-y-4 print:hidden">
                        <Card className="shadow-sm bg-card text-card-foreground h-full min-h-[295px]">
                            <CardHeader className="pb-3 border-b">
                                <CardTitle className="text-sm font-bold tracking-wider uppercase text-muted-foreground flex items-center gap-1.5">
                                    <Building2 className="size-4 text-primary" /> Document Attachment Scan
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 flex flex-col items-center justify-center h-[calc(100%-60px)]">
                                {purchase.image_url ? (
                                    <a href={purchase.image_url} target="_blank" rel="noopener noreferrer" className="group relative block w-full overflow-hidden rounded-lg border shadow-sm cursor-zoom-in">
                                        <img
                                            src={purchase.image_url}
                                            alt={`Invoice Scan ${purchase.invoice_no}`}
                                            className="w-full max-h-56 object-cover object-top group-hover:scale-105 transition-transform duration-300"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-semibold tracking-wide">
                                            Click to Open Full View
                                        </div>
                                    </a>
                                ) : (
                                    <div className="text-center py-8 space-y-2 text-muted-foreground">
                                        <ShieldAlert className="size-10 mx-auto opacity-40 text-amber-500" />
                                        <p className="text-xs font-medium">No image or digital slip file was uploaded with this transaction manifest.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Purchase Line Items Ledger Grid Panel */}
                <Card className="shadow-sm bg-card text-card-foreground mt-1">
                    <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-lg font-bold tracking-tight">Line Items Ledger</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="w-12 text-center font-semibold">#</TableHead>
                                        <TableHead className="font-semibold">Product SKU Reference</TableHead>
                                        <TableHead className="font-semibold">Batch No</TableHead>
                                        <TableHead className="font-semibold">Expiry Date</TableHead>
                                        <TableHead className="text-right font-semibold">Qty</TableHead>
                                        <TableHead className="text-right font-semibold">Cost Price</TableHead>
                                        <TableHead className="text-right font-semibold">MRP Valuation</TableHead>
                                        <TableHead className="font-semibold">Tax Category Bracket</TableHead>
                                        <TableHead className="text-right font-semibold">Base Net</TableHead>
                                        <TableHead className="text-right font-semibold">Tax Gross</TableHead>
                                        <TableHead className="text-right font-semibold">Line Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {purchase.items?.map((item, index) => {
                                        const { subtotal, tax, total } = itemBreakdown(item);
                                        const tc = item.tax_category;
                                        return (
                                            <TableRow key={item.id} className="hover:bg-muted/20 transition-colors border-b">
                                                <TableCell className="text-center font-medium text-muted-foreground">{index + 1}</TableCell>
                                                <TableCell className="font-semibold text-foreground">{item.product_name ?? '—'}</TableCell>
                                                <TableCell className="font-mono font-medium text-xs text-primary">{item.batch_no}</TableCell>
                                                <TableCell className="whitespace-nowrap font-medium text-xs">
                                                    {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : <span className="text-muted-foreground">—</span>}
                                                </TableCell>
                                                <TableCell className="text-right font-mono font-medium">{item.quantity}</TableCell>
                                                <TableCell className="text-right font-mono text-muted-foreground">{INR(item.cost_price)}</TableCell>
                                                <TableCell className="text-right font-mono text-muted-foreground font-medium">{INR(item.mrp)}</TableCell>
                                                <TableCell>
                                                    {tc ? (
                                                        <div className="flex flex-col gap-0.5 text-xs">
                                                            <span className="font-bold flex items-center gap-0.5 text-muted-foreground"><BadgePercent className="size-3 text-primary" /> {tc.name}</span>
                                                            <span className="text-[10px] text-muted-foreground/80 font-mono capitalize">{tc.tax_percent}% ({tc.type})</span>
                                                        </div>
                                                    ) : <span className="text-muted-foreground font-mono">—</span>}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-muted-foreground">{INR(subtotal)}</TableCell>
                                                <TableCell className="text-right font-mono text-muted-foreground">{INR(tax)}</TableCell>
                                                <TableCell className="text-right font-mono font-bold text-foreground">{INR(total)}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Calculated Consolidated Financial Summary Sheet Panel */}
                        <div className="p-6 border-t bg-muted/10 flex justify-end">
                            <dl className="w-full max-w-xs space-y-2.5 text-sm">
                                <div className="flex justify-between text-muted-foreground">
                                    <dt className="font-medium">Total Net Subtotal</dt>
                                    <dd className="font-mono font-semibold">{INR(purchase.subtotal)}</dd>
                                </div>
                                <div className="flex justify-between text-muted-foreground">
                                    <dt className="font-medium">Consolidated Tax Mass</dt>
                                    <dd className="font-mono font-semibold">{INR(purchase.tax_amount)}</dd>
                                </div>
                                <div className="flex justify-between border-t pt-2.5 text-xl font-bold text-foreground">
                                    <dt>Grand Total amount</dt>
                                    <dd className="font-mono text-primary">{INR(purchase.total_amount)}</dd>
                                </div>
                            </dl>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
