import { Head, router } from '@inertiajs/react';
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    Coins,
    Boxes,
    Clock,
    Scale,
    ShieldAlert,
    CalendarCheck,
    ArrowUpRight,
    Sparkles
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Analytics & Ledger', href: '#' },
    { title: 'Command Center', href: '/warehouse/analytics-engine/dashboard' },
];

type Props = {
    vitals: {
        valuation: {
            total_monitored_skus: number;
            total_on_hand_volume: number;
            total_asset_value_cost: number;
            total_asset_value_retail: number;
            potential_holding_margin: number;
        };
        fulfillment: {
            total_fulfilled_deliveries: number;
            avg_packaging_time_mins: number;
            avg_transit_time_mins: number;
            total_turnaround_time_mins: number;
        };
        financials: {
            gross_revenue: number;
            cost_of_goods_sold: number;
            gross_profit: number;
            operating_expenses: number;
            net_profit: number;
        };
    };
    filters: { from: string; to: string };
};

export default function DashboardCommandCenter({ vitals, filters }: Props) {
    const fmt = (n: number) =>
        `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const isProfitable = vitals.financials.net_profit >= 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Warehouse Analytics Command Center" />
            <div className="p-6 space-y-6">

                {/* Header Title */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight flex items-center gap-2 text-foreground">
                            <BarChart3 className="h-6 w-6 text-primary animate-pulse" /> Analytics Command Center
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            Real-time valuation, sales margins, shipping metrics, and store financials.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs bg-muted/60 border rounded-xl p-2 font-medium">
                        <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                        <span>Date Range: <span className="font-bold text-foreground font-mono">{filters.from}</span> to <span className="font-bold text-foreground font-mono">{filters.to}</span></span>
                    </div>
                </div>

                {/* Main Action Bar Navigation Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 p-2 bg-muted/40 rounded-xl border">
                    <Button variant="outline" size="sm" onClick={() => router.visit('/warehouse/analytics-engine/stock-intelligence/reorder-velocity')} className="text-xs bg-card hover:bg-primary/5 transition">
                        <ShieldAlert className="h-3.5 w-3.5 mr-1.5 text-destructive" /> Stock Reorder Engine
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => router.visit('/warehouse/analytics-engine/stock-intelligence/batch-lifecycle')} className="text-xs bg-card hover:bg-primary/5 transition">
                        <Clock className="h-3.5 w-3.5 mr-1.5 text-amber-500" /> Batch Lifecycles
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => router.visit('/warehouse/analytics-engine/sales-channels/omnichannel')} className="text-xs bg-card hover:bg-primary/5 transition">
                        <Coins className="h-3.5 w-3.5 mr-1.5 text-emerald-500" /> Omnichannel Logs
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => router.visit('/warehouse/analytics-engine/financials/profit-loss')} className="text-xs bg-card hover:bg-primary/5 transition">
                        <Scale className="h-3.5 w-3.5 mr-1.5 text-blue-500" /> Live Profit & Loss
                    </Button>
                </div>

                {/* Row 1: Net Financial Position Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className={`lg:col-span-2 border-l-4 ${isProfitable ? 'border-l-emerald-600 bg-gradient-to-br from-card to-emerald-50/10' : 'border-l-destructive bg-gradient-to-br from-card to-destructive/5'}`}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                                Net Profit
                                {isProfitable ? <TrendingUp className="h-4 w-4 text-emerald-600" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className={`text-4xl font-black font-mono tracking-tight ${isProfitable ? 'text-emerald-600' : 'text-destructive'}`}>
                                {fmt(vitals.financials.net_profit)}
                            </p>
                            <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-dashed text-xs">
                                <div>
                                    <span className="text-muted-foreground block">Total Revenue</span>
                                    <span className="font-mono font-bold text-foreground text-sm">{fmt(vitals.financials.gross_revenue)}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block">Cost of Goods (COGS)</span>
                                    <span className="font-mono font-bold text-foreground text-sm text-amber-600">{fmt(vitals.financials.cost_of_goods_sold)}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block">Warehouse Expenses</span>
                                    <span className="font-mono font-bold text-foreground text-sm text-destructive">{fmt(vitals.financials.operating_expenses)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-blue-600 bg-gradient-to-br from-card to-blue-50/10">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                                Total Inventory Value
                                <Boxes className="h-4 w-4 text-blue-600" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <span className="text-muted-foreground text-xs block">Stock Value (At Cost)</span>
                                <p className="text-2xl font-black font-mono text-blue-700">{fmt(vitals.valuation.total_asset_value_cost)}</p>
                            </div>
                            <div className="pt-2 border-t text-xs grid grid-cols-2 gap-2">
                                <div>
                                    <span className="text-muted-foreground block">Active SKUs</span>
                                    <span className="font-mono font-bold text-foreground text-sm">{vitals.valuation.total_monitored_skus} Items</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block">Expected Profit</span>
                                    <span className="font-mono font-bold text-emerald-600 text-sm">{fmt(vitals.valuation.potential_holding_margin)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Row 2: Operational Velocity Insights */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-bold tracking-tight flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-primary" /> Order Packing & Shipping Speeds
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between items-center p-2.5 bg-muted/40 border rounded-lg">
                                <span className="text-xs text-muted-foreground">Average Packing Time</span>
                                <span className="font-mono font-bold text-xs text-foreground bg-card px-2 py-1 border rounded">{Math.round(vitals.fulfillment.avg_packaging_time_mins || 0)} mins</span>
                            </div>
                            <div className="flex justify-between items-center p-2.5 bg-muted/40 border rounded-lg">
                                <span className="text-xs text-muted-foreground">Average Delivery Transit Time</span>
                                <span className="font-mono font-bold text-xs text-foreground bg-card px-2 py-1 border rounded">{Math.round(vitals.fulfillment.avg_transit_time_mins || 0)} mins</span>
                            </div>
                            <div className="flex justify-between items-center p-2.5 bg-muted/40 border rounded-lg">
                                <span className="text-xs text-muted-foreground">Total Turnaround Time (TAT)</span>
                                <span className="font-mono font-bold text-xs text-primary bg-primary/5 px-2 py-1 border border-primary/20 rounded">{Math.round(vitals.fulfillment.total_turnaround_time_mins || 0)} mins</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-bold tracking-tight">Additional Reports</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 gap-2">
                            <button onClick={() => router.visit('/warehouse/analytics-engine/sales-channels/product-margins')} className="group text-left p-3 rounded-xl border bg-card hover:bg-muted/40 transition flex items-center justify-between">
                                <div>
                                    <span className="text-xs font-bold block text-foreground">Product Profit Margins</span>
                                    <span className="text-[11px] text-muted-foreground">Ranking of your best-selling and highest margin items.</span>
                                </div>
                                <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition" />
                            </button>
                            <button onClick={() => router.visit('/warehouse/analytics-engine/financials/tax-ledger')} className="group text-left p-3 rounded-xl border bg-card hover:bg-muted/40 transition flex items-center justify-between">
                                <div>
                                    <span className="text-xs font-bold block text-foreground">Collected Sales Taxes</span>
                                    <span className="text-[11px] text-muted-foreground">View tax collections separated cleanly by tax percentage brackets.</span>
                                </div>
                                <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition" />
                            </button>
                        </CardContent>
                    </Card>
                </div>

            </div>
        </AppLayout>
    );
}
