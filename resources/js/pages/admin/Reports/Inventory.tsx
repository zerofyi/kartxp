import { Head, router } from '@inertiajs/react';
import { AlertTriangle, Download, Package, TrendingDown } from 'lucide-react';
import { useState } from 'react';
import AdminAppLayout from '@/layouts/admin-app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Reports', href: '/admin/reports' },
    { title: 'Inventory Report', href: '/admin/reports/inventory' },
];

type LowStockItem = {
    variant_id: number;
    sku: string;
    variant_name: string;
    product_name: string;
    warehouse_name: string;
    available_quantity: number;
    stock_alert_qty: number;
};

type TopMover = {
    product_name: string;
    variant_name: string;
    qty_moved: number;
    revenue: number;
};

type Props = {
    summary: {
        total_products: number;
        total_variants: number;
        low_stock_count: number;
        out_of_stock_count: number;
    };
    low_stock: LowStockItem[];
    top_movers: TopMover[];
};

export default function InventoryReport({ summary, low_stock, top_movers }: Props) {
    const fmt = (n: number) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

    return (
        <AdminAppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inventory Report — Admin" />
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Inventory Report</h1>
                        <p className="text-muted-foreground">Stock levels, alerts & top movers</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => window.open('/admin/reports/export?type=inventory')}>
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                    </Button>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <Card>
                        <CardContent className="pt-6">
                            <p className="text-sm text-muted-foreground">Total Products</p>
                            <p className="text-2xl font-bold mt-1">{summary.total_products}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <p className="text-sm text-muted-foreground">Total Variants</p>
                            <p className="text-2xl font-bold mt-1">{summary.total_variants}</p>
                        </CardContent>
                    </Card>
                    <Card className="border-amber-200 dark:border-amber-800">
                        <CardContent className="pt-6">
                            <p className="text-sm text-amber-600">Low Stock</p>
                            <p className="text-2xl font-bold text-amber-600 mt-1">{summary.low_stock_count}</p>
                        </CardContent>
                    </Card>
                    <Card className="border-red-200 dark:border-red-800">
                        <CardContent className="pt-6">
                            <p className="text-sm text-red-500">Out of Stock</p>
                            <p className="text-2xl font-bold text-red-500 mt-1">{summary.out_of_stock_count}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Low Stock Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-amber-600">
                            <AlertTriangle className="h-5 w-5" />
                            Low Stock Items ({low_stock.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {low_stock.length === 0 ? (
                            <div className="flex flex-col items-center py-12 text-muted-foreground">
                                <Package className="h-10 w-10 mb-3 opacity-40" />
                                <p>All stock levels are healthy</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead>SKU</TableHead>
                                        <TableHead>Warehouse</TableHead>
                                        <TableHead className="text-right">Available</TableHead>
                                        <TableHead className="text-right">Alert At</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {low_stock.map((item) => (
                                        <TableRow key={`${item.variant_id}-${item.warehouse_name}`}>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{item.product_name}</p>
                                                    <p className="text-xs text-muted-foreground">{item.variant_name}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                                            <TableCell>{item.warehouse_name}</TableCell>
                                            <TableCell className="text-right font-bold">
                                                <span className={item.available_quantity === 0 ? 'text-red-500' : 'text-amber-600'}>
                                                    {item.available_quantity}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right text-muted-foreground">{item.stock_alert_qty}</TableCell>
                                            <TableCell>
                                                <Badge variant={item.available_quantity === 0 ? 'destructive' : 'outline'} className={item.available_quantity === 0 ? '' : 'border-amber-500 text-amber-600'}>
                                                    {item.available_quantity === 0 ? 'Out of Stock' : 'Low Stock'}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* Top Movers */}
                <Card>
                    <CardHeader>
                        <CardTitle>Top 10 Movers (Last 30 Days)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {top_movers.length === 0 ? (
                            <div className="flex flex-col items-center py-12 text-muted-foreground">
                                <TrendingDown className="h-10 w-10 mb-3 opacity-40" />
                                <p>No sales data for the last 30 days</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>#</TableHead>
                                        <TableHead>Product</TableHead>
                                        <TableHead className="text-right">Qty Moved</TableHead>
                                        <TableHead className="text-right">Revenue</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {top_movers.map((item, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="font-bold text-muted-foreground">{i + 1}</TableCell>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{item.product_name}</p>
                                                    <p className="text-xs text-muted-foreground">{item.variant_name}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-semibold">{item.qty_moved}</TableCell>
                                            <TableCell className="text-right text-emerald-600 font-semibold">{fmt(item.revenue)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AdminAppLayout>
    );
}
