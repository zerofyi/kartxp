import { Head, router } from '@inertiajs/react';
import { Scale, ArrowLeft, ArrowUpRight, ArrowDownRight, Coins } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Analytics Command Center', href: '/warehouse/analytics-engine/dashboard' },
    { title: 'Profit & Loss Sheet', href: '#' },
];

type Props = {
    statement: {
        gross_revenue: number;
        cost_of_goods_sold: number;
        gross_profit: number;
        operating_expenses: number;
        net_profit: number;
    };
    filters: { from: string; to: string };
};

export default function ProfitLossReport({ statement }: Props) {
    const fmt = (n: number) =>
        `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const netProfitPositive = statement.net_profit >= 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Warehouse Profit & Loss Statement" />
            <div className="p-6 space-y-6">

                <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" onClick={() => router.visit('/warehouse/analytics-engine/dashboard')} className="h-8 w-8 rounded-lg">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
                            <Scale className="h-5 w-5 text-blue-500" /> Profit & Loss Statement
                        </h1>
                        <p className="text-muted-foreground text-xs">Financial summary page tracking incoming warehouse revenue against stock costs and bill expenses.</p>
                    </div>
                </div>

                {/* Structured Sheet Stack Layout */}
                <div className="max-w-3xl space-y-4">

                    {/* Component Item 1: Revenue Line */}
                    <Card className="border-l-4 border-l-emerald-600">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-50 rounded-lg"><ArrowUpRight className="h-4 w-4 text-emerald-600" /></div>
                                <div>
                                    <span className="text-xs font-bold uppercase text-muted-foreground">Total Realized Revenue</span>
                                    <span className="text-[11px] text-muted-foreground block">Combined earnings calculated directly from retail POS checkouts and online deliveries.</span>
                                </div>
                            </div>
                            <span className="font-mono font-black text-lg text-emerald-700">{fmt(statement.gross_revenue)}</span>
                        </CardContent>
                    </Card>

                    {/* Component Item 2: COGS Line */}
                    <Card className="border-l-4 border-l-amber-600">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-50 rounded-lg"><ArrowDownRight className="h-4 w-4 text-amber-600" /></div>
                                <div>
                                    <span className="text-xs font-bold uppercase text-muted-foreground">Cost of Goods Sold (COGS)</span>
                                    <span className="text-[11px] text-muted-foreground block">The original cost price value of the stock items sold during this timeframe.</span>
                                </div>
                            </div>
                            <span className="font-mono font-bold text-lg text-amber-700">-{fmt(statement.cost_of_goods_sold)}</span>
                        </CardContent>
                    </Card>

                    {/* Intermediary Gross Operating Margin */}
                    <div className="flex items-center justify-between p-3 px-4 bg-muted/60 border rounded-xl text-xs font-bold text-foreground">
                        <span>CALCULATED GROSS EARNINGS MARGIN</span>
                        <span className="font-mono text-sm">{fmt(statement.gross_profit)}</span>
                    </div>

                    {/* Component Item 3: Expenses Line */}
                    <Card className="border-l-4 border-l-destructive">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-destructive/5 rounded-lg"><Coins className="h-4 w-4 text-destructive" /></div>
                                <div>
                                    <span className="text-xs font-bold uppercase text-muted-foreground">Operating Bills & Expense Payouts</span>
                                    <span className="text-[11px] text-muted-foreground block">Outward running costs logged manually in your accounting expenses tab.</span>
                                </div>
                            </div>
                            <span className="font-mono font-bold text-lg text-destructive">-{fmt(statement.operating_expenses)}</span>
                        </CardContent>
                    </Card>

                    {/* Final Balance Summary Block */}
                    <Card className={`border-t-4 shadow ${netProfitPositive ? 'border-t-emerald-600 bg-gradient-to-br from-card to-emerald-50/20' : 'border-t-destructive bg-gradient-to-br from-card to-destructive/5'}`}>
                        <CardHeader className="py-3">
                            <CardTitle className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Audited Warehouse Net Profit</CardTitle>
                        </CardHeader>
                        <CardContent className="pb-5">
                            <p className={`text-3xl font-black font-mono tracking-tight ${netProfitPositive ? 'text-emerald-700' : 'text-destructive'}`}>
                                {fmt(statement.net_profit)}
                            </p>
                        </CardContent>
                    </Card>

                </div>

            </div>
        </AppLayout>
    );
}
