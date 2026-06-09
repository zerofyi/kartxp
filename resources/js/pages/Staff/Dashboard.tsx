import { Head, router } from '@inertiajs/react';
import {
    ShoppingCart,
    IndianRupee,
    Package,
    AlertTriangle,
    Clock,
    ExternalLink,
    ArrowRight,
} from 'lucide-react';

import AppLayout from '@/layouts/app-layout';
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

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type Props = {
    stats: {
        pos_sales_today: number;
        revenue_today: number;
        orders_to_pack: number;
        low_stock_items: number;
    };
    orders_to_pack: Array<{
        id: number;
        order_number: string;
        items_count: number;
        created_at: string;
        customer: { name: string } | null;
    }>;
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Staff Dashboard', href: '' },
];

function formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}

// ─────────────────────────────────────────────
// Quick Links
// ─────────────────────────────────────────────
const quickLinks = [
    {
        label: 'Point of Sale',
        description: 'Create new sales',
        href: '/warehouse/pos',
        icon: <ShoppingCart className="size-6" />,
        color: 'from-blue-500 to-blue-600',
    },
    {
        label: 'Inventory',
        description: 'Check stock levels',
        href: '/warehouse/inventory',
        icon: <Package className="size-6" />,
        color: 'from-purple-500 to-purple-600',
    },
    {
        label: 'Online Orders',
        description: 'Manage online orders',
        href: '/warehouse/orders',
        icon: <ShoppingCart className="size-6" />,
        color: 'from-emerald-500 to-emerald-600',
    },
];

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────
export default function StaffDashboard({ stats, orders_to_pack }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Staff Dashboard" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Staff Dashboard</h1>
                    <p className="text-muted-foreground text-sm">
                        {new Date().toLocaleDateString('en-IN', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                        })}
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">POS Sales Today</p>
                                    <p className="text-3xl font-bold text-blue-700 dark:text-blue-300 mt-1">
                                        {stats.pos_sales_today}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-blue-500/20 p-3">
                                    <ShoppingCart className="size-6 text-blue-600 dark:text-blue-400" />
                                </div>
                            </div>
                            <p className="text-xs text-blue-500/80 mt-2">Transactions processed</p>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/50 dark:to-green-900/30">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-green-600 dark:text-green-400">Today's Revenue</p>
                                    <p className="text-2xl font-bold text-green-700 dark:text-green-300 mt-1">
                                        ₹{Number(stats.revenue_today).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-green-500/20 p-3">
                                    <IndianRupee className="size-6 text-green-600 dark:text-green-400" />
                                </div>
                            </div>
                            <p className="text-xs text-green-500/80 mt-2">Total paid orders</p>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/50 dark:to-amber-900/30">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Orders to Pack</p>
                                    <p className="text-3xl font-bold text-amber-700 dark:text-amber-300 mt-1">
                                        {stats.orders_to_pack}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-amber-500/20 p-3">
                                    <Package className="size-6 text-amber-600 dark:text-amber-400" />
                                </div>
                            </div>
                            <p className="text-xs text-amber-500/80 mt-2">Confirmed & processing</p>
                        </CardContent>
                    </Card>

                    <Card className={`border-0 shadow-sm ${stats.low_stock_items > 0
                        ? 'bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/50 dark:to-red-900/30'
                        : 'bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-950/50 dark:to-slate-900/30'
                    }`}>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className={`text-sm font-medium ${stats.low_stock_items > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-600'}`}>
                                        Low Stock Items
                                    </p>
                                    <p className={`text-3xl font-bold mt-1 ${stats.low_stock_items > 0 ? 'text-red-700 dark:text-red-300' : 'text-slate-700'}`}>
                                        {stats.low_stock_items}
                                    </p>
                                </div>
                                <div className={`rounded-xl p-3 ${stats.low_stock_items > 0 ? 'bg-red-500/20' : 'bg-slate-500/20'}`}>
                                    <AlertTriangle className={`size-6 ${stats.low_stock_items > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-500'}`} />
                                </div>
                            </div>
                            <p className={`text-xs mt-2 ${stats.low_stock_items > 0 ? 'text-red-500/80' : 'text-slate-500/80'}`}>
                                {stats.low_stock_items > 0 ? 'Need restocking soon' : 'Stock levels are fine'}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Links */}
                <div className="grid gap-4 sm:grid-cols-3">
                    {quickLinks.map((link) => (
                        <Card
                            key={link.href}
                            className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 border-0"
                            onClick={() => router.visit(link.href)}
                        >
                            <CardContent className="p-0">
                                <div className={`bg-gradient-to-br ${link.color} p-5 rounded-t-xl`}>
                                    <div className="text-white">{link.icon}</div>
                                </div>
                                <div className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold">{link.label}</p>
                                        <p className="text-xs text-muted-foreground">{link.description}</p>
                                    </div>
                                    <ArrowRight className="size-4 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Orders to Pack Table */}
                <Card className="flex-1">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Clock className="size-4 text-amber-500" />
                                    Orders to Pack
                                </CardTitle>
                                <CardDescription>
                                    Confirmed and processing orders awaiting packing
                                </CardDescription>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.visit('/warehouse/orders?status=confirmed')}
                            >
                                View All
                                <ExternalLink className="ml-1.5 size-3.5" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {orders_to_pack.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="rounded-full bg-muted p-4 mb-4">
                                    <Package className="size-8 text-muted-foreground" />
                                </div>
                                <p className="font-medium text-muted-foreground">No orders to pack</p>
                                <p className="text-sm text-muted-foreground/70 mt-1">All orders have been packed! Great work.</p>
                            </div>
                        ) : (
                            <div className="overflow-auto">
                                <Table>
                                    <TableHeader className="bg-muted/40">
                                        <TableRow>
                                            <TableHead>Order No.</TableHead>
                                            <TableHead>Customer</TableHead>
                                            <TableHead className="text-center">Items</TableHead>
                                            <TableHead>Placed At</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {orders_to_pack.map((order) => (
                                            <TableRow key={order.id} className="hover:bg-accent/40">
                                                <TableCell className="font-mono font-semibold">
                                                    {order.order_number}
                                                </TableCell>
                                                <TableCell>
                                                    {order.customer?.name ?? (
                                                        <span className="text-muted-foreground text-sm">Walk-in</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="secondary">{order.items_count}</Badge>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {formatDate(order.created_at)}
                                                </TableCell>
                                                <TableCell>
                                                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 border-amber-200">
                                                        To Pack
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => router.visit(`/warehouse/orders/${order.id}`)}
                                                    >
                                                        View
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
