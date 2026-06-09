import { Head, router } from '@inertiajs/react';
import {
    Truck,
    CheckCircle,
    XCircle,
    Clock,
    Eye,
    MapPin,
    Phone,
    User,
    Package,
} from 'lucide-react';

import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type Props = {
    stats: {
        assigned_today: number;
        completed_today: number;
        failed_today: number;
        total_pending: number;
    };
    today_deliveries: Array<{
        id: number;
        order: {
            order_number: string;
            customer: { name: string; phone: string } | null;
            address_snapshot: Record<string, string> | null;
        };
        status: string;
        assigned_at: string;
    }>;
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Agent Dashboard', href: '' },
];

function formatAddress(snapshot: Record<string, string> | null): string {
    if (!snapshot) return '—';
    const parts = [
        snapshot.address_line_1,
        snapshot.address_line_2,
        snapshot.city,
        snapshot.state,
        snapshot.pincode,
    ].filter(Boolean);
    return parts.join(', ') || '—';
}

function DeliveryStatusBadge({ status }: { status: string }) {
    const map: Record<string, { label: string; className: string }> = {
        assigned:         { label: 'Assigned',         className: 'bg-blue-100 text-blue-700 border-blue-200' },
        picked_up:        { label: 'Picked Up',        className: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
        out_for_delivery: { label: 'Out for Delivery', className: 'bg-amber-100 text-amber-700 border-amber-200' },
        delivered:        { label: 'Delivered',        className: 'bg-green-100 text-green-700 border-green-200' },
        failed:           { label: 'Failed',           className: 'bg-red-100 text-red-700 border-red-200' },
    };
    const info = map[status] ?? { label: status, className: 'bg-gray-100 text-gray-700 border-gray-200' };
    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${info.className}`}>
            {info.label}
        </span>
    );
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────
export default function AgentDashboard({ stats, today_deliveries }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Agent Dashboard" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">My Dashboard</h1>
                        <p className="text-muted-foreground text-sm">
                            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                    <Button onClick={() => router.visit('/agent/deliveries')}>
                        <Truck className="mr-2 size-4" />
                        All Deliveries
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Assigned Today</p>
                                    <p className="text-3xl font-bold text-blue-700 dark:text-blue-300 mt-1">
                                        {stats.assigned_today}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-blue-500/20 p-3">
                                    <Package className="size-6 text-blue-600 dark:text-blue-400" />
                                </div>
                            </div>
                            <p className="text-xs text-blue-500/80 dark:text-blue-400/70 mt-2">Total deliveries for today</p>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/50 dark:to-green-900/30">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-green-600 dark:text-green-400">Completed Today</p>
                                    <p className="text-3xl font-bold text-green-700 dark:text-green-300 mt-1">
                                        {stats.completed_today}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-green-500/20 p-3">
                                    <CheckCircle className="size-6 text-green-600 dark:text-green-400" />
                                </div>
                            </div>
                            <p className="text-xs text-green-500/80 dark:text-green-400/70 mt-2">Successfully delivered</p>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/50 dark:to-red-900/30">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-red-600 dark:text-red-400">Failed Today</p>
                                    <p className="text-3xl font-bold text-red-700 dark:text-red-300 mt-1">
                                        {stats.failed_today}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-red-500/20 p-3">
                                    <XCircle className="size-6 text-red-600 dark:text-red-400" />
                                </div>
                            </div>
                            <p className="text-xs text-red-500/80 dark:text-red-400/70 mt-2">Could not be delivered</p>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/50 dark:to-amber-900/30">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Total Pending</p>
                                    <p className="text-3xl font-bold text-amber-700 dark:text-amber-300 mt-1">
                                        {stats.total_pending}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-amber-500/20 p-3">
                                    <Clock className="size-6 text-amber-600 dark:text-amber-400" />
                                </div>
                            </div>
                            <p className="text-xs text-amber-500/80 dark:text-amber-400/70 mt-2">Awaiting delivery</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Today's Deliveries Table */}
                <Card className="flex-1">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-lg">Today's Deliveries</CardTitle>
                                <CardDescription>
                                    {today_deliveries.length} deliveries assigned for today
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {today_deliveries.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="rounded-full bg-muted p-4 mb-4">
                                    <Truck className="size-8 text-muted-foreground" />
                                </div>
                                <p className="font-medium text-muted-foreground">No deliveries assigned for today</p>
                                <p className="text-sm text-muted-foreground/70 mt-1">Check back later or contact your supervisor</p>
                            </div>
                        ) : (
                            <div className="overflow-auto">
                                <Table>
                                    <TableHeader className="bg-muted/40">
                                        <TableRow>
                                            <TableHead>Order No.</TableHead>
                                            <TableHead>Customer</TableHead>
                                            <TableHead>Delivery Address</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Assigned At</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {today_deliveries.map((delivery) => (
                                            <TableRow key={delivery.id} className="hover:bg-accent/40">
                                                <TableCell className="font-mono font-semibold text-sm">
                                                    {delivery.order.order_number}
                                                </TableCell>
                                                <TableCell>
                                                    {delivery.order.customer ? (
                                                        <div>
                                                            <div className="flex items-center gap-1.5 font-medium">
                                                                <User className="size-3.5 text-muted-foreground" />
                                                                {delivery.order.customer.name}
                                                            </div>
                                                            <a
                                                                href={`tel:${delivery.order.customer.phone}`}
                                                                className="flex items-center gap-1 text-xs text-blue-600 hover:underline mt-0.5"
                                                            >
                                                                <Phone className="size-3" />
                                                                {delivery.order.customer.phone}
                                                            </a>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground text-sm">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="max-w-xs">
                                                    <div className="flex items-start gap-1.5">
                                                        <MapPin className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
                                                        <span className="text-sm text-muted-foreground line-clamp-2">
                                                            {formatAddress(delivery.order.address_snapshot)}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <DeliveryStatusBadge status={delivery.status} />
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {new Date(delivery.assigned_at).toLocaleTimeString('en-IN', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => router.visit(`/agent/deliveries/${delivery.id}`)}
                                                    >
                                                        <Eye className="mr-1.5 size-3.5" />
                                                        View
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
