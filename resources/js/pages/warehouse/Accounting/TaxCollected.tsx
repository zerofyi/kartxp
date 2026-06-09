import { Head, router } from '@inertiajs/react';
import { Calendar, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Accounting', href: '#' },
    { title: 'Tax Liabilities', href: '/warehouse/accounting/tax-collected' },
];

type TaxRow = {
    tax_category: string;
    tax_rate: number;
    taxable_amount: number;
    tax_collected: number;
};

type Props = {
    taxData: TaxRow[];
    filters: { from: string; to: string };
};

export default function TaxCollectedPage({ taxData, filters }: Props) {
    const [from, setFrom] = useState(filters.from);
    const [to, setTo] = useState(filters.to);

    const applyTaxRange = () => {
        router.visit('/warehouse/accounting/tax-collected', { data: { from, to }, preserveState: true });
    };

    const fmt = (n: number) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const totalTax = taxData.reduce((sum, item) => sum + item.tax_collected, 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Tax Auditing Matrix — Warehouse" />
            <div className="p-6 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Tax Register Liability</h1>
                        <p className="text-muted-foreground">Aggregated transaction output taxes derived from item-level checkouts</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-36" />
                        <span className="text-muted-foreground text-xs">to</span>
                        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-36" />
                        <Button size="sm" onClick={applyTaxRange}><Calendar className="h-4 w-4 mr-2" /> Sync Window</Button>
                    </div>
                </div>

                <div>
                    <Card className="bg-slate-950 text-white border-0 shadow-inner">
                        <CardContent className="pt-6">
                            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Aggregate Calculated Liability Balance</p>
                            <p className="text-3xl font-black mt-1 text-amber-400 font-mono">{fmt(totalTax)}</p>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                            Tax Category Splits
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Category Class</TableHead>
                                    <TableHead className="text-right">Applied Bracket Rate</TableHead>
                                    <TableHead className="text-right">Gross Taxable Transacted Total</TableHead>
                                    <TableHead className="text-right">Tax Value Component</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {taxData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-xs">
                                            No tax transactional records detected across selected period constraints.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    taxData.map((row, index) => (
                                        <TableRow key={index} className="hover:bg-transparent">
                                            <TableCell className="font-semibold text-sm">{row.tax_category}</TableCell>
                                            <TableCell className="text-right font-mono text-xs text-muted-foreground">{row.tax_rate}%</TableCell>
                                            <TableCell className="text-right font-mono text-xs text-muted-foreground">{fmt(row.taxable_amount)}</TableCell>
                                            <TableCell className="text-right font-mono text-sm font-bold text-amber-600">{fmt(row.tax_collected)}</TableCell>
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
