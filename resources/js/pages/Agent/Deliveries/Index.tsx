import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import {
    Truck,
    CheckCircle,
    Clock,
    MapPin,
    Phone,
    User,
    Package,
    Eye,
    ChevronLeft,
    ChevronRight,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type DeliveryRow = {
    id: number;
    status: string;
    assigned_at: string | null;
    picked_at: string | null;
    delivered_at: string | null;
    order: {
        order_number: string;
        total_amount: number;
        address_snapshot: Record<string, string> | null;
        customer: { name: string; phone: string } | null;
    };
};

type Props = {
    deliveries: {
        data: DeliveryRow[];
        current_page: number;
        last_page: number;
        total: number;
    };
    filters: { status?: string };
    stats: { total: number; pending: number; delivered_today: number };
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Agent Dashboard', href: '/agent' },
    { title: 'My Deliveries', href: '' },
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

function formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
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

const TABS = [
    { value: 'all',              label: 'All' },
    { value: 'assigned',         label: 'Assigned' },
    { value: 'out_for_delivery', label: 'Out for Delivery' },
    { value: 'delivered',        label: 'Delivered' },
    { value: 'failed',           label: 'Failed' },
];

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────
export default function AgentDeliveriesIndex({ deliveries, filters, stats }: Props) {
    const activeTab = filters.status ?? 'all';

    function handleTabChange(value: string) {
        const params: Record<string, string> = { page: '1' };
        if (value !== 'all') params.status = value;
        router.visit('/agent/deliveries', {
            data: params,
            preserveState: true,
            replace: true,
        });
    }

    function handlePageChange(page: number) {
        const params: Record<string, string | number> = { page };
        if (activeTab !== 'all') params.status = activeTab;
        router.visit('/agent/deliveries', {
            data: params,
            preserveState: true,
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="My Deliveries" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">My Deliveries</h1>
                        <p className="text-muted-foreground text-sm">Track and manage all your assigned deliveries</p>
                    </div>
                    <Button variant="outline" onClick={() => router.visit('/agent')}>
                        ← Back to Dashboard
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid gap-4 sm:grid-cols-3">
                    <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900/50 dark:to-slate-800/30">
                        <CardContent className="p-5 flex items-center gap-4">
                            <div className="rounded-xl bg-slate-500/15 p-3">
                                <Package className="size-5 text-slate-600 dark:text-slate-400" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground font-medium">Total Deliveries</p>
                                <p className="text-2xl font-bold">{stats.total}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/50 dark:to-amber-900/30">
                        <CardContent className="p-5 flex items-center gap-4">
                            <div className="rounded-xl bg-amber-500/15 p-3">
                                <Clock className="size-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground font-medium">Pending</p>
                                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.pending}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/50 dark:to-green-900/30">
                        <CardContent className="p-5 flex items-center gap-4">
                            <div className="rounded-xl bg-green-500/15 p-3">
                                <CheckCircle className="size-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground font-medium">Delivered Today</p>
                                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.delivered_today}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Table with Tabs */}
                <Card className="flex-1">
                    <CardHeader className="pb-0">
                        <CardTitle>Deliveries</CardTitle>
                        <CardDescription>{deliveries.total} total deliveries found</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <Tabs value={activeTab} onValueChange={handleTabChange}>
                            <TabsList className="mb-4">
                                {TABS.map((tab) => (
                                    <TabsTrigger key={tab.value} value={tab.value}>
                                        {tab.label}
                                    </TabsTrigger>
                                ))}
                            </TabsList>

                            {TABS.map((tab) => (
                                <TabsContent key={tab.value} value={tab.value} className="mt-0">
                                    {deliveries.data.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-16 text-center">
                                            <div className="rounded-full bg-muted p-4 mb-4">
                                                <Truck className="size-8 text-muted-foreground" />
                                            </div>
                                            <p className="font-medium text-muted-foreground">No deliveries found</p>
                                            <p className="text-sm text-muted-foreground/70 mt-1">
                                                {activeTab !== 'all'
                                                    ? `No ${activeTab.replace('_', ' ')} deliveries`
                                                    : 'No deliveries assigned yet'}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="overflow-auto rounded-md border">
                                            <Table>
                                                <TableHeader className="bg-muted/40">
                                                    <TableRow>
                                                        <TableHead>Order No.</TableHead>
                                                        <TableHead>Customer</TableHead>
                                                        <TableHead>Delivery Address</TableHead>
                                                        <TableHead className="text-right">Amount</TableHead>
                                                        <TableHead>Status</TableHead>
                                                        <TableHead>Assigned At</TableHead>
                                                        <TableHead className="text-right">Actions</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {deliveries.data.map((delivery) => (
                                                        <TableRow key={delivery.id} className="hover:bg-accent/40">
                                                            <TableCell className="font-mono font-semibold text-sm">
                                                                {delivery.order.order_number}
                                                            </TableCell>
                                                            <TableCell>
                                                                {delivery.order.customer ? (
                                                                    <div>
                                                                        <div className="flex items-center gap-1.5 font-medium text-sm">
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
                                                                    <span className="text-xs text-muted-foreground line-clamp-2">
                                                                        {formatAddress(delivery.order.address_snapshot)}
                                                                    </span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right font-semibold text-sm">
                                                                ₹{Number(delivery.order.total_amount).toFixed(2)}
                                                            </TableCell>
                                                            <TableCell>
                                                                <DeliveryStatusBadge status={delivery.status} />
                                                            </TableCell>
                                                            <TableCell className="text-sm text-muted-foreground">
                                                                {formatDate(delivery.assigned_at)}
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
                                </TabsContent>
                            ))}
                        </Tabs>

                        {/* Pagination */}
                        {deliveries.last_page > 1 && (
                            <div className="flex items-center justify-between mt-4 pt-4 border-t">
                                <p className="text-sm text-muted-foreground">
                                    Page {deliveries.current_page} of {deliveries.last_page} &middot; {deliveries.total} total
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={deliveries.current_page === 1}
                                        onClick={() => handlePageChange(deliveries.current_page - 1)}
                                    >
                                        <ChevronLeft className="size-4" />
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={deliveries.current_page === deliveries.last_page}
                                        onClick={() => handlePageChange(deliveries.current_page + 1)}
                                    >
                                        Next
                                        <ChevronRight className="size-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
