import { Head, router } from '@inertiajs/react';
import React from 'react';
import {
    ArrowLeft,
    Printer,
    Edit2,
    User,
    Phone,
    Calendar,
    CreditCard,
    Package,
    Receipt,
} from 'lucide-react';

import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import type { BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
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
type Customer = {
    id: number;
    name: string;
    phone: string;
    credit_limit: number;
};

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
};

type Payment = {
    id: number;
    method: string;
    amount: number;
    reference_no: string;
    created_at: string;
};

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

type Props = {
    sale: Sale;
};

export default function SaleDetails({ sale }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: dashboard().url },
        { title: 'Sales', href: '/sales' },
        { title: sale.order_number, href: '' },
    ];

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
            completed: 'default',
            pending: 'secondary',
            processing: 'outline',
            cancelled: 'destructive',
        };
        return <Badge variant={variants[status] || 'outline'}>{status.toUpperCase()}</Badge>;
    };

    const calculateItemTotal = (item: OrderItem) => {
        const subtotal = item.quantity * item.price;
        const afterDiscount = subtotal - item.discount;
        //const tax = (afterDiscount * item.tax_percent) / 100;
        const tax = 0;
        return afterDiscount + tax;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Sale ${sale.order_number}`} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Button variant="outline" size="icon" onClick={() => router.visit('/sales')}>
                                    <ArrowLeft className="size-4" />
                                </Button>
                                <div>
                                    <CardTitle className="text-2xl">Sale Details</CardTitle>
                                    <CardDescription>Order #{sale.order_number}</CardDescription>
                                </div>
                                {getStatusBadge(sale.status)}
                            </div>
                            <div className="flex gap-2">
                                {sale.status !== 'completed' && (
                                    <Button
                                        variant="outline"
                                        onClick={() => router.visit(`/sales/${sale.id}/edit`)}
                                    >
                                        <Edit2 className="mr-2 size-4" />
                                        Edit
                                    </Button>
                                )}
                                <Button onClick={() => window.open(`/sales/${sale.id}/print`, '_blank')}>
                                    <Printer className="mr-2 size-4" />
                                    Print
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                <div className="grid gap-4 md:grid-cols-3">
                    {/* Customer Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <User className="size-4" />
                                Customer Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <div className="text-sm text-muted-foreground">Name</div>
                                <div className="font-medium">
                                    {sale.customer?.name || 'Walk-in Customer'}
                                </div>
                            </div>
                            {sale.customer?.phone && (
                                <div>
                                    <div className="text-sm text-muted-foreground">Phone</div>
                                    <div className="flex items-center gap-2">
                                        <Phone className="size-4 text-muted-foreground" />
                                        <span className="font-medium">{sale.customer.phone}</span>
                                    </div>
                                </div>
                            )}
                            {sale.customer?.credit_limit && (
                                <div>
                                    <div className="text-sm text-muted-foreground">Credit Limit</div>
                                    <div className="font-medium">₹{Number(sale.customer.credit_limit).toFixed(2)}</div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Order Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Receipt className="size-4" />
                                Order Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <div className="text-sm text-muted-foreground">Order Number</div>
                                <div className="font-mono font-medium">{sale.order_number}</div>
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground">Order Date</div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="size-4 text-muted-foreground" />
                                    <span className="font-medium">
                                        {new Date(sale.created_at).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground">Channel</div>
                                <Badge variant="outline">{sale.order_channel}</Badge>
                            </div>
                            {sale.created_by && (
                                <div>
                                    <div className="text-sm text-muted-foreground">Created By</div>
                                    <div className="font-medium">{sale.created_by.name}</div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Payment Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <CreditCard className="size-4" />
                                Payment Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {sale.payments.map((payment) => (
                                <div key={payment.id} className="space-y-2">
                                    <div>
                                        <div className="text-sm text-muted-foreground">Payment Method</div>
                                        <Badge>{payment.method.toUpperCase()}</Badge>
                                    </div>
                                    <div>
                                        <div className="text-sm text-muted-foreground">Amount</div>
                                        <div className="font-medium">₹{Number(payment.amount).toFixed(2)}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-muted-foreground">Reference</div>
                                        <div className="font-mono text-sm">{payment.reference_no}</div>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* Order Items */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="size-4" />
                            Order Items
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12.5">#</TableHead>
                                    <TableHead>Product</TableHead>
                                    <TableHead>SKU</TableHead>
                                    <TableHead className="text-right">Qty</TableHead>
                                    <TableHead className="text-right">Price</TableHead>
                                    <TableHead className="text-right">Discount</TableHead>
                                    <TableHead className="text-right">Tax</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sale.items.map((item, index) => (
                                    <TableRow key={item.id}>
                                        <TableCell>{index + 1}</TableCell>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">
                                                    {item.product_variant.product.name}
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    {item.product_variant.variant_name}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-sm">
                                            {item.product_variant.sku}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {item.quantity}
                                            {/* {item.product_variant.unit.symbol} */}
                                        </TableCell>
                                        <TableCell className="text-right">₹{Number(item.price).toFixed(2)}</TableCell>
                                        <TableCell className="text-right">₹{Number(item.discount).toFixed(2)}</TableCell>
                                        <TableCell className="text-right">{Number(item.tax_percent).toFixed(2)}%</TableCell>
                                        <TableCell className="text-right font-medium">
                                            ₹{Number(calculateItemTotal(item)).toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Summary */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex justify-end">
                            <div className="w-full max-w-md space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Subtotal:</span>
                                    <span className="font-medium">₹{Number(sale.subtotal).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Discount:</span>
                                    <span className="font-medium text-red-600">
                                        -₹{Number(sale.discount_amount).toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Tax:</span>
                                    <span className="font-medium">₹{Number(sale.tax_amount).toFixed(2)}</span>
                                </div>
                                <div className="border-t" />
                                <div className="flex justify-between text-lg">
                                    <span className="font-semibold">Total Amount:</span>
                                    <span className="font-bold">₹{Number(sale.total_amount).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
