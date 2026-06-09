import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    Clock,
    CreditCard,
    Download,
    FileText,
    Mail,
    MapPin,
    MessageSquare,
    Package,
    Phone,
    User,
    UserCheck,
} from 'lucide-react';
import React from 'react';

type Props = {
    order: {
        id: number;
        order_number: string;
        order_channel: string;
        status: string;
        payment_status: string;
        payment_method: string | null;
        subtotal: number;
        tax_amount: number;
        coupon_discount: number;
        shipping_charge: number;
        discount_amount: number;
        total_amount: number;
        address_snapshot: Record<string, string> | null;
        notes: string | null;
        created_at: string;
        customer: {
            id: number;
            name: string;
            phone: string;
            email: string | null;
        } | null;
        items: Array<{
            id: number;
            quantity: number;
            price: number;
            discount: number;
            total: number;
            product_variant: {
                variant_name: string;
                sku: string;
                product: { name: string };
            } | null; // Changed key here
        }>;
        payments: Array<{
            id: number;
            amount: number;
            method: string;
            gateway: string | null;
            transaction_id: string | null;
            status: string;
        }>;
        status_logs: Array<{
            id: number;
            from_status: string | null;
            to_status: string;
            note: string | null;
            created_at: string;
            changed_by: { name: string } | null;
        }>;
        delivery: {
            id: number;
            status: string;
            agent: { name: string; mobile: string } | null;
            assigned_at: string | null;
        } | null;
    };
    agents: Array<{ id: number; name: string; mobile: string }>;
    available_statuses: string[];
};

const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
    processing: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    packed: 'bg-purple-50 text-purple-700 border-purple-200',
    dispatched: 'bg-orange-50 text-orange-700 border-orange-200',
    delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
};

