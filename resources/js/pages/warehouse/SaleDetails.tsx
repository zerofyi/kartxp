import { Head, router } from '@inertiajs/react';
import React, { useMemo } from 'react';
import {
    ArrowLeft, Printer, User, Phone,
    Calendar, CreditCard, Package, Receipt,
} from 'lucide-react';

import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import type { BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type Customer = { id: number; name: string; phone: string; credit_limit: number };

type OrderItem = {
    id: number;
    product_variant: {
        product: { name: string };
        variant_name: string;
        sku: string;
        unit: { symbol: string };
    };
    quantity: number;
    price: number;
    discount: number;
    tax_percent: number;
    tax_type?: 'inclusive' | 'exclusive';
};

type Payment = { id: number; method: string; amount: number; reference_no: string; created_at: string };

type Sale = {
    id: number;
    order_number: string;
    order_channel: string;
    customer?: Customer;
    status: string;
    subtotal: number;
    tax_amount: number;
    discount_amount: number;
    total_amount: number;
    items: OrderItem[];
    payments: Payment[];
    created_at: string;
    created_by?: { name: string };
};

type Props = { sale: Sale };

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    completed: 'default', pending: 'secondary', processing: 'outline', cancelled: 'destructive',
};

function fmtCurrency(val: number | string) {
    return `₹${Number(val).toFixed(2)}`;
}

// Correct tax-aware item total matching the controller logic
function calcItemTotal(item: OrderItem): number {
    const taxType = item.tax_type ?? 'inclusive';
    if (taxType === 'inclusive') {
        // Tax already baked into price — total is simply qty×rate minus discount
        return Math.max(0, item.quantity * item.price - item.discount);
    }
    // Exclusive — add tax on top of base after discount
    const base = Math.max(0, item.quantity * item.price - item.discount);
    return base + base * item.tax_percent / 100;
}

// ─────────────────────────────────────────────
// Sub-components (memoized)
// ─────────────────────────────────────────────
const InfoRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="font-medium">{children}</div>
    </div>
);

