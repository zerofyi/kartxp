import { Head, router } from '@inertiajs/react';
import React, { useState, useCallback } from 'react';
import {
    Search, Eye, Printer, Calendar, X, Package, Filter, Download, ChevronLeft, ChevronRight, Layers,
    IndianRupee
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

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: dashboard().url },
    { title: 'Sales', href: '' },
];

type Customer = { id: number; name: string; phone: string };

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
    items_count: number;
    created_at: string;
};

type PaginationLink = {
    url: string | null | undefined;
    label: string;
    active: boolean;
};

type FilterBag = {
    search: string;
    status: string;
    channel: string;
    start_date: string;
    end_date: string;
    per_page: number;
    [key: string]: string | number | null | undefined;
};

type MonthStats = {
    sales: number;
    count: number;
    discounts: number;
    customers: number;
};

type SummaryStats = {
    grand_total: number;
    grand_count: number;
    this_month: MonthStats;
    last_month: MonthStats;
};

type Props = {
    sales: {
        data: Sale[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        links: PaginationLink[];
    };
    stats: SummaryStats;
    filters: FilterBag;
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    completed:  'default',
    pending:    'secondary',
    processing: 'outline',
    cancelled:  'destructive',
};

function StatusBadge({ status }: { status: string }) {
    return (
        <Badge variant={STATUS_VARIANTS[status] ?? 'outline'} className="tracking-wide font-medium">
            {status.toUpperCase()}
        </Badge>
    );
}

const INR = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(amount);

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function SalesList({ sales, stats, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? 'all');
    const [channel, setChannel] = useState(filters.channel ?? 'all');
    const [startDate, setStartDate] = useState(filters.start_date ?? '');
    const [endDate, setEndDate] = useState(filters.end_date ?? '');
    const [showFilters, setShowFilters] = useState(false);

    const applyFilters = (updatedFields = {}) => {
        const payload: Record<string, string | number | null | undefined> = {
            search,
            status,
            channel,
            start_date: startDate,
            end_date: endDate,
            per_page: filters.per_page ?? 25,
            ...updatedFields
        };

        (Object.keys(payload) as Array<keyof typeof payload>).forEach(key => {
            if (payload[key] === 'all' || payload[key] === '') {
                payload[key] = null;
            }
        });

        router.get('/warehouse/sales', payload, {
            preserveState: true,
            replace: true,
        });
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') applyFilters();
    };

    const clearFilters = () => {
        setSearch(''); setStatus('all'); setChannel('all'); setStartDate(''); setEndDate('');
        router.get('/warehouse/sales', {}, { replace: true });
    };

    const exportToCSV = useCallback(() => {
        const headers = ['Order Number','Date','Customer','Phone','Subtotal','Tax','Discount','Total','Status'];
        const rows = sales.data.map(s => [
            s.order_number,
            fmtDate(s.created_at),
            s.customer?.name ?? 'Walk-in Customer',
            s.customer?.phone ?? '-',
            s.subtotal.toFixed(2),
            s.tax_amount.toFixed(2),
            s.discount_amount.toFixed(2),
            s.total_amount.toFixed(2),
            s.status,
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = Object.assign(document.createElement('a'), { href: url, download: `sales-export-${new Date().toISOString().split('T')[0]}.csv` });
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [sales.data]);

    const hasActiveFilters = search || status !== 'all' || channel !== 'all' || startDate || endDate;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Sales Orders" />

            <div className="flex h-full flex-1 flex-col gap-4 p-6">

                {/* ── Title Header ── */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Sales Register</h1>
                        <p className="text-muted-foreground text-sm font-medium">Monthly timeline metrics comparison, active bill structures, and store logs.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={exportToCSV} variant="outline" className="h-10 text-sm font-medium">
                            <Download className="mr-2 size-4" /> Export CSV
                        </Button>
                        <Button onClick={() => router.visit('/warehouse/pos')} className="h-10 text-sm font-medium shadow-sm">
                            <Package className="mr-2 size-4" /> Open POS Terminal
                        </Button>
                    </div>
                </div>

                {/* ── Theme-Safe Analytical Comparative KPI Cards ── */}
                <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-3">
                    {/* Card 1: Gross Sales Lifetime Summary */}
                    <Card className="shadow-sm border-l-4 border-l-primary bg-card text-card-foreground">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Gross Revenue (Lifetime)</span>
                                <div className="text-2xl font-bold text-primary font-mono tracking-tight">{INR(stats.grand_total)}</div>
                                <span className="text-[11px] text-muted-foreground block font-medium">
                                    Total Invoices Cumulative: <strong className="text-foreground font-mono">{stats.grand_count} bills</strong>
                                </span>
                            </div>
                            <div className="rounded-full p-3 bg-primary/10 text-primary"><IndianRupee className="size-6" /></div>
                        </CardContent>
                    </Card>

                    {/* Card 2: This Current Calendar Month Performance */}
                    <Card className="shadow-sm border-l-4 border-l-emerald-500 bg-card text-card-foreground">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1 w-full">
                                <div className="flex justify-between items-center pr-2">
                                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">This Month</span>
                                    <span className="text-xs font-bold font-mono">{INR(stats.this_month.sales)}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-1 pt-2 text-[11px] text-muted-foreground border-t border-muted mt-2">
                                    <div>Invoices<strong className="text-foreground font-mono block text-xs mt-0.5">{stats.this_month.count}</strong></div>
                                    <div>Customers<strong className="text-foreground font-mono block text-xs mt-0.5">{stats.this_month.customers}</strong></div>
                                    <div>Discounts<strong className="text-destructive font-mono block text-xs mt-0.5">{INR(stats.this_month.discounts)}</strong></div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Card 3: Last Calendar Month Performance */}
                    <Card className="shadow-sm border-l-4 border-l-blue-500 bg-card text-card-foreground">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1 w-full">
                                <div className="flex justify-between items-center pr-2">
                                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">Last Month</span>
                                    <span className="text-xs font-bold font-mono text-muted-foreground">{INR(stats.last_month.sales)}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-1 pt-2 text-[11px] text-muted-foreground border-t border-muted mt-2">
                                    <div>Invoices<strong className="text-foreground font-mono block text-xs mt-0.5">{stats.last_month.count}</strong></div>
                                    <div>Customers<strong className="text-foreground font-mono block text-xs mt-0.5">{stats.last_month.customers}</strong></div>
                                    <div>Discounts<strong className="text-muted-foreground font-mono block text-xs mt-0.5">{INR(stats.last_month.discounts)}</strong></div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ── Search and Advanced Filtering Console Panel ── */}
                <Card className="shadow-sm bg-card text-card-foreground">
                    <CardContent className="p-4 flex flex-col gap-3">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative min-w-[280px] flex-1">
                                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search order #, customer credentials + hit Enter..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    onKeyDown={handleSearchKeyDown}
                                    className="pl-9 h-10"
                                />
                                {search && (
                                    <button onClick={() => { setSearch(''); router.get('/warehouse/sales', { ...filters, search: null }); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                        <X className="size-4" />
                                    </button>
                                )}
                            </div>

                            <Select value={status} onValueChange={(v) => { setStatus(v); applyFilters({ status: v }); }}>
                                <SelectTrigger className="w-44 h-10"><SelectValue placeholder="Status Filter" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Lifecycles</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="processing">Processing</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>

                            <Button variant="outline" onClick={() => setShowFilters(v => !v)} className={`h-10 ${showFilters && "bg-muted"}`}>
                                <Filter className="mr-2 size-4" /> Advanced Filters
                            </Button>

                            {hasActiveFilters && (
                                <Button variant="ghost" onClick={clearFilters} className="h-10 text-muted-foreground hover:text-foreground">
                                    Reset Filters
                                </Button>
                            )}
                        </div>

                        {showFilters && (
                            <div className="grid gap-4 pt-4 border-t grid-cols-1 sm:grid-cols-3 animate-in fade-in duration-200">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Layers className="size-3" /> Order Sales Channel</Label>
                                    <Select value={channel} onValueChange={(v) => { setChannel(v); applyFilters({ channel: v }); }}>
                                        <SelectTrigger className="h-10"><SelectValue placeholder="Channel Filter" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Channels</SelectItem>
                                            <SelectItem value="pos">POS Terminal</SelectItem>
                                            <SelectItem value="online">Online Marketplace</SelectItem>
                                            <SelectItem value="manual">Manual Entry</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Calendar className="size-3" /> Timeline Date From</Label>
                                    <Input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); applyFilters({ start_date: e.target.value }); }} className="h-10" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Calendar className="size-3" /> Timeline Date To</Label>
                                    <Input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); applyFilters({ end_date: e.target.value }); }} className="h-10" />
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ── Table Grid Dataset Matrix ── */}
                <Card className="flex-1 overflow-hidden shadow-sm bg-card text-card-foreground">
                    <div className="h-full overflow-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
                                <TableRow>
                                    <TableHead className="font-semibold">Order ID</TableHead>
                                    <TableHead className="font-semibold">Date</TableHead>
                                    <TableHead className="font-semibold">Customer Account</TableHead>
                                    <TableHead className="font-semibold">Channel</TableHead>
                                    <TableHead className="text-right font-semibold">SKUs</TableHead>
                                    <TableHead className="text-right font-semibold">Subtotal</TableHead>
                                    <TableHead className="text-right font-semibold">Tax</TableHead>
                                    <TableHead className="text-right font-semibold">Discount</TableHead>
                                    <TableHead className="text-right font-semibold">Grand Total</TableHead>
                                    <TableHead className="font-semibold">Status</TableHead>
                                    <TableHead className="text-right font-semibold">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sales.data.length > 0 ? (
                                    sales.data.map((sale) => (
                                        <TableRow key={sale.id} className="hover:bg-muted/40 transition-colors border-b">
                                            <TableCell className="font-mono font-bold text-primary">{sale.order_number}</TableCell>
                                            <TableCell className="whitespace-nowrap">{fmtDate(sale.created_at)}</TableCell>
                                            <TableCell>
                                                <div className="font-medium">{sale.customer?.name ?? 'Walk-In'}</div>
                                                <div className="text-xs text-muted-foreground font-mono">{sale.customer?.phone ?? '-'}</div>
                                            </TableCell>
                                            <TableCell><Badge variant="outline" className="capitalize text-[11px] font-medium">{sale.order_channel}</Badge></TableCell>
                                            <TableCell className="text-right font-mono">{sale.items_count}</TableCell>
                                            <TableCell className="text-right font-mono text-muted-foreground">{INR(sale.subtotal)}</TableCell>
                                            <TableCell className="text-right font-mono text-muted-foreground">{INR(sale.tax_amount)}</TableCell>
                                            <TableCell className="text-right font-mono text-destructive/80">{INR(sale.discount_amount)}</TableCell>
                                            <TableCell className="text-right font-mono font-bold text-foreground">{INR(sale.total_amount)}</TableCell>
                                            <TableCell><StatusBadge status={sale.status} /></TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" onClick={() => router.visit(`/warehouse/sales/${sale.id}`)} title="Inspect Detail Ledger">
                                                        <Eye className="size-4 text-muted-foreground hover:text-foreground" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => window.open(`/warehouse/sales/${sale.id}/print`, '_blank')} title="Print Legal Invoice">
                                                        <Printer className="size-4 text-muted-foreground hover:text-foreground" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={11} className="h-32 text-center text-muted-foreground bg-muted/10">
                                            No sales records match the selection criteria.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </Card>

                {/* ── Pagination ── */}
                {sales.last_page > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border rounded-lg bg-muted/20 shadow-sm mt-1 text-card-foreground">
                        <div className="text-sm text-muted-foreground font-medium">
                            Viewing page <span className="font-semibold text-foreground">{sales.current_page}</span> of <span className="font-semibold text-foreground">{sales.last_page}</span> • Found <span className="font-semibold text-foreground">{sales.total}</span> entries
                        </div>
                        <div className="flex items-center gap-1">
                            {sales.links.map((link, i) => {
                                const isLabelCode = link.label.includes('&laquo;') || link.label.includes('&raquo;');
                                let visibleLabel = link.label;
                                if (link.label.includes('&laquo;')) visibleLabel = "Previous";
                                if (link.label.includes('&raquo;')) visibleLabel = "Next";

                                return (
                                    <Button
                                        key={i}
                                        variant={link.active ? "default" : "outline"}
                                        size="sm"
                                        disabled={!link.url}
                                        onClick={() => {
                                            if (link.url) {
                                                router.get(link.url, {}, { preserveState: true });
                                            }
                                        }}
                                        className={`h-9 font-medium ${isLabelCode ? 'px-3' : 'min-w-[36px]'} ${!link.url && 'opacity-40 cursor-not-allowed'}`}
                                    >
                                        {visibleLabel === "Previous" ? <ChevronLeft className="size-4 mr-0.5" /> : null}
                                        {visibleLabel}
                                        {visibleLabel === "Next" ? <ChevronRight className="size-4 ml-0.5" /> : null}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