export default function OnlineOrderShow({
    order,
    agents,
    available_statuses,
}: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Online Orders', href: '/warehouse/online-orders' },
        { title: order.order_number, href: '#' },
    ];

    const statusForm = useForm({ status: order.status, note: '' });
    const agentForm = useForm({ agent_id: '' });

    const commitStatus = (e: React.FormEvent) => {
        e.preventDefault();
        statusForm.post(`/warehouse/online-orders/${order.id}/status`);
    };

    const commitAgent = (e: React.FormEvent) => {
        e.preventDefault();
        agentForm.post(`/warehouse/online-orders/${order.id}/assign-agent`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Manifest File Split — ${order.order_number}`} />
            <div className="space-y-6 p-6">
                {/* Subheading Split Menu Row */}
                <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            onClick={() =>
                                router.visit('/warehouse/online-orders')
                            }
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="font-mono text-xl font-bold tracking-tight text-primary">
                                    {order.order_number}
                                </h1>
                                <Badge
                                    variant="outline"
                                    className={`font-mono text-[10px] capitalize ${STATUS_COLORS[order.status] ?? 'bg-slate-100'}`}
                                >
                                    {order.status.replace('_', ' ')}
                                </Badge>
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Logged entry context pipeline:{' '}
                                {new Date(order.created_at).toLocaleString(
                                    'en-IN',
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 gap-1.5 text-xs"
                            onClick={() =>
                                window.open(
                                    `/warehouse/online-orders/${order.id}/packing-slip`,
                                    '_blank',
                                )
                            }
                        >
                            <FileText className="h-4 w-4 text-slate-500" />{' '}
                            Print Manifest Slip
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 gap-1.5 text-xs"
                            onClick={() =>
                                window.open(
                                    `/warehouse/online-orders/${order.id}/invoice`,
                                    '_blank',
                                )
                            }
                        >
                            <Download className="h-4 w-4 text-slate-500" />{' '}
                            Invoice File
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
                    {/* Primary Left Split Logs Context Column */}
                    <div className="space-y-6 lg:col-span-2">
                        {/* Itemized Cargo Payload Rows */}
                        <Card className="overflow-hidden">
                            <CardHeader className="border-b bg-muted/30 py-3.5">
                                <CardTitle className="flex items-center gap-2 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                    <Package className="h-4 w-4 text-slate-500" />{' '}
                                    Consolidated Package Allocation Items
                                </CardTitle>
                            </CardHeader>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>
                                            SKU Inventory Product description
                                        </TableHead>
                                        <TableHead>
                                            Manufacturer Part SKU
                                        </TableHead>
                                        <TableHead className="text-center">
                                            Units Allocated
                                        </TableHead>
                                        <TableHead className="text-right">
                                            Unit Price
                                        </TableHead>
                                        <TableHead className="text-right">
                                            Net Totals
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {order.items.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                {/* Safe access via optional chaining mapping avoids crashing on incomplete snapshot models */}
                                                <div className="text-sm font-semibold">
                                                    {item.product_variant
                                                        ?.product?.name ??
                                                        'Unknown Product Asset'}
                                                </div>
                                                <div className="font-mono text-xs text-muted-foreground">
                                                    {item.product_variant
                                                        ?.variant_name ??
                                                        'Base Variant Config'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs text-muted-foreground">
                                                {item.product_variant?.sku ??
                                                    '—'}
                                            </TableCell>
                                            <TableCell className="text-center font-mono font-medium">
                                                {item.quantity}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs">
                                                ₹
                                                {Number(
                                                    item.price,
                                                ).toLocaleString('en-IN')}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-sm font-bold">
                                                ₹
                                                {Number(
                                                    item.total,
                                                ).toLocaleString('en-IN')}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            {/* Accounting Ledger Aggregates Split */}
                            <div className="flex justify-end border-t bg-muted/20 p-4">
                                <div className="w-full max-w-xs space-y-2 font-mono text-xs">
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Subtotal Payload:</span>
                                        <span className="font-medium text-foreground">
                                            ₹
                                            {Number(
                                                order.subtotal,
                                            ).toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                    {Number(order.coupon_discount) > 0 && (
                                        <div className="flex justify-between text-red-600">
                                            <span>Coupon Slashes:</span>
                                            <span>
                                                -₹
                                                {Number(
                                                    order.coupon_discount,
                                                ).toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                    )}
                                    {Number(order.discount_amount) > 0 && (
                                        <div className="flex justify-between text-red-600">
                                            <span>
                                                Promotional Subtractions:
                                            </span>
                                            <span>
                                                -₹
                                                {Number(
                                                    order.discount_amount,
                                                ).toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Fulfillment Freight:</span>
                                        <span className="font-medium text-foreground">
                                            ₹
                                            {Number(
                                                order.shipping_charge,
                                            ).toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Aggregated State Tax:</span>
                                        <span className="font-medium text-foreground">
                                            ₹
                                            {Number(
                                                order.tax_amount,
                                            ).toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                    <div className="flex justify-between border-t pt-2 text-sm font-black text-primary">
                                        <span>Net Balance Payable:</span>
                                        <span>
                                            ₹
                                            {Number(
                                                order.total_amount,
                                            ).toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Internal State Audit Tracking Timeline */}
                        <Card>
                            <CardHeader className="border-b bg-muted/10 py-3.5">
                                <CardTitle className="flex items-center gap-2 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                    <Clock className="h-4 w-4 text-slate-500" />{' '}
                                    Pipeline Transition State Audit Trail
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-5">
                                <ol className="relative ml-2 space-y-6 border-l border-muted">
                                    {order.status_logs.map((log) => (
                                        <li
                                            key={log.id}
                                            className="relative ml-6"
                                        >
                                            <span className="absolute top-0 -left-[31px] flex h-4 w-4 items-center justify-center rounded-full bg-primary ring-4 ring-background" />
                                            <div className="space-y-1.5 rounded-lg border bg-muted/40 p-3 text-xs">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {log.from_status && (
                                                        <Badge
                                                            variant="outline"
                                                            className="text-[9px] capitalize"
                                                        >
                                                            {log.from_status.replace(
                                                                '_',
                                                                ' ',
                                                            )}
                                                        </Badge>
                                                    )}
                                                    <span className="text-[10px] text-muted-foreground">
                                                        →
                                                    </span>
                                                    <Badge className="text-[9px] capitalize">
                                                        {log.to_status.replace(
                                                            '_',
                                                            ' ',
                                                        )}
                                                    </Badge>
                                                </div>
                                                {log.note && (
                                                    <div className="flex items-start gap-1 font-sans text-sm text-muted-foreground">
                                                        <MessageSquare className="mt-0.5 h-3 w-3 shrink-0" />{' '}
                                                        {log.note}
                                                    </div>
                                                )}
                                                <div className="font-mono text-[10px] text-muted-foreground">
                                                    Signee Author:{' '}
                                                    {log.changed_by?.name ??
                                                        'System Process Server'}{' '}
                                                    ·{' '}
                                                    {new Date(
                                                        log.created_at,
                                                    ).toLocaleString('en-IN')}
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Secondary Right Control & Profile Context Column */}
                    <div className="space-y-6">
                        {/* Core Operations Form Actions Control Panel */}
                        <Card>
                            <CardHeader className="border-b bg-muted/30 py-3.5">
                                <CardTitle className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                    Pipeline State Routing Controllers
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-4">
                                <form
                                    onSubmit={commitStatus}
                                    className="space-y-2"
                                >
                                    <Label className="text-xs font-bold">
                                        Transition Pipeline Workflow Tracking
                                        State
                                    </Label>
                                    <Select
                                        value={statusForm.data.status}
                                        onValueChange={(v) =>
                                            statusForm.setData('status', v)
                                        }
                                    >
                                        <SelectTrigger className="h-9 text-xs w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {available_statuses.map((s) => (
                                                <SelectItem
                                                    key={s}
                                                    value={s}
                                                    className="text-xs capitalize"
                                                >
                                                    {s.replace('_', ' ')}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Textarea
                                        className="h-14 text-xs"
                                        placeholder="Append transition log note entry description statement parameters..."
                                        value={statusForm.data.note}
                                        onChange={(e) =>
                                            statusForm.setData(
                                                'note',
                                                e.target.value,
                                            )
                                        }
                                    />
                                    <Button
                                        size="sm"
                                        type="submit"
                                        className="h-8 w-full text-xs"
                                        disabled={statusForm.processing}
                                    >
                                        Commit State Mutation
                                    </Button>
                                </form>

                                <Separator />

                                <form
                                    onSubmit={commitAgent}
                                    className="space-y-2"
                                >
                                    <Label className="text-xs font-bold">
                                        Link Active Fleet Vehicle Courier Driver
                                    </Label>
                                    <Select
                                        value={agentForm.data.agent_id}
                                        onValueChange={(v) =>
                                            agentForm.setData('agent_id', v)
                                        }
                                    >
                                        <SelectTrigger className="h-9 text-xs w-full">
                                            <SelectValue placeholder="Select fleet courier driver profile..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {agents.map((a) => (
                                                <SelectItem
                                                    key={a.id}
                                                    value={a.id.toString()}
                                                    className="text-xs"
                                                >
                                                    {a.name} ({a.mobile})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        size="sm"
                                        type="submit"
                                        variant="outline"
                                        className="h-8 w-full border-orange-200 text-xs text-orange-700 hover:bg-orange-50"
                                        disabled={agentForm.processing}
                                    >
                                        <UserCheck className="mr-1 h-3.5 w-3.5" />{' '}
                                        Bind Fleet Manifest Route
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        {/* Consignee Recipient Identity Profile Card */}
                        <Card>
                            <CardHeader className="border-b bg-muted/10 py-3.5">
                                <CardTitle className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                    <User className="h-4 w-4" /> Consignee
                                    Metadata Identity Profile
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 pt-4 text-xs">
                                <div className="text-sm font-bold text-foreground">
                                    {order.customer?.name ??
                                        'Anonymous Account Holder'}
                                </div>
                                {order.customer?.phone && (
                                    <div className="flex items-center gap-1.5 font-mono text-muted-foreground">
                                        <Phone className="h-3.5 w-3.5" />{' '}
                                        {order.customer.phone}
                                    </div>
                                )}
                                {order.customer?.email && (
                                    <div className="flex items-center gap-1.5 font-mono text-muted-foreground">
                                        <Mail className="h-3.5 w-3.5" />{' '}
                                        {order.customer.email}
                                    </div>
                                )}
                                {order.notes && (
                                    <div className="mt-1 rounded-lg border border-amber-100 bg-amber-50/50 p-2.5 text-foreground/80 italic">
                                        "{order.notes}"
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Physical Shipping Geo Address Destination Snapshot Card */}
                        {order.address_snapshot && (
                            <Card>
                                <CardHeader className="border-b bg-muted/10 py-3.5">
                                    <CardTitle className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                        <MapPin className="h-4 w-4" /> Drop
                                        Destination Coordinates Snapshot
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-1 pt-4 font-sans text-xs text-foreground/90">
                                    <div className="mb-1 text-sm font-semibold">
                                        {order.address_snapshot.name}
                                    </div>
                                    <div>
                                        {order.address_snapshot.address_line_1}
                                    </div>
                                    {order.address_snapshot.address_line_2 && (
                                        <div>
                                            {
                                                order.address_snapshot
                                                    .address_line_2
                                            }
                                        </div>
                                    )}
                                    <div className="mt-1 font-semibold text-primary">
                                        {[
                                            order.address_snapshot.city,
                                            order.address_snapshot.state,
                                            order.address_snapshot.pincode,
                                        ]
                                            .filter(Boolean)
                                            .join(', ')}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Financial Ledger Clearings Statement Parameters Card */}
                        <Card>
                            <CardHeader className="border-b bg-muted/10 py-3.5">
                                <CardTitle className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                    <CreditCard className="h-4 w-4" /> Financial
                                    Transactions Summary Ledger
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 pt-4 text-xs">
                                {order.payments.map((p) => (
                                    <div
                                        key={p.id}
                                        className="space-y-1 rounded-lg border bg-muted/30 p-2.5 font-mono"
                                    >
                                        <div className="flex justify-between">
                                            <span>Method Channel:</span>
                                            <Badge
                                                variant="outline"
                                                className="text-[9px] uppercase"
                                            >
                                                {p.method}
                                            </Badge>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Value Cleared:</span>
                                            <span className="font-bold text-foreground">
                                                ₹
                                                {Number(
                                                    p.amount,
                                                ).toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                        {p.transaction_id && (
                                            <div className="flex justify-between text-[10px] text-muted-foreground">
                                                <span>Txn Reference Code:</span>
                                                <span>{p.transaction_id}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between border-t pt-1 text-[10px]">
                                            <span>Clearing State:</span>
                                            <span className="font-bold text-emerald-600 capitalize">
                                                {p.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
