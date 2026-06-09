import { Head, router } from '@inertiajs/react';
import { Calendar, FileText } from 'lucide-react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Accounting', href: '#' },
    { title: 'P&L Statement', href: '/warehouse/accounting/pl-statement' },
];

type Props = {
    revenue: number;
    expenses: number;
    cogs: number;
    grossProfit: number;
    netProfit: number;
    filters?: { from?: string; to?: string };
};

export default function PlStatementPage({ revenue, expenses, cogs, grossProfit, netProfit, filters }: Props) {
    // Fallback gracefully to standard dates if the filters prop or its keys are missing
    const [from, setFrom] = useState(filters?.from ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
    const [to, setTo] = useState(filters?.to ?? new Date().toISOString().slice(0, 10));

    const updateRange = () => {
        router.visit('/warehouse/accounting/pl-statement', { data: { from, to }, preserveState: true });
    };

    const fmt = (n: number) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Profit & Loss Statement — Warehouse" />
            <div className="p-6 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Profit & Loss Statement</h1>
                        <p className="text-muted-foreground">Comprehensive net operational dynamic metrics</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-36" />
                        <span className="text-muted-foreground text-xs">to</span>
                        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-36" />
                        <Button size="sm" onClick={updateRange}><Calendar className="h-4 w-4 mr-2" /> Refilter</Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border-l-4 border-l-emerald-500">
                        <CardContent className="pt-4">
                            <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Gross Margin</p>
                            <p className="text-2xl font-black mt-1 text-emerald-600 font-mono">{fmt(grossProfit)}</p>
                        </CardContent>
                    </Card>
                    <Card className={`border-l-4 ${netProfit >= 0 ? 'border-l-blue-600' : 'border-l-red-500'}`}>
                        <CardContent className="pt-4">
                            <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Net Retained Operational Profit</p>
                            <p className={`text-2xl font-black mt-1 font-mono ${netProfit >= 0 ? 'text-blue-600' : 'text-red-500'}`}>{fmt(netProfit)}</p>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-muted-foreground" /> Account Spread</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableBody>
                                <TableRow className="hover:bg-transparent font-semibold text-sm">
                                    <TableCell>Gross Operating Revenues (Sales)</TableCell>
                                    <TableCell className="text-right font-mono text-emerald-600 text-sm">{fmt(revenue)}</TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-transparent text-muted-foreground border-b-2">
                                    <TableCell className="pl-6 text-xs">Less: Cost of Goods Sold (COGS Purchases Summary)</TableCell>
                                    <TableCell className="text-right font-mono text-xs">({fmt(cogs)})</TableCell>
                                </TableRow>
                                <TableRow className="bg-muted/30 font-bold text-sm">
                                    <TableCell>Gross Profit Spread</TableCell>
                                    <TableCell className="text-right font-mono text-sm">{fmt(grossProfit)}</TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-transparent text-muted-foreground">
                                    <TableCell className="pl-6 text-xs">Less: Operating Costs (OPEX Registry)</TableCell>
                                    <TableCell className="text-right font-mono text-destructive text-xs">({fmt(expenses)})</TableCell>
                                </TableRow>
                                <TableRow className="bg-muted/80 font-black text-base border-t-2 border-double">
                                    <TableCell>Net Realized Margins Over Window</TableCell>
                                    <TableCell className={`text-right font-mono text-base ${netProfit >= 0 ? 'text-blue-600' : 'text-red-500'}`}>{fmt(netProfit)}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
