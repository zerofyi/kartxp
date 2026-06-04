import { Head, router } from '@inertiajs/react';
import React, { useState } from 'react';
import {
    Search,
    Eye,
    Edit2,
    Printer,
    Calendar,
    User,
    DollarSign,
    Package,
    Filter,
    Download,
} from 'lucide-react';

import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import type { BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: dashboard().url },
    { title: 'Sales', href: '' },
];

type Customer = {
    id: number;
    name: string;
    phone: string;
};

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

type Payment = {
    id: number;
    method: string;
    amount: number;
};

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

export default function SalesList({ sales }: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [dateFilter, setDateFilter] = useState({ from: '', to: '' });
    const [showFilters, setShowFilters] = useState(false);

    const filteredSales = sales.data.filter((sale) => {
        const matchesSearch =
            sale.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            sale.customer?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            sale.customer?.phone.includes(searchQuery);

        const matchesStatus = statusFilter === 'all' || sale.status === statusFilter;

        const matchesDate =
            (!dateFilter.from || new Date(sale.created_at) >= new Date(dateFilter.from)) &&
            (!dateFilter.to || new Date(sale.created_at) <= new Date(dateFilter.to));

        return matchesSearch && matchesStatus && matchesDate;
    });

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
            completed: 'default',
            pending: 'secondary',
            processing: 'outline',
            cancelled: 'destructive',
        };
        return <Badge variant={variants[status] || 'outline'}>{status.toUpperCase()}</Badge>;
    };

    const exportToCSV = () => {
        const headers = [
            'Order Number',
            'Date',
            'Customer',
            'Phone',
            'Items',
            'Subtotal',
            'Tax',
            'Discount',
            'Total',
            'Status',
        ];
        const rows = filteredSales.map((sale) => [
            sale.order_number,
            new Date(sale.created_at).toLocaleDateString(),
            sale.customer?.name || 'Walk-in',
            sale.customer?.phone || '-',
            sale.items?.length || 0,
            Number(sale.subtotal).toFixed(2),
            Number(sale.tax_amount).toFixed(2),
            Number(sale.discount_amount).toFixed(2),
            Number(sale.total_amount).toFixed(2),
            sale.status,
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sales-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const totalSales = filteredSales.reduce((sum, sale) => sum + Number(sale.total_amount), 0);
    const totalOrders = filteredSales.length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Sales List" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-2xl">Sales Management</CardTitle>
                                <CardDescription>View and manage all sales orders</CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={exportToCSV} variant="outline">
                                    <Download className="mr-2 size-4" />
                                    Export CSV
                                </Button>
                                <Button onClick={() => router.visit('/warehouse/pos')}>
                                    <Package className="mr-2 size-4" />
                                    New Sale
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                {/* Stats */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900">
                                    <Package className="size-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">Total Orders</div>
                                    <div className="text-2xl font-bold">{totalOrders}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="rounded-full bg-green-100 p-3 dark:bg-green-900">
                                    <DollarSign className="size-6 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">Total Sales</div>
                                    <div className="text-2xl font-bold">₹{Number(totalSales).toFixed(2)}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="rounded-full bg-purple-100 p-3 dark:bg-purple-900">
                                    <User className="size-6 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">Customers</div>
                                    <div className="text-2xl font-bold">
                                        {new Set(filteredSales.map((s) => s.customer?.id).filter(Boolean)).size}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="rounded-full bg-orange-100 p-3 dark:bg-orange-900">
                                    <Calendar className="size-6 text-orange-600 dark:text-orange-400" />
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">Avg Order Value</div>
                                    <div className="text-2xl font-bold">
                                        ₹{totalOrders > 0 ? (Number(totalSales) / Number(totalOrders)).toFixed(2) : '0.00'}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex flex-wrap gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search by order number, customer..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9"
                                />
                            </div>

                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-45">
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
                                onClick={() => setShowFilters(!showFilters)}
                                className={showFilters ? 'bg-primary text-primary-foreground' : ''}
                            >
                                <Filter className="mr-2 size-4" />
                                More Filters
                            </Button>
                        </div>

                        {showFilters && (
                            <div className="mt-4 grid gap-4 rounded-md border bg-muted/50 p-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Date From</Label>
                                    <Input
                                        type="date"
                                        value={dateFilter.from}
                                        onChange={(e) => setDateFilter({ ...dateFilter, from: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Date To</Label>
                                    <Input
                                        type="date"
                                        value={dateFilter.to}
                                        onChange={(e) => setDateFilter({ ...dateFilter, to: e.target.value })}
                                    />
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Sales Table */}
                <Card className="flex-1 overflow-hidden">
                    <div className="h-full overflow-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-muted/50">
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
                                    filteredSales.map((sale) => (
                                        <TableRow key={sale.id} className="hover:bg-accent/50">
                                            <TableCell className="font-mono font-medium">
                                                {sale.order_number}
                                            </TableCell>
                                            <TableCell>
                                                {new Date(sale.created_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium">
                                                        {sale.customer?.name || 'Walk-in Customer'}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {sale.customer?.phone || '-'}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{sale.order_channel}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {sale.items?.length || 0}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                ₹{Number(sale.subtotal).toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                ₹{Number(sale.tax_amount).toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                ₹{Number(sale.discount_amount).toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-right font-semibold">
                                                ₹{Number(sale.total_amount).toFixed(2)}
                                            </TableCell>
                                            <TableCell>{getStatusBadge(sale.status)}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => router.visit(`/warehouse/sales/${sale.id}`)}
                                                    >
                                                        <Eye className="size-4" />
                                                    </Button>
                                                    {sale.status !== 'completed' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => router.visit(`/warehouse/sales/${sale.id}/edit`)}
                                                        >
                                                            <Edit2 className="size-4" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => window.open(`/warehouse/sales/${sale.id}/print`, '_blank')}
                                                    >
                                                        <Printer className="size-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                                            {searchQuery || statusFilter !== 'all'
                                                ? 'No sales match your filters.'
                                                : 'No sales yet.'}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </Card>

                {/* Pagination */}
                {sales.last_page > 1 && (
                    <Card>
                        <CardContent className="flex items-center justify-between p-4">
                            <div className="text-sm text-muted-foreground">
                                Showing {sales.data.length} of {sales.total} sales
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={sales.current_page === 1}
                                    onClick={() => router.visit(`/warehouse/sales?page=${sales.current_page - 1}`)}
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={sales.current_page === sales.last_page}
                                    onClick={() => router.visit(`/warehouse/sales?page=${sales.current_page + 1}`)}
                                >
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