const SummaryRow = ({ label, value, accent, large, border }: {
    label: string; value: string; accent?: string; large?: boolean; border?: boolean;
}) => (
    <div className={`flex justify-between ${large ? 'text-lg' : 'text-sm'} ${border ? 'border-t pt-3 mt-1' : ''}`}>
        <span className={large ? 'font-semibold' : 'text-muted-foreground'}>{label}</span>
        <span className={`font-${large ? 'bold' : 'medium'} ${accent ?? ''}`}>{value}</span>
    </div>
);

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────
export default function SaleDetails({ sale }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: dashboard().url },
        { title: 'Sales', href: '/warehouse/sales' },
        { title: sale.order_number, href: '' },
    ];

    const totalPaid = useMemo(
        () => sale.payments.reduce((s, p) => s + Number(p.amount), 0),
        [sale.payments]
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Sale ${sale.order_number}`} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">

                {/* ── Header ──────────────────────────────────────── */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Button variant="outline" size="icon" onClick={() => router.visit('/warehouse/sales')}>
                                    <ArrowLeft className="size-4" />
                                </Button>
                                <div>
                                    <h1 className="text-2xl font-bold">Sale Details</h1>
                                    <p className="text-sm text-muted-foreground">Order #{sale.order_number}</p>
                                </div>
                                <Badge variant={STATUS_VARIANTS[sale.status] ?? 'outline'}>
                                    {sale.status.toUpperCase()}
                                </Badge>
                            </div>
                            <Button onClick={() => window.open(`/warehouse/sales/${sale.id}/print`, '_blank')}>
                                <Printer className="mr-2 size-4" /> Print Invoice
                            </Button>
                        </div>
                    </CardHeader>
                </Card>

                {/* ── Info cards ──────────────────────────────────── */}
                <div className="grid gap-4 md:grid-cols-3">

                    {/* Customer */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <User className="size-4" /> Customer Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <InfoRow label="Name">{sale.customer?.name ?? 'Walk-in Customer'}</InfoRow>
                            {sale.customer?.phone && (
                                <InfoRow label="Phone">
                                    <span className="flex items-center gap-2">
                                        <Phone className="size-4 text-muted-foreground" />
                                        {sale.customer.phone}
                                    </span>
                                </InfoRow>
                            )}
                            {sale.customer?.credit_limit != null && sale.customer.credit_limit > 0 && (
                                <InfoRow label="Credit Limit">{fmtCurrency(sale.customer.credit_limit)}</InfoRow>
                            )}
                        </CardContent>
                    </Card>

                    {/* Order */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Receipt className="size-4" /> Order Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <InfoRow label="Order Number">
                                <span className="font-mono">{sale.order_number}</span>
                            </InfoRow>
                            <InfoRow label="Order Date">
                                <span className="flex items-center gap-2">
                                    <Calendar className="size-4 text-muted-foreground" />
                                    {new Date(sale.created_at).toLocaleString('en-IN')}
                                </span>
                            </InfoRow>
                            <InfoRow label="Channel">
                                <Badge variant="outline">{sale.order_channel}</Badge>
                            </InfoRow>
                            {sale.created_by && (
                                <InfoRow label="Created By">{sale.created_by.name}</InfoRow>
                            )}
                        </CardContent>
                    </Card>

                    {/* Payment */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <CreditCard className="size-4" /> Payment Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {sale.payments.map(payment => (
                                <div key={payment.id} className="space-y-2">
                                    <InfoRow label="Method">
                                        <Badge>{payment.method.toUpperCase()}</Badge>
                                    </InfoRow>
                                    <InfoRow label="Amount">{fmtCurrency(payment.amount)}</InfoRow>
                                    <InfoRow label="Reference">
                                        <span className="font-mono text-sm">{payment.reference_no}</span>
                                    </InfoRow>
                                </div>
                            ))}
                            {sale.payments.length === 0 && (
                                <p className="text-sm text-muted-foreground">No payment records.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* ── Items table ──────────────────────────────────── */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="size-4" /> Order Items
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10 pl-4">#</TableHead>
                                    <TableHead>Product</TableHead>
                                    <TableHead>SKU</TableHead>
                                    <TableHead className="text-right">Qty</TableHead>
                                    <TableHead className="text-right">Price</TableHead>
                                    <TableHead className="text-right">Discount</TableHead>
                                    <TableHead className="text-right">Tax</TableHead>
                                    <TableHead className="text-right pr-4">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sale.items.map((item, idx) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="pl-4">{idx + 1}</TableCell>
                                        <TableCell>
                                            <div className="font-medium">{item.product_variant.product.name}</div>
                                            <div className="text-sm text-muted-foreground">{item.product_variant.variant_name}</div>
                                        </TableCell>
                                        <TableCell className="font-mono text-sm">{item.product_variant.sku}</TableCell>
                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                        <TableCell className="text-right">{fmtCurrency(item.price)}</TableCell>
                                        <TableCell className="text-right text-red-600">
                                            {Number(item.discount) > 0 ? `-${fmtCurrency(item.discount)}` : '—'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className="text-xs text-muted-foreground">
                                                {Number(item.tax_percent).toFixed(0)}%
                                                {item.tax_type === 'inclusive' ? ' inc.' : ' exc.'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right font-medium pr-4">
                                            {fmtCurrency(calcItemTotal(item))}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* ── Summary ─────────────────────────────────────── */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex justify-end">
                            <div className="w-full max-w-sm space-y-2">
                                <SummaryRow label="Subtotal (excl. tax)" value={fmtCurrency(sale.subtotal)} />
                                {Number(sale.discount_amount) > 0 && (
                                    <SummaryRow label="Discount" value={`-${fmtCurrency(sale.discount_amount)}`} accent="text-red-600" />
                                )}
                                <SummaryRow label="Tax" value={fmtCurrency(sale.tax_amount)} />
                                <SummaryRow label="Total Amount" value={fmtCurrency(sale.total_amount)} large border />
                                <SummaryRow label="Amount Paid" value={fmtCurrency(totalPaid)} accent="text-green-600" />
                                {totalPaid < Number(sale.total_amount) && (
                                    <SummaryRow label="Balance Due" value={fmtCurrency(Number(sale.total_amount) - totalPaid)} accent="text-red-600" />
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

            </div>
        </AppLayout>
    );
}
