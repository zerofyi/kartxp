import { Head, router } from '@inertiajs/react';
import { Download, TrendingUp, TrendingDown, ShoppingBag, Receipt } from 'lucide-react';
import { useState } from 'react';
import AdminAppLayout from '@/layouts/admin-app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Reports', href: '/admin/reports' },
    { title: 'Sales Report', href: '/admin/reports/sales' },
];

type SaleRow = {
    period: string;
    orders: number;
    revenue: number;
    discounts: number;
    shipping: number;
    tax: number;
};

type Props = {
    summary: {
        total_orders: number;
        total_revenue: number;
        avg_order_value: number;
        total_discounts: number;
        total_shipping: number;
        total_tax: number;
    };
    rows: SaleRow[];
    filters: { from?: string; to?: string; group_by?: string };
};

function StatCard({ label, value, icon: Icon, trend }: { label: string; value: string; icon: React.ElementType; trend?: 'up' | 'down' }) {
    return (
        <Card>
            <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">{label}</p>
                        <p className="text-2xl font-bold mt-1">{value}</p>
                    </div>
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="h-5 w-5 text-primary" />
                    </div>
                </div>
                {trend && (
                    <div className={`flex items-center gap-1 mt-2 text-xs ${trend === 'up' ? 'text-emerald-600' : 'text-red-500'}`}>
                        {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        <span>vs previous period</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function SalesReport({ summary, rows, filters }: Props) {
    const [from, setFrom] = useState(filters.from ?? '');
    const [to, setTo] = useState(filters.to ?? '');
    const [groupBy, setGroupBy] = useState(filters.group_by ?? 'day');

    const maxRevenue = Math.max(...(rows.map((r) => r.revenue)), 1);

    const applyFilters = () => {
        router.visit('/admin/reports/sales', { data: { from, to, group_by: groupBy }, preserveState: true });
    };

    const fmt = (n: number) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

    return (
        <AdminAppLayout breadcrumbs={breadcrumbs}>
            <Head title="Sales Report — Admin" />
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Sales Report</h1>
                        <p className="text-muted-foreground">Orders, revenue & discount breakdown</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => window.open('/admin/reports/export?type=sales&from=' + from + '&to=' + to)}>
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                    </Button>
                </div>

                {/* Filters */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-wrap gap-4 items-end">
                            <div>
                                <Label>From</Label>
                                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40 mt-1" />
                            </div>
                            <div>
                                <Label>To</Label>
                                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40 mt-1" />
                            </div>
                            <div>
                                <Label>Group By</Label>
                                <Select value={groupBy} onValueChange={setGroupBy}>
                                    <SelectTrigger className="w-32 mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="day">Day</SelectItem>
                                        <SelectItem value="week">Week</SelectItem>
                                        <SelectItem value="month">Month</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={applyFilters}>Apply Filters</Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    <StatCard label="Total Orders" value={summary.total_orders.toLocaleString()} icon={ShoppingBag} />
                    <StatCard label="Total Revenue" value={fmt(summary.total_revenue)} icon={Receipt} trend="up" />
                    <StatCard label="Avg Order Value" value={fmt(summary.avg_order_value)} icon={TrendingUp} />
                    <StatCard label="Total Discounts" value={fmt(summary.total_discounts)} icon={TrendingDown} />
                </div>

                {/* Chart */}
                {rows.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Revenue Trend</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-end gap-1 h-40">
                                {rows.map((row) => (
                                    <div key={row.period} className="flex-1 flex flex-col items-center gap-1 group" title={`${row.period}: ${fmt(row.revenue)}`}>
                                        <div
                                            className="w-full bg-primary/80 hover:bg-primary rounded-t transition-all"
                                            style={{ height: `${(row.revenue / maxRevenue) * 100}%`, minHeight: 2 }}
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground mt-2">
                                <span>{rows[0]?.period}</span>
                                <span>{rows[rows.length - 1]?.period}</span>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Data Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Detailed Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {rows.length === 0 ? (
                            <div className="flex flex-col items-center py-12 text-muted-foreground">
                                <ShoppingBag className="h-10 w-10 mb-3 opacity-40" />
                                <p>No data for the selected period</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Period</TableHead>
                                        <TableHead className="text-right">Orders</TableHead>
                                        <TableHead className="text-right">Revenue</TableHead>
                                        <TableHead className="text-right">Discounts</TableHead>
                                        <TableHead className="text-right">Shipping</TableHead>
                                        <TableHead className="text-right">Tax</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rows.map((row) => (
                                        <TableRow key={row.period}>
                                            <TableCell className="font-medium">{row.period}</TableCell>
                                            <TableCell className="text-right">{row.orders}</TableCell>
                                            <TableCell className="text-right font-semibold">{fmt(row.revenue)}</TableCell>
                                            <TableCell className="text-right text-red-500">{fmt(row.discounts)}</TableCell>
                                            <TableCell className="text-right">{fmt(row.shipping)}</TableCell>
                                            <TableCell className="text-right">{fmt(row.tax)}</TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="bg-muted/50 font-bold">
                                        <TableCell>Total</TableCell>
                                        <TableCell className="text-right">{summary.total_orders}</TableCell>
                                        <TableCell className="text-right">{fmt(summary.total_revenue)}</TableCell>
                                        <TableCell className="text-right text-red-500">{fmt(summary.total_discounts)}</TableCell>
                                        <TableCell className="text-right">{fmt(summary.total_shipping)}</TableCell>
                                        <TableCell className="text-right">{fmt(summary.total_tax)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AdminAppLayout>
    );
}
