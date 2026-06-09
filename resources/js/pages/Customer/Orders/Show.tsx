import { Head, router } from '@inertiajs/react';
import { ArrowLeft, Box, CheckCircle2, ChevronRight, MapPin, Phone, Truck } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

type OrderItem = {
    id: number;
    product_variant_id: number;
    quantity: number;
    unit_price: number;
    total: number;
    productVariant: {
        sku: string;
        product: { name: string; image_path?: string };
    };
};

type Props = {
    order: {
        id: number;
        order_number: string;
        status: string;
        payment_status: string;
        payment_method: string;
        total_amount: number;
        coupon_discount: number;
        shipping_charge: number;
        created_at: string;
        notes: string | null;
        address_snapshot: Record<string, string> | null;
        items: OrderItem[];
        statusLogs: Array<{ to_status: string; note: string; created_at: string }>;
    };
};

const breadcrumbs = (id: string): BreadcrumbItem[] => [
    { title: 'My Orders', href: '/customer/orders' },
    { title: `Order #${id}`, href: '#' }
];

export default function CustomerOrderShow({ order }: Props) {
    const fmt = (n: number) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

    const addr = order.address_snapshot;

    return (
        <AppLayout breadcrumbs={breadcrumbs(order.order_number)}>
            <Head title={`Order #${order.order_number}`} />
            <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
                <Button variant="ghost" onClick={() => router.visit('/customer/orders')} className="mb-2 -ml-3">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to Orders
                </Button>

                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Order #{order.order_number}</h1>
                        <p className="text-muted-foreground mt-1">Placed on {new Date(order.created_at).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold capitalize border
                            ${order.status === 'delivered' ? 'bg-green-100 text-green-800 border-green-200' :
                              order.status === 'cancelled' ? 'bg-red-100 text-red-800 border-red-200' :
                              'bg-blue-100 text-blue-800 border-blue-200'}`}>
                            {order.status}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        {/* Items */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Items Ordered</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y">
                                    {order.items.map((item) => (
                                        <div key={item.id} className="p-4 flex flex-col sm:flex-row items-start gap-4">
                                            <div className="h-20 w-20 rounded-md bg-muted flex items-center justify-center overflow-hidden flex-shrink-0 border">
                                                {item.productVariant.product.image_path ? (
                                                    <img src={`/storage/${item.productVariant.product.image_path}`} alt="Product" className="object-cover h-full w-full" />
                                                ) : (
                                                    <Box className="h-8 w-8 text-muted-foreground opacity-50" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold text-base truncate">{item.productVariant.product.name}</h4>
                                                <p className="text-sm text-muted-foreground mt-1">SKU: {item.productVariant.sku}</p>
                                                <p className="text-sm font-medium mt-2">{fmt(item.unit_price)} × {item.quantity}</p>
                                            </div>
                                            <div className="text-right sm:ml-auto">
                                                <p className="font-bold">{fmt(item.total)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Order Timeline */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Truck className="h-5 w-5 text-primary" /> Tracking History
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {order.statusLogs.length === 0 ? (
                                    <p className="text-muted-foreground text-sm">No tracking information available yet.</p>
                                ) : (
                                    <div className="space-y-6 pl-4 border-l-2 border-muted relative pt-2 pb-2">
                                        {order.statusLogs.map((log, idx) => (
                                            <div key={idx} className="relative">
                                                <div className="absolute -left-[25px] top-0.5 h-3 w-3 rounded-full bg-primary ring-4 ring-card"></div>
                                                <p className="font-medium capitalize text-sm">{log.to_status.replace('_', ' ')}</p>
                                                <p className="text-xs text-muted-foreground mt-1">{new Date(log.created_at).toLocaleString('en-IN')}</p>
                                                {log.note && <p className="text-sm mt-2 text-muted-foreground bg-muted/50 p-2 rounded">{log.note}</p>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        {/* Summary */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Order Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span>{fmt(order.total_amount + order.coupon_discount - order.shipping_charge)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Shipping</span>
                                    <span>{order.shipping_charge > 0 ? fmt(order.shipping_charge) : 'Free'}</span>
                                </div>
                                {order.coupon_discount > 0 && (
                                    <div className="flex justify-between text-sm text-emerald-600">
                                        <span>Discount</span>
                                        <span>-{fmt(order.coupon_discount)}</span>
                                    </div>
                                )}
                                <Separator className="my-2" />
                                <div className="flex justify-between font-bold text-lg">
                                    <span>Total</span>
                                    <span>{fmt(order.total_amount)}</span>
                                </div>
                                <div className="pt-3">
                                    <div className="bg-muted p-3 rounded-md flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Payment Status</span>
                                        <span className={`font-semibold capitalize ${order.payment_status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                            {order.payment_status}
                                        </span>
                                    </div>
                                    <div className="text-xs text-center mt-2 text-muted-foreground">Method: <span className="uppercase">{order.payment_method ?? 'N/A'}</span></div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Delivery Address */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <MapPin className="h-5 w-5 text-muted-foreground" /> Delivery Address
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {addr ? (
                                    <div className="text-sm space-y-1">
                                        <p className="font-semibold text-base">{addr.name}</p>
                                        <p className="text-muted-foreground flex items-center gap-1 mt-1"><Phone className="h-3 w-3" /> {addr.phone}</p>
                                        <div className="mt-3 text-muted-foreground leading-relaxed">
                                            <p>{addr.line1}</p>
                                            {addr.line2 && <p>{addr.line2}</p>}
                                            <p>{addr.city}, {addr.state} {addr.pincode}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-4">No address details available</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
