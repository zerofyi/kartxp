import { Head, router } from '@inertiajs/react';
import React from 'react';
import { ShieldAlert, CalendarDays, FileDown, History, Layers, Boxes, TrendingUp, ChevronRight } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

type Props = {
    stats: {
        low_stock_count: number;
        total_active_skus: number;
        total_stock_volume: number;
        expiring_batch_count: number;
        dead_stock_count: number;
    };
};

export default function InventoryIndex({ stats }: Props) {
    return (
        <AppLayout breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }, { title: 'Inventory Control Hub', href: '' }]}>
            <Head title="Inventory Control Hub" />

            <div className="flex flex-col gap-6 p-6 w-full max-w-[100vw] lg:max-w-none text-foreground bg-background">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Inventory Control Hub</h1>
                    <p className="text-muted-foreground text-sm font-medium">Unified warehouse management deck for active stock tracking, batch shelf life alerts, and financial logs.</p>
                </div>

                {/* ── Operational Totals Core Dashboard Cards Row ── */}
                <div className="grid gap-4 sm:grid-cols-3">
                    <Card className="shadow-sm border-l-4 border-l-primary bg-card text-card-foreground">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-0.5">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Tracked SKU Profiles</span>
                                <div className="text-3xl font-bold font-mono tracking-tight">{stats.total_active_skus}</div>
                                <span className="text-xs text-muted-foreground font-medium block">Unique products with active stock snapshot logs</span>
                            </div>
                            <div className="rounded-full p-3 bg-primary/10 text-primary"><Layers className="size-6" /></div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-l-4 border-l-blue-500 bg-card text-card-foreground">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-0.5">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Total Items Volume</span>
                                <div className="text-3xl font-bold font-mono tracking-tight">{stats.total_stock_volume} units</div>
                                <span className="text-xs text-muted-foreground font-medium block">Cumulative product counts across all warehouse cells</span>
                            </div>
                            <div className="rounded-full p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400"><Boxes className="size-6" /></div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-l-4 border-l-emerald-500 bg-card text-card-foreground">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-0.5">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Stock Safety Health</span>
                                <div className="text-3xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
                                    {stats.low_stock_count === 0 ? "100%" : `${Math.max(0, 100 - Math.round((stats.low_stock_count / stats.total_active_skus) * 100))}%`}
                                </div>
                                <span className="text-xs text-muted-foreground font-medium block">Safe operational threshold compliance margin</span>
                            </div>
                            <div className="rounded-full p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"><TrendingUp className="size-6" /></div>
                        </CardContent>
                    </Card>
                </div>

                {/* ── Sub-Report Management Navigation Sections Matrix ── */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Low Stock Tracker Link Card */}
                    <Card onClick={() => router.visit('/warehouse/inventory-advanced/low-stock-report')} className="group shadow-sm bg-card hover:border-destructive/40 hover:shadow-md transition-all cursor-pointer border relative flex flex-col justify-between h-40">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Low Stock Alerts</span>
                                <ShieldAlert className="size-5 text-destructive group-hover:scale-110 transition-transform" />
                            </div>
                            <CardTitle className="text-3xl font-black mt-2 font-mono text-destructive">{stats.low_stock_count}</CardTitle>
                        </CardHeader>
                        <CardContent className="pb-4 flex items-center justify-between text-xs text-muted-foreground font-medium border-t pt-3">
                            <span>Open Restock Intelligence View</span>
                            <ChevronRight className="size-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                        </CardContent>
                    </Card>

                    {/* Expiry Lots Link Card */}
                    <Card onClick={() => router.visit('/warehouse/inventory-advanced/expiring-report')} className="group shadow-sm bg-card hover:border-amber-500/40 hover:shadow-md transition-all cursor-pointer border relative flex flex-col justify-between h-40">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Lot Expiry Radar</span>
                                <CalendarDays className="size-5 text-amber-500 group-hover:scale-110 transition-transform" />
                            </div>
                            <CardTitle className="text-3xl font-black mt-2 font-mono text-amber-600 dark:text-amber-400">{stats.expiring_batch_count}</CardTitle>
                        </CardHeader>
                        <CardContent className="pb-4 flex items-center justify-between text-xs text-muted-foreground font-medium border-t pt-3">
                            <span>Open Shelf-Life Degradation Tracker</span>
                            <ChevronRight className="size-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                        </CardContent>
                    </Card>

                    {/* Dead Stock Link Card */}
                    <Card onClick={() => router.visit('/warehouse/inventory-advanced/dead-stock-report')} className="group shadow-sm bg-card hover:border-slate-400/40 hover:shadow-md transition-all cursor-pointer border relative flex flex-col justify-between h-40">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Dead Stagnant Assets</span>
                                <FileDown className="size-5 text-slate-400 group-hover:scale-110 transition-transform" />
                            </div>
                            <CardTitle className="text-3xl font-black mt-2 font-mono text-slate-600 dark:text-slate-400">{stats.dead_stock_count}</CardTitle>
                        </CardHeader>
                        <CardContent className="pb-4 flex items-center justify-between text-xs text-muted-foreground font-medium border-t pt-3">
                            <span>Open Capital Frozen Assessment</span>
                            <ChevronRight className="size-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                        </CardContent>
                    </Card>

                    {/* Double-Entry Ledger Sheet Link Card */}
                    <Card onClick={() => router.visit('/warehouse/inventory-advanced/ledger')} className="group shadow-sm bg-card hover:border-primary/40 hover:shadow-md transition-all cursor-pointer border relative flex flex-col justify-between h-40">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Audit Stock Ledger</span>
                                <History className="size-5 text-primary group-hover:scale-110 transition-transform" />
                            </div>
                            <CardTitle className="text-sm font-semibold text-muted-foreground mt-4 leading-relaxed">Granular Inbound/Outbound Movement Trace Trails</CardTitle>
                        </CardHeader>
                        <CardContent className="pb-4 flex items-center justify-between text-xs text-muted-foreground font-medium border-t pt-3">
                            <span>Inspect Regulatory Activity Sheets</span>
                            <ChevronRight className="size-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
