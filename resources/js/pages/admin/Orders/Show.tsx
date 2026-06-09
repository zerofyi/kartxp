import { Head, router, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    Package,
    MapPin,
    User,
    CreditCard,
    Truck,
    CheckCircle,
    Clock,
    AlertTriangle,
    Phone,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AdminAppLayout from '@/layouts/admin-app-layout';
import type { BreadcrumbItem } from '@/types';
import admin from '@/routes/admin';

type OrderItem = {
    id: number;
    product_name: string;
    variant_name: string | null;
    sku: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
};

type Address = {
    name: string;
    phone: string;
    address_line1: string;
    address_line2: string | null;
    city: string;
    state: string;
    pincode: string;
};

type Delivery = {
    id: number;
    status: string;
    assigned_at: string | null;
    picked_at: string | null;
    delivered_at: string | null;
    proof_image: string | null;
    agent: { name: string; mobile: string } | null;
};

type OrderLog = {
    id: number;
    status: string;
    note: string | null;
    created_at: string;
    created_by: string | null;
};

type Order = {
    id: number;
    order_number: string;
    order_channel: string;
    status: string;
    payment_status: string;
    payment_method: string;
    subtotal: number;
    tax_amount: number;
    discount_amount: number;
    coupon_discount: number;
    shipping_charge: number;
    total_amount: number;
    created_at: string;
    customer: { name: string; phone: string; email: string } | null;
    warehouse: { name: string } | null;
    address: Address | null;
    items: OrderItem[];
    logs: OrderLog[];
    delivery: Delivery | null;
};

type Props = {
    order: Order;
};

function formatCurrency(amount: number) {
    return '₹' + (amount ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function formatDateTime(dateStr: string | null) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function getStatusBadge(status: string) {
    const map: Record<string, string> = {
        pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        processing: 'bg-blue-100 text-blue-800 border-blue-200',
        shipped: 'bg-purple-100 text-purple-800 border-purple-200',
        delivered: 'bg-green-100 text-green-800 border-green-200',
        cancelled: 'bg-red-100 text-red-800 border-red-200',
        on_hold: 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return (
        <Badge variant="outline" className={`capitalize ${map[status] ?? 'bg-gray-100 text-gray-700'}`}>
            {status.replace('_', ' ')}
        </Badge>
    );
}

function getPaymentBadge(status: string) {
    const map: Record<string, string> = {
        paid: 'bg-green-100 text-green-800 border-green-200',
        unpaid: 'bg-red-100 text-red-700 border-red-200',
        pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        refunded: 'bg-gray-100 text-gray-600 border-gray-200',
    };
    return (
        <Badge variant="outline" className={`capitalize ${map[status] ?? 'bg-gray-100 text-gray-700'}`}>
            {status}
        </Badge>
    );
}

const STATUS_STEPS = ['pending', 'processing', 'shipped', 'delivered'];

export default function OrderShow({ order }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: admin.dashboard().url },
        { title: 'Orders', href: '/admin/orders' },
        { title: `#${order.order_number}`, href: '' },
    ];

    const { data, setData, post, processing, errors, reset } = useForm({
        status: order.status,
        note: '',
    });

    const handleStatusUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/admin/orders/${order.id}/status`, {
            onSuccess: () => reset('note'),
        });
    };

    return (
        <AdminAppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Order #${order.order_number}`} />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" onClick={() => router.visit('/admin/orders')}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <h1 className="text-xl font-bold">Order #{order.order_number}</h1>
                            <p className="text-sm text-muted-foreground">{formatDateTime(order.created_at)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {getStatusBadge(order.status)}
                        {getPaymentBadge(order.payment_status)}
                        <Badge className="bg-indigo-100 text-indigo-700 capitalize">
                            {order.order_channel}
                        </Badge>
                    </div>
                </div>

                {/* Status Timeline */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            {STATUS_STEPS.map((step, index) => {
                                const stepIndex = STATUS_STEPS.indexOf(order.status);
                                const isCompleted = index <= stepIndex;
                                const isCurrent = index === stepIndex;
                                return (
                                    <div key={step} className="flex flex-1 flex-col items-center">
                                        <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold
                                            ${isCompleted ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                            {isCompleted ? <CheckCircle className="h-4 w-4" /> : index + 1}
                                        </div>
                                        <p className={`mt-1 text-xs capitalize font-medium ${isCurrent ? 'text-indigo-700' : isCompleted ? 'text-gray-600' : 'text-gray-400'}`}>
                                            {step}
                                        </p>
                                        {index < STATUS_STEPS.length - 1 && (
                                            <div className={`absolute h-0.5 w-full translate-y-4 ${isCompleted && index < stepIndex ? 'bg-indigo-500' : 'bg-gray-200'}`} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Left Column */}
                    <div className="space-y-6 lg:col-span-2">
                        {/* Order Items */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Package className="h-4 w-4 text-indigo-500" />
                                    Order Items ({order.items?.length ?? 0})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Product</TableHead>
                                            <TableHead>SKU</TableHead>
                                            <TableHead className="text-center">Qty</TableHead>
                                            <TableHead className="text-right">Unit Price</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {!order.items?.length ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                                    No items found
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            order.items.map((item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell>
                                                        <div className="font-medium text-sm">{item.product_name}</div>
                                                        {item.variant_name && (
                                                            <div className="text-xs text-muted-foreground">{item.variant_name}</div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                                        {item.sku ?? '—'}
                                                    </TableCell>
                                                    <TableCell className="text-center">{item.quantity}</TableCell>
                                                    <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                                                    <TableCell className="text-right font-semibold">
                                                        {formatCurrency(item.total_price)}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>

                                {/* Order Summary */}
                                <div className="border-t p-4">
                                    <div className="ml-auto max-w-xs space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Subtotal</span>
                                            <span>{formatCurrency(order.subtotal)}</span>
                                        </div>
                                        {order.discount_amount > 0 && (
                                            <div className="flex justify-between text-sm text-green-600">
                                                <span>Discount</span>
                                                <span>-{formatCurrency(order.discount_amount)}</span>
                                            </div>
                                        )}
                                        {order.coupon_discount > 0 && (
                                            <div className="flex justify-between text-sm text-green-600">
                                                <span>Coupon Discount</span>
                                                <span>-{formatCurrency(order.coupon_discount)}</span>
                                            </div>
                                        )}
                                        {order.tax_amount > 0 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Tax</span>
                                                <span>{formatCurrency(order.tax_amount)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Shipping</span>
                                            <span>
                                                {order.shipping_charge > 0 ? formatCurrency(order.shipping_charge) : 'Free'}
                                            </span>
                                        </div>
                                        <Separator />
                                        <div className="flex justify-between font-bold">
                                            <span>Total</span>
                                            <span className="text-indigo-700">{formatCurrency(order.total_amount)}</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Delivery Info */}
                        {order.delivery && (
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Truck className="h-4 w-4 text-purple-500" />
                                        Delivery Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Delivery Agent</p>
                                            <p className="font-medium">{order.delivery.agent?.name ?? '—'}</p>
                                            <p className="text-sm text-muted-foreground">{order.delivery.agent?.mobile ?? ''}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Delivery Status</p>
                                            {getStatusBadge(order.delivery.status)}
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Assigned At</p>
                                            <p className="text-sm">{formatDateTime(order.delivery.assigned_at)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Picked At</p>
                                            <p className="text-sm">{formatDateTime(order.delivery.picked_at)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Delivered At</p>
                                            <p className="text-sm">{formatDateTime(order.delivery.delivered_at)}</p>
                                        </div>
                                        {order.delivery.proof_image && (
                                            <div>
                                                <p className="text-xs text-muted-foreground">Proof Image</p>
                                                <a
                                                    href={order.delivery.proof_image}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-sm text-indigo-600 underline"
                                                >
                                                    View Proof
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Order Logs */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Clock className="h-4 w-4 text-gray-500" />
                                    Order Timeline
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {!order.logs?.length ? (
                                    <p className="text-sm text-muted-foreground">No activity recorded</p>
                                ) : (
                                    <div className="space-y-4">
                                        {order.logs.map((log, index) => (
                                            <div key={log.id} className="flex gap-3">
                                                <div className="flex flex-col items-center">
                                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100">
                                                        <CheckCircle className="h-3.5 w-3.5 text-indigo-600" />
                                                    </div>
                                                    {index < order.logs.length - 1 && (
                                                        <div className="mt-1 w-0.5 flex-1 bg-gray-200" />
                                                    )}
                                                </div>
                                                <div className="pb-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium capitalize text-sm">
                                                            {log.status.replace('_', ' ')}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {formatDateTime(log.created_at)}
                                                        </span>
                                                    </div>
                                                    {log.note && (
                                                        <p className="mt-0.5 text-sm text-muted-foreground">{log.note}</p>
                                                    )}
                                                    {log.created_by && (
                                                        <p className="text-xs text-gray-400">by {log.created_by}</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                        {/* Customer Info */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <User className="h-4 w-4 text-blue-500" />
                                    Customer
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {order.customer ? (
                                    <>
                                        <p className="font-medium">{order.customer.name}</p>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Phone className="h-3.5 w-3.5" />
                                            {order.customer.phone}
                                        </div>
                                        {order.customer.email && (
                                            <div className="text-sm text-muted-foreground">{order.customer.email}</div>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-sm text-muted-foreground">Guest order</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Delivery Address */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <MapPin className="h-4 w-4 text-red-500" />
                                    Delivery Address
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {order.address ? (
                                    <div className="space-y-1 text-sm">
                                        <p className="font-medium">{order.address.name}</p>
                                        <p className="text-muted-foreground">{order.address.phone}</p>
                                        <p>{order.address.address_line1}</p>
                                        {order.address.address_line2 && <p>{order.address.address_line2}</p>}
                                        <p>{order.address.city}, {order.address.state} - {order.address.pincode}</p>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No address on record</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Payment Info */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <CreditCard className="h-4 w-4 text-green-500" />
                                    Payment
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Method</span>
                                    <span className="capitalize font-medium">{order.payment_method?.replace('_', ' ') ?? '—'}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Status</span>
                                    {getPaymentBadge(order.payment_status)}
                                </div>
                                <div className="flex items-center justify-between font-semibold">
                                    <span>Total</span>
                                    <span className="text-indigo-700">{formatCurrency(order.total_amount)}</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Warehouse */}
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 text-sm">
                                    <Package className="h-4 w-4 text-amber-500" />
                                    <span className="text-muted-foreground">Warehouse:</span>
                                    <span className="font-medium">{order.warehouse?.name ?? '—'}</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Update Status */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                                    Update Status
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleStatusUpdate} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>New Status</Label>
                                        <Select
                                            value={data.status}
                                            onValueChange={(val) => setData('status', val)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="pending">Pending</SelectItem>
                                                <SelectItem value="processing">Processing</SelectItem>
                                                <SelectItem value="shipped">Shipped</SelectItem>
                                                <SelectItem value="delivered">Delivered</SelectItem>
                                                <SelectItem value="cancelled">Cancelled</SelectItem>
                                                <SelectItem value="on_hold">On Hold</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Note (optional)</Label>
                                        <Textarea
                                            placeholder="Add a note about this status change…"
                                            value={data.note}
                                            onChange={(e) => setData('note', e.target.value)}
                                            rows={3}
                                        />
                                    </div>
                                    <Button
                                        type="submit"
                                        className="w-full"
                                        disabled={processing}
                                    >
                                        {processing ? 'Updating…' : 'Update Status'}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AdminAppLayout>
    );
}
