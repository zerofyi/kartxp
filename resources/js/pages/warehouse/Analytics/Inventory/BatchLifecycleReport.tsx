import { Head, router } from '@inertiajs/react';
import { Clock, ArrowLeft, ShieldCheck, AlertTriangle, AlertCircle } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Analytics Command Center', href: '/warehouse/analytics-engine/dashboard' },
    { title: 'Batch Status', href: '#' },
];

type BatchItem = {
    id: number;
    batch_no: string;
    expiry_date: string;
    available_quantity: number;
    product_name: string;
    variant_name: string;
    sku: string;
    days_until_expiry: number;
    lifecycle_status: 'EXPIRED' | 'CRITICAL' | 'HEALTHY';
};

type Props = {
    segments: {
        EXPIRED?: BatchItem[];
        CRITICAL?: BatchItem[];
        HEALTHY?: BatchItem[];
    };
    days: number;
};

export default function BatchLifecycleReport({ segments, days }: Props) {
    const expiredList = segments.EXPIRED || [];
    const criticalList = segments.CRITICAL || [];
    const healthyList = segments.HEALTHY || [];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Batch Expiry Dates" />
            <div className="p-6 space-y-6">

                <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" onClick={() => router.visit('/warehouse/analytics-engine/dashboard')} className="h-8 w-8 rounded-lg">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
                            <Clock className="h-5 w-5 text-amber-500" /> Batch Expiry Lifecycles
                        </h1>
                        <p className="text-muted-foreground text-xs">Tracking stocks based on how close they are to their expiration date.</p>
                    </div>
                </div>

                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-l-4 border-l-destructive bg-destructive/5">
                        <CardContent className="pt-4 flex items-center justify-between">
                            <div>
                                <span className="text-xs font-bold text-muted-foreground uppercase">Expired Batches</span>
                                <p className="text-2xl font-black font-mono text-destructive mt-0.5">{expiredList.length} Batches</p>
                            </div>
                            <AlertCircle className="h-5 w-5 text-destructive" />
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-amber-500 bg-amber-50/10">
                        <CardContent className="pt-4 flex items-center justify-between">
                            <div>
                                <span className="text-xs font-bold text-muted-foreground uppercase">Near Expiry (&lt;{days} Days)</span>
                                <p className="text-2xl font-black font-mono text-amber-600 mt-0.5">{criticalList.length} Batches</p>
                            </div>
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-emerald-600 bg-emerald-50/10">
                        <CardContent className="pt-4 flex items-center justify-between">
                            <div>
                                <span className="text-xs font-bold text-muted-foreground uppercase">Healthy Batches</span>
                                <p className="text-2xl font-black font-mono text-emerald-600 mt-0.5">{healthyList.length} Batches</p>
                            </div>
                            <ShieldCheck className="h-5 w-5 text-emerald-600" />
                        </CardContent>
                    </Card>
                </div>

                {/* Expiry Table Panel */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-bold tracking-tight text-foreground">
                            Batches Requiring Attention (Expired or Near Expiry)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item Profile</TableHead>
                                    <TableHead className="w-[150px]">Batch No</TableHead>
                                    <TableHead className="w-[140px] text-right">Available Qty</TableHead>
                                    <TableHead className="w-[160px]">Expiry Date</TableHead>
                                    <TableHead className="w-[140px] text-right">Status Details</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {[...expiredList, ...criticalList].length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-10 text-xs text-muted-foreground italic">
                                            No warehouse batches are expired or near expiry.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    [...expiredList, ...criticalList].map((batch) => (
                                        <TableRow key={batch.id} className="hover:bg-muted/20">
                                            <TableCell className="py-2.5">
                                                <span className="font-bold text-sm block text-foreground">{batch.product_name}</span>
                                                <span className="text-xs text-muted-foreground font-mono">{batch.sku} ({batch.variant_name})</span>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs font-bold text-foreground bg-muted/40 p-1.5 rounded text-center">
                                                {batch.batch_no}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs font-bold">{batch.available_quantity}</TableCell>
                                            <TableCell className="text-xs font-medium text-foreground">
                                                {new Date(batch.expiry_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </TableCell>
                                            <TableCell className={`text-right font-mono text-xs font-bold ${batch.lifecycle_status === 'EXPIRED' ? 'text-destructive bg-destructive/5' : 'text-amber-600 bg-amber-50/30'}`}>
                                                {batch.lifecycle_status === 'EXPIRED' ? 'EXPIRED' : `${batch.days_until_expiry} days left`}
                                            </TableCell>
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
