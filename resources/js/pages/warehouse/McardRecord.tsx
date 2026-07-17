import React, { useState, useMemo } from 'react';
import { Head, router, Deferred } from '@inertiajs/react';
import {
    Coins,
    Calendar,
    ArrowUpRight,
    Layers,
    TrendingUp,
    ChevronLeft,
    ChevronRight,
    Search,
    Clock
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/warehouse/dashboard' },
    { title: 'M-Card Records', href: '/warehouse/mcard-sales' },
];

type Customer = {
    name: string;
    phone: string;
};

type Order = {
    id: number;
    order_number: string;
    created_at: string;
    total_amount: string;
    calculated_profit: string | number;
    customer: Customer | null;
};

type PaginatedOrders = {
    data: Order[];
    current_page: number;
    last_page: number;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
};

type StatsPeriod = {
    revenue: number;
    profit: number;
    margin_percent?: number;
};

type Stats = {
    today: StatsPeriod;
    range: StatsPeriod;
};

type Props = {
    orders?: PaginatedOrders;
    stats?: Stats;
    filters: { start_date: string; end_date: string };
};

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);

export default function McardRecordPage({ orders, stats, filters }: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const todayStr = new Date().toISOString().split('T')[0];

    // Detect if we have explicit date parameters in the URL
    const queryParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const hasParams = queryParams.has('start_date') || queryParams.has('end_date');

    const currentActiveRange = useMemo(() => {
        if (!hasParams) return 'month';
        if (filters.start_date === todayStr && filters.end_date === todayStr) return 'today';
        return 'custom';
    }, [filters.start_date, filters.end_date, todayStr, hasParams]);

    const [quickRange, setQuickRange] = useState<'month' | 'today' | 'custom'>(currentActiveRange);
    const [startDate, setStartDate] = useState(filters.start_date);
    const [endDate, setEndDate] = useState(filters.end_date);

    // Keep state values in sync with props changes
    React.useEffect(() => {
        setStartDate(filters.start_date);
        setEndDate(filters.end_date);
        setQuickRange(currentActiveRange);
    }, [filters.start_date, filters.end_date, currentActiveRange]);

    const handleCustomSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setQuickRange('custom');
        router.get('/warehouse/mcard-sales',
            { start_date: startDate, end_date: endDate },
            { preserveState: true }
        );
    };

    const handleQuickChange = (range: 'month' | 'today') => {
        setQuickRange(range);
        if (range === 'today') {
            router.get('/warehouse/mcard-sales', { start_date: todayStr, end_date: todayStr }, { preserveState: true });
        } else {
            // Clean URL back to default month mode
            router.get('/warehouse/mcard-sales');
        }
    };

    const filteredOrders = useMemo(() => {
        if (!orders?.data) return [];
        const term = searchTerm.toLowerCase().trim();
        if (!term) return orders.data;

        return orders.data.filter(order =>
            order.order_number.toLowerCase().includes(term) ||
            order.customer?.name.toLowerCase().includes(term) ||
            order.customer?.phone.toLowerCase().includes(term)
        );
    }, [orders?.data, searchTerm]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="M-Card Sales Overview" />

            <div className="flex h-full flex-1 flex-col gap-5 p-6 bg-background">

                {/* Header Row with Right-Aligned Compact Controls */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-foreground">M-Card Sales Tracker</h2>
                        <p className="text-xs text-muted-foreground">Track sales, profit splits, and target client records.</p>
                    </div>

                    {/* Compact Filter Switcher */}
                    <div className="flex items-center gap-2 self-start sm:self-center">
                        <div className="flex items-center rounded-md border border-border bg-muted p-0.5 h-8">
                            <button
                                onClick={() => handleQuickChange('month')}
                                className={`rounded px-2.5 py-1 text-xs font-semibold transition-all ${
                                    quickRange === 'month' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                This Month
                            </button>
                            <button
                                onClick={() => handleQuickChange('today')}
                                className={`rounded px-2.5 py-1 text-xs font-semibold transition-all ${
                                    quickRange === 'today' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Today
                            </button>

                            {/* Minimal Custom Range Popover */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button
                                        className={`rounded px-2.5 py-1 text-xs font-semibold transition-all ${
                                            quickRange === 'custom' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        Custom
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-4 border border-border bg-popover text-popover-foreground shadow-md" align="end">
                                    <form onSubmit={handleCustomSubmit} className="space-y-3">
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">From</span>
                                            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="text-xs h-8" />
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">To</span>
                                            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="text-xs h-8" />
                                        </div>
                                        <Button type="submit" size="sm" className="w-full text-xs h-8 font-semibold">
                                            Apply Range
                                        </Button>
                                    </form>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                </div>

                {/* Grid Layout strictly matching standard dashboard tiles[cite: 3] */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Deferred data="stats" fallback={<StatCardSkeleton />}>
                        {stats && (
                            <>
                                {/* Card 1: Total Sales */}
                                <Card className="border border-border transition-all duration-200">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 px-4">
                                        <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Paid Sales</CardTitle>
                                        <div className="text-muted-foreground"><Layers className="h-4 w-4" /></div>
                                    </CardHeader>
                                    <CardContent className="space-y-1 px-4">
                                        <div className="text-xl font-bold tracking-tight text-foreground">
                                            {formatCurrency(stats.range.revenue)}
                                        </div>
                                        <p className="text-[11px] text-muted-foreground mt-0.5">Total collected revenue</p>
                                    </CardContent>
                                </Card>

                                {/* Card 2: Net Profit */}
                                <Card className="border border-border transition-all duration-200">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 px-4">
                                        <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Net Profit</CardTitle>
                                        <div className="text-muted-foreground"><TrendingUp className="h-4 w-4" /></div>
                                    </CardHeader>
                                    <CardContent className="space-y-1 px-4">
                                        <div className="flex items-baseline justify-between">
                                            <span className="text-xl font-bold tracking-tight text-foreground">
                                                {formatCurrency(stats.range.profit)}
                                            </span>
                                            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-500">
                                                <ArrowUpRight className="h-3 w-3" /> {stats.range.margin_percent}%
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground mt-0.5">Direct item yield margin</p>
                                    </CardContent>
                                </Card>

                                {/* Card 3: Commission Split (Spans 2 columns) */}
                                <Card className="border border-border transition-all duration-200 sm:col-span-2">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 px-4">
                                        <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Commission Split (60% / 40%)</CardTitle>
                                        <div className="text-muted-foreground"><Coins className="h-4 w-4" /></div>
                                    </CardHeader>
                                    <CardContent className="space-y-1 px-4">
                                        <div className="grid grid-cols-2 gap-4 mt-0.5">
                                            <div>
                                                <span className="block text-[10px] uppercase font-bold text-muted-foreground tracking-wide">Our Share (60%)</span>
                                                <span className="text-xl font-bold tracking-tight text-foreground">{formatCurrency(stats.range.profit * 0.60)}</span>
                                            </div>
                                            <div className="border-l border-border pl-4">
                                                <span className="block text-[10px] uppercase font-bold text-muted-foreground tracking-wide">Partner Share (40%)</span>
                                                <span className="text-xl font-bold tracking-tight text-foreground">{formatCurrency(stats.range.profit * 0.40)}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </>
                        )}
                    </Deferred>
                </div>

                {/* Sales Records Register Table */}
                <Card className="border border-border">
                    <CardHeader className="py-4 px-4 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sales Records</CardTitle>

                        {/* Live Filter Search Input */}
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search by Order, Name or Phone..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-8 bg-background border-border text-xs h-8.5 w-full outline-none"
                            />
                        </div>
                    </CardHeader>
                    <div className="p-0">
                        <Deferred data="orders" fallback={<TableSkeleton />}>
                            {orders && (
                                <>
                                    <Table>
                                        <TableHeader className="bg-muted/30">
                                            <TableRow className="border-b border-border hover:bg-transparent">
                                                <TableHead className="h-9 text-xs font-bold px-4">Order Ref</TableHead>
                                                <TableHead className="h-9 text-xs font-bold">Date</TableHead>
                                                <TableHead className="h-9 text-xs font-bold">Customer</TableHead>
                                                <TableHead className="h-9 text-xs font-bold text-right">Total Bill</TableHead>
                                                <TableHead className="h-9 text-xs font-bold text-right">Profit</TableHead>
                                                <TableHead className="h-9 text-xs font-bold text-right px-4">Revenue Split (60% / 40%)</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredOrders.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="h-24 text-center text-xs text-muted-foreground font-medium">
                                                        No records match your query.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredOrders.map((order) => {
                                                    const profit = Number(order.calculated_profit || 0);
                                                    return (
                                                        <TableRow key={order.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                                                            <TableCell className="px-4 py-2.5">
                                                                <button
                                                                    onClick={() => router.visit(`/warehouse/sales/${order.id}`)}
                                                                    className="font-bold text-xs text-primary hover:underline block text-left"
                                                                >
                                                                    {order.order_number}
                                                                </button>
                                                            </TableCell>
                                                            <TableCell className="text-xs text-muted-foreground py-2.5">
                                                                {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                            </TableCell>
                                                            <TableCell className="text-xs py-2.5">
                                                                {order.customer ? (
                                                                    <div>
                                                                        <p className="font-semibold text-foreground leading-tight">{order.customer.name}</p>
                                                                        <p className="text-[10px] text-muted-foreground font-mono">{order.customer.phone}</p>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-muted-foreground italic text-xs font-medium">Unknown contact</span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-right font-bold text-xs py-2.5 text-foreground">
                                                                {formatCurrency(Number(order.total_amount))}
                                                            </TableCell>
                                                            <TableCell className="text-right font-bold text-xs py-2.5 text-foreground">
                                                                {formatCurrency(profit)}
                                                            </TableCell>
                                                            <TableCell className="text-right text-xs text-muted-foreground px-4 py-2.5">
                                                                <div className="flex justify-end gap-4">
                                                                    <span><strong>60%:</strong> {formatCurrency(profit * 0.60)}</span>
                                                                    <span className="border-l border-border pl-4"><strong>40%:</strong> {formatCurrency(profit * 0.40)}</span>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            )}
                                        </TableBody>
                                    </Table>

                                    {/* Pagination Controls */}
                                    {orders.last_page > 1 && (
                                        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
                                            <p className="text-xs text-muted-foreground">
                                                Page <span className="font-semibold">{orders.current_page}</span> of <span className="font-semibold">{orders.last_page}</span>
                                            </p>
                                            <div className="flex gap-1.5">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 px-2.5 text-xs font-semibold"
                                                    disabled={!orders.prev_page_url}
                                                    onClick={() => router.visit(orders.prev_page_url!, { preserveState: true })}
                                                >
                                                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 px-2.5 text-xs font-semibold"
                                                    disabled={!orders.next_page_url}
                                                    onClick={() => router.visit(orders.next_page_url!, { preserveState: true })}
                                                >
                                                    Next <ChevronRight className="h-4 w-4 ml-1" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </Deferred>
                    </div>
                </Card>
            </div>
        </AppLayout>
    );
}

function StatCardSkeleton() {
    return (
        <>
            <Card className="border border-border p-4">
                <div className="flex justify-between items-center"><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-4" /></div>
                <Skeleton className="h-7 w-28" />
                <Skeleton className="h-3 w-36" />
            </Card>
            <Card className="border border-border p-4">
                <div className="flex justify-between items-center"><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-4" /></div>
                <Skeleton className="h-7 w-28" />
                <Skeleton className="h-3 w-36" />
            </Card>
            <Card className="border border-border p-4 sm:col-span-2">
                <div className="flex justify-between items-center"><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-4" /></div>
                <Skeleton className="h-7 w-44" />
                <Skeleton className="h-3 w-36" />
            </Card>
        </>
    );
}

function TableSkeleton() {
    return (
        <div className="p-4 space-y-3">
            <Skeleton className="h-8 w-full rounded" />
            <Skeleton className="h-12 w-full rounded" />
            <Skeleton className="h-12 w-full rounded" />
            <Skeleton className="h-12 w-full rounded" />
        </div>
    );
}
