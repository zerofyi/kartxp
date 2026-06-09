import { Head, router } from '@inertiajs/react';
import {
    TrendingUp,
    ShoppingCart,
    Users,
    Package,
    Clock,
    Loader2,
    AlertTriangle,
    CheckCircle,
    XCircle,
    ArrowRight,
    BarChart2,
    Truck,
    Warehouse,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AdminAppLayout from '@/layouts/admin-app-layout';
import type { BreadcrumbItem } from '@/types';
import admin from '@/routes/admin';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: admin.dashboard().url },
];

type Props = {
    stats: {
        today_revenue: number;
        total_revenue: number;
        total_orders: number;
        pending_orders: number;
        processing_orders: number;
        delivered_orders: number;
        cancelled_orders: number;
        total_users: number;
        total_products: number;
        low_stock_alerts: number;
    };
    chart_data: Array<{ date: string; revenue: number; orders: number }>;
    recent_orders: Array<{
        id: number;
        order_number: string;
        customer: { name: string; phone: string } | null;
        status: string;
        total_amount: number;
        created_at: string;
    }>;
    top_products: Array<{ name: string; total_sold: number; revenue: number }>;
    warehouses: Array<{ id: number; name: string; is_active: boolean }>;
};

function formatCurrency(amount: number) {
    return '₹' + amount.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

function getStatusBadge(status: string) {
    const map: Record<string, { label: string; className: string }> = {
        pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
        processing: { label: 'Processing', className: 'bg-blue-100 text-blue-800 border-blue-200' },
        shipped: { label: 'Shipped', className: 'bg-purple-100 text-purple-800 border-purple-200' },
        delivered: { label: 'Delivered', className: 'bg-green-100 text-green-800 border-green-200' },
        cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-800 border-red-200' },
    };
    const s = map[status] ?? { label: status, className: 'bg-gray-100 text-gray-700 border-gray-200' };
    return (
        <Badge variant="outline" className={s.className}>
            {s.label}
        </Badge>
    );
}

export default function Dashboard({ stats, chart_data = [], recent_orders = [], top_products = [], warehouses = [] }: Props) {
    const maxRevenue = Math.max(...chart_data.map((d) => d.revenue), 1);

    return (
        <AdminAppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                {/* ── Hero Stats Row ── */}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    {/* Today Revenue */}
                    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-lg">
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-medium text-indigo-200">Today's Revenue</p>
                                    <p className="mt-1 text-2xl font-bold">{formatCurrency(stats?.today_revenue ?? 0)}</p>
                                </div>
                                <div className="rounded-xl bg-white/20 p-2">
                                    <TrendingUp className="h-5 w-5" />
                                </div>
                            </div>
                            <p className="mt-2 text-xs text-indigo-200">
                                Total: {formatCurrency(stats?.total_revenue ?? 0)}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Total Orders */}
                    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg">
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-medium text-emerald-100">Total Orders</p>
                                    <p className="mt-1 text-2xl font-bold">{(stats?.total_orders ?? 0).toLocaleString()}</p>
                                </div>
                                <div className="rounded-xl bg-white/20 p-2">
                                    <ShoppingCart className="h-5 w-5" />
                                </div>
                            </div>
                            <p className="mt-2 text-xs text-emerald-100">
                                Delivered: {stats?.delivered_orders ?? 0}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Active Users */}
                    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-lg">
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-medium text-violet-100">Total Users</p>
                                    <p className="mt-1 text-2xl font-bold">{(stats?.total_users ?? 0).toLocaleString()}</p>
                                </div>
                                <div className="rounded-xl bg-white/20 p-2">
                                    <Users className="h-5 w-5" />
                                </div>
                            </div>
                            <p className="mt-2 text-xs text-violet-100">Registered accounts</p>
                        </CardContent>
                    </Card>

                    {/* Total Products */}
                    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg">
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-medium text-amber-100">Total Products</p>
                                    <p className="mt-1 text-2xl font-bold">{(stats?.total_products ?? 0).toLocaleString()}</p>
                                </div>
                                <div className="rounded-xl bg-white/20 p-2">
                                    <Package className="h-5 w-5" />
                                </div>
                            </div>
                            <p className="mt-2 text-xs text-amber-100">
                                Low stock: {stats?.low_stock_alerts ?? 0}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* ── Quick Stats Row ── */}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <Card className="border border-yellow-200 bg-yellow-50">
                        <CardContent className="flex items-center gap-4 p-4">
                            <div className="rounded-lg bg-yellow-100 p-2">
                                <Clock className="h-5 w-5 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-xs text-yellow-700">Pending Orders</p>
                                <p className="text-xl font-bold text-yellow-900">{stats?.pending_orders ?? 0}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border border-blue-200 bg-blue-50">
                        <CardContent className="flex items-center gap-4 p-4">
                            <div className="rounded-lg bg-blue-100 p-2">
                                <Loader2 className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs text-blue-700">Processing</p>
                                <p className="text-xl font-bold text-blue-900">{stats?.processing_orders ?? 0}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border border-red-200 bg-red-50">
                        <CardContent className="flex items-center gap-4 p-4">
                            <div className="rounded-lg bg-red-100 p-2">
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                                <p className="text-xs text-red-700">Low Stock Alerts</p>
                                <p className="text-xl font-bold text-red-900">{stats?.low_stock_alerts ?? 0}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border border-gray-200 bg-gray-50">
                        <CardContent className="flex items-center gap-4 p-4">
                            <div className="rounded-lg bg-gray-100 p-2">
                                <XCircle className="h-5 w-5 text-gray-500" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-600">Cancelled</p>
                                <p className="text-xl font-bold text-gray-800">{stats?.cancelled_orders ?? 0}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ── Revenue Chart + Warehouses ── */}
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Revenue Chart */}
                    <Card className="lg:col-span-2">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <BarChart2 className="h-4 w-4 text-indigo-500" />
                                        30-Day Revenue
                                    </CardTitle>
                                    <CardDescription>Daily revenue for the last 30 days</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {chart_data.length === 0 ? (
                                <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                                    No data available
                                </div>
                            ) : (
                                <div className="relative">
                                    {/* Y-axis labels */}
                                    <div className="flex h-48 items-end gap-1">
                                        {chart_data.map((d, i) => {
                                            const heightPct = maxRevenue > 0 ? (d.revenue / maxRevenue) * 100 : 0;
                                            return (
                                                <div
                                                    key={i}
                                                    className="group relative flex flex-1 flex-col items-center justify-end"
                                                    style={{ height: '100%' }}
                                                >
                                                    {/* Tooltip */}
                                                    <div className="absolute bottom-full mb-1 hidden rounded bg-gray-900 px-2 py-1 text-xs text-white group-hover:block whitespace-nowrap z-10">
                                                        {d.date}
                                                        <br />
                                                        {formatCurrency(d.revenue)}
                                                        <br />
                                                        {d.orders} orders
                                                    </div>
                                                    <div
                                                        className="w-full rounded-t bg-indigo-500 transition-all hover:bg-indigo-400 min-h-0.5"
                                                        style={{ height: `${heightPct}%` }}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {/* X-axis labels */}
                                    <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                                        <span>{chart_data[0]?.date ?? ''}</span>
                                        <span>{chart_data[Math.floor(chart_data.length / 2)]?.date ?? ''}</span>
                                        <span>{chart_data[chart_data.length - 1]?.date ?? ''}</span>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Warehouses */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Warehouse className="h-4 w-4 text-emerald-500" />
                                Warehouses
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {warehouses.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No warehouses configured</p>
                            ) : (
                                warehouses.map((w) => (
                                    <div
                                        key={w.id}
                                        className="flex items-center justify-between rounded-lg border p-3"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Warehouse className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm font-medium">{w.name}</span>
                                        </div>
                                        {w.is_active ? (
                                            <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                                                <CheckCircle className="mr-1 h-3 w-3" /> Active
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-xs">
                                                Inactive
                                            </Badge>
                                        )}
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* ── Recent Orders + Top Products ── */}
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Recent Orders */}
                    <Card>
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <ShoppingCart className="h-4 w-4 text-emerald-500" />
                                    Recent Orders
                                </CardTitle>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs"
                                    onClick={() => router.visit('/admin/orders')}
                                >
                                    View all <ArrowRight className="ml-1 h-3 w-3" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {recent_orders.length === 0 ? (
                                <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                                    No recent orders
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Order</TableHead>
                                            <TableHead>Customer</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {recent_orders.map((order) => (
                                            <TableRow
                                                key={order.id}
                                                className="cursor-pointer hover:bg-muted/50"
                                                onClick={() => router.visit('/admin/orders/' + order.id)}
                                            >
                                                <TableCell>
                                                    <div className="font-medium text-sm">#{order.order_number}</div>
                                                    <div className="text-xs text-muted-foreground">{formatDate(order.created_at)}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm">{order.customer?.name ?? 'Guest'}</div>
                                                    <div className="text-xs text-muted-foreground">{order.customer?.phone ?? '—'}</div>
                                                </TableCell>
                                                <TableCell>{getStatusBadge(order.status)}</TableCell>
                                                <TableCell className="text-right font-semibold text-sm">
                                                    {formatCurrency(order.total_amount)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                    {/* Top Products */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Truck className="h-4 w-4 text-amber-500" />
                                Top Products by Sales
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {top_products.length === 0 ? (
                                <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                                    No product data available
                                </div>
                            ) : (
                                top_products.map((product, i) => {
                                    const maxSold = Math.max(...top_products.map((p) => p.total_sold), 1);
                                    const pct = (product.total_sold / maxSold) * 100;
                                    return (
                                        <div key={i} className="space-y-1">
                                            <div className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2">
                                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                                                        {i + 1}
                                                    </span>
                                                    <span className="font-medium line-clamp-1 max-w-[160px]">{product.name}</span>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-semibold">{formatCurrency(product.revenue)}</div>
                                                    <div className="text-xs text-muted-foreground">{product.total_sold} sold</div>
                                                </div>
                                            </div>
                                            <div className="h-1.5 w-full rounded-full bg-gray-100">
                                                <div
                                                    className="h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AdminAppLayout>
    );
}
