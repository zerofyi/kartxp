import { Head, router } from '@inertiajs/react';
import React from 'react';
import { ArrowLeft, Edit2, FileText, Printer } from 'lucide-react';

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

type Vendor = {
    id: number;
    name: string;
    phone: string;
    gstin?: string;
    email?: string;
    address?: string;
};

type PurchaseItem = {
    id: number;
    product_variant_id: number;
    product_name?: string;
    quantity: number;
    cost_price: number;
    selling_price: number;
    mrp: number;
    tax_percent: number;
    batch_no: string;
    expiry_date?: string;
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
    created_by?: number;
    created_at: string;
};

type Props = {
    purchase: Purchase;
};

export default function ViewPurchase({ purchase }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: dashboard().url },
        { title: 'Purchases', href: '/purchases' },
        { title: purchase.invoice_no, href: '' },
    ];

    const handlePrint = () => {
        window.print();
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Purchase ${purchase.invoice_no}`} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header Actions */}
                <Card className="print:hidden">
                    <CardContent className="flex items-center justify-between p-4">
                        <Button variant="outline" onClick={() => router.get('/purchases')}>
                            <ArrowLeft className="mr-2 size-4" />
                            Back to List
                        </Button>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={handlePrint}>
                                <Printer className="mr-2 size-4" />
                                Print
                            </Button>
                            {purchase.status === 'draft' && (
                                <Button onClick={() => router.get(`/purchases/${purchase.id}/edit`)}>
                                    <Edit2 className="mr-2 size-4" />
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
                            <Badge variant={purchase.status === 'confirmed' ? 'default' : 'secondary'} className="text-sm">
                                {purchase.status.toUpperCase()}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-6 md:grid-cols-2">
                            {/* Vendor Information */}
                            <div className="space-y-3">
                                <h3 className="font-semibold text-lg">Vendor Details</h3>
                                <div className="space-y-2 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Name:</span>
                                        <span className="ml-2 font-medium">{purchase.vendor?.name}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Phone:</span>
                                        <span className="ml-2 font-medium">{purchase.vendor?.phone}</span>
                                    </div>
                                    {purchase.vendor?.gstin && (
                                        <div>
                                            <span className="text-muted-foreground">GSTIN:</span>
                                            <span className="ml-2 font-medium">{purchase.vendor.gstin}</span>
                                        </div>
                                    )}
                                    {purchase.vendor?.email && (
                                        <div>
                                            <span className="text-muted-foreground">Email:</span>
                                            <span className="ml-2 font-medium">{purchase.vendor.email}</span>
                                        </div>
                                    )}
                                    {purchase.vendor?.address && (
                                        <div>
                                            <span className="text-muted-foreground">Address:</span>
                                            <span className="ml-2 font-medium">{purchase.vendor.address}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Purchase Information */}
                            <div className="space-y-3">
                                <h3 className="font-semibold text-lg">Purchase Details</h3>
                                <div className="space-y-2 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Invoice No:</span>
                                        <span className="ml-2 font-medium">{purchase.invoice_no}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Purchase Date:</span>
                                        <span className="ml-2 font-medium">
                                            {new Date(purchase.purchase_date).toLocaleDateString('en-IN', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                            })}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Created On:</span>
                                        <span className="ml-2 font-medium">
                                            {new Date(purchase.created_at).toLocaleDateString('en-IN', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                            })}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Status:</span>
                                        <Badge variant={purchase.status === 'confirmed' ? 'default' : 'secondary'} className="ml-2">
                                            {purchase.status}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Invoice Image */}
                        {purchase.image_path && (
                            <div className="mt-6">
                                <h3 className="font-semibold text-lg mb-3">Invoice Image</h3>
                                <img
                                    src={`/storage/${purchase.image_path}`}
                                    alt="Invoice"
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
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]">#</TableHead>
                                        <TableHead>Product Name</TableHead>
                                        <TableHead>Batch No</TableHead>
                                        <TableHead>Expiry Date</TableHead>
                                        <TableHead className="text-right">Qty</TableHead>
                                        <TableHead className="text-right">Cost Price</TableHead>
                                        <TableHead className="text-right">MRP</TableHead>
                                        <TableHead className="text-right">Tax %</TableHead>
                                        <TableHead className="text-right">Subtotal</TableHead>
                                        <TableHead className="text-right">Tax Amt</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {purchase.items?.map((item, index) => {
                                        const itemSubtotal = item.quantity * item.cost_price;
                                        const itemTax = (itemSubtotal * item.tax_percent) / 100;
                                        const itemTotal = itemSubtotal + itemTax;

                                        return (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium">{index + 1}</TableCell>
                                                <TableCell>{item.product_name}</TableCell>
                                                <TableCell>{item.batch_no}</TableCell>
                                                <TableCell>
                                                    {item.expiry_date
                                                        ? new Date(item.expiry_date).toLocaleDateString()
                                                        : '-'}
                                                </TableCell>
                                                <TableCell className="text-right">{item.quantity}</TableCell>
                                                <TableCell className="text-right">₹{item.cost_price}</TableCell>
                                                <TableCell className="text-right">₹{item.mrp}</TableCell>
                                                <TableCell className="text-right">{item.tax_percent}%</TableCell>
                                                <TableCell className="text-right">₹{itemSubtotal}</TableCell>
                                                <TableCell className="text-right">₹{itemTax}</TableCell>
                                                <TableCell className="text-right font-medium">₹{itemTotal}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Summary */}
                        <div className="mt-6 flex justify-end">
                            <div className="w-full max-w-xs space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Subtotal:</span>
                                    <span className="font-medium">₹{purchase.subtotal}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Tax Amount:</span>
                                    <span className="font-medium">₹{purchase.tax_amount}</span>
                                </div>
                                <div className="flex justify-between border-t pt-2 text-lg font-semibold">
                                    <span>Total Amount:</span>
                                    <span>₹{purchase.total_amount}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
