import { Head, Link, router } from '@inertiajs/react';
import {
    Activity,
    AlertTriangle,
    ArrowDownRight,
    ArrowUpRight,
    CalendarDays,
    Clock,
    CreditCard,
    Package,
    ShoppingBag,
    ShoppingCart,
    Timer,
    TrendingUp,
    Truck,
    Users,
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
        name: string;
        sku: string;
        product?: { id: number; name: string };
    };
}

interface LowStockItem {
    id: number;
    name: string;
    sku: string;
    stock_alert_qty: number;
    available_qty: number;
    product?: { id: number; name: string };
}

interface TopProduct {
    name: string;
    sku: string;
    total_qty: number;
    total_revenue: number;
}

interface Props {
    stats: Stats;
    recent_orders: Order[];
    revenue_chart: ChartPoint[];
    near_expiry_stock: NearExpiryItem[];
    low_stock_items: LowStockItem[];
    top_products: TopProduct[];
    expiry_days: number;
    expiry_windows: number[];
}

// ---------------------------------------------------------------------------
// Breadcrumbs
// ---------------------------------------------------------------------------

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Dashboard', href: dashboard().url }];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
    if (daysLeft <= 7)  return 'bg-red-50 text-red-700 border-red-200';
    if (daysLeft <= 14) return 'bg-orange-50 text-orange-700 border-orange-200';
    return 'bg-yellow-50 text-yellow-700 border-yellow-200';
};

const getStatusColor = (status: string): string => {
    const map: Record<string, string> = {
        pending:    'bg-yellow-50 text-yellow-700 border-yellow-200',
        processing: 'bg-blue-50 text-blue-700 border-blue-200',
        packed:     'bg-indigo-50 text-indigo-700 border-indigo-200',
        dispatched: 'bg-purple-50 text-purple-700 border-purple-200',
        delivered:  'bg-green-50 text-green-700 border-green-200',
        cancelled:  'bg-red-50 text-red-700 border-red-200',
    };
    return map[status?.toLowerCase()] ?? 'bg-gray-50 text-gray-700 border-gray-200';
};

