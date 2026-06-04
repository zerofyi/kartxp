import { Head, router } from '@inertiajs/react';
import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Download, FileText, Filter } from 'lucide-react';

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

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: dashboard().url },
    { title: 'Purchases', href: '/purchases' },
    { title: 'Reports', href: '' },
];

type Vendor = {
    id: number;
    name: string;
    phone: string;
};

type Purchase = {
    id: number;
    vendor_id: number;
    vendor?: Vendor;
    invoice_no: string;
    purchase_date: string;
    subtotal: number;
    tax_amount: number;
    total_amount: number;
    status: 'draft' | 'confirmed';
    items_count?: number;
};

type Props = {
    purchases: Purchase[];
    vendors: Vendor[];
};

export default function PurchaseReport({ purchases = [], vendors = [] }: Props) {
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [vendorFilter, setVendorFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'confirmed'>('all');

    // Format numbers with proper rounding and commas
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            maximumFractionDigits: 2,
            minimumFractionDigits: 2,
        }).format(amount);
    };

    // Filter purchases with proper date comparison
    const filteredPurchases = useMemo(() => {
        return purchases.filter((purchase) => {
            const purchaseDate = new Date(purchase.purchase_date);
            purchaseDate.setHours(0, 0, 0, 0); // Normalize time for date comparison

            let matchesDateFrom = true;
            let matchesDateTo = true;

            if (dateFrom) {
                const fromDate = new Date(dateFrom);
                fromDate.setHours(0, 0, 0, 0);
                matchesDateFrom = purchaseDate >= fromDate;
            }

            if (dateTo) {
                const toDate = new Date(dateTo);
                toDate.setHours(23, 59, 59, 999); // Include entire end date
                matchesDateTo = purchaseDate <= toDate;
            }

            const matchesVendor = vendorFilter === 'all' || purchase.vendor_id.toString() === vendorFilter;
            const matchesStatus = statusFilter === 'all' || purchase.status === statusFilter;

            return matchesDateFrom && matchesDateTo && matchesVendor && matchesStatus;
        });
    }, [purchases, dateFrom, dateTo, vendorFilter, statusFilter]);

    // Calculate summary statistics with proper rounding
    const summary = useMemo(() => {
        const totalAmount = filteredPurchases.reduce((sum, p) => sum + p.total_amount, 0);
        const totalTax = filteredPurchases.reduce((sum, p) => sum + p.tax_amount, 0);
        const totalSubtotal = filteredPurchases.reduce((sum, p) => sum + p.subtotal, 0);

        return {
            totalPurchases: filteredPurchases.length,
            totalAmount: parseFloat(Number(totalAmount).toFixed(2)),
            totalTax: parseFloat(Number(totalTax).toFixed(2)),
            totalSubtotal: parseFloat(Number(totalSubtotal).toFixed(2)),
            confirmedCount: filteredPurchases.filter((p) => p.status === 'confirmed').length,
            draftCount: filteredPurchases.filter((p) => p.status === 'draft').length,
        };
    }, [filteredPurchases]);

    const handleExport = () => {
        // Create CSV content with proper formatting
        const headers = ['Invoice No', 'Date', 'Vendor', 'Status', 'Subtotal', 'Tax', 'Total'];
        const rows = filteredPurchases.map((p) => [
            `"${p.invoice_no}"`, // Wrap in quotes in case invoice numbers have special characters
            new Date(p.purchase_date).toLocaleDateString('en-IN'),
            `"${p.vendor?.name || ''}"`,
            p.status,
            formatCurrency(p.subtotal),
            formatCurrency(p.tax_amount),
            formatCurrency(p.total_amount),
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map((row) => row.join(',')),
        ].join('\n');

        // Download CSV
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' }); // BOM for UTF-8
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `purchase-report-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handlePrint = () => {
        window.print();
    };

    // Calculate vendor-wise summary
    const vendorSummary = useMemo(() => {
        return Object.entries(
            filteredPurchases.reduce((acc, purchase) => {
                const vendorName = purchase.vendor?.name || 'Unknown';
                if (!acc[vendorName]) {
                    acc[vendorName] = {
                        count: 0,
                        total: 0,
                        vendorId: purchase.vendor_id
                    };
                }
                acc[vendorName].count += 1;
                acc[vendorName].total += purchase.total_amount;
                return acc;
            }, {} as Record<string, { count: number; total: number; vendorId: number }>)
        ).sort(([nameA], [nameB]) => nameA.localeCompare(nameB)); // Sort alphabetically
    }, [filteredPurchases]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Purchase Reports" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header */}
                <Card className="print:hidden">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-2xl">Purchase Reports</CardTitle>
                                <CardDescription>Analyze your purchase history and trends</CardDescription>
                            </div>
                            <Button variant="outline" onClick={() => router.get('/purchases')}>
                                <ArrowLeft className="mr-2 size-4" />
                                Back to Purchases
                            </Button>
                        </div>
                    </CardHeader>
                </Card>

                {/* Filters */}
                <Card className="print:hidden">
                    <CardHeader>
                        <CardTitle className="flex items-center text-lg">
                            <Filter className="mr-2 size-5" />
                            Filter Options
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-4">
                            <div className="space-y-2">
                                <Label htmlFor="date_from">Date From</Label>
                                <Input
                                    id="date_from"
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    max={dateTo || undefined}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="date_to">Date To</Label>
                                <Input
                                    id="date_to"
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    min={dateFrom || undefined}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="vendor">Vendor</Label>
                                <Select value={vendorFilter} onValueChange={setVendorFilter}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select vendor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Vendors</SelectItem>
                                        {vendors.map((vendor) => (
                                            <SelectItem key={vendor.id} value={vendor.id.toString()}>
                                                {vendor.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                                <Select
                                    value={statusFilter}
                                    onValueChange={(value: 'all' | 'draft' | 'confirmed') => setStatusFilter(value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="confirmed">Confirmed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="mt-4 flex gap-2">
                            <Button
                                variant="outline"
                                onClick={handleExport}
                                disabled={filteredPurchases.length === 0}
                            >
                                <Download className="mr-2 size-4" />
                                Export CSV
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handlePrint}
                                disabled={filteredPurchases.length === 0}
                            >
                                <FileText className="mr-2 size-4" />
                                Print Report
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setDateFrom('');
                                    setDateTo('');
                                    setVendorFilter('all');
                                    setStatusFilter('all');
                                }}
                                className="ml-auto"
                            >
                                Clear Filters
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardDescription>Total Purchases</CardDescription>
                            <CardTitle className="text-3xl">{summary.totalPurchases}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xs text-muted-foreground">
                                {summary.confirmedCount} confirmed, {summary.draftCount} draft
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardDescription>Total Amount</CardDescription>
                            <CardTitle className="text-3xl">₹{formatCurrency(summary.totalAmount)}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xs text-muted-foreground">
                                Across all filtered purchases
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardDescription>Subtotal</CardDescription>
                            <CardTitle className="text-3xl">₹{formatCurrency(summary.totalSubtotal)}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xs text-muted-foreground">
                                Before taxes
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardDescription>Total Tax</CardDescription>
                            <CardTitle className="text-3xl">₹{formatCurrency(summary.totalTax)}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xs text-muted-foreground">
                                Tax amount paid
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Purchase Details Table */}
                <Card className="flex-1 overflow-hidden">
                    <CardHeader>
                        <CardTitle>Purchase Details ({filteredPurchases.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-auto max-h-150">
                            <Table>
                                <TableHeader className="sticky top-0 bg-muted/50">
                                    <TableRow>
                                        <TableHead>Invoice No</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Vendor</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Subtotal</TableHead>
                                        <TableHead className="text-right">Tax</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredPurchases.length > 0 ? (
                                        filteredPurchases.map((purchase) => (
                                            <TableRow key={purchase.id}>
                                                <TableCell className="font-mono font-medium">
                                                    {purchase.invoice_no}
                                                </TableCell>
                                                <TableCell>
                                                    {new Date(purchase.purchase_date).toLocaleDateString('en-IN')}
                                                </TableCell>
                                                <TableCell>{purchase.vendor?.name || 'N/A'}</TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={purchase.status === 'confirmed' ? 'default' : 'secondary'}
                                                        className="capitalize"
                                                    >
                                                        {purchase.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    ₹{formatCurrency(purchase.subtotal)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    ₹{formatCurrency(purchase.tax_amount)}
                                                </TableCell>
                                                <TableCell className="text-right font-semibold">
                                                    ₹{formatCurrency(purchase.total_amount)}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                                No purchases match your filters.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {/* Vendor-wise Summary */}
                {filteredPurchases.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Vendor-wise Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Vendor Name</TableHead>
                                        <TableHead className="text-right">Purchase Count</TableHead>
                                        <TableHead className="text-right">Total Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {vendorSummary.map(([vendorName, data]) => (
                                        <TableRow key={`${vendorName}-${data.vendorId}`}>
                                            <TableCell className="font-medium">{vendorName}</TableCell>
                                            <TableCell className="text-right">{data.count}</TableCell>
                                            <TableCell className="text-right font-semibold">
                                                ₹{formatCurrency(data.total)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {/* Total Row */}
                                    <TableRow className="bg-muted/50 font-semibold">
                                        <TableCell className="font-medium">Total</TableCell>
                                        <TableCell className="text-right">{summary.totalPurchases}</TableCell>
                                        <TableCell className="text-right">₹{formatCurrency(summary.totalAmount)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
