import { Head, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { ArrowLeft, Download, FileText, Filter } from 'lucide-react';

import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import type { BreadcrumbItem } from '@/types';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
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

const ROUTES = {
    purchases: '/warehouse/purchases',
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: dashboard().url },
    { title: 'Purchases', href: ROUTES.purchases },
    { title: 'Reports', href: '' },
];

type PurchaseStatus = 'draft' | 'confirmed';

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
    status: PurchaseStatus;
    items_count?: number;
};

type Props = Readonly<{
    purchases: Purchase[];
    vendors: Vendor[];
}>;

export default function PurchaseReport({
    purchases = [],
    vendors = [],
}: Props) {
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [vendorFilter, setVendorFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState<
        'all' | PurchaseStatus
    >('all');

    const currencyFormatter = useMemo(
        () =>
            new Intl.NumberFormat('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }),
        []
    );

    const dateFormatter = useMemo(
        () =>
            new Intl.DateTimeFormat('en-IN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            }),
        []
    );

    const formatCurrency = (amount: number) =>
        currencyFormatter.format(amount);

    const fromTimestamp = useMemo(() => {
        if (!dateFrom) return null;

        const date = new Date(dateFrom);
        date.setHours(0, 0, 0, 0);

        return date.getTime();
    }, [dateFrom]);

    const toTimestamp = useMemo(() => {
        if (!dateTo) return null;

        const date = new Date(dateTo);
        date.setHours(23, 59, 59, 999);

        return date.getTime();
    }, [dateTo]);

    const filteredPurchases = useMemo(() => {
        return purchases.filter((purchase) => {
            const purchaseTimestamp = new Date(
                purchase.purchase_date
            ).getTime();

            const matchesDateFrom =
                !fromTimestamp || purchaseTimestamp >= fromTimestamp;

            const matchesDateTo =
                !toTimestamp || purchaseTimestamp <= toTimestamp;

            const matchesVendor =
                vendorFilter === 'all' ||
                String(purchase.vendor_id) === vendorFilter;

            const matchesStatus =
                statusFilter === 'all' ||
                purchase.status === statusFilter;

            return (
                matchesDateFrom &&
                matchesDateTo &&
                matchesVendor &&
                matchesStatus
            );
        });
    }, [
        purchases,
        fromTimestamp,
        toTimestamp,
        vendorFilter,
        statusFilter,
    ]);

    const summary = useMemo(() => {
        return filteredPurchases.reduce(
            (acc, purchase) => {
                acc.totalPurchases += 1;

                acc.totalAmount += purchase.total_amount;
                acc.totalTax += purchase.tax_amount;
                acc.totalSubtotal += purchase.subtotal;

                if (purchase.status === 'confirmed') {
                    acc.confirmedCount += 1;
                } else {
                    acc.draftCount += 1;
                }

                return acc;
            },
            {
                totalPurchases: 0,
                totalAmount: 0,
                totalTax: 0,
                totalSubtotal: 0,
                confirmedCount: 0,
                draftCount: 0,
            }
        );
    }, [filteredPurchases]);

    const vendorSummary = useMemo(() => {
        return Object.entries(
            filteredPurchases.reduce((acc, purchase) => {
                const vendorName = purchase.vendor?.name || 'Unknown';

                if (!acc[vendorName]) {
                    acc[vendorName] = {
                        count: 0,
                        total: 0,
                        vendorId: purchase.vendor_id,
                    };
                }

                acc[vendorName].count += 1;
                acc[vendorName].total += purchase.total_amount;

                return acc;
            }, {} as Record<string, { count: number; total: number; vendorId: number }>)
        ).sort(([nameA], [nameB]) => nameA.localeCompare(nameB));
    }, [filteredPurchases]);

    const escapeCsv = (value: unknown) =>
        `"${String(value ?? '').replace(/"/g, '""')}"`;

    const handleExport = () => {
        const headers = [
            'Invoice No',
            'Date',
            'Vendor',
            'Status',
            'Subtotal',
            'Tax',
            'Total',
        ];

        const rows = filteredPurchases.map((purchase) => [
            escapeCsv(purchase.invoice_no),
            escapeCsv(
                dateFormatter.format(
                    new Date(purchase.purchase_date)
                )
            ),
            escapeCsv(purchase.vendor?.name),
            escapeCsv(purchase.status),
            escapeCsv(purchase.subtotal),
            escapeCsv(purchase.tax_amount),
            escapeCsv(purchase.total_amount),
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map((row) => row.join(',')),
        ].join('\n');

        const blob = new Blob(['\ufeff' + csvContent], {
            type: 'text/csv;charset=utf-8',
        });

        const url = window.URL.createObjectURL(blob);

        const link = document.createElement('a');

        link.href = url;
        link.download = `purchase-report-${
            new Date().toISOString().split('T')[0]
        }.csv`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        window.URL.revokeObjectURL(url);
    };

    const handlePrint = () => {
        window.print();
    };

    const resetFilters = () => {
        setDateFrom('');
        setDateTo('');
        setVendorFilter('all');
        setStatusFilter('all');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Purchase Reports" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header */}
                <Card className="print:hidden">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-2xl">
                                    Purchase Reports
                                </CardTitle>

                                <CardDescription>
                                    Analyze your purchase history and trends
                                </CardDescription>
                            </div>

                            <Button
                                variant="outline"
                                onClick={() =>
                                    router.visit(ROUTES.purchases)
                                }
                            >
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
                                <Label htmlFor="date_from">
                                    Date From
                                </Label>

                                <Input
                                    id="date_from"
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) =>
                                        setDateFrom(e.target.value)
                                    }
                                    max={dateTo || undefined}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="date_to">
                                    Date To
                                </Label>

                                <Input
                                    id="date_to"
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) =>
                                        setDateTo(e.target.value)
                                    }
                                    min={dateFrom || undefined}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="vendor">
                                    Vendor
                                </Label>

                                <Select
                                    value={vendorFilter}
                                    onValueChange={setVendorFilter}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select vendor" />
                                    </SelectTrigger>

                                    <SelectContent>
                                        <SelectItem value="all">
                                            All Vendors
                                        </SelectItem>

                                        {vendors.map((vendor) => (
                                            <SelectItem
                                                key={vendor.id}
                                                value={String(vendor.id)}
                                            >
                                                {vendor.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="status">
                                    Status
                                </Label>

                                <Select
                                    value={statusFilter}
                                    onValueChange={(
                                        value:
                                            | 'all'
                                            | PurchaseStatus
                                    ) =>
                                        setStatusFilter(value)
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>

                                    <SelectContent>
                                        <SelectItem value="all">
                                            All Status
                                        </SelectItem>

                                        <SelectItem value="draft">
                                            Draft
                                        </SelectItem>

                                        <SelectItem value="confirmed">
                                            Confirmed
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="mt-4 flex gap-2">
                            <Button
                                variant="outline"
                                onClick={handleExport}
                                disabled={
                                    filteredPurchases.length === 0
                                }
                            >
                                <Download className="mr-2 size-4" />
                                Export CSV
                            </Button>

                            <Button
                                variant="outline"
                                onClick={handlePrint}
                                disabled={
                                    filteredPurchases.length === 0
                                }
                            >
                                <FileText className="mr-2 size-4" />
                                Print Report
                            </Button>

                            <Button
                                variant="outline"
                                onClick={resetFilters}
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
                            <CardDescription>
                                Total Purchases
                            </CardDescription>

                            <CardTitle className="text-3xl">
                                {summary.totalPurchases}
                            </CardTitle>
                        </CardHeader>

                        <CardContent>
                            <div className="text-xs text-muted-foreground">
                                {summary.confirmedCount} confirmed,
                                {' '}
                                {summary.draftCount} draft
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardDescription>
                                Total Amount
                            </CardDescription>

                            <CardTitle className="text-3xl">
                                ₹
                                {formatCurrency(
                                    summary.totalAmount
                                )}
                            </CardTitle>
                        </CardHeader>

                        <CardContent>
                            <div className="text-xs text-muted-foreground">
                                Across all filtered purchases
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardDescription>
                                Subtotal
                            </CardDescription>

                            <CardTitle className="text-3xl">
                                ₹
                                {formatCurrency(
                                    summary.totalSubtotal
                                )}
                            </CardTitle>
                        </CardHeader>

                        <CardContent>
                            <div className="text-xs text-muted-foreground">
                                Before taxes
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardDescription>
                                Total Tax
                            </CardDescription>

                            <CardTitle className="text-3xl">
                                ₹
                                {formatCurrency(summary.totalTax)}
                            </CardTitle>
                        </CardHeader>

                        <CardContent>
                            <div className="text-xs text-muted-foreground">
                                Tax amount paid
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Purchase Details */}
                <Card className="flex-1 overflow-hidden">
                    <CardHeader>
                        <CardTitle>
                            Purchase Details (
                            {filteredPurchases.length})
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="p-0">
                        <div className="max-h-[600px] overflow-auto">
                            <Table>
                                <TableHeader className="sticky top-0 bg-muted/50 backdrop-blur">
                                    <TableRow>
                                        <TableHead>
                                            Invoice No
                                        </TableHead>

                                        <TableHead>
                                            Date
                                        </TableHead>

                                        <TableHead>
                                            Vendor
                                        </TableHead>

                                        <TableHead>
                                            Status
                                        </TableHead>

                                        <TableHead className="text-right">
                                            Subtotal
                                        </TableHead>

                                        <TableHead className="text-right">
                                            Tax
                                        </TableHead>

                                        <TableHead className="text-right">
                                            Total
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {filteredPurchases.length > 0 ? (
                                        filteredPurchases.map(
                                            (purchase) => (
                                                <TableRow
                                                    key={
                                                        purchase.id
                                                    }
                                                >
                                                    <TableCell className="font-mono font-medium">
                                                        {
                                                            purchase.invoice_no
                                                        }
                                                    </TableCell>

                                                    <TableCell>
                                                        {dateFormatter.format(
                                                            new Date(
                                                                purchase.purchase_date
                                                            )
                                                        )}
                                                    </TableCell>

                                                    <TableCell>
                                                        {purchase.vendor
                                                            ?.name ||
                                                            'N/A'}
                                                    </TableCell>

                                                    <TableCell>
                                                        <Badge
                                                            variant={
                                                                purchase.status ===
                                                                'confirmed'
                                                                    ? 'default'
                                                                    : 'secondary'
                                                            }
                                                            className="capitalize"
                                                        >
                                                            {
                                                                purchase.status
                                                            }
                                                        </Badge>
                                                    </TableCell>

                                                    <TableCell className="text-right">
                                                        ₹
                                                        {formatCurrency(
                                                            purchase.subtotal
                                                        )}
                                                    </TableCell>

                                                    <TableCell className="text-right">
                                                        ₹
                                                        {formatCurrency(
                                                            purchase.tax_amount
                                                        )}
                                                    </TableCell>

                                                    <TableCell className="text-right font-semibold">
                                                        ₹
                                                        {formatCurrency(
                                                            purchase.total_amount
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        )
                                    ) : (
                                        <TableRow>
                                            <TableCell
                                                colSpan={7}
                                                className="h-24 text-center text-muted-foreground"
                                            >
                                                No purchases match
                                                your filters.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {/* Vendor Summary */}
                {filteredPurchases.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                Vendor-wise Summary
                            </CardTitle>
                        </CardHeader>

                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>
                                            Vendor Name
                                        </TableHead>

                                        <TableHead className="text-right">
                                            Purchase Count
                                        </TableHead>

                                        <TableHead className="text-right">
                                            Total Amount
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {vendorSummary.map(
                                        ([vendorName, data]) => (
                                            <TableRow
                                                key={`${vendorName}-${data.vendorId}`}
                                            >
                                                <TableCell className="font-medium">
                                                    {vendorName}
                                                </TableCell>

                                                <TableCell className="text-right">
                                                    {data.count}
                                                </TableCell>

                                                <TableCell className="text-right font-semibold">
                                                    ₹
                                                    {formatCurrency(
                                                        data.total
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    )}

                                    <TableRow className="bg-muted/50 font-semibold">
                                        <TableCell>
                                            Total
                                        </TableCell>

                                        <TableCell className="text-right">
                                            {
                                                summary.totalPurchases
                                            }
                                        </TableCell>

                                        <TableCell className="text-right">
                                            ₹
                                            {formatCurrency(
                                                summary.totalAmount
                                            )}
                                        </TableCell>
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
