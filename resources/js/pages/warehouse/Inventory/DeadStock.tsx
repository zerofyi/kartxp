import { Head, router } from '@inertiajs/react';
import React, { useState } from 'react';
import { PackageX, ArrowLeft, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

type Variant = { id: number; sku: string; variant_name: string; current_stock: number; product?: { name: string }; unit?: { symbol: string } };
type Props = { variants: { data: Variant[]; current_page: number; last_page: number; total: number }; days: number; filters: { search: string } };

export default function DeadStock({ variants, days, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

    const syncGrid = (updatedDays = String(days), pageNumber = variants.current_page) => {
        router.get('/warehouse/inventory-advanced/dead-stock-report', { search, days: updatedDays, page: pageNumber }, { preserveState: true });
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Inventory Hub', href: '/warehouse/inventory-advanced' }, { title: 'Turnover Reports', href: '' }]}>
            <Head title="Stagnant Asset Audit" />
            <div className="p-6 space-y-4 w-full max-w-[100vw] lg:max-w-none bg-background text-foreground flex flex-col h-full">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-muted-foreground"><PackageX className="size-6 text-slate-400" /> Stagnant Inventory (Dead Stock)</h1>
                        <p className="text-sm text-muted-foreground">Audit capital trapped inside inventory lines carrying high holding values with zero recent sales history velocity.</p>
                    </div>
                    <Button variant="outline" onClick={() => router.visit('/warehouse/inventory-advanced')} className="h-10 bg-card"><ArrowLeft className="mr-2 size-4" /> Back Hub</Button>
                </div>

                <Card className="shadow-sm bg-card border"><CardContent className="p-4 flex flex-wrap gap-3"><Input placeholder="Filter stagnant rows..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && syncGrid(String(days), 1)} className="flex-1 max-w-md h-10" /><Select value={String(days)} onValueChange={v => syncGrid(v, 1)}><SelectTrigger className="w-56 h-10"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="30">Stagnant last 30 Days</SelectItem><SelectItem value="60">Stagnant last 60 Days</SelectItem><SelectItem value="90">Stagnant last 90 Days</SelectItem></SelectContent></Select></CardContent></Card>

                <Card className="overflow-hidden border shadow-sm bg-card flex-1">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead>SKU Identifier</TableHead>
                                <TableHead>Item Master Title</TableHead>
                                <TableHead className="text-right">Stagnant Stock Quantity</TableHead>
                                <TableHead className="text-center font-semibold">Classification</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {variants.data.length > 0 ? variants.data.map(v => (
                                <TableRow key={v.id} className="border-b">
                                    <TableCell className="font-mono font-bold text-slate-500">{v.sku}</TableCell>
                                    <TableCell className="font-semibold">{v.product?.name} — {v.variant_name}</TableCell>
                                    <TableCell className="text-right font-mono font-bold text-amber-600">{v.current_stock} Packs</TableCell>
                                    <TableCell className="text-center"><Badge variant="secondary" className="uppercase font-bold tracking-wider text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500">FROZEN CAPITAL</Badge></TableCell>
                                </TableRow>
                            )) : <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">All product variant mappings show steady inventory movement speeds.</TableCell></TableRow>}
                        </TableBody>
                    </Table>

                    {variants.last_page > 1 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/20">
                            <div className="text-sm text-muted-foreground font-medium">Page <span className="font-semibold text-foreground">{variants.current_page}</span> of <span className="font-semibold text-foreground">{variants.last_page}</span> • Found <span className="font-semibold text-foreground">{variants.total}</span> non-moving SKUs</div>
                            <div className="flex items-center gap-1">
                                <Button variant="outline" size="sm" disabled={variants.current_page === 1} onClick={() => syncGrid(String(days), variants.current_page - 1)}><ChevronLeft className="size-4 mr-1" /> Previous</Button>
                                <Button variant="outline" size="sm" disabled={variants.current_page === variants.last_page} onClick={() => syncGrid(String(days), variants.current_page + 1)}>Next <ChevronRight className="size-4 ml-1" /></Button>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}
