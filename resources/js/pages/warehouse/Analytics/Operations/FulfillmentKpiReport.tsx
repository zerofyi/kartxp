import { Head, router } from '@inertiajs/react';
import { Clock, ArrowLeft, Truck, PackageCheck, Hourglass } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Analytics Command Center', href: '/warehouse/analytics-engine/dashboard' },
    { title: 'Fulfillment Speeds', href: '#' },
];

type Props = {
    velocity: {
        total_fulfilled_deliveries: number;
        avg_packaging_time_mins: number;
        avg_transit_time_mins: number;
        total_turnaround_time_mins: number;
    };
};

export default function FulfillmentKpiReport({ velocity }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Order Shipping & Fulfillment Speeds" />
            <div className="p-6 space-y-6">

                <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" onClick={() => router.visit('/warehouse/analytics-engine/dashboard')} className="h-8 w-8 rounded-lg">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
                            <Clock className="h-5 w-5 text-primary" /> Fulfillment Shipping KPIs
                        </h1>
                        <p className="text-muted-foreground text-xs">Tracking order packing speeds and delivery agent road trip durations.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border-t-4 border-t-amber-500">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-black text-muted-foreground uppercase flex items-center justify-between">
                                Packing Speed
                                <Hourglass className="h-4 w-4 text-amber-500" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-black font-mono text-foreground">{Math.round(velocity.avg_packaging_time_mins || 0)} mins</p>
                            <span className="text-[11px] text-muted-foreground mt-2 block">Average time taken to accept, pack, and assign an order to a courier agent.</span>
                        </CardContent>
                    </Card>

                    <Card className="border-t-4 border-t-purple-500">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-black text-muted-foreground uppercase flex items-center justify-between">
                                Road Delivery Time
                                <Truck className="h-4 w-4 text-purple-500" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-black font-mono text-foreground">{Math.round(velocity.avg_transit_time_mins || 0)} mins</p>
                            <span className="text-[11px] text-muted-foreground mt-2 block">Average travel time for delivery staff from warehouse exit to customer doorstep.</span>
                        </CardContent>
                    </Card>

                    <Card className="border-t-4 border-t-primary bg-primary/5">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-black text-primary uppercase flex items-center justify-between">
                                Total Processing Duration
                                <PackageCheck className="h-4 w-4 text-primary" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-black font-mono text-primary">{Math.round(velocity.total_turnaround_time_mins || 0)} mins</p>
                            <span className="text-[11px] text-muted-foreground mt-2 block">Total lifespan of an order from the second payment clears until items are dropped off.</span>
                        </CardContent>
                    </Card>
                </div>

                <div className="bg-muted/40 rounded-xl p-4 border text-center py-8">
                    <span className="text-xs text-muted-foreground uppercase tracking-widest block font-bold">Total Orders Processed in Sample</span>
                    <span className="text-2xl font-black font-mono mt-1 block text-foreground">{velocity.total_fulfilled_deliveries} Shipments Completed</span>
                </div>
            </div>
        </AppLayout>
    );
}
