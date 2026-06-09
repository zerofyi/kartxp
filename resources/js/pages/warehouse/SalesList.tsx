import { Head, router } from '@inertiajs/react';
import React, { useMemo, useState, useCallback } from 'react';
import {
    Search, Eye, Printer, Calendar, User,
    DollarSign, Package, Filter, Download, TrendingUp,
} from 'lucide-react';

import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import type { BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: dashboard().url },
    { title: 'Sales', href: '' },
];

type Customer = { id: number; name: string; phone: string };

type OrderItem = {
    id: number;
    product_variant: {
        product: { name: string };
        unit: { symbol: string };
    };
    quantity: number;
    price: number;
    discount: number;
};

type Payment = { id: number; method: string; amount: number };

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
    items?: OrderItem[];
    payments?: Payment[];
    created_at: string;
    created_by?: { name: string };
};

type Props = {
    sales: {
        data: Sale[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
};

// ─────────────────────────────────────────────
// Helpers (outside component – stable refs)
// ─────────────────────────────────────────────
const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    completed:  'default',
    pending:    'secondary',
    processing: 'outline',
    cancelled:  'destructive',
};

function StatusBadge({ status }: { status: string }) {
    return (
        <Badge variant={STATUS_VARIANTS[status] ?? 'outline'}>
            {status.toUpperCase()}
        </Badge>
    );
}

function fmtCurrency(val: number | string) {
    return `₹${Number(val).toFixed(2)}`;
}

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-IN');
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export default function SalesList({ sales }: Props) {
    const [searchQuery,  setSearchQuery]  = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFilter,   setDateFilter]   = useState({ from: '', to: '' });
    const [showFilters,  setShowFilters]  = useState(false);

    // ── Client-side filter (only on the current page's data) ──────────
    // For large datasets the right approach is server-side; this is intentionally
    // scoped to the paginated page data so it stays fast.
    const filteredSales = useMemo(() => {
        const q       = searchQuery.toLowerCase().trim();
        const fromMs  = dateFilter.from ? new Date(dateFilter.from).getTime() : 0;
        const toMs    = dateFilter.to   ? new Date(dateFilter.to + 'T23:59:59').getTime() : Infinity;

        return sales.data.filter(sale => {
            if (q && !(
                sale.order_number.toLowerCase().includes(q) ||
                sale.customer?.name.toLowerCase().includes(q) ||
                sale.customer?.phone.includes(q)
            )) return false;

            if (statusFilter !== 'all' && sale.status !== statusFilter) return false;

            const saleMs = new Date(sale.created_at).getTime();
            if (saleMs < fromMs || saleMs > toMs) return false;

            return true;
        });
    }, [sales.data, searchQuery, statusFilter, dateFilter]);

    // ── Aggregates (memoized) ─────────────────────────────────────────
    const stats = useMemo(() => {
        let totalSales = 0;
        const customerIds = new Set<number>();

        for (const s of filteredSales) {
            totalSales += Number(s.total_amount);
            if (s.customer?.id) customerIds.add(s.customer.id);
        }

        const count = filteredSales.length;
        return {
            count,
            totalSales,
            uniqueCustomers: customerIds.size,
            avgOrder: count > 0 ? totalSales / count : 0,
        };
    }, [filteredSales]);

    // ── CSV export (fixed: was mapping `rows` twice, not `row`) ───────
    const exportToCSV = useCallback(() => {
        const headers = ['Order Number','Date','Customer','Phone','Items','Subtotal','Tax','Discount','Total','Status'];
        const rows = filteredSales.map(s => [
            s.order_number,
            fmtDate(s.created_at),
            s.customer?.name ?? 'Walk-in',
            s.customer?.phone ?? '-',
            String(s.items?.length ?? 0),
            Number(s.subtotal).toFixed(2),
            Number(s.tax_amount).toFixed(2),
            Number(s.discount_amount).toFixed(2),
            Number(s.total_amount).toFixed(2),
            s.status,
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),   // ← fixed: was `rows.map`
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = Object.assign(document.createElement('a'), { href: url, download: `sales-${new Date().toISOString().split('T')[0]}.csv` });
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [filteredSales]);

    const navigatePage = useCallback((page: number) => {
        router.visit(`/warehouse/sales?page=${page}`, { preserveScroll: true });
    }, []);

    const clearFilters = useCallback(() => {
        setSearchQuery('');
        setStatusFilter('all');
        setDateFilter({ from: '', to: '' });
    }, []);

    const hasActiveFilters = searchQuery || statusFilter !== 'all' || dateFilter.from || dateFilter.to;

    // ─────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Sales List" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">

                {/* ── Header ────────────────────────────────────── */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-2xl">Sales Management</CardTitle>
                                <CardDescription>View and manage all sales orders</CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={exportToCSV} variant="outline">
                                    <Download className="mr-2 size-4" /> Export CSV
                                </Button>
                                <Button onClick={() => router.visit('/warehouse/pos')}>
                                    <Package className="mr-2 size-4" /> New Sale
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                {/* ── Stats ─────────────────────────────────────── */}
                <div className="grid gap-4 md:grid-cols-4">
                    <StatCard icon={<Package className="size-6 text-blue-600 dark:text-blue-400" />} bg="bg-blue-100 dark:bg-blue-900" label="Total Orders"     value={stats.count} />
                    <StatCard icon={<DollarSign className="size-6 text-green-600 dark:text-green-400" />} bg="bg-green-100 dark:bg-green-900" label="Total Sales" value={fmtCurrency(stats.totalSales)} />
                    <StatCard icon={<User className="size-6 text-purple-600 dark:text-purple-400" />} bg="bg-purple-100 dark:bg-purple-900" label="Customers" value={stats.uniqueCustomers} />
                    <StatCard icon={<TrendingUp className="size-6 text-orange-600 dark:text-orange-400" />} bg="bg-orange-100 dark:bg-orange-900" label="Avg Order Value" value={fmtCurrency(stats.avgOrder)} />
                </div>

                {/* ── Filters ───────────────────────────────────── */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex flex-wrap gap-3">
                            <div className="relative min-w-60 flex-1">
                                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search by order number, customer…"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="pl-9"
                                />
                            </div>

                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-44">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="processing">Processing</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>

                            <Button
                                variant="outline"
                                onClick={() => setShowFilters(v => !v)}
                                className={showFilters ? 'bg-primary text-primary-foreground' : ''}
                            >
                                <Filter className="mr-2 size-4" /> More Filters
                            </Button>

                            {hasActiveFilters && (
                                <Button variant="ghost" onClick={clearFilters} className="text-muted-foreground">
                                    Clear all
                                </Button>
                            )}
                        </div>

                        {showFilters && (
                            <div className="mt-4 grid gap-4 rounded-md border bg-muted/50 p-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Date From</Label>
                                    <Input type="date" value={dateFilter.from} onChange={e => setDateFilter(d => ({ ...d, from: e.target.value }))} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Date To</Label>
                                    <Input type="date" value={dateFilter.to} onChange={e => setDateFilter(d => ({ ...d, to: e.target.value }))} />
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ── Table ─────────────────────────────────────── */}
                <Card className="flex-1 overflow-hidden">
                    <div className="h-full overflow-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                                <TableRow>
                                    <TableHead>Order No</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Channel</TableHead>
                                    <TableHead className="text-right">Items</TableHead>
                                    <TableHead className="text-right">Subtotal</TableHead>
                                    <TableHead className="text-right">Tax</TableHead>
                                    <TableHead className="text-right">Discount</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredSales.length > 0 ? (
                                    filteredSales.map(sale => (
                                        <SaleRow key={sale.id} sale={sale} />
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                                            {hasActiveFilters ? 'No sales match your filters.' : 'No sales yet.'}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </Card>

                {/* ── Pagination ────────────────────────────────── */}
                {sales.last_page > 1 && (
                    <Card>
                        <CardContent className="flex items-center justify-between p-4">
                            <div className="text-sm text-muted-foreground">
                                Page {sales.current_page} of {sales.last_page} • {sales.total} total sales
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" disabled={sales.current_page === 1} onClick={() => navigatePage(sales.current_page - 1)}>
                                    Previous
                                </Button>
                                {/* Show page numbers when there aren't too many */}
                                {sales.last_page <= 7 && Array.from({ length: sales.last_page }, (_, i) => i + 1).map(p => (
                                    <Button
                                        key={p}
                                        variant={p === sales.current_page ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => navigatePage(p)}
                                    >
                                        {p}
                                    </Button>
                                ))}
                                <Button variant="outline" size="sm" disabled={sales.current_page === sales.last_page} onClick={() => navigatePage(sales.current_page + 1)}>
                                    Next
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}

// ─────────────────────────────────────────────
// Memoized sub-components
// ─────────────────────────────────────────────
const StatCard = React.memo(({ icon, bg, label, value }: { icon: React.ReactNode; bg: string; label: string; value: string | number }) => (
    <Card>
        <CardContent className="p-6">
            <div className="flex items-center gap-4">
                <div className={`rounded-full p-3 ${bg}`}>{icon}</div>
                <div>
                    <div className="text-sm text-muted-foreground">{label}</div>
                    <div className="text-2xl font-bold">{value}</div>
                </div>
            </div>
        </CardContent>
    </Card>
));

const SaleRow = React.memo(({ sale }: { sale: Sale }) => (
    <TableRow className="hover:bg-accent/50">
        <TableCell className="font-mono font-medium">{sale.order_number}</TableCell>
        <TableCell>{fmtDate(sale.created_at)}</TableCell>
        <TableCell>
            <div className="font-medium">{sale.customer?.name ?? 'Walk-in Customer'}</div>
            <div className="text-sm text-muted-foreground">{sale.customer?.phone ?? '-'}</div>
        </TableCell>
        <TableCell><Badge variant="outline">{sale.order_channel}</Badge></TableCell>
        <TableCell className="text-right">{sale.items?.length ?? 0}</TableCell>
        <TableCell className="text-right">{fmtCurrency(sale.subtotal)}</TableCell>
        <TableCell className="text-right">{fmtCurrency(sale.tax_amount)}</TableCell>
        <TableCell className="text-right">{fmtCurrency(sale.discount_amount)}</TableCell>
        <TableCell className="text-right font-semibold">{fmtCurrency(sale.total_amount)}</TableCell>
        <TableCell><StatusBadge status={sale.status} /></TableCell>
        <TableCell className="text-right">
            <div className="flex justify-end gap-1">
                <Button variant="ghost" size="icon" onClick={() => router.visit(`/warehouse/sales/${sale.id}`)} title="View">
                    <Eye className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => window.open(`/warehouse/sales/${sale.id}/print`, '_blank')} title="Print">
                    <Printer className="size-4" />
                </Button>
            </div>
        </TableCell>
    </TableRow>
));
