import { Head, router } from '@inertiajs/react';
import { Coins, ArrowLeft, Store, Globe, ArrowUpRight } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Analytics Command Center', href: '/warehouse/analytics-engine/dashboard' },
    { title: 'Omnichannel Breakdowns', href: '#' },
];

type ChannelMetric = {
    order_channel: 'pos' | 'online' | string;
    total_orders: number;
    gross_revenue: string | number;
    total_markdowns: string | number;
    average_order_value: string | number;
};

type Props = {
    channels: ChannelMetric[];
    filters: { from: string; to: string };
};

export default function OmnichannelPerformanceReport({ channels }: Props) {
    const fmt = (n: string | number) =>
        `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="POS vs Online Channel Performance" />
            <div className="p-6 space-y-6">

                <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" onClick={() => router.visit('/warehouse/analytics-engine/dashboard')} className="h-8 w-8 rounded-lg">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
                            <Coins className="h-5 w-5 text-emerald-500" /> Channel Performance
                        </h1>
                        <p className="text-muted-foreground text-xs">Comparing sales figures between local store POS transactions and online orders.</p>
                    </div>
                </div>

                {/* Channel Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {['pos', 'online'].map((chan) => {
                        const match = channels.find(c => c.order_channel.toLowerCase() === chan) || {
                            order_channel: chan, total_orders: 0, gross_revenue: 0, total_markdowns: 0, average_order_value: 0
                        };

                        const isPos = chan === 'pos';

                        return (
                            <Card key={chan} className={`border border-t-4 ${isPos ? 'border-t-blue-600' : 'border-t-purple-600'}`}>
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                        {isPos ? <Store className="h-4 w-4 text-blue-600" /> : <Globe className="h-4 w-4 text-purple-600" />}
                                        {isPos ? 'Walk-in Retail POS' : 'Online Store Marketplace'}
                                    </CardTitle>
                                    <span className="text-xs text-muted-foreground font-mono font-bold bg-muted px-2 py-0.5 border rounded">
                                        {match.total_orders} Orders
                                    </span>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <span className="text-xs text-muted-foreground block">Total Revenue</span>
                                        <p className="text-3xl font-black font-mono text-foreground mt-0.5">{fmt(match.gross_revenue)}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-dashed text-xs">
                                        <div>
                                            <span className="text-muted-foreground block">Avg Order Value (AOV)</span>
                                            <span className="font-mono font-bold text-foreground">{fmt(match.average_order_value)}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block">Discounts Given</span>
                                            <span className="font-mono font-bold text-destructive">{fmt(match.total_markdowns)}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Sales Summary Log</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Channel Name</TableHead>
                                    <TableHead className="text-right w-[140px]">Total Orders</TableHead>
                                    <TableHead className="text-right w-[160px]">Total Discounts</TableHead>
                                    <TableHead className="text-right w-[160px]">Avg Order Ticket</TableHead>
                                    <TableHead className="text-right w-[180px] font-bold">Gross Sales</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {channels.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-10 text-xs text-muted-foreground italic">
                                            No sales rows logged for this active time period.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    channels.map((row, idx) => (
                                        <TableRow key={idx} className="hover:bg-muted/10">
                                            <TableCell className="font-bold text-sm text-foreground uppercase tracking-wider py-3 flex items-center gap-2">
                                                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" /> {row.order_channel}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs font-semibold">{row.total_orders}</TableCell>
                                            <TableCell className="text-right font-mono text-xs text-destructive font-medium">{fmt(row.total_markdowns)}</TableCell>
                                            <TableCell className="text-right font-mono text-xs text-muted-foreground">{fmt(row.average_order_value)}</TableCell>
                                            <TableCell className="text-right font-mono text-sm font-black bg-emerald-50/20 text-emerald-700">{fmt(row.gross_revenue)}</TableCell>
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
