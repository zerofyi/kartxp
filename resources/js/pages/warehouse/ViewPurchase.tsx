import { Head, router } from '@inertiajs/react';
import { ArrowLeft, Edit2, Printer } from 'lucide-react';

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
    // Server-computed per-item tax breakdown (add these columns to the API response
    // if you want to avoid re-computing on the client)
    item_subtotal?: number;
    item_tax?: number;
    item_total?: number;
};

type Purchase = {
    id: number;
    vendor_id: number;
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
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const INR = (n: number) =>
    new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const localeDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

/**
 * Derive per-row subtotal/tax/total from the tax category.
 * The server stores the aggregate correctly; this is display-only.
 */
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
// Page
// ─────────────────────────────────────────────
export default function ViewPurchase({ purchase }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: dashboard().url },
        { title: 'Purchases', href: '/warehouse/purchases' },
        { title: purchase.invoice_no, href: '' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Purchase ${purchase.invoice_no}`} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">

                {/* Header Actions */}
                <Card className="print:hidden">
                    <CardContent className="flex items-center justify-between p-4">
                        <Button variant="outline" onClick={() => router.get('/warehouse/purchases')}>
                            <ArrowLeft className="mr-2 size-4" aria-hidden />
                            Back to List
                        </Button>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => window.print()}>
                                <Printer className="mr-2 size-4" aria-hidden />
                                Print
                            </Button>
                            {purchase.status === 'draft' && (
                                <Button onClick={() => router.get(`/warehouse/purchases/${purchase.id}/edit`)}>
                                    <Edit2 className="mr-2 size-4" aria-hidden />
                                    Edit Purchase
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Purchase Details */}
                <Card>
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <div>
                                <CardTitle className="text-2xl">Purchase Order</CardTitle>
                                <CardDescription className="mt-1">Invoice: {purchase.invoice_no}</CardDescription>
                            </div>
                            <Badge
                                variant={purchase.status === 'confirmed' ? 'default' : 'secondary'}
                                className="text-sm capitalize"
                            >
                                {purchase.status}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-6 md:grid-cols-2">
                            {/* Vendor */}
                            <div className="space-y-3">
                                <h3 className="text-lg font-semibold">Vendor Details</h3>
                                <dl className="space-y-2 text-sm">
                                    <div className="flex gap-2">
                                        <dt className="text-muted-foreground">Name:</dt>
                                        <dd className="font-medium">{purchase.vendor?.name}</dd>
                                    </div>
                                    <div className="flex gap-2">
                                        <dt className="text-muted-foreground">Phone:</dt>
                                        <dd className="font-medium">{purchase.vendor?.phone}</dd>
                                    </div>
                                    {purchase.vendor?.gstin && (
                                        <div className="flex gap-2">
                                            <dt className="text-muted-foreground">GSTIN:</dt>
                                            <dd className="font-mono font-medium">{purchase.vendor.gstin}</dd>
                                        </div>
                                    )}
                                    {purchase.vendor?.email && (
                                        <div className="flex gap-2">
                                            <dt className="text-muted-foreground">Email:</dt>
                                            <dd className="font-medium">{purchase.vendor.email}</dd>
                                        </div>
                                    )}
                                    {purchase.vendor?.address && (
                                        <div className="flex gap-2">
                                            <dt className="text-muted-foreground">Address:</dt>
                                            <dd className="font-medium">{purchase.vendor.address}</dd>
                                        </div>
                                    )}
                                </dl>
                            </div>

                            {/* Purchase info */}
                            <div className="space-y-3">
                                <h3 className="text-lg font-semibold">Purchase Details</h3>
                                <dl className="space-y-2 text-sm">
                                    <div className="flex gap-2">
                                        <dt className="text-muted-foreground">Invoice No:</dt>
                                        <dd className="font-mono font-medium">{purchase.invoice_no}</dd>
                                    </div>
                                    <div className="flex gap-2">
                                        <dt className="text-muted-foreground">Purchase Date:</dt>
                                        <dd className="font-medium">{localeDate(purchase.purchase_date)}</dd>
                                    </div>
                                    <div className="flex gap-2">
                                        <dt className="text-muted-foreground">Created On:</dt>
                                        <dd className="font-medium">{localeDate(purchase.created_at)}</dd>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <dt className="text-muted-foreground">Status:</dt>
                                        <dd>
                                            <Badge
                                                variant={purchase.status === 'confirmed' ? 'default' : 'secondary'}
                                                className="capitalize"
                                            >
                                                {purchase.status}
                                            </Badge>
                                        </dd>
                                    </div>
                                </dl>
                            </div>
                        </div>

                        {/* Invoice Image */}
                        {purchase.image_path && (
                            <div className="mt-6">
                                <h3 className="mb-3 text-lg font-semibold">Invoice Image</h3>
                                <img
                                    src={`/storage/${purchase.image_path}`}
                                    alt={`Invoice ${purchase.invoice_no}`}
                                    className="max-w-md rounded-lg border"
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Purchase Items */}
                <Card>
                    <CardHeader>
                        <CardTitle>Purchase Items</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-10">#</TableHead>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Batch No</TableHead>
                                        <TableHead>Expiry</TableHead>
                                        <TableHead className="text-right">Qty</TableHead>
                                        <TableHead className="text-right">Cost</TableHead>
                                        <TableHead className="text-right">MRP</TableHead>
                                        <TableHead>Tax</TableHead>
                                        <TableHead className="text-right">Subtotal</TableHead>
                                        <TableHead className="text-right">Tax Amt</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {purchase.items?.map((item, index) => {
                                        const { subtotal, tax, total } = itemBreakdown(item);
                                        const tc = item.tax_category;
                                        return (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium">{index + 1}</TableCell>
                                                <TableCell>{item.product_name ?? '—'}</TableCell>
                                                <TableCell className="font-mono text-sm">{item.batch_no}</TableCell>
                                                <TableCell className="text-sm">
                                                    {item.expiry_date
                                                        ? new Date(item.expiry_date).toLocaleDateString('en-IN')
                                                        : '—'}
                                                </TableCell>
                                                <TableCell className="text-right">{item.quantity}</TableCell>
                                                <TableCell className="text-right">₹{INR(item.cost_price)}</TableCell>
                                                <TableCell className="text-right">₹{INR(item.mrp)}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {tc ? (
                                                        <>{tc.name}<br />{tc.tax_percent}% {tc.type === 'inclusive' ? 'Inc' : 'Exc'}</>
                                                    ) : '—'}
                                                </TableCell>
                                                <TableCell className="text-right">₹{INR(subtotal)}</TableCell>
                                                <TableCell className="text-right">₹{INR(tax)}</TableCell>
                                                <TableCell className="text-right font-medium">₹{INR(total)}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Summary */}
                        <div className="mt-6 flex justify-end">
                            <dl className="w-full max-w-xs space-y-2">
                                <div className="flex justify-between text-sm">
                                    <dt className="text-muted-foreground">Subtotal:</dt>
                                    <dd className="font-medium">₹{INR(purchase.subtotal)}</dd>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <dt className="text-muted-foreground">Tax Amount:</dt>
                                    <dd className="font-medium">₹{INR(purchase.tax_amount)}</dd>
                                </div>
                                <div className="flex justify-between border-t pt-2 text-lg font-semibold">
                                    <dt>Total Amount:</dt>
                                    <dd>₹{INR(purchase.total_amount)}</dd>
                                </div>
                            </dl>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