const GrowthBadge = ({ value }: { value: number }) => (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${value >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
        {value >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        {Math.abs(value)}% vs last month
    </span>
);

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

interface StatCardProps {
    title: string;
    icon: React.ReactNode;
    todayValue: React.ReactNode;
    monthValue: React.ReactNode;
    growth?: number;
    mode: 'today' | 'month';
    alert?: boolean;
    subtitle?: string;
}

const StatCard = ({ title, icon, todayValue, monthValue, growth, mode, alert, subtitle }: StatCardProps) => (
    <Card className={alert ? 'border-red-200 bg-red-50/30' : ''}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            <div className={alert ? 'text-red-500' : 'text-muted-foreground'}>{icon}</div>
        </CardHeader>
        <CardContent className="space-y-1">
            <div className={`text-2xl font-bold tracking-tight ${alert ? 'text-red-600' : ''}`}>
                {mode === 'today' ? todayValue : monthValue}
            </div>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            {growth !== undefined && mode === 'month' && <GrowthBadge value={growth} />}
            {mode === 'today' && (
                <p className="text-xs text-muted-foreground">
                    Month total: <span className="font-medium">{monthValue}</span>
                </p>
            )}
        </CardContent>
    </Card>
);

// ---------------------------------------------------------------------------
// Custom Tooltip for chart
// ---------------------------------------------------------------------------

const ChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-lg border bg-background p-3 shadow-md text-xs space-y-1">
            <p className="font-semibold text-sm mb-1">{label}</p>
            {payload.map((p: any) => (
                <div key={p.name} className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                    <span className="text-muted-foreground capitalize">{p.name.replace('_', ' ')}:</span>
                    <span className="font-medium">
                        {p.name === 'revenue' ? formatCurrencyShort(p.value) : p.value}
                    </span>
                </div>
            ))}
        </div>
    );
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function Dashboard({
    stats,
    recent_orders = [],
    revenue_chart = [],
    near_expiry_stock = [],
    low_stock_items = [],
    top_products = [],
    expiry_days,
    expiry_windows,
}: Props) {
    const [mode, setMode] = useState<'today' | 'month'>('today');
    const [chartMetric, setChartMetric] = useState<'revenue' | 'orders'>('revenue');

    const handleExpiryWindow = (days: number) => {
        router.get(window.location.pathname, { expiry_days: days }, { preserveState: true, preserveScroll: true });
    };

    // Determine max revenue for top-products bar scaling
    const maxProductRevenue = Math.max(...top_products.map(p => p.total_revenue), 1);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Warehouse Dashboard" />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto p-6">

                {/* ── Header ── */}
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Warehouse Dashboard</h2>
                        <p className="text-sm text-muted-foreground">
                            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                    </div>

                    {/* Today / Month toggle */}
                    <div className="flex items-center gap-1 rounded-lg border bg-muted p-1 self-start sm:self-auto">
                        <button
                            onClick={() => setMode('today')}
                            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                                mode === 'today' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Clock className="h-3.5 w-3.5" /> Today
                        </button>
                        <button
                            onClick={() => setMode('month')}
                            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                                mode === 'month' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <CalendarDays className="h-3.5 w-3.5" /> This Month
                        </button>
                    </div>
                </div>

                {/* ── KPI Cards (row 1) ── */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        title="Revenue"
                        icon={<TrendingUp className="h-4 w-4" />}
                        todayValue={formatCurrency(stats.today_revenue)}
                        monthValue={formatCurrency(stats.month_revenue)}
                        growth={stats.revenue_growth}
                        mode={mode}
                    />
                    <StatCard
                        title="Revenue (Pending)"
                        icon={<TrendingUp className="h-4 w-4" />}
                        todayValue={formatCurrency(stats.today_revenue_pending)}
                        monthValue={formatCurrency(stats.month_revenue_pending)}
                        growth={stats.revenue_growth_pending}
                        mode={mode}
                    />
                    {/* <StatCard
                        title="Total Orders"
                        icon={<ShoppingBag className="h-4 w-4" />}
                        todayValue={stats.today_orders.toLocaleString()}
                        monthValue={stats.month_orders.toLocaleString()}
                        growth={stats.orders_growth}
                        mode={mode}
                    /> */}
                    <StatCard
                        title="Online Orders"
                        icon={<ShoppingCart className="h-4 w-4" />}
                        todayValue={stats.today_online.toLocaleString()}
                        monthValue={stats.month_online.toLocaleString()}
                        growth={stats.online_growth}
                        mode={mode}
                    />
                    <StatCard
                        title="POS Sales"
                        icon={<CreditCard className="h-4 w-4" />}
                        todayValue={stats.today_pos.toLocaleString()}
                        monthValue={stats.month_pos.toLocaleString()}
                        growth={stats.pos_growth}
                        mode={mode}
                    />
                </div>

                {/* ── KPI Cards (row 2) ── */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        title="Low Stock Alerts"
                        icon={<AlertTriangle className="h-4 w-4" />}
                        todayValue={stats.low_stock}
                        monthValue={stats.low_stock}
                        mode={mode}
                        alert={stats.low_stock > 0}
                        subtitle="Products below alert threshold"
                    />
                    <StatCard
                        title="Near Expiry (30d)"
                        icon={<Timer className="h-4 w-4" />}
                        todayValue={stats.near_expiry}
                        monthValue={stats.near_expiry}
                        mode={mode}
                        alert={stats.near_expiry > 0}
                        subtitle="Batches expiring within 30 days"
                    />
                    <StatCard
                        title="Pending Deliveries"
                        icon={<Truck className="h-4 w-4" />}
                        todayValue={stats.pending_deliveries}
                        monthValue={stats.pending_deliveries}
                        mode={mode}
                        subtitle="Awaiting dispatch / in transit"
                    />
                    <StatCard
                        title="New Customers"
                        icon={<Users className="h-4 w-4" />}
                        todayValue={stats.today_customers}
                        monthValue={stats.month_customers}
                        mode={mode}
                        subtitle={mode === 'today' ? 'Registered today' : 'Registered this month'}
                    />
                </div>

                {/* ── Revenue Chart + Quick Actions ── */}
                <div className="grid gap-4 lg:grid-cols-7">
                    {/* Chart */}
                    <Card className="lg:col-span-5">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-base">6-Month Trend</CardTitle>
                            <div className="flex items-center gap-1 rounded-lg border bg-muted p-1">
                                <button
                                    onClick={() => setChartMetric('revenue')}
                                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                                        chartMetric === 'revenue' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                                    }`}
                                >
                                    Revenue
                                </button>
                                <button
                                    onClick={() => setChartMetric('orders')}
                                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                                        chartMetric === 'orders' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                                    }`}
                                >
                                    Orders
                                </button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={240}>
                                {chartMetric === 'revenue' ? (
                                    <AreaChart data={revenue_chart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                        <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                        <YAxis tickFormatter={formatCurrencyShort} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={60} />
                                        <Tooltip content={<ChartTooltip />} />
                                        <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#revGrad)" dot={{ r: 3, fill: '#6366f1' }} />
                                    </AreaChart>
                                ) : (
                                    <AreaChart data={revenue_chart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
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
                                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                        <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
                                        <Tooltip content={<ChartTooltip />} />
                                        <Area type="monotone" dataKey="online_orders" stroke="#06b6d4" strokeWidth={2} fill="url(#onlineGrad)" dot={{ r: 3, fill: '#06b6d4' }} />
                                        <Area type="monotone" dataKey="pos_orders"    stroke="#f59e0b" strokeWidth={2} fill="url(#posGrad)"   dot={{ r: 3, fill: '#f59e0b' }} />
                                    </AreaChart>
                                )}
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Quick Actions + Top Products */}
                    <Card className="lg:col-span-2">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-2">
                            <Button asChild className="w-full justify-start" variant="outline" size="sm">
                                <Link href="/warehouse/pos">
                                    <ShoppingCart className="mr-2 h-4 w-4" /> New POS Sale
                                </Link>
                            </Button>
                            <Button asChild className="w-full justify-start" variant="outline" size="sm">
                                <Link href="/warehouse/online-orders">
                                    <Package className="mr-2 h-4 w-4" /> Process Online Orders
                                </Link>
                            </Button>
                            <Button asChild className="w-full justify-start" variant="outline" size="sm">
                                <Link href="/warehouse/inventory">
                                    <Activity className="mr-2 h-4 w-4" /> Check Inventory
                                </Link>
                            </Button>
                            <Button asChild className="w-full justify-start" variant="outline" size="sm">
                                <Link href="/warehouse/deliveries">
                                    <Truck className="mr-2 h-4 w-4" /> Manage Deliveries
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* ── Recent Orders + Top Products ── */}
                <div className="grid gap-4 lg:grid-cols-7">
                    {/* Recent Orders */}
                    <Card className="lg:col-span-4">
                        <CardHeader>
                            <CardTitle className="text-base">Recent Orders</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Order</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Channel</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recent_orders.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                                No recent orders found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        recent_orders.map((order) => (
                                            <TableRow key={order.id}>
                                                <TableCell className="font-medium text-sm">
                                                    <div>{order.order_number}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {new Date(order.created_at).toLocaleString('en-IN', {
                                                            day: '2-digit', month: 'short',
                                                            hour: 'numeric', minute: '2-digit', hour12: true,
                                                        })}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {order.customer ? (
                                                        <div>
                                                            <div className="font-medium">{order.customer.name}</div>
                                                            <div className="text-xs text-muted-foreground">{order.customer.phone}</div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={`text-xs ${getStatusColor(order.status)}`}>
                                                        {order.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                                        order.order_channel === 'online'
                                                            ? 'bg-cyan-50 text-cyan-700'
                                                            : 'bg-amber-50 text-amber-700'
                                                    }`}>
                                                        {order.order_channel?.toUpperCase() ?? 'POS'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right text-sm font-medium">
                                                    {formatCurrency(order.total_amount)}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Top Products */}
                    <Card className="lg:col-span-3">
                        <CardHeader>
                            <CardTitle className="text-base">Top Products (This Month)</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {top_products.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">No data yet.</p>
                            ) : (
                                top_products.map((p, i) => (
                                    <div key={p.sku} className="space-y-1">
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                                                    {i + 1}
                                                </span>
                                                <span className="truncate font-medium">{p.name}</span>
                                            </div>
                                            <span className="ml-2 shrink-0 font-semibold">{formatCurrencyShort(p.total_revenue)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-primary transition-all"
                                                    style={{ width: `${(p.total_revenue / maxProductRevenue) * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-muted-foreground shrink-0">{p.total_qty} units</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* ── Near Expiry + Low Stock ── */}
                <div className="grid gap-4 lg:grid-cols-2">

                    {/* Near Expiry */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Timer className="h-4 w-4 text-orange-500" />
                                Near Expiry Stock
                            </CardTitle>
                            {/* Window toggle */}
                            <div className="flex items-center gap-1 rounded-lg border bg-muted p-1">
                                {expiry_windows.map((d) => (
                                    <button
                                        key={d}
                                        onClick={() => handleExpiryWindow(d)}
                                        className={`rounded-md px-2 py-1 text-xs font-medium transition-all ${
                                            expiry_days === d ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        {d}d
                                    </button>
                                ))}
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Batch</TableHead>
                                        <TableHead>Qty</TableHead>
                                        <TableHead>Expires</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {near_expiry_stock.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-20 text-center text-muted-foreground text-sm">
                                                No batches expiring within {expiry_days} days. ✓
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        near_expiry_stock.map((item) => {
                                            const daysLeft = getDaysUntilExpiry(item.expiry_date);
                                            return (
                                                <TableRow key={item.id}>
                                                    <TableCell className="text-sm">
                                                        <div className="font-medium">
                                                            {item.product_variant?.product?.name ?? '—'}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {item.product_variant?.sku}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {item.batch_no}
                                                    </TableCell>
                                                    <TableCell className="text-sm font-medium">
                                                        {item.available_quantity}
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${getExpiryBadge(daysLeft)}`}>
                                                            {daysLeft <= 0 ? 'Expired' : `${daysLeft}d left`}
                                                        </span>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Low Stock */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                                Low Stock Items
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead className="text-right">Available</TableHead>
                                        <TableHead className="text-right">Alert At</TableHead>
                                        <TableHead className="text-right">Deficit</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {low_stock_items.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-20 text-center text-muted-foreground text-sm">
                                                All stock levels are healthy. ✓
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        low_stock_items.map((item) => {
                                            const deficit = (item.stock_alert_qty ?? 0) - (item.available_qty ?? 0);
                                            return (
                                                <TableRow key={item.id}>
                                                    <TableCell className="text-sm">
                                                        <div className="font-medium">{item.product?.name ?? item.name}</div>
                                                        <div className="text-xs text-muted-foreground">{item.sku}</div>
                                                    </TableCell>
                                                    <TableCell className="text-right text-sm font-semibold text-red-600">
                                                        {item.available_qty ?? 0}
                                                    </TableCell>
                                                    <TableCell className="text-right text-sm text-muted-foreground">
                                                        {item.stock_alert_qty}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                                                            -{deficit}
                                                        </span>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

            </div>
        </AppLayout>
    );
}
