import { Head, router } from '@inertiajs/react';
import React, { useState } from 'react';
import { ShieldAlert, ArrowLeft, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

type Variant = { id: number; sku: string; variant_name: string; current_stock: number; stock_alert_qty: number; product?: { name: string; category?: { name: string } }; unit?: { symbol: string } };
type Props = { variants: { data: Variant[]; current_page: number; last_page: number; total: number }; filters: { search: string } };

export default function LowStock({ variants, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

    const changePage = (page: number) => {
        router.get('/warehouse/inventory-advanced/low-stock-report', { search, page }, { preserveState: true });
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Inventory Hub', href: '/warehouse/inventory-advanced' }, { title: 'Low Stock Report', href: '' }]}>
            <Head title="Critical Low Stock Alerts" />
            <div className="p-6 space-y-4 w-full max-w-[100vw] lg:max-w-none bg-background text-foreground flex flex-col h-full">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-destructive"><ShieldAlert className="size-6" /> Reorder Trigger Alerts</h1>
                        <p className="text-sm text-muted-foreground">SKUs whose active warehouse counts have fallen at or below safety floor thresholds.</p>
                    </div>
                    <Button variant="outline" onClick={() => router.visit('/warehouse/inventory-advanced')} className="h-10 bg-card"><ArrowLeft className="mr-2 size-4" /> Back Hub</Button>
                </div>

                <Card className="shadow-sm bg-card border">
                    <CardContent className="p-4 flex gap-2">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input placeholder="Search within low stock..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && changePage(1)} className="pl-9 h-10" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="overflow-hidden border shadow-sm bg-card flex-1">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead>SKU Identifier</TableHead>
                                <TableHead>Product Description</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead className="text-right">Reorder Threshold Limit</TableHead>
                                <TableHead className="text-right">Current Available Stock</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {variants.data.length > 0 ? variants.data.map(v => (
                                <TableRow key={v.id} className="border-b">
                                    <TableCell className="font-mono font-bold text-primary">{v.sku}</TableCell>
                                    <TableCell className="font-semibold">{v.product?.name} — {v.variant_name}</TableCell>
                                    <TableCell><Badge variant="outline">{v.product?.category?.name ?? 'General'}</Badge></TableCell>
                                    <TableCell className="text-right font-mono font-medium">{v.stock_alert_qty} Units</TableCell>
                                    <TableCell className="text-right font-mono font-bold text-destructive">{v.current_stock} Units</TableCell>
                                </TableRow>
                            )) : <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">All stored variant snapshots maintain normal safety thresholds volumes.</TableCell></TableRow>}
                        </TableBody>
                    </Table>

                    {variants.last_page > 1 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/20">
                            <div className="text-sm text-muted-foreground font-medium">Page <span className="font-semibold text-foreground">{variants.current_page}</span> of <span className="font-semibold text-foreground">{variants.last_page}</span> • Found <span className="font-semibold text-foreground">{variants.total}</span> alert triggers</div>
                            <div className="flex items-center gap-1">
                                <Button variant="outline" size="sm" disabled={variants.current_page === 1} onClick={() => changePage(variants.current_page - 1)}><ChevronLeft className="size-4 mr-1" /> Previous</Button>
                                <Button variant="outline" size="sm" disabled={variants.current_page === variants.last_page} onClick={() => changePage(variants.current_page + 1)}>Next <ChevronRight className="size-4 ml-1" /></Button>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}
