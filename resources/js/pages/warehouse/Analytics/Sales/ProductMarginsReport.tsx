import { Head, router } from '@inertiajs/react';
import { TrendingUp, ArrowLeft } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Analytics Command Center', href: '/warehouse/analytics-engine/dashboard' },
    { title: 'Product Profit Margins', href: '#' },
];

type MarginItem = {
    variant_id: number;
    sku: string;
    product_name: string;
    variant_name: string;
    total_units_sold: number;
    generated_revenue: string | number;
    net_margin_profit: string | number;
    profit_margin_percentage: string | number;
};

type Props = {
    ranking: MarginItem[];
};

export default function ProductMarginsReport({ ranking }: Props) {
    const fmt = (n: string | number) =>
        `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Product Profit Margins Ranking" />
            <div className="p-6 space-y-6">

                <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" onClick={() => router.visit('/warehouse/analytics-engine/dashboard')} className="h-8 w-8 rounded-lg">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-primary" /> Product Profit Margins
                        </h1>
                        <p className="text-muted-foreground text-xs">Items ranked by total profit generated after item cost deductions.</p>
                    </div>
                </div>

                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product Variant Details</TableHead>
                                    <TableHead className="w-[140px]">SKU Code</TableHead>
                                    <TableHead className="w-[120px] text-right">Units Sold</TableHead>
                                    <TableHead className="w-[150px] text-right">Total Revenue</TableHead>
                                    <TableHead className="w-[120px] text-right text-emerald-600 font-bold">Margin %</TableHead>
                                    <TableHead className="w-[160px] text-right text-primary font-bold">Net Profit Contributed</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {ranking.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-12 text-xs text-muted-foreground italic">
                                            No sales data yet to calculate profit margins.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    ranking.map((item) => (
                                        <TableRow key={item.variant_id} className="hover:bg-muted/20">
                                            <TableCell className="py-2.5">
                                                <span className="font-bold text-sm block text-foreground">{item.product_name}</span>
                                                <span className="text-xs text-muted-foreground">{item.variant_name}</span>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs font-semibold text-muted-foreground">{item.sku}</TableCell>
                                            <TableCell className="text-right font-mono text-xs">{item.total_units_sold}</TableCell>
                                            <TableCell className="text-right font-mono text-xs text-foreground/80">{fmt(item.generated_revenue)}</TableCell>
                                            <TableCell className="text-right font-mono text-xs font-bold text-emerald-600 bg-emerald-50/20">
                                                {Number(item.profit_margin_percentage || 0).toFixed(1)}%
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-sm font-black text-primary bg-primary/5">
                                                {fmt(item.net_margin_profit)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
