import { Head, router } from '@inertiajs/react';
import { ShieldAlert, ArrowLeft, RefreshCw } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Analytics Command Center', href: '/warehouse/analytics-engine/dashboard' },
    { title: 'Customer Returns Log', href: '#' },
];

type ReturnConditionRow = {
    condition: 'damaged' | 'defective' | 'wrong_item' | string;
    total_returned_items: number;
    return_volume: number;
    financial_loss_value: string | number;
};

type Props = {
    conditions: ReturnConditionRow[];
};

export default function ReturnsAnalysisReport({ conditions }: Props) {
    const fmt = (n: string | number) =>
        `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Product Returns Log Breakdown" />
            <div className="p-6 space-y-6">

                <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" onClick={() => router.visit('/warehouse/analytics-engine/dashboard')} className="h-8 w-8 rounded-lg">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
                            <RefreshCw className="h-5 w-5 text-destructive" /> Product Returns Breakdown
                        </h1>
                        <p className="text-muted-foreground text-xs">Customer return items grouped by reason or condition report.</p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Product Return Reasons Table</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Return Condition Reason</TableHead>
                                    <TableHead className="text-right w-[150px]">Unique Claims</TableHead>
                                    <TableHead className="text-right w-[160px]">Total Item Units</TableHead>
                                    <TableHead className="text-right w-[200px] text-destructive font-bold">Refund Cash Value</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {conditions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-12 text-xs text-muted-foreground italic">
                                            No item returns processed during this date selection window.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    conditions.map((row, idx) => (
                                        <TableRow key={idx} className="hover:bg-muted/10">
                                            <TableCell className="font-bold text-sm uppercase text-foreground py-3 flex items-center gap-2">
                                                <ShieldAlert className="h-3.5 w-3.5 text-destructive" /> {row.condition.replace('_', ' ')}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs font-medium">{row.total_returned_items} records</TableCell>
                                            <TableCell className="text-right font-mono text-xs">{row.return_volume}</TableCell>
                                            <TableCell className="text-right font-mono text-sm font-black text-destructive bg-destructive/5">{fmt(row.financial_loss_value)}</TableCell>
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
