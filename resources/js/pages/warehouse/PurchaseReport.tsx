import { Head, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Calendar,
    DollarSign,
    Download,
    FileText,
    Filter,
    Layers,
    Percent,
    TrendingUp,
    User,
} from 'lucide-react';
import { useMemo, useState } from 'react';

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
    const [statusFilter, setStatusFilter] = useState<'all' | PurchaseStatus>(
        'all',
    );

    const currencyFormatter = useMemo(
        () =>
            new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                minimumFractionDigits: 2,
            }),
        [],
    );

    const dateFormatter = useMemo(
        () =>
            new Intl.DateTimeFormat('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
            }),
        [],
    );

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

    // ── Live Client Filtering Compute Logic ──
    const filteredPurchases = useMemo(() => {
        return purchases.filter((purchase) => {
            const purchaseTimestamp = new Date(
                purchase.purchase_date,
            ).getTime();

            const matchesDateFrom =
                !fromTimestamp || purchaseTimestamp >= fromTimestamp;
            const matchesDateTo =
                !toTimestamp || purchaseTimestamp <= toTimestamp;
            const matchesVendor =
                vendorFilter === 'all' ||
                String(purchase.vendor_id) === vendorFilter;
            const matchesStatus =
                statusFilter === 'all' || purchase.status === statusFilter;

            return (
                matchesDateFrom &&
                matchesDateTo &&
                matchesVendor &&
                matchesStatus
            );
        });
    }, [purchases, fromTimestamp, toTimestamp, vendorFilter, statusFilter]);

    // ── High Performance Aggregation Summaries ──
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
            },
        );
    }, [filteredPurchases]);

    const vendorSummary = useMemo(() => {
        return Object.entries(
            filteredPurchases.reduce(
                (acc, purchase) => {
                    const vendorName =
                        purchase.vendor?.name || 'Unknown Vendor';
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
                },
                {} as Record<
                    string,
                    { count: number; total: number; vendorId: number }
                >,
            ),
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
            escapeCsv(dateFormatter.format(new Date(purchase.purchase_date))),
            escapeCsv(purchase.vendor?.name),
            escapeCsv(purchase.status),
            purchase.subtotal.toFixed(2),
            purchase.tax_amount.toFixed(2),
            purchase.total_amount.toFixed(2),
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
        link.download = `purchase-analytics-report-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    };

    const resetFilters = () => {
        setDateFrom('');
        setDateTo('');
        setVendorFilter('all');
        setStatusFilter('all');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Procurement Intelligence Reports" />

            <div className="flex w-full max-w-[100vw] flex-col gap-4 p-6 text-foreground lg:max-w-none">
                {/* ── Title block actions Header ── */}
                <Card className="border bg-card text-card-foreground shadow-sm print:hidden">
                    <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                        <div>
                            <CardTitle className="text-2xl font-bold tracking-tight">
                                Procurement Statements
                            </CardTitle>
                            <CardDescription className="mt-0.5 text-sm font-medium">
                                Audit historical supply paths, accrued tax
                                balances, and outflux volumes.
                            </CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => router.visit(ROUTES.purchases)}
                            className="h-10 bg-card"
                        >
                            <ArrowLeft className="mr-2 size-4" /> Back Register
                        </Button>
                    </CardContent>
                </Card>

                {/* ── Balanced Server-Fitted Filters Console Bar ── */}
                <Card className="border bg-card text-card-foreground shadow-sm print:hidden">
                    <CardHeader className="border-b pb-3">
                        <CardTitle className="flex items-center text-sm font-bold tracking-wider text-muted-foreground uppercase">
                            <Filter className="mr-2 size-4 text-primary" />{' '}
                            Multi-Variable Filter Console
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="date_from"
                                    className="flex items-center gap-1 text-xs font-semibold text-muted-foreground"
                                >
                                    <Calendar className="size-3" /> Timeline
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
                                    className="h-10"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="date_to"
                                    className="flex items-center gap-1 text-xs font-semibold text-muted-foreground"
                                >
                                    <Calendar className="size-3" /> Timeline
                                    Date To
                                </Label>
                                <Input
                                    id="date_to"
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    min={dateFrom || undefined}
                                    className="h-10"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="vendor"
                                    className="flex items-center gap-1 text-xs font-semibold text-muted-foreground"
                                >
                                    <User className="size-3" /> Supplier Vendor
                                    Filter
                                </Label>
                                <Select
                                    value={vendorFilter}
                                    onValueChange={setVendorFilter}
                                >
                                    <SelectTrigger className="h-10 border-border bg-card">
                                        <SelectValue placeholder="All Suppliers" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All Registered Vendors
                                        </SelectItem>
                                        {vendors.map((v) => (
                                            <SelectItem
                                                key={v.id}
                                                value={String(v.id)}
                                            >
                                                {v.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="status"
                                    className="flex items-center gap-1 text-xs font-semibold text-muted-foreground"
                                >
                                    <Layers className="size-3" /> Lifecycle
                                    Status Scope
                                </Label>
                                <Select
                                    value={statusFilter}
                                    onValueChange={(
                                        v: 'all' | PurchaseStatus,
                                    ) => setStatusFilter(v)}
                                >
                                    <SelectTrigger className="h-10 border-border bg-card">
                                        <SelectValue placeholder="All Lifecycles" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All Lifecycle States
                                        </SelectItem>
                                        <SelectItem value="draft">
                                            Draft Forms
                                        </SelectItem>
                                        <SelectItem value="confirmed">
                                            Confirmed Ledger Ingests
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
                            <Button
                                variant="outline"
                                onClick={handleExport}
                                disabled={filteredPurchases.length === 0}
                                className="h-9 text-xs font-medium"
                            >
                                <Download className="mr-1.5 size-4" /> Export
                                Spreadsheet CSV
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => window.print()}
                                disabled={filteredPurchases.length === 0}
                                className="h-9 text-xs font-medium"
                            >
                                <FileText className="mr-1.5 size-4" /> Print
                                Statement View
                            </Button>
                            {(dateFrom ||
                                dateTo ||
                                vendorFilter !== 'all' ||
                                statusFilter !== 'all') && (
                                <Button
                                    variant="ghost"
                                    onClick={resetFilters}
                                    className="ml-auto h-9 text-xs text-muted-foreground hover:text-foreground"
                                >
                                    Reset Filters
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* ── Modern Dynamic Analytical Counters Row ── */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className="border-l-4 border-l-primary bg-card text-card-foreground shadow-sm">
                        <CardContent className="flex items-center justify-between p-5">
                            <div className="space-y-0.5">
                                <span className="block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                    Total Invoices
                                </span>
                                <div className="font-mono text-2xl font-bold">
                                    {summary.totalPurchases}
                                </div>
                                <span className="block text-[11px] font-medium text-muted-foreground">
                                    {summary.confirmedCount} confirmed •{' '}
                                    {summary.draftCount} draft
                                </span>
                            </div>
                            <div className="rounded-full bg-primary/10 p-2.5 text-primary">
                                <Layers className="size-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-emerald-500 bg-card text-card-foreground shadow-sm">
                        <CardContent className="flex items-center justify-between p-5">
                            <div className="space-y-0.5">
                                <span className="block text-xs font-semibold tracking-wider text-emerald-600 uppercase dark:text-emerald-400">
                                    Total Cost
                                </span>
                                <div className="font-mono text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                                    {currencyFormatter.format(
                                        summary.totalAmount,
                                    )}
                                </div>
                                <span className="block text-[11px] font-medium text-muted-foreground">
                                    Gross inventory spending volume
                                </span>
                            </div>
                            <div className="rounded-full bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400">
                                <DollarSign className="size-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-blue-500 bg-card text-card-foreground shadow-sm">
                        <CardContent className="flex items-center justify-between p-5">
                            <div className="space-y-0.5">
                                <span className="block text-xs font-semibold tracking-wider text-blue-600 uppercase dark:text-blue-400">
                                    Net Subtotal
                                </span>
                                <div className="font-mono text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
                                    {currencyFormatter.format(
                                        summary.totalSubtotal,
                                    )}
                                </div>
                                <span className="block text-[11px] font-medium text-muted-foreground">
                                    Value before tax calculations
                                </span>
                            </div>
                            <div className="rounded-full bg-blue-500/10 p-2.5 text-blue-600 dark:text-blue-400">
                                <TrendingUp className="size-5" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* CHANGED HERE: Simple terms "Total Tax Paid" instead of "Surcharges Accrued" */}
                    <Card className="border-l-4 border-l-amber-500 bg-card text-card-foreground shadow-sm">
                        <CardContent className="flex items-center justify-between p-5">
                            <div className="space-y-0.5">
                                <span className="block text-xs font-semibold tracking-wider text-amber-600 uppercase dark:text-amber-400">
                                    Total Tax Paid
                                </span>
                                <div className="font-mono text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
                                    {currencyFormatter.format(summary.totalTax)}
                                </div>
                                <span className="block text-[11px] font-medium text-muted-foreground">
                                    Accrued government tax amounts
                                </span>
                            </div>
                            <div className="rounded-full bg-amber-500/10 p-2.5 text-amber-600 dark:text-amber-400">
                                <Percent className="size-5" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ── Primary Detailed Invoices Matrix Ledger ── */}
                <Card className="flex-1 overflow-hidden border bg-card text-card-foreground shadow-sm">
                    <CardHeader className="border-b bg-muted/20 pb-3">
                        <CardTitle className="text-lg font-bold tracking-tight">
                            Purchase History Log ({filteredPurchases.length}{' '}
                            records)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="max-h-[500px] overflow-auto">
                            <Table>
                                <TableHeader className="sticky top-0 z-10 bg-muted backdrop-blur-md">
                                    <TableRow>
                                        <TableHead className="font-semibold">
                                            Invoice Identification No
                                        </TableHead>
                                        <TableHead className="font-semibold">
                                            Transaction Date
                                        </TableHead>
                                        <TableHead className="font-semibold">
                                            Associated Supplier Vendor
                                        </TableHead>
                                        <TableHead className="font-semibold">
                                            Lifecycle State
                                        </TableHead>
                                        <TableHead className="text-right font-semibold">
                                            Net Subtotal
                                        </TableHead>
                                        <TableHead className="text-right font-semibold">
                                            Tax Weight
                                        </TableHead>
                                        <TableHead className="text-right font-semibold">
                                            Grand Gross Total
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredPurchases.length > 0 ? (
                                        filteredPurchases.map((purchase) => (
                                            <TableRow
                                                key={purchase.id}
                                                className="border-b transition-colors hover:bg-muted/30"
                                            >
                                                <TableCell className="font-mono font-bold text-primary">
                                                    {purchase.invoice_no}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap">
                                                    {dateFormatter.format(
                                                        new Date(
                                                            purchase.purchase_date,
                                                        ),
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    {purchase.vendor?.name ??
                                                        'Unknown / N/A'}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={
                                                            purchase.status ===
                                                            'confirmed'
                                                                ? 'default'
                                                                : 'secondary'
                                                        }
                                                        className={`capitalize ${purchase.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}`}
                                                    >
                                                        {purchase.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-muted-foreground">
                                                    {currencyFormatter.format(
                                                        purchase.subtotal,
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-muted-foreground">
                                                    {currencyFormatter.format(
                                                        purchase.tax_amount,
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right font-mono font-bold text-foreground">
                                                    {currencyFormatter.format(
                                                        purchase.total_amount,
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell
                                                colSpan={7}
                                                className="h-32 bg-muted/10 text-center font-medium text-muted-foreground"
                                            >
                                                No tracked purchase manifest
                                                packages matched filter console
                                                parameters.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {/* ── Distinct Supplier Vendor Aggregate Matrix ── */}
                {filteredPurchases.length > 0 && (
                    <Card className="break-inside-avoid border bg-card text-card-foreground shadow-sm">
                        <CardHeader className="border-b bg-muted/20 pb-3">
                            <CardTitle className="text-base font-bold tracking-tight">
                                Supplier Volume Breakdowns
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow>
                                        <TableHead className="font-semibold">
                                            Vendor Entity Name
                                        </TableHead>
                                        <TableHead className="text-right font-semibold">
                                            Bill Count Volume
                                        </TableHead>
                                        <TableHead className="text-right font-semibold">
                                            Accumulated Financial Outflux Total
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {vendorSummary.map(([vendorName, data]) => (
                                        <TableRow
                                            key={`${vendorName}-${data.vendorId}`}
                                            className="border-b transition-colors hover:bg-muted/20"
                                        >
                                            <TableCell className="font-semibold text-foreground">
                                                {vendorName}
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-medium">
                                                {data.count} orders
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-bold text-primary">
                                                {currencyFormatter.format(
                                                    data.total,
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="border-t-2 bg-muted/60 font-bold text-foreground">
                                        <TableCell>
                                            Consolidated Summary Evaluation
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {summary.totalPurchases} orders
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-base text-primary">
                                            {currencyFormatter.format(
                                                summary.totalAmount,
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
