import { Head, router } from '@inertiajs/react';
import { ShieldAlert, ChevronLeft, ChevronRight, ArrowLeft, Search } from 'lucide-react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Analytics Command Center', href: '/warehouse/analytics-engine/dashboard' },
    { title: 'Reorder Report', href: '#' },
];

type VariantReportItem = {
    id: number;
    sku: string;
    variant_name: string;
    product_name: string;
    net_quantity: string | number;
    unit_symbol: string | null;
    current_stock: number;
    alert_threshold: number;
    recommended_reorder_qty: number;
};

type Props = {
    data: {
        data: VariantReportItem[];
        current_page: number;
        last_page: number;
        total: number;
        prev_page_url: string | null;
        next_page_url: string | null;
    };
    filters: { search: string };
};

export default function ReorderVelocityReport({ data, filters }: Props) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/warehouse/analytics-engine/stock-intelligence/reorder-velocity', { search: searchTerm }, { preserveState: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Low Stock Reorder Items" />
            <div className="p-6 space-y-6">

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="icon" onClick={() => router.visit('/warehouse/analytics-engine/dashboard')} className="h-8 w-8 rounded-lg">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
                                <ShieldAlert className="h-5 w-5 text-destructive" /> Stock Reorder Engine
                            </h1>
                            <p className="text-muted-foreground text-xs">Items whose stock balance has fallen below their minimum safety limits.</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSearch} className="flex gap-2 max-w-md bg-card p-1.5 border rounded-xl shadow-sm">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search via SKU or Item name..." className="pl-9 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <Button type="submit" size="sm" className="h-9">Search</Button>
                </form>

                <Card className="shadow-sm">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product Details</TableHead>
                                    <TableHead className="w-[180px]">SKU Code</TableHead>
                                    <TableHead className="w-[180px] text-right">Current Stock</TableHead>
                                    <TableHead className="w-[140px] text-right">Alert Level</TableHead>
                                    <TableHead className="w-[160px] text-right text-destructive font-bold">Suggested Reorder</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12 text-xs text-muted-foreground italic">
                                            All product stock levels are currently healthy and above limits.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data.data.map((item) => (
                                        <TableRow key={item.id} className="hover:bg-muted/20">
                                            <TableCell className="py-3">
                                                <span className="font-bold text-foreground text-sm block">{item.product_name}</span>
                                                <span className="text-xs text-muted-foreground">{item.variant_name}</span>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs font-semibold text-muted-foreground">{item.sku}</TableCell>

                                            {/* Safe Unit Layout Rendering Variant Sizes */}
                                            <TableCell className="text-right font-mono text-xs font-bold text-destructive bg-destructive/5">
                                                {item.current_stock} pcs <span className="text-[10px] text-muted-foreground font-sans font-normal">({Number(item.net_quantity)}{item.unit_symbol || ''})</span>
                                            </TableCell>

                                            <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                                {item.alert_threshold}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-sm font-black text-primary bg-primary/5">
                                                +{item.recommended_reorder_qty}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>

                        {data.last_page > 1 && (
                            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
                                <p className="text-xs text-muted-foreground">
                                    Showing page <span className="font-semibold">{data.current_page}</span> of <span className="font-semibold">{data.last_page}</span>
                                </p>
                                <div className="flex gap-1.5">
                                    <Button variant="outline" size="sm" className="h-8 px-2.5" disabled={!data.prev_page_url} onClick={() => router.visit(data.prev_page_url!, { preserveState: true })}>
                                        <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                                    </Button>
                                    <Button variant="outline" size="sm" className="h-8 px-2.5" disabled={!data.next_page_url} onClick={() => router.visit(data.next_page_url!, { preserveState: true })}>
                                        Next <ChevronRight className="h-4 w-4 ml-1" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
