import { Head, router } from '@inertiajs/react';
import React, { useState } from 'react';
import { CalendarDays, ArrowLeft, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Batch = { id: number; batch_no: string; expiry_date: string; available_quantity: number; product_variant?: { product?: { name: string }; variant_name: string; unit?: { symbol: string } } };
type Props = { batches: { data: Batch[]; current_page: number; last_page: number; total: number }; days: number; filters: { search: string } };

export default function Expiring({ batches, days, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

    const handleSync = (updatedDays = String(days), pageNumber = batches.current_page) => {
        router.get('/warehouse/inventory-advanced/expiring-report', { search, days: updatedDays, page: pageNumber }, { preserveState: true });
    };

    const formatExpiryDate = (dateStr: string) => {
        if (!dateStr || dateStr.startsWith('1970') || dateStr.startsWith('0000')) return <span className="text-destructive font-medium">Date Missing</span>;
        const parsedDate = new Date(dateStr);
        if (isNaN(parsedDate.getTime())) return <span className="text-destructive font-medium">Invalid Date</span>;
        return parsedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Inventory Hub', href: '/warehouse/inventory-advanced' }, { title: 'Expiry Analysis', href: '' }]}>
            <Head title="Batch Quality Expiry Radar" />
            <div className="p-6 space-y-4 w-full max-w-[100vw] lg:max-w-none bg-background text-foreground flex flex-col h-full">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-amber-500"><CalendarDays className="size-6" /> Batch Expiry Radar</h1>
                        <p className="text-sm text-muted-foreground">Track dynamic item lots with active expiration timestamps approaching shelf limits.</p>
                    </div>
                    <Button variant="outline" onClick={() => router.visit('/warehouse/inventory-advanced')} className="h-10 bg-card"><ArrowLeft className="mr-2 size-4" /> Back Hub</Button>
                </div>

                <Card className="shadow-sm bg-card border"><CardContent className="p-4 flex flex-wrap gap-3"><Input placeholder="Search batch tag parameters..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSync(String(days), 1)} className="flex-1 max-w-md h-10" /><Select value={String(days)} onValueChange={v => handleSync(v, 1)}><SelectTrigger className="w-56 h-10"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="15">Expiring inside 15 Days</SelectItem><SelectItem value="30">Expiring inside 30 Days</SelectItem><SelectItem value="60">Expiring inside 60 Days</SelectItem></SelectContent></Select></CardContent></Card>

                <Card className="overflow-hidden border shadow-sm bg-card flex-1">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead>Batch Log No</TableHead>
                                <TableHead>Product Variant Block</TableHead>
                                <TableHead className="text-right">Physical Quantity Remaining</TableHead>
                                <TableHead>Expiration Target Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {batches.data.length > 0 ? batches.data.map(b => (
                                <TableRow key={b.id} className="border-b">
                                    <TableCell className="font-mono font-bold text-amber-600">{b.batch_no}</TableCell>
                                    <TableCell className="font-semibold">{b.product_variant?.product?.name} — {b.product_variant?.variant_name}</TableCell>
                                    <TableCell className="text-right font-mono font-bold">{b.available_quantity} Packs</TableCell>
                                    <TableCell className="font-mono font-bold text-xs">{formatExpiryDate(b.expiry_date)}</TableCell>
                                </TableRow>
                            )) : <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">No expiring material lots detected inside selected timeframe boundaries.</TableCell></TableRow>}
                        </TableBody>
                    </Table>

                    {batches.last_page > 1 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/20">
                            <div className="text-sm text-muted-foreground font-medium">Page <span className="font-semibold text-foreground">{batches.current_page}</span> of <span className="font-semibold text-foreground">{batches.last_page}</span> • Found <span className="font-semibold text-foreground">{batches.total}</span> records</div>
                            <div className="flex items-center gap-1">
                                <Button variant="outline" size="sm" disabled={batches.current_page === 1} onClick={() => handleSync(String(days), batches.current_page - 1)}><ChevronLeft className="size-4 mr-1" /> Previous</Button>
                                <Button variant="outline" size="sm" disabled={batches.current_page === batches.last_page} onClick={() => handleSync(String(days), batches.current_page + 1)}>Next <ChevronRight className="size-4 ml-1" /></Button>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}
