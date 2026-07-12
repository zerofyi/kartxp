import { Head, router } from '@inertiajs/react';
import { Receipt, ArrowLeft, Building2 } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Analytics Command Center', href: '/warehouse/analytics-engine/dashboard' },
    { title: 'Tax Logs', href: '#' },
];

type TaxTierRow = {
    tax_tier_name: string;
    tax_percent: string | number;
    gross_sales_with_tax: string | number;
    tax_collected_portion: string | number;
};

type Props = {
    ledger: TaxTierRow[];
    filters: { from: string; to: string };
};

export default function TaxLedgerReport({ ledger }: Props) {
    const fmt = (n: string | number) =>
        `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Collected Sales Taxes Breakdown" />
            <div className="p-6 space-y-6">

                <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" onClick={() => router.visit('/warehouse/analytics-engine/dashboard')} className="h-8 w-8 rounded-lg">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
                            <Receipt className="h-5 w-5 text-blue-600" /> Tax Bracket Registry Logs
                        </h1>
                        <p className="text-muted-foreground text-xs">Collected order taxes separated out by standard billing tax bands.</p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Tax Collections Summary Table</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tax Class Category</TableHead>
                                    <TableHead className="w-[120px] text-right">Tax Percent</TableHead>
                                    <TableHead className="text-right w-[180px]">Gross Sales (Inc. Tax)</TableHead>
                                    <TableHead className="text-right w-[200px] text-blue-600 font-bold">Tax Amount Collected</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {ledger.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-12 text-xs text-muted-foreground italic">
                                            No tax collection entries have been found for this date limit.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    ledger.map((row, idx) => (
                                        <TableRow key={idx} className="hover:bg-muted/10">
                                            <TableCell className="font-bold text-sm text-foreground py-3 flex items-center gap-2">
                                                <Building2 className="h-4 w-4 text-muted-foreground" /> {row.tax_tier_name}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs font-semibold">{row.tax_percent}%</TableCell>
                                            <TableCell className="text-right font-mono text-xs">{fmt(row.gross_sales_with_tax)}</TableCell>
                                            <TableCell className="text-right font-mono text-sm font-black text-blue-700 bg-blue-50/30">{fmt(row.tax_collected_portion)}</TableCell>
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
