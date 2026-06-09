import { Head, router } from '@inertiajs/react';
import { Eye, Package, ShoppingBag } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'My Dashboard', href: '/customer' },
    { title: 'My Orders', href: '/customer/orders' }
];

type Props = {
    orders: {
        data: Array<{
            id: number;
            order_number: string;
            status: string;
            total_amount: number;
            created_at: string;
            items_count: number;
        }>;
        current_page: number;
        last_page: number;
    };
};

const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
    processing: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    shipped: 'bg-purple-100 text-purple-700 border-purple-200',
    delivered: 'bg-green-100 text-green-700 border-green-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
};

export default function CustomerOrders({ orders }: Props) {
    const fmt = (n: number) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="My Orders" />
            <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <ShoppingBag className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">My Orders</h1>
                        <p className="text-muted-foreground">View and track all your purchases</p>
                    </div>
                </div>

                {orders.data.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="rounded-full bg-muted p-4 mb-4">
                                <Package className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h2 className="text-lg font-semibold">No orders yet</h2>
                            <p className="text-muted-foreground mb-4">When you buy something, it will appear here.</p>
                            <Button onClick={() => router.visit('/')}>Start Shopping</Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {orders.data.map((order) => (
                            <Card key={order.id} className="overflow-hidden hover:border-primary/50 transition-colors">
                                <div className="bg-muted/30 px-4 py-3 border-b flex flex-wrap items-center justify-between gap-4 text-sm">
                                    <div className="flex gap-6">
                                        <div>
                                            <p className="text-muted-foreground text-xs uppercase tracking-wider">Order Placed</p>
                                            <p className="font-medium">{new Date(order.created_at).toLocaleDateString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground text-xs uppercase tracking-wider">Total</p>
                                            <p className="font-medium">{fmt(order.total_amount)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-muted-foreground text-xs uppercase tracking-wider">Order #</p>
                                            <p className="font-medium font-mono">{order.order_number}</p>
                                        </div>
                                    </div>
                                </div>
                                <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded bg-primary/5 flex items-center justify-center border">
                                            <Package className="h-6 w-6 text-primary/60" />
                                        </div>
                                        <div>
                                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize border ${statusColors[order.status] ?? 'bg-gray-100 text-gray-700'}`}>
                                                {order.status}
                                            </span>
                                            <p className="text-sm text-muted-foreground mt-1">{order.items_count} item(s) in this order</p>
                                        </div>
                                    </div>
                                    <Button variant="secondary" onClick={() => router.visit(`/customer/orders/${order.id}`)} className="w-full sm:w-auto">
                                        <Eye className="h-4 w-4 mr-2" /> View Details
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}

                        {/* Pagination */}
                        {orders.last_page > 1 && (
                            <div className="flex items-center justify-between pt-4">
                                <p className="text-sm text-muted-foreground">Page {orders.current_page} of {orders.last_page}</p>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" disabled={orders.current_page === 1} onClick={() => router.visit(`/customer/orders?page=${orders.current_page - 1}`)}>Previous</Button>
                                    <Button variant="outline" size="sm" disabled={orders.current_page === orders.last_page} onClick={() => router.visit(`/customer/orders?page=${orders.current_page + 1}`)}>Next</Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
