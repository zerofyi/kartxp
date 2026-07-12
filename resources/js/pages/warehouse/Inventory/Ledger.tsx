import { Head, router } from '@inertiajs/react';
import React, { useState } from 'react';
import { History, ArrowLeft } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

type LedgerRow = { id: number; movement_type: 'IN' | 'OUT'; quantity: number; source_type: string; remarks: string; created_at: string; product_variant?: { product?: { name: string }; variant_name: string; unit?: { symbol: string } }; batch?: { batch_no: string } };
type VariantListItem = { id: number; name: string };
type Props = { ledger: { data: LedgerRow[]; current_page: number; last_page: number }; activeVariants: VariantListItem[]; filters: { variant_id?: string; movement_type?: string; from?: string; to?: string } };

export default function Ledger({ ledger, activeVariants = [], filters }: Props) {
    const [variantId, setVariantId] = useState(filters.variant_id ?? 'all');
    const [moveType, setMoveType] = useState(filters.movement_type ?? 'all');
    const [from, setFrom] = useState(filters.from ?? '');
    const [to, setTo] = useState(filters.to ?? '');

    const runSearch = (overrides = {}) => {
        const data = { variant_id: variantId, movement_type: moveType, from, to, ...overrides };
        Object.keys(data).forEach(k => { if (data[k as keyof typeof data] === 'all' || !data[k as keyof typeof data]) delete data[k as keyof typeof data]; });
        router.get('/warehouse/inventory-advanced/ledger', data, { preserveState: true });
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Inventory Hub', href: '/warehouse/inventory-advanced' }, { title: 'Audit Ledger', href: '' }]}>
            <Head title="Inventory Operational Audit Ledger" />
            <div className="p-6 space-y-4 max-w-full text-foreground flex flex-col h-full w-full max-w-[100vw] lg:max-w-none bg-background">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><History className="size-6 text-primary" /> Movement Audit Ledger</h1>
                        <p className="text-sm text-muted-foreground">Historical sequence trace logs for continuous regulatory reconciliation controls.</p>
                    </div>
                    <Button variant="outline" onClick={() => router.visit('/warehouse/inventory-advanced')} className="h-10 bg-card"><ArrowLeft className="mr-2 size-4" /> Back Hub</Button>
                </div>
                <Card className="shadow-sm bg-card border"><CardContent className="p-4 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 items-end"><div className="space-y-1"><Label className="text-xs font-bold text-muted-foreground">Profile SKU</Label><Select value={variantId} onValueChange={v => { setVariantId(v); runSearch({ variant_id: v }); }}><SelectTrigger className="h-10 bg-background"><SelectValue placeholder="All SKUs" /></SelectTrigger><SelectContent><SelectItem value="all">All Variants Logged</SelectItem>{activeVariants.map(v => <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1"><Label className="text-xs font-bold text-muted-foreground">Vector Stream</Label><Select value={moveType} onValueChange={v => { setMoveType(v); runSearch({ movement_type: v }); }}><SelectTrigger className="h-10 bg-background"><SelectValue placeholder="All Flow" /></SelectTrigger><SelectContent><SelectItem value="all">All Operations</SelectItem><SelectItem value="IN">Inbound (IN)</SelectItem><SelectItem value="OUT">Outbound (OUT)</SelectItem></SelectContent></Select></div><div className="space-y-1"><Label className="text-xs font-bold text-muted-foreground">From Date</Label><Input type="date" value={from} onChange={e => { setFrom(e.target.value); runSearch({ from: e.target.value }); }} className="h-10" /></div><div className="space-y-1"><Label className="text-xs font-bold text-muted-foreground">To Date</Label><Input type="date" value={to} onChange={e => { setTo(e.target.value); runSearch({ to: e.target.value }); }} className="h-10" /></div><Button variant="ghost" onClick={() => router.get('/warehouse/inventory-advanced/ledger', {})} className="h-10 border border-input">Clear All</Button></CardContent></Card>
                <Card className="overflow-hidden border shadow-sm bg-card"><Table><TableHeader className="bg-muted/50"><TableRow><TableHead>Timestamp</TableHead><TableHead>Product Variant Reference</TableHead><TableHead>Lot Batch</TableHead><TableHead className="text-center">Flow Stream</TableHead><TableHead className="text-right">Mutation Delta</TableHead><TableHead>Audit Log Remarks Description</TableHead></TableRow></TableHeader><TableBody>{ledger.data.length > 0 ? ledger.data.map(row => (<TableRow key={row.id} className="border-b"><TableCell className="font-mono text-xs whitespace-nowrap">{new Date(row.created_at).toLocaleString('en-IN')}</TableCell><TableCell className="font-semibold">{row.product_variant?.product?.name} — {row.product_variant?.variant_name}</TableCell><TableCell className="font-mono text-xs text-muted-foreground">{row.batch?.batch_no ?? 'GLOBAL_SNAP'}</TableCell><TableCell className="text-center"><Badge className={`font-mono text-[9px] font-bold ${row.movement_type === 'IN' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-500'}`}>{row.movement_type}</Badge></TableCell><TableCell className={`text-right font-mono font-bold ${row.movement_type === 'IN' ? 'text-emerald-600' : 'text-red-500'}`}>{row.movement_type === 'IN' ? '+' : '-'}{row.quantity}</TableCell><TableCell className="text-muted-foreground text-sm font-medium">{row.remarks}</TableCell></TableRow>)) : <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No transactional ledger activity logs match chosen parameters.</TableCell></TableRow>}</TableBody></Table></Card>
            </div>
        </AppLayout>
    );
}
