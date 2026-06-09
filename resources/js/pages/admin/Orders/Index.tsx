import { Head, router } from '@inertiajs/react';
import {
    Search,
    ShoppingCart,
    TrendingUp,
    Clock,
    Download,
    Filter,
    ChevronLeft,
    ChevronRight,
    Eye,
} from 'lucide-react';
import { useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox as CheckboxUI } from '@/components/ui/checkbox';
import AdminAppLayout from '@/layouts/admin-app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/admin' },
    { title: 'Orders', href: '/admin/orders' },
];

type Order = {
    id: number;
    order_number: string;
    order_channel: string;
    status: string;
    payment_status: string;
    total_amount: number;
    created_at: string;
    customer: { name: string; phone: string } | null;
    warehouse: { name: string } | null;
};

type Props = {
    orders: { data: Order[]; current_page: number; last_page: number; total: number };
    stats: {
        total: number;
        pending: number;
        processing: number;
        delivered: number;
        cancelled: number;
        today_revenue: number;
    };
    filters: Record<string, string>;
    warehouses: Array<{ id: number; name: string }>;
};

function formatCurrency(amount: number) {
    return '₹' + (amount ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getStatusBadge(status: string) {
    const map: Record<string, string> = {
        pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        processing: 'bg-blue-100 text-blue-800 border-blue-200',
        shipped: 'bg-purple-100 text-purple-800 border-purple-200',
        delivered: 'bg-green-100 text-green-800 border-green-200',
        cancelled: 'bg-red-100 text-red-800 border-red-200',
        on_hold: 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return (
        <Badge variant="outline" className={`capitalize ${map[status] ?? 'bg-gray-100 text-gray-700'}`}>
            {status.replace('_', ' ')}
        </Badge>
    );
}

function getPaymentBadge(status: string) {
    const map: Record<string, string> = {
        paid: 'bg-green-100 text-green-800 border-green-200',
        unpaid: 'bg-red-100 text-red-700 border-red-200',
        pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        refunded: 'bg-gray-100 text-gray-600 border-gray-200',
    };
    return (
        <Badge variant="outline" className={`capitalize ${map[status] ?? 'bg-gray-100 text-gray-700'}`}>
            {status}
        </Badge>
    );
}

function getChannelBadge(channel: string) {
    const map: Record<string, string> = {
        online: 'bg-indigo-100 text-indigo-700',
        pos: 'bg-teal-100 text-teal-700',
        phone: 'bg-orange-100 text-orange-700',
    };
    return (
        <Badge className={`text-xs ${map[channel] ?? 'bg-gray-100 text-gray-700'}`}>
            {channel}
        </Badge>
    );
}

export default function OrdersIndex({ orders, stats, filters = {}, warehouses = [] }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? 'all');
    const [paymentStatus, setPaymentStatus] = useState(filters.payment_status ?? 'all');
    const [warehouseId, setWarehouseId] = useState(filters.warehouse_id ?? 'all');
    const [dateFrom, setDateFrom] = useState(filters.from ?? '');
    const [dateTo, setDateTo] = useState(filters.to ?? '');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [bulkAction, setBulkAction] = useState('');

    const buildParams = (overrides: Record<string, string> = {}) => {
        const params: Record<string, string> = {};
        const s = overrides.search ?? search;
        const st = overrides.status ?? status;
        const ps = overrides.payment_status ?? paymentStatus;
        const wh = overrides.warehouse_id ?? warehouseId;
        const from = overrides.from ?? dateFrom;
        const to = overrides.to ?? dateTo;
        if (s) params.search = s;
        if (st && st !== 'all') params.status = st;
        if (ps && ps !== 'all') params.payment_status = ps;
        if (wh && wh !== 'all') params.warehouse_id = wh;
        if (from) params.from = from;
        if (to) params.to = to;
        return params;
    };

    const applyFilters = (overrides: Record<string, string> = {}) => {
        router.visit('/admin/orders', { data: buildParams(overrides), preserveState: true });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const toggleSelect = (id: number) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === orders?.data?.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(orders?.data?.map((o) => o.id) ?? []);
        }
    };

    const applyBulkAction = () => {
        if (!bulkAction || selectedIds.length === 0) return;
        router.post('/admin/orders/bulk-status', {
            ids: selectedIds,
            status: bulkAction,
        }, {
            onSuccess: () => {
                setSelectedIds([]);
                setBulkAction('');
            },
        });
    };

    return (
        <AdminAppLayout breadcrumbs={breadcrumbs}>
            <Head title="Orders" />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
                        <p className="mt-1 text-sm text-muted-foreground">Manage all customer orders</p>
                    </div>
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => window.open('/admin/orders/export/csv?' + new URLSearchParams(buildParams()).toString(), '_blank')}
                    >
                        <Download className="h-4 w-4" />
                        Export CSV
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <Card className="border-0 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-md">
                        <CardContent className="p-4">
                            <p className="text-xs text-indigo-200">Total Orders</p>
                            <p className="text-2xl font-bold">{stats?.total ?? 0}</p>
                        </CardContent>
                    </Card>
                    <Card className="border border-yellow-100 bg-yellow-50">
                        <CardContent className="p-4">
                            <p className="text-xs text-yellow-600">Pending</p>
                            <p className="text-2xl font-bold text-yellow-900">{stats?.pending ?? 0}</p>
                        </CardContent>
                    </Card>
                    <Card className="border border-green-100 bg-green-50">
                        <CardContent className="p-4">
                            <p className="text-xs text-green-600">Delivered</p>
                            <p className="text-2xl font-bold text-green-900">{stats?.delivered ?? 0}</p>
                        </CardContent>
                    </Card>
                    <Card className="border-0 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-md">
                        <CardContent className="p-4">
                            <p className="text-xs text-emerald-100">Today's Revenue</p>
                            <p className="text-xl font-bold">{formatCurrency(stats?.today_revenue ?? 0)}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card>
                    <CardContent className="p-4">
                        <form onSubmit={handleSearch} className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                            <div className="relative lg:col-span-1">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Order # or customer name…"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                            <Select
                                value={status}
                                onValueChange={(val) => { setStatus(val); applyFilters({ status: val }); }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="processing">Processing</SelectItem>
                                    <SelectItem value="shipped">Shipped</SelectItem>
                                    <SelectItem value="delivered">Delivered</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                    <SelectItem value="on_hold">On Hold</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select
                                value={paymentStatus}
                                onValueChange={(val) => { setPaymentStatus(val); applyFilters({ payment_status: val }); }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Payment Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Payment</SelectItem>
                                    <SelectItem value="paid">Paid</SelectItem>
                                    <SelectItem value="unpaid">Unpaid</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="refunded">Refunded</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select
                                value={warehouseId}
                                onValueChange={(val) => { setWarehouseId(val); applyFilters({ warehouse_id: val }); }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Warehouse" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Warehouses</SelectItem>
                                    {warehouses.map((w) => (
                                        <SelectItem key={w.id} value={String(w.id)}>
                                            {w.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Input
                                type="date"
                                placeholder="From date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                            />
                            <Input
                                type="date"
                                placeholder="To date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                            />
                            <Button type="submit" className="gap-2">
                                <Filter className="h-4 w-4" />
                                Apply Filters
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                    setSearch(''); setStatus('all'); setPaymentStatus('all');
                                    setWarehouseId('all'); setDateFrom(''); setDateTo('');
                                    router.visit('/admin/orders');
                                }}
                            >
                                Clear
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Bulk Actions */}
                {selectedIds.length > 0 && (
                    <div className="flex items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50 p-3">
                        <span className="text-sm font-medium text-indigo-700">
                            {selectedIds.length} order(s) selected
                        </span>
                        <Select value={bulkAction} onValueChange={setBulkAction}>
                            <SelectTrigger className="w-44">
                                <SelectValue placeholder="Bulk action…" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="processing">Mark Processing</SelectItem>
                                <SelectItem value="shipped">Mark Shipped</SelectItem>
                                <SelectItem value="delivered">Mark Delivered</SelectItem>
                                <SelectItem value="cancelled">Mark Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button size="sm" onClick={applyBulkAction} disabled={!bulkAction}>
                            Apply
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>
                            Deselect
                        </Button>
                    </div>
                )}

                {/* Table */}
                <Card>
                    <CardHeader className="pb-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {orders?.total ?? 0} orders found
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10">
                                        <CheckboxUI
                                            checked={selectedIds.length === orders?.data?.length && orders?.data?.length > 0}
                                            onCheckedChange={toggleSelectAll}
                                        />
                                    </TableHead>
                                    <TableHead>Order</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Warehouse</TableHead>
                                    <TableHead>Channel</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Payment</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {!orders?.data?.length ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-32 text-center">
                                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                <ShoppingCart className="h-8 w-8" />
                                                <p>No orders found</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    orders.data.map((order) => (
                                        <TableRow key={order.id} className={selectedIds.includes(order.id) ? 'bg-indigo-50' : ''}>
                                            <TableCell>
                                                <CheckboxUI
                                                    checked={selectedIds.includes(order.id)}
                                                    onCheckedChange={() => toggleSelect(order.id)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-mono font-medium text-sm">#{order.order_number}</div>
                                                <div className="text-xs text-muted-foreground">{formatDate(order.created_at)}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm font-medium">{order.customer?.name ?? 'Guest'}</div>
                                                <div className="text-xs text-muted-foreground">{order.customer?.phone ?? '—'}</div>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {order.warehouse?.name ?? '—'}
                                            </TableCell>
                                            <TableCell>{getChannelBadge(order.order_channel)}</TableCell>
                                            <TableCell>{getStatusBadge(order.status)}</TableCell>
                                            <TableCell>{getPaymentBadge(order.payment_status)}</TableCell>
                                            <TableCell className="text-right font-semibold">
                                                {formatCurrency(order.total_amount)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => router.visit('/admin/orders/' + order.id)}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Pagination */}
                {orders && orders.last_page > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            Page {orders.current_page} of {orders.last_page}
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={orders.current_page <= 1}
                                onClick={() =>
                                    router.visit('/admin/orders', {
                                        data: { ...buildParams(), page: orders.current_page - 1 },
                                        preserveState: true,
                                    })
                                }
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={orders.current_page >= orders.last_page}
                                onClick={() =>
                                    router.visit('/admin/orders', {
                                        data: { ...buildParams(), page: orders.current_page + 1 },
                                        preserveState: true,
                                    })
                                }
                            >
                                Next
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </AdminAppLayout>
    );
}
