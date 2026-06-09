import { Head, router } from '@inertiajs/react';
import { BarChart3, TrendingDown, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Accounting', href: '#' },
    { title: 'P&L Statement', href: '/warehouse/accounting/pl-statement' },
];

type Props = {
    revenue: number;
    tax: number;
    expenses: Record<string, number>;
    net: number;
    from: string;
    to: string;
};

export default function PLStatement({ revenue, tax, expenses, net, from, to }: Props) {
    const [fromDate, setFromDate] = useState(from);
    const [toDate, setTo] = useState(to);

    const fmt = (n: number) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

    const totalExpenses = Object.values(expenses).reduce((a, b) => a + b, 0);

    const applyFilters = () => {
        router.visit('/warehouse/accounting/pl-statement', {
            data: { from: fromDate, to: toDate },
            preserveState: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="P&L Statement — Warehouse" />
            <div className="p-6 space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <BarChart3 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Profit & Loss Statement</h1>
                        <p className="text-muted-foreground">Financial overview for selected period</p>
                    </div>
                </div>

                {/* Date Filter */}
                <Card>
                    <CardContent className="pt-5">
                        <div className="flex flex-wrap gap-3 items-end">
                            <div>
                                <Label className="text-xs">From</Label>
                                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-36 mt-1" />
                            </div>
                            <div>
                                <Label className="text-xs">To</Label>
                                <Input type="date" value={toDate} onChange={(e) => setTo(e.target.value)} className="w-36 mt-1" />
                            </div>
                            <Button onClick={applyFilters}>Apply</Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Net P&L Banner */}
                <Card className={`border-0 text-white ${net >= 0 ? 'bg-gradient-to-r from-emerald-600 to-green-700' : 'bg-gradient-to-r from-red-600 to-rose-700'}`}>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-white/80 text-sm">Net Profit / Loss</p>
                                <p className="text-4xl font-bold mt-1">{fmt(Math.abs(net))}</p>
                                <p className="text-white/70 text-sm mt-1">{net >= 0 ? '▲ Profit' : '▼ Loss'} for period</p>
                            </div>
                            {net >= 0
                                ? <TrendingUp className="h-16 w-16 opacity-20" />
                                : <TrendingDown className="h-16 w-16 opacity-20" />
                            }
                        </div>
                    </CardContent>
                </Card>

                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4">
                    <Card>
                        <CardContent className="pt-5">
                            <p className="text-xs text-muted-foreground">Total Revenue</p>
                            <p className="text-xl font-bold text-emerald-600 mt-1">{fmt(revenue)}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-5">
                            <p className="text-xs text-muted-foreground">Total Expenses</p>
                            <p className="text-xl font-bold text-red-500 mt-1">{fmt(totalExpenses)}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-5">
                            <p className="text-xs text-muted-foreground">Tax Collected</p>
                            <p className="text-xl font-bold text-blue-600 mt-1">{fmt(tax)}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* P&L Detail Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Detailed Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {/* Revenue Section */}
                                <TableRow className="bg-muted/30">
                                    <TableCell colSpan={2} className="font-bold text-emerald-700 uppercase text-xs tracking-wider py-2 px-4">
                                        Income
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="pl-8">Sales Revenue</TableCell>
                                    <TableCell className="text-right font-semibold text-emerald-600">{fmt(revenue)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="pl-8">Tax Collected</TableCell>
                                    <TableCell className="text-right font-semibold text-blue-600">{fmt(tax)}</TableCell>
                                </TableRow>
                                <TableRow className="border-t-2">
                                    <TableCell className="font-bold">Total Income</TableCell>
                                    <TableCell className="text-right font-bold text-emerald-600">{fmt(revenue + tax)}</TableCell>
                                </TableRow>

                                {/* Expenses Section */}
                                <TableRow className="bg-muted/30">
                                    <TableCell colSpan={2} className="font-bold text-red-600 uppercase text-xs tracking-wider py-2 px-4">
                                        Expenses
                                    </TableCell>
                                </TableRow>
                                {Object.entries(expenses).length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center text-muted-foreground py-4">No expenses recorded</TableCell>
                                    </TableRow>
                                ) : (
                                    Object.entries(expenses).map(([cat, amount]) => (
                                        <TableRow key={cat}>
                                            <TableCell className="pl-8">{cat}</TableCell>
                                            <TableCell className="text-right text-red-500">{fmt(amount)}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                                <TableRow className="border-t-2">
                                    <TableCell className="font-bold">Total Expenses</TableCell>
                                    <TableCell className="text-right font-bold text-red-500">{fmt(totalExpenses)}</TableCell>
                                </TableRow>

                                {/* Net */}
                                <TableRow className={`border-t-4 ${net >= 0 ? 'bg-emerald-50 dark:bg-emerald-950' : 'bg-red-50 dark:bg-red-950'}`}>
                                    <TableCell className="font-bold text-lg">{net >= 0 ? 'Net Profit' : 'Net Loss'}</TableCell>
                                    <TableCell className={`text-right font-bold text-lg ${net >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {net >= 0 ? '+' : '-'}{fmt(Math.abs(net))}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
