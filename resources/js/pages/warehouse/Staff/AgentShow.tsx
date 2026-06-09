import { Head, Link } from '@inertiajs/react';
import { ChevronLeft, Truck, AlertCircle, ChevronRight } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Staff', href: '/warehouse/staff' },
    { title: 'Fulfillment Logs', href: '#' }
];

type OrderPayload = {
    id: number;
    order_number: string;
    status: string;
    total_amount: string | number;
};

type DeliveryLog = {
    id: number;
    order_id: number;
    status: string;
    assigned_at: string;
    created_at: string;
    order: OrderPayload | null;
};

type PaginationLinks = {
    url: string | null;
    label: string;
    active: boolean;
};

type Props = {
    agent: { id: number; name: string; mobile: string; status: string };
    deliveries: {
        data: DeliveryLog[];
        links: PaginationLinks[];
        total: number;
        current_page: number;
    };
};

const statusMap: Record<string, { label: string; class: string }> = {
    assigned: { label: 'Assigned', class: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300' },
    picked: { label: 'Picked up', class: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300' },
    out_for_delivery: { label: 'Out Bound Fleet', class: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300' },
    delivered: { label: 'Delivered', class: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300' },
    cancelled: { label: 'Dropped / Returned', class: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300' },
};

export default function AgentShow({ agent, deliveries }: Props) {
    const renderLinkLabel = (label: string) => {
        if (label.includes('Previous')) return <ChevronLeft className="h-4 w-4" />;
        if (label.includes('Next')) return <ChevronRight className="h-4 w-4" />;
        return label;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Fulfillment Logs: ${agent.name}`} />
            <div className="p-6 space-y-6">

                {/* Module Heading */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" asChild>
                            <Link href="/warehouse/staff"><ChevronLeft className="h-5 w-5" /></Link>
                        </Button>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                                {agent.name} <Badge className="text-[10px] font-mono tracking-wider capitalize">{agent.status}</Badge>
                            </h1>
                            <p className="text-xs font-mono text-muted-foreground mt-0.5">Fleet Line Reference: {agent.mobile}</p>
                        </div>
                    </div>
                </div>

                {/* Operations Manifest Stats Monitor */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border-l-4 border-l-orange-500 bg-gradient-to-br from-card to-orange-50/20">
                        <CardHeader className="pb-2 pt-4">
                            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <Truck className="h-4 w-4" /> Operations Registry Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-mono font-bold tracking-tight text-orange-700">{deliveries.total} Manifest entries signed</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Manifest Summary Data Tables */}
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Manifest Code</TableHead>
                                <TableHead>Value Weight</TableHead>
                                <TableHead>Current Registry Status</TableHead>
                                <TableHead>Dispatched At</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {deliveries.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <AlertCircle className="h-8 w-8 opacity-40 text-muted-foreground" />
                                            <span>No historical delivery manifests signed out to this operator node asset.</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                deliveries.data.map((log) => (
                                    <TableRow key={log.id} className="hover:bg-muted/30">
                                        <TableCell className="font-mono text-xs font-bold text-primary">
                                            {log.order?.order_number ?? `[orphaned_id: ${log.order_id}]`}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs font-medium">
                                            ₹{Number(log.order?.total_amount ?? 0).toLocaleString('en-IN')}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`capitalize font-mono text-[10px] ${statusMap[log.status]?.class ?? 'bg-slate-100'}`}>
                                                {statusMap[log.status]?.label ?? log.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground font-medium">
                                            {log.assigned_at ? new Date(log.assigned_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination Segment Footer */}
                    {deliveries.links.length > 3 && (
                        <div className="p-4 border-t flex items-center justify-center gap-1 bg-muted/20">
                            {deliveries.links.map((link, index) => (
                                <Button
                                    key={index}
                                    variant={link.active ? 'default' : 'outline'}
                                    size="sm"
                                    className="h-8 min-w-[32px] text-xs font-mono"
                                    disabled={!link.url}
                                    asChild={!!link.url}
                                >
                                    {link.url ? (
                                        <Link href={link.url}>
                                            {renderLinkLabel(link.label)}
                                        </Link>
                                    ) : (
                                        <span>{renderLinkLabel(link.label)}</span>
                                    )}
                                </Button>
                            ))}
                        </div>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}
