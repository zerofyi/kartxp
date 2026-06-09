import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import {
    MapPin,
    Phone,
    User,
    Package,
    CreditCard,
    CheckCircle,
    XCircle,
    Truck,
    Clock,
    Camera,
    AlertTriangle,
    ArrowLeft,
    ImageIcon,
} from 'lucide-react';

import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type Props = {
    delivery: {
        id: number;
        status: string;
        assigned_at: string | null;
        picked_at: string | null;
        delivered_at: string | null;
        proof_image: string | null;
        notes: string | null;
        order: {
            order_number: string;
            total_amount: number;
            payment_method: string | null;
            payment_status: string;
            address_snapshot: Record<string, string> | null;
            customer: { name: string; phone: string } | null;
        };
        attempts: Array<{
            id: number;
            attempted_at: string;
            reason: string;
            photo: string | null;
        }>;
    };
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function getBreadcrumbs(id: number): BreadcrumbItem[] {
    return [
        { title: 'Agent Dashboard', href: '/agent' },
        { title: 'My Deliveries', href: '/agent/deliveries' },
        { title: `Delivery #${id}`, href: '' },
    ];
}

function formatAddress(snapshot: Record<string, string> | null): React.ReactNode {
    if (!snapshot) return <span className="text-muted-foreground text-sm">No address provided</span>;
    return (
        <div className="space-y-0.5 text-sm">
            {snapshot.name && <p className="font-semibold">{snapshot.name}</p>}
            {snapshot.address_line_1 && <p>{snapshot.address_line_1}</p>}
            {snapshot.address_line_2 && <p>{snapshot.address_line_2}</p>}
            {(snapshot.city || snapshot.state || snapshot.pincode) && (
                <p>{[snapshot.city, snapshot.state, snapshot.pincode].filter(Boolean).join(', ')}</p>
            )}
            {snapshot.phone && (
                <a href={`tel:${snapshot.phone}`} className="text-blue-600 hover:underline flex items-center gap-1 mt-1">
                    <Phone className="size-3" /> {snapshot.phone}
                </a>
            )}
        </div>
    );
}

function formatDatetime(dateStr: string | null): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
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
        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${info.className}`}>
            {info.label}
        </span>
    );
}

type TimelineStep = {
    label: string;
    time: string | null;
    icon: React.ReactNode;
    done: boolean;
};

function StatusTimeline({ delivery }: { delivery: Props['delivery'] }) {
    const steps: TimelineStep[] = [
        {
            label: 'Assigned',
            time: delivery.assigned_at,
            icon: <Package className="size-4" />,
            done: !!delivery.assigned_at,
        },
        {
            label: 'Picked Up',
            time: delivery.picked_at,
            icon: <Truck className="size-4" />,
            done: !!delivery.picked_at,
        },
        {
            label: 'Out for Delivery',
            time: null,
            icon: <Clock className="size-4" />,
            done: ['out_for_delivery', 'delivered'].includes(delivery.status),
        },
        {
            label: delivery.status === 'failed' ? 'Delivery Failed' : 'Delivered',
            time: delivery.delivered_at,
            icon: delivery.status === 'failed'
                ? <XCircle className="size-4" />
                : <CheckCircle className="size-4" />,
            done: ['delivered', 'failed'].includes(delivery.status),
        },
    ];

    return (
        <div className="space-y-0">
            {steps.map((step, index) => (
                <div key={index} className="flex gap-4">
                    {/* connector + icon */}
                    <div className="flex flex-col items-center">
                        <div className={`rounded-full p-2 border-2 ${step.done
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'bg-muted border-muted-foreground/30 text-muted-foreground'
                        }`}>
                            {step.icon}
                        </div>
                        {index < steps.length - 1 && (
                            <div className={`w-0.5 h-8 ${step.done ? 'bg-primary' : 'bg-muted-foreground/20'}`} />
                        )}
                    </div>
                    {/* content */}
                    <div className="pb-6 pt-1.5">
                        <p className={`font-medium text-sm ${step.done ? '' : 'text-muted-foreground'}`}>
                            {step.label}
                        </p>
                        {step.time && (
                            <p className="text-xs text-muted-foreground mt-0.5">{formatDatetime(step.time)}</p>
                        )}
                        {!step.done && !step.time && (
                            <p className="text-xs text-muted-foreground/60 mt-0.5">Pending</p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────
export default function AgentDeliveryShow({ delivery }: Props) {
    const [showFailReason, setShowFailReason] = useState(false);
    const isTerminal = ['delivered', 'failed'].includes(delivery.status);

    const { data, setData, post, processing, errors } = useForm<{
        status: string;
        reason: string;
        proof_image: File | null;
    }>({
        status: '',
        reason: '',
        proof_image: null,
    });

    function handleStatusUpdate(newStatus: string) {
        if (newStatus === 'failed') {
            setShowFailReason(true);
            setData('status', 'failed');
            return;
        }
        
        let endpoint = '';
        if (newStatus === 'picked_up') endpoint = 'picked';
        else if (newStatus === 'out_for_delivery') endpoint = 'out-for-delivery';
        else if (newStatus === 'delivered') endpoint = 'delivered';
        
        router.post(`/agent/deliveries/${delivery.id}/${endpoint}`, {}, {
            onSuccess: () => router.reload(),
        });
    }

    function handleSubmitFailed() {
        router.post(`/agent/deliveries/${delivery.id}/failed`, { reason: data.reason }, {
            onSuccess: () => {
                setShowFailReason(false);
                router.reload();
            },
        });
    }

    function handleSubmitDelivered() {
        const formData = new FormData();
        if (data.proof_image) formData.append('proof_image', data.proof_image);
        
        router.post(`/agent/deliveries/${delivery.id}/delivered`, formData, {
            forceFormData: true,
            onSuccess: () => router.reload(),
        });
    }

    const actionButtons = [
        {
            label: 'Mark Picked Up',
            newStatus: 'picked_up',
            show: delivery.status === 'assigned',
            icon: <Truck className="size-4" />,
            className: 'bg-indigo-600 hover:bg-indigo-700 text-white',
        },
        {
            label: 'Mark Out for Delivery',
            newStatus: 'out_for_delivery',
            show: delivery.status === 'picked_up',
            icon: <Clock className="size-4" />,
            className: 'bg-amber-500 hover:bg-amber-600 text-white',
        },
        {
            label: 'Mark Delivered',
            newStatus: 'delivered',
            show: delivery.status === 'out_for_delivery',
            icon: <CheckCircle className="size-4" />,
            className: 'bg-green-600 hover:bg-green-700 text-white',
        },
        {
            label: 'Mark Failed',
            newStatus: 'failed',
            show: ['assigned', 'picked_up', 'out_for_delivery'].includes(delivery.status),
            icon: <XCircle className="size-4" />,
            className: 'bg-red-600 hover:bg-red-700 text-white',
        },
    ];

    return (
        <AppLayout breadcrumbs={getBreadcrumbs(delivery.id)}>
            <Head title={`Delivery – ${delivery.order.order_number}`} />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => router.visit('/agent/deliveries')}>
                            <ArrowLeft className="size-4" />
                        </Button>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold">
                                    {delivery.order.order_number}
                                </h1>
                                <DeliveryStatusBadge status={delivery.status} />
                            </div>
                            <p className="text-muted-foreground text-sm mt-0.5">
                                Delivery #{delivery.id}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Left column */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Order Info */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Package className="size-4 text-muted-foreground" />
                                    Order Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4 sm:grid-cols-3">
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Order Number</p>
                                        <p className="font-mono font-semibold">{delivery.order.order_number}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Amount</p>
                                        <p className="font-semibold text-lg">₹{Number(delivery.order.total_amount).toFixed(2)}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Payment</p>
                                        <div className="flex items-center gap-2">
                                            <CreditCard className="size-3.5 text-muted-foreground" />
                                            <span className="text-sm capitalize">
                                                {delivery.order.payment_method ?? '—'}
                                            </span>
                                            <Badge
                                                variant={delivery.order.payment_status === 'paid' ? 'default' : 'secondary'}
                                                className="text-xs"
                                            >
                                                {delivery.order.payment_status}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Customer Info */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <User className="size-4 text-muted-foreground" />
                                    Customer
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {delivery.order.customer ? (
                                    <div className="flex items-center gap-4">
                                        <div className="rounded-full bg-primary/10 p-3">
                                            <User className="size-6 text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-lg">{delivery.order.customer.name}</p>
                                            <a
                                                href={`tel:${delivery.order.customer.phone}`}
                                                className="flex items-center gap-1.5 text-blue-600 hover:underline font-medium"
                                            >
                                                <Phone className="size-3.5" />
                                                {delivery.order.customer.phone}
                                            </a>
                                        </div>
                                        <div className="ml-auto">
                                            <a href={`tel:${delivery.order.customer.phone}`}>
                                                <Button variant="outline" className="gap-2">
                                                    <Phone className="size-4" />
                                                    Call Customer
                                                </Button>
                                            </a>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground text-sm">No customer information available</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Delivery Address */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <MapPin className="size-4 text-muted-foreground" />
                                    Delivery Address
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-lg bg-muted/40 p-4">
                                    {formatAddress(delivery.order.address_snapshot)}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Delivery Attempts */}
                        {delivery.attempts.length > 0 && (
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <AlertTriangle className="size-4 text-amber-500" />
                                        Delivery Attempts
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {delivery.attempts.map((attempt) => (
                                            <div key={attempt.id} className="rounded-lg border bg-muted/20 p-4">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="text-sm font-medium">{attempt.reason}</p>
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            {formatDatetime(attempt.attempted_at)}
                                                        </p>
                                                    </div>
                                                    {attempt.photo && (
                                                        <a href={attempt.photo} target="_blank" rel="noreferrer">
                                                            <Button variant="outline" size="sm" className="gap-1.5">
                                                                <ImageIcon className="size-3.5" />
                                                                Photo
                                                            </Button>
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Right column */}
                    <div className="space-y-6">
                        {/* Timeline */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">Status Timeline</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <StatusTimeline delivery={delivery} />
                            </CardContent>
                        </Card>

                        {/* Proof Image (if delivered) */}
                        {delivery.proof_image && (
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Camera className="size-4 text-muted-foreground" />
                                        Delivery Proof
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <a href={delivery.proof_image} target="_blank" rel="noreferrer">
                                        <img
                                            src={delivery.proof_image}
                                            alt="Delivery proof"
                                            className="rounded-lg w-full object-cover border"
                                        />
                                    </a>
                                </CardContent>
                            </Card>
                        )}

                        {/* Status Update Actions */}
                        {!isTerminal && (
                            <Card className="border-primary/30">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base">Update Status</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {actionButtons
                                        .filter((btn) => btn.show)
                                        .map((btn) => (
                                            <Button
                                                key={btn.newStatus}
                                                className={`w-full gap-2 ${btn.className}`}
                                                disabled={processing}
                                                onClick={() => {
                                                    if (btn.newStatus === 'delivered') {
                                                        setData('status', 'delivered');
                                                        setShowFailReason(false);
                                                    }
                                                    handleStatusUpdate(btn.newStatus);
                                                }}
                                            >
                                                {btn.icon}
                                                {btn.label}
                                            </Button>
                                        ))}

                                    {/* Failed Reason Form */}
                                    {showFailReason && (
                                        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 p-4 space-y-3">
                                            <p className="text-sm font-medium text-red-700 dark:text-red-400">
                                                Reason for failure
                                            </p>
                                            <div>
                                                <Label htmlFor="reason" className="text-xs text-red-600">
                                                    Please describe why the delivery failed
                                                </Label>
                                                <Textarea
                                                    id="reason"
                                                    value={data.reason}
                                                    onChange={(e) => setData('reason', e.target.value)}
                                                    placeholder="e.g. Customer not available, wrong address..."
                                                    className="mt-1.5 border-red-300 focus:border-red-500"
                                                    rows={3}
                                                />
                                                {errors.reason && (
                                                    <p className="text-xs text-destructive mt-1">{errors.reason}</p>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setShowFailReason(false)}
                                                    className="flex-1"
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    disabled={processing || !data.reason.trim()}
                                                    onClick={handleSubmitFailed}
                                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                                                >
                                                    Confirm Failed
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Proof Image Upload for delivered */}
                                    {data.status === 'delivered' && !showFailReason && (
                                        <div className="mt-4 rounded-lg border bg-muted/30 p-4 space-y-3">
                                            <p className="text-sm font-medium">Upload Delivery Proof (Optional)</p>
                                            <div>
                                                <Label htmlFor="proof_image" className="text-xs text-muted-foreground">
                                                    Photo of delivered package
                                                </Label>
                                                <input
                                                    id="proof_image"
                                                    type="file"
                                                    accept="image/*"
                                                    capture="environment"
                                                    className="mt-1.5 w-full text-sm text-muted-foreground file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                                                    onChange={(e) => setData('proof_image', e.target.files?.[0] ?? null)}
                                                />
                                            </div>
                                            <Button
                                                className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
                                                disabled={processing}
                                                onClick={handleSubmitDelivered}
                                            >
                                                <CheckCircle className="size-4" />
                                                Confirm Delivered
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Terminal state info */}
                        {isTerminal && (
                            <Card className={delivery.status === 'delivered'
                                ? 'border-green-200 bg-green-50 dark:bg-green-950/20'
                                : 'border-red-200 bg-red-50 dark:bg-red-950/20'
                            }>
                                <CardContent className="p-5 flex items-center gap-3">
                                    {delivery.status === 'delivered' ? (
                                        <CheckCircle className="size-6 text-green-600 shrink-0" />
                                    ) : (
                                        <XCircle className="size-6 text-red-600 shrink-0" />
                                    )}
                                    <div>
                                        <p className={`font-semibold ${delivery.status === 'delivered' ? 'text-green-700' : 'text-red-700'}`}>
                                            {delivery.status === 'delivered' ? 'Delivery Completed' : 'Delivery Failed'}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {delivery.status === 'delivered'
                                                ? `Delivered on ${formatDatetime(delivery.delivered_at)}`
                                                : delivery.notes ?? 'No reason provided'}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
