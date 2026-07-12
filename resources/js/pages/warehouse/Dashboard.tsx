import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowDownRight,
    ArrowUpRight,
    CalendarDays,
    Clock,
    CreditCard,
    RotateCcw,
    ShoppingCart,
    Timer,
    Truck,
    Users,
    Skull,
    ExternalLink,
    Percent,
    Layers,
    TrendingUp,
} from 'lucide-react';
import { useState } from 'react';
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Stats {
    today_revenue: number;
    month_revenue: number;
    revenue_growth: number;
    today_revenue_pending: number;
    month_revenue_pending: number;
    revenue_growth_pending: number;
    today_orders: number;
    month_orders: number;
    orders_growth: number;
    today_online: number;
    month_online: number;
    online_growth: number;
    today_pos: number;
    month_pos: number;
    pos_growth: number;
    low_stock: number;
    near_expiry: number;
    expired_count: number;
    pending_deliveries: number;
    today_customers: number;
    month_customers: number;
}

interface Order {
    id: number;
    order_number: string;
    order_channel: string;
    status: string;
    payment_status: string;
    payment_method: string | null;
    total_amount: number;
    created_at: string;
    customer?: { id: number; name: string; phone: string };
}

interface ChartPoint {
    month: string;
    revenue: number;
    orders: number;
    online_orders: number;
    pos_orders: number;
}

interface NearExpiryItem {
    id: number;
    batch_no: string;
    expiry_date: string;
    available_quantity: number;
    product_variant?: {
        id: number;
        sku: string;
        product?: { id: number; name: string };
    };
}

interface TopProduct {
    variant_id: number;
    name: string;
    sku: string;
    total_qty: number;
    total_revenue: number;
}

interface Props {
    stats?: Stats;
    recent_orders?: Order[];
    revenue_chart?: ChartPoint[];
    near_expiry_stock?: NearExpiryItem[];
    top_products?: TopProduct[];
    expiry_days: number;
    expiry_windows: number[];
    filters: { top_period: string; top_metric: string };
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Dashboard', href: dashboard().url }];

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);

const formatCurrencyShort = (amount: number): string => {
    if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(1)}Cr`;
    if (amount >= 1_00_000)    return `₹${(amount / 1_00_000).toFixed(1)}L`;
    if (amount >= 1_000)       return `₹${(amount / 1_000).toFixed(1)}K`;
    return `₹${amount}`;
};

const getDaysUntilExpiry = (dateStr: string): number => {
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const getExpiryBadge = (daysLeft: number) => {
    if (daysLeft <= 0) return 'border-destructive text-destructive bg-destructive/10';
    if (daysLeft <= 7)  return 'border-orange-500 text-orange-600 bg-orange-500/5';
    return 'text-muted-foreground bg-muted border-border';
};

const getStatusColor = (status: string): string => {
    const map: Record<string, string> = {
        pending:    'text-amber-500 border-amber-500/30 bg-amber-500/10',
        processing: 'text-sky-500 border-sky-500/30 bg-sky-500/10',
        packed:     'text-indigo-500 border-indigo-500/30 bg-indigo-500/10',
        dispatched: 'text-purple-500 border-purple-500/30 bg-purple-500/10',
        delivered:  'text-emerald-500 border-emerald-500/30 bg-emerald-500/10',
        cancelled:  'text-destructive border-destructive/30 bg-destructive/10',
    };
    return map[status?.toLowerCase()] ?? 'text-muted-foreground border-border bg-muted';
};

interface StatCardProps {
    title: string;
    icon: React.ReactNode;
    todayValue: React.ReactNode;
    monthValue: React.ReactNode;
    growth?: number;
    mode: 'today' | 'month';
    alert?: boolean;
    subtitle?: string;
    loading?: boolean;
}

const StatCard = ({ title, icon, todayValue, monthValue, growth, mode, alert, subtitle, loading }: StatCardProps) => {
    if (loading) {
        return (
            <Card className="border border-border p-4">
                <div className="flex justify-between items-center"><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-4" /></div>
                <Skeleton className="h-7 w-28" />
                <Skeleton className="h-3 w-36" />
            </Card>
        );
    }
    return (
        <Card className={`border transition-all duration-200 ${alert ? 'border-destructive/30 bg-destructive/5' : 'border-border'}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 px-4">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
                <div className={alert ? 'text-destructive' : 'text-muted-foreground'}>{icon}</div>
            </CardHeader>
            <CardContent className="space-y-1 px-4">
                <div className="flex items-baseline justify-between">
                    <span className="text-xl font-bold tracking-tight">
                        {mode === 'today' ? todayValue : monthValue}
                    </span>
                    {growth !== undefined && mode === 'month' && (
                        <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${growth >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                            {growth >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            {Math.abs(growth)}%
                        </span>
                    )}
                </div>
                {subtitle ? (
                    <p className="text-[11px] text-muted-foreground">{subtitle}</p>
                ) : (
                    mode === 'today' && (
                        <p className="text-[11px] text-muted-foreground">
                            Month total: <span className="font-semibold text-foreground">{monthValue}</span>
                        </p>
                    )
                )}
            </CardContent>
        </Card>
    );
};

const ChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-md border border-border bg-background p-2.5 shadow-sm text-xs space-y-1">
            <p className="font-bold border-b border-border pb-1 mb-1">{label}</p>
            {payload.map((p: any) => (
                <div key={p.name} className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground capitalize">{p.name.replace('_', ' ')}:</span>
                    <span className="font-bold text-foreground">
                        {p.name === 'revenue' ? formatCurrency(p.value) : p.value}
                    </span>
                </div>
            ))}
        </div>
    );
};

export default function Dashboard({
    stats,
    recent_orders = [],
    revenue_chart = [],
    near_expiry_stock = [],
    top_products = [],
    expiry_days,
    expiry_windows,
    filters,
}: Props) {
    const [mode, setMode] = useState<'today' | 'month'>('today');
    const [chartMetric, setChartMetric] = useState<'revenue' | 'orders'>('revenue');
    const [isClearing, setIsClearing] = useState(false);

    const loadingStats = !stats;
    const loadingChart = !revenue_chart || revenue_chart.length === 0;
    const loadingTopProducts = !top_products || top_products.length === 0;

    const handleExpiryWindow = (days: number) => {
        router.get(window.location.pathname, { expiry_days: days }, { preserveState: true, preserveScroll: true });
    };

    const handleTopProductFilters = (period: string, metric: string) => {
        router.get(window.location.pathname, {
            expiry_days: expiry_days,
            top_period: period,
            top_metric: metric
        }, { preserveState: true, preserveScroll: true });
    };

    const triggerCachePurge = () => {
        setIsClearing(true);
        router.post('/warehouse/maintenance/dashboard/clear-cache', {}, {
            onFinish: () => setIsClearing(false)
        });
    };

    const maxProductBarValue = top_products.length > 0
        ? Math.max(...top_products.map(p => filters.top_metric === 'units' ? p.total_qty : p.total_revenue), 1)
        : 1;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Warehouse Dashboard" />

            <div className="flex h-full flex-1 flex-col gap-5 p-6 bg-background">

                {/* Control Action Header Deck */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-foreground">Warehouse Dashboard</h2>
                        <p className="text-xs text-muted-foreground">
                            Data updated: {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">

                        <div className="flex items-center rounded-md border border-border bg-muted p-0.5">
                            <button
                                onClick={() => setMode('today')}
                                className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold transition-all ${
                                    mode === 'today' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                                }`}
                            >
                                <Clock className="h-3 w-3" /> Today
                            </button>
                            <button
                                onClick={() => setMode('month')}
                                className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold transition-all ${
                                    mode === 'month' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                                }`}
                            >
                                <CalendarDays className="h-3 w-3" /> Month
                            </button>
                        </div>
                    </div>
                </div>

                {/* Financial Metric Grid */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        title="Paid Revenue"
                        icon={<TrendingUp className="h-4 w-4" />}
                        todayValue={formatCurrency(stats?.today_revenue ?? 0)}
                        monthValue={formatCurrency(stats?.month_revenue ?? 0)}
                        growth={stats?.revenue_growth}
                        mode={mode}
                        loading={loadingStats}
                    />
                    <StatCard
                        title="Pending Revenue"
                        icon={<CreditCard className="h-4 w-4" />}
                        todayValue={formatCurrency(stats?.today_revenue_pending ?? 0)}
                        monthValue={formatCurrency(stats?.month_revenue_pending ?? 0)}
                        growth={stats?.revenue_growth_pending}
                        mode={mode}
                        loading={loadingStats}
                    />
                    <StatCard
                        title="Online Orders"
                        icon={<ShoppingCart className="h-4 w-4" />}
                        todayValue={(stats?.today_online ?? 0).toLocaleString()}
                        monthValue={(stats?.month_online ?? 0).toLocaleString()}
                        growth={stats?.online_growth}
                        mode={mode}
                        loading={loadingStats}
                    />
                    <StatCard
                        title="POS Sales"
                        icon={<CreditCard className="h-4 w-4" />}
                        todayValue={(stats?.today_pos ?? 0).toLocaleString()}
                        monthValue={(stats?.month_pos ?? 0).toLocaleString()}
                        growth={stats?.pos_growth}
                        mode={mode}
                        loading={loadingStats}
                    />
                </div>

                {/* Vector Risk Management Grid */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        title="Low Stock Items"
                        icon={<AlertTriangle className="h-4 w-4" />}
                        todayValue={stats?.low_stock ?? 0}
                        monthValue={stats?.low_stock ?? 0}
                        mode={mode}
                        alert={(stats?.low_stock ?? 0) > 0}
                        subtitle="SKUs below safety limits"
                        loading={loadingStats}
                    />
                    <StatCard
                        title="Expired Stock"
                        icon={<Skull className="h-4 w-4" />}
                        todayValue={stats?.expired_count ?? 0}
                        monthValue={stats?.expired_count ?? 0}
                        mode={mode}
                        alert={(stats?.expired_count ?? 0) > 0}
                        subtitle="Expired batches (Total loss)"
                        loading={loadingStats}
                    />
                    <StatCard
                        title="Near Expiry"
                        icon={<Timer className="h-4 w-4" />}
                        todayValue={stats?.near_expiry ?? 0}
                        monthValue={stats?.near_expiry ?? 0}
                        mode={mode}
                        alert={(stats?.near_expiry ?? 0) > 0}
                        subtitle="Expiring within 30 days"
                        loading={loadingStats}
                    />
                    <StatCard
                        title="Pending Deliveries"
                        icon={<Truck className="h-4 w-4" />}
                        todayValue={stats?.pending_deliveries ?? 0}
                        monthValue={stats?.pending_deliveries ?? 0}
                        mode={mode}
                        subtitle="Awaiting courier dispatch"
                        loading={loadingStats}
                    />
                </div>

                {/* 6-Month Trend Original Area Graph + High Density Uniform Side Tiles */}
                <div className="grid gap-4 lg:grid-cols-12">

                    {/* Trend Graph Container - Spans exactly 3 StatCards width */}
                    <Card className="border border-border lg:col-span-9 flex flex-col justify-between">
                        <CardHeader className="flex flex-col gap-3 pb-2 pt-4 px-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Performance Trends
                            </CardTitle>

                            <div className="flex items-center gap-2">
                                {/* Dynamic Refresh Action */}
                                <Button
                                    onClick={triggerCachePurge}
                                    disabled={isClearing}
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2.5 gap-1 text-[11px] font-semibold text-muted-foreground border-border hover:text-foreground"
                                >
                                    <RotateCcw className={`h-3 w-3 ${isClearing ? 'animate-spin' : ''}`} />
                                    Refresh Chart
                                </Button>

                                {/* Unified Metric Context Toggles */}
                                <div className="flex items-center h-7 rounded-md border border-border bg-muted p-0.5">
                                    <button
                                        onClick={() => setChartMetric('revenue')}
                                        className={`rounded px-2.5 h-full text-xs font-semibold transition-all ${
                                            chartMetric === 'revenue'
                                                ? 'bg-background text-foreground shadow-sm'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        Revenue
                                    </button>
                                    <button
                                        onClick={() => setChartMetric('orders')}
                                        className={`rounded px-2.5 h-full text-xs font-semibold transition-all ${
                                            chartMetric === 'orders'
                                                ? 'bg-background text-foreground shadow-sm'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        Orders
                                    </button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="px-2 pb-4">
                            {loadingChart ? (
                                <div className="h-57.5 w-full p-2"><Skeleton className="h-full w-full rounded" /></div>
                            ) : (
                                <ResponsiveContainer width="100%" height={230}>
                                    {chartMetric === 'revenue' ? (
                                        /* Adjusted left margin to 0 and increased width to 65 to prevent half-cut text */
                                        <AreaChart data={revenue_chart} margin={{ top: 10, right: 15, left: 0, bottom: 10 }}>
                                            <defs>
                                                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%"  stopColor="var(--color-primary, #6366f1)" stopOpacity={0.2} />
                                                    <stop offset="95%" stopColor="var(--color-primary, #6366f1)" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                            {/* dy added to create an elegant gap between the text labels and the bottom line */}
                                            <XAxis dataKey="month" className="text-[10px] fill-muted-foreground" tickLine={false} axisLine={false} dy={10} />
                                            <YAxis tickFormatter={formatCurrencyShort} className="text-[10px] fill-muted-foreground" tickLine={false} axisLine={false} width={65} />
                                            <Tooltip content={<ChartTooltip />} />
                                            <Area type="monotone" dataKey="revenue" stroke="var(--color-primary, #6366f1)" strokeWidth={2} fill="url(#revGrad)" dot={{ r: 3, fill: 'var(--color-primary, #6366f1)' }} />
                                        </AreaChart>
                                    ) : (
                                        <AreaChart data={revenue_chart} margin={{ top: 10, right: 15, left: 0, bottom: 10 }}>
                                            <defs>
                                                <linearGradient id="onlineGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.2} />
                                                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="posGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.2} />
                                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                            <XAxis dataKey="month" className="text-[10px] fill-muted-foreground" tickLine={false} axisLine={false} dy={10} />
                                            <YAxis className="text-[10px] fill-muted-foreground" tickLine={false} axisLine={false} width={50} />
                                            <Tooltip content={<ChartTooltip />} />
                                            <Area type="monotone" dataKey="online_orders" stroke="#06b6d4" strokeWidth={2} fill="url(#onlineGrad)" dot={{ r: 3, fill: '#06b6d4' }} />
                                            <Area type="monotone" dataKey="pos_orders"    stroke="#f59e0b" strokeWidth={2} fill="url(#posGrad)"   dot={{ r: 3, fill: '#f59e0b' }} />
                                        </AreaChart>
                                    )}
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>

                    {/* Side Informational Metric Stack - Spans remaining width, matching total graph height */}
                    <div className="lg:col-span-3 flex flex-col gap-3 justify-between h-full">
                        {/* Tile 1: Customers */}
                        <Card className="border border-border p-3.5 flex flex-col justify-between flex-1 min-h-19">
                            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground leading-none">
                                <span>New Customers</span>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex items-baseline justify-between mt-1">
                                <span className="text-4xl font-bold leading-none">
                                    {loadingStats ? <Skeleton className="h-6 w-12" /> : (stats?.month_customers ?? 0).toLocaleString()}
                                </span>
                                <span className="text-[10px] font-medium text-muted-foreground">
                                    Today: <b className="text-foreground">{stats?.today_customers ?? 0}</b>
                                </span>
                            </div>
                        </Card>

                        {/* Tile 2: Order Load */}
                        <Card className="border border-border p-3.5 flex flex-col justify-between flex-1 min-h-19">
                            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground leading-none">
                                <span>Total Orders</span>
                                <Layers className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex items-baseline justify-between mt-1">
                                <span className="text-4xl font-bold leading-none">
                                    {loadingStats ? <Skeleton className="h-6 w-12" /> : (stats?.month_orders ?? 0).toLocaleString()}
                                </span>
                                <span className="text-[10px] font-medium text-muted-foreground">
                                    Today: <b className="text-foreground">{stats?.today_orders ?? 0}</b>
                                </span>
                            </div>
                        </Card>

                        {/* Tile 3: Growth Ratio */}
                        <Card className="border border-border p-3.5 flex flex-col justify-between flex-1 min-h-19">
                            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground leading-none">
                                <span>Order Growth</span>
                                <Percent className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex items-baseline justify-between mt-1">
                                <span className={`text-4xl font-bold leading-none ${
                                    loadingStats
                                        ? ''
                                        : (stats?.orders_growth ?? 0) >= 0
                                            ? 'text-emerald-500'
                                            : 'text-destructive'
                                }`}>
                                    {loadingStats ? <Skeleton className="h-6 w-12" /> : `${stats?.orders_growth ?? 0}%`}
                                </span>
                                <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-0.5">
                                    {!loadingStats && (
                                        (stats?.orders_growth ?? 0) >= 0
                                            ? <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                                            : <ArrowDownRight className="h-3 w-3 text-destructive" />
                                    )}
                                    vs Last Month
                                </span>
                            </div>
                        </Card>
                    </div>
                </div>

                {/* Ledger Index Lists Matrix Grid Layout */}
                <div className="grid gap-4 lg:grid-cols-7">

                    {/* Recent Orders Register View */}
                    <Card className="border border-border lg:col-span-4 flex flex-col justify-between">
                        <div>
                            <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-4">
                                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent Orders</CardTitle>
                                <Link href="/warehouse/online-orders" className="text-xs font-bold text-primary flex items-center gap-1 hover:underline">
                                    View All <ExternalLink className="h-3 w-3" />
                                </Link>
                            </CardHeader>
                            <div className="p-0 border-t border-border">
                                {loadingStats ? (
                                    <div className="p-4 space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
                                ) : (
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow className="border-b border-border hover:bg-transparent">
                                                <TableHead className="h-9 text-xs font-bold px-4">Order Ref</TableHead>
                                                <TableHead className="h-9 text-xs font-bold">Customer</TableHead>
                                                <TableHead className="h-9 text-xs font-bold">Status</TableHead>
                                                <TableHead className="h-9 text-xs font-bold">Channel</TableHead>
                                                <TableHead className="h-9 text-xs font-bold text-right px-4">Amount</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {recent_orders.length === 0 ? (
                                                <TableRow><TableCell colSpan={5} className="h-24 text-center text-xs text-muted-foreground font-medium">No recent orders found.</TableCell></TableRow>
                                            ) : (
                                                recent_orders.map((order) => (
                                                    <TableRow key={order.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                                                        <TableCell className="px-4 py-2">
                                                            <Link href={`/warehouse/online-orders/${order.id}`} className="font-bold text-xs text-primary hover:underline block">
                                                                {order.order_number}
                                                            </Link>
                                                            <span className="text-[10px] text-muted-foreground block mt-0.5">
                                                                {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="py-2 text-xs">
                                                            {order.customer ? (
                                                                <div className="max-w-30 truncate">
                                                                    <p className="font-semibold text-foreground truncate leading-tight">{order.customer.name}</p>
                                                                    <p className="text-[10px] text-muted-foreground truncate">{order.customer.phone}</p>
                                                                </div>
                                                            ) : (
                                                                <span className="text-muted-foreground text-xs italic font-medium">Walk-in Customer</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="py-2">
                                                            <Badge variant="outline" className={`text-[10px] font-bold px-1.5 py-0 h-5 rounded ${getStatusColor(order.status)}`}>
                                                                {order.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="py-2">
                                                            <span className={`inline-flex items-center rounded px-1.5 py-0 text-[10px] font-bold h-5 ${
                                                                order.order_channel === 'online' ? 'bg-cyan-500/10 text-cyan-600 border border-cyan-500/20' : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                                                            }`}>
                                                                {order.order_channel?.toUpperCase() ?? 'POS'}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold text-xs px-4 py-2 text-foreground">{formatCurrency(order.total_amount)}</TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* Production Grade Re-engineered Top Moving Products Tabular Matrix */}
                    <Card className="border border-border lg:col-span-3 flex flex-col justify-between">
                        <div>
                            <CardHeader className="flex flex-col gap-3 pb-3 pt-4 px-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Top Moving Products
                                </CardTitle>

                                <div className="flex items-center gap-2">
                                    <Select
                                        value={filters.top_period}
                                        onValueChange={(value) => handleTopProductFilters(value, filters.top_metric)}
                                    >
                                        <SelectTrigger className="w-full text-xs font-semibold bg-background border-border text-foreground outline-none focus:ring-1 focus:ring-primary">
                                            <SelectValue placeholder="Select Period" />
                                        </SelectTrigger>
                                        <SelectContent className="border-border bg-popover text-popover-foreground">
                                            <SelectItem value="month" className="text-xs font-medium">This Month</SelectItem>
                                            <SelectItem value="past_3" className="text-xs font-medium">Past 90 Days</SelectItem>
                                            <SelectItem value="past_6" className="text-xs font-medium">Past 180 Days</SelectItem>
                                            <SelectItem value="all" className="text-xs font-medium">All Time</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    {/* Metric Mode Toggle */}
                                    <div className="flex items-center rounded-md border border-border bg-muted p-1">
                                        <button
                                            onClick={() => handleTopProductFilters(filters.top_period, 'revenue')}
                                            className={`rounded px-2.5 py-1 text-xs font-bold transition-all ${
                                                filters.top_metric === 'revenue'
                                                    ? 'bg-background text-foreground shadow-sm'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            Value
                                        </button>
                                        <button
                                            onClick={() => handleTopProductFilters(filters.top_period, 'units')}
                                            className={`rounded px-2.5 py-1 text-xs font-bold transition-all ${
                                                filters.top_metric === 'units'
                                                    ? 'bg-background text-foreground shadow-sm'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            Units
                                        </button>
                                    </div>
                                </div>
                            </CardHeader>
                            <div className="p-0 border-t border-border">
                                {loadingTopProducts ? (
                                    <div className="p-4 space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
                                ) : top_products.length === 0 ? (
                                    <p className="text-xs text-muted-foreground text-center py-10">No data available.</p>
                                ) : (
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow className="border-b border-border hover:bg-transparent">
                                                <TableHead className="h-9 text-xs font-bold px-4 w-12.5">Rank</TableHead>
                                                <TableHead className="h-9 text-xs font-bold">Product Variant</TableHead>
                                                <TableHead className="h-9 text-xs font-bold text-right px-4">Performance Metrics</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {top_products.map((p, i) => {
                                                const scaledMetricValue = filters.top_metric === 'units' ? p.total_qty : p.total_revenue;
                                                return (
                                                    <TableRow key={p.sku} className="border-b border-border hover:bg-muted/30 transition-colors">
                                                        <TableCell className="px-4 py-3 font-bold text-xs text-muted-foreground text-center">
                                                            {i + 1}
                                                        </TableCell>
                                                        <TableCell className="py-3">
                                                            <Link href={`/warehouse/inventory/${p.variant_id}`} className="font-bold text-xs text-primary hover:underline block leading-tight">
                                                                {p.name}
                                                            </Link>
                                                            <span className="text-[10px] font-mono text-muted-foreground block mt-0.5">{p.sku}</span>
                                                            <div className="h-1 w-24 rounded bg-muted overflow-hidden mt-1.5">
                                                                <div
                                                                    className="h-full bg-primary rounded transition-all duration-300"
                                                                    style={{ width: `${(scaledMetricValue / maxProductBarValue) * 100}%` }}
                                                                />
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right px-4 py-3 leading-tight">
                                                            <p className="font-bold text-foreground text-xs">{formatCurrency(p.total_revenue)}</p>
                                                            <p className="text-[10px] font-medium text-muted-foreground mt-0.5">{p.total_qty} units sold</p>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Expiry Lifespan Tracker */}
                <div className="grid gap-4">
                    <Card className="border border-border">
                        <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-4">
                            <CardTitle className="flex items-center gap-1.5 text-sm font-bold tracking-tight text-foreground">
                                <Timer className="h-4 w-4 text-orange-500" /> Near Expiry Tracking Register
                            </CardTitle>
                            <div className="flex items-center border border-border bg-muted p-0.5 rounded-md">
                                {expiry_windows.map((d) => (
                                    <button
                                        key={d}
                                        onClick={() => handleExpiryWindow(d)}
                                        className={`rounded px-2 py-0.5 text-xs font-bold transition-all ${expiry_days === d ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
                                    >
                                        {d}d Window
                                    </button>
                                ))}
                            </div>
                        </CardHeader>
                        <div className="p-0 border-t border-border">
                            {loadingStats ? (
                                <div className="p-4 space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
                            ) : (
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow className="border-b border-border hover:bg-transparent">
                                            <TableHead className="h-9 text-xs font-bold px-4">Product Variant Details</TableHead>
                                            <TableHead className="h-9 text-xs font-bold">Batch ID</TableHead>
                                            <TableHead className="h-9 text-xs font-bold">Stock Quantity</TableHead>
                                            <TableHead className="h-9 text-xs font-bold px-4">Days Left</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {near_expiry_stock.length === 0 ? (
                                            <TableRow><TableCell colSpan={4} className="h-20 text-center text-xs text-muted-foreground font-medium px-4">No batches match expiry warning thresholds within {expiry_days} days.</TableCell></TableRow>
                                        ) : (
                                            near_expiry_stock.map((item) => {
                                                const daysLeft = getDaysUntilExpiry(item.expiry_date);
                                                return (
                                                    <TableRow key={item.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                                                        <TableCell className="px-4 py-2">
                                                            {/* CHANGED FROM item.product_variant_id TO item.product_variant?.id */}
                                                            <Link href={`/warehouse/inventory/${item.product_variant?.id}`} className="font-bold text-xs text-primary hover:underline block leading-tight">
                                                                {item.product_variant?.product?.name ?? '—'}
                                                            </Link>
                                                            <span className="text-[10px] text-muted-foreground block mt-0.5">{item.product_variant?.sku}</span>
                                                        </TableCell>
                                                        <TableCell className="text-xs font-medium text-muted-foreground py-2">{item.batch_no}</TableCell>
                                                        <TableCell className="text-xs font-bold text-foreground py-2">{item.available_quantity}</TableCell>
                                                        <TableCell className="px-4 py-2">
                                                            <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-bold ${getExpiryBadge(daysLeft)}`}>
                                                                {daysLeft <= 0 ? 'EXPIRED' : `${daysLeft} DAYS LEFT`}
                                                            </span>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    </Card>
                </div>

            </div>
        </AppLayout>
    );
}
