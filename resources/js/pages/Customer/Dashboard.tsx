import { Head, router } from '@inertiajs/react';
import { Award, Box, Clock, MapPin, Package, ShoppingBag, Star, User } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'My Dashboard', href: '/customer' }];

type Props = {
    stats: {
        total_orders: number;
        loyalty_points: number;
        total_spent: number;
    };
    recent_orders: Array<{
        id: number;
        order_number: string;
        status: string;
        total_amount: number;
        created_at: string;
        items_count: number;
    }>;
    customer: {
        name: string;
        phone: string;
        email: string | null;
        is_verified: boolean;
    } | null;
};

const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    processing: 'bg-indigo-100 text-indigo-700',
    shipped: 'bg-purple-100 text-purple-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
};

export default function CustomerDashboard({ stats, recent_orders, customer }: Props) {
    const fmt = (n: number) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="My Dashboard" />
            <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Welcome back, {customer?.name?.split(' ')[0] ?? 'Guest'}!</h1>
                        <p className="text-muted-foreground">Manage your orders and account settings.</p>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                    <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-0">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3 mb-2 opacity-80">
                                <ShoppingBag className="h-5 w-5" />
                                <span className="text-sm font-medium">Total Orders</span>
                            </div>
                            <p className="text-3xl font-bold">{stats.total_orders}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3 mb-2 opacity-80">
                                <Star className="h-5 w-5" />
                                <span className="text-sm font-medium">Loyalty Points</span>
                            </div>
                            <p className="text-3xl font-bold">{stats.loyalty_points}</p>
                        </CardContent>
                    </Card>
                    <Card className="col-span-2 md:col-span-1 border-0 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3 mb-2 text-muted-foreground">
                                <Award className="h-5 w-5" />
                                <span className="text-sm font-medium">Total Spent</span>
                            </div>
                            <p className="text-3xl font-bold text-emerald-600">{fmt(stats.total_spent)}</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Quick Links */}
                    <div className="space-y-4">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">Quick Links</CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-2 p-4 pt-0">
                                <Button variant="outline" className="justify-start" onClick={() => router.visit('/customer/orders')}>
                                    <Package className="mr-2 h-4 w-4" /> My Orders
                                </Button>
                                <Button variant="outline" className="justify-start" onClick={() => router.visit('/customer/profile')}>
                                    <User className="mr-2 h-4 w-4" /> Profile & Addresses
                                </Button>
                                <Button variant="outline" className="justify-start" onClick={() => router.visit('/')}>
                                    <Box className="mr-2 h-4 w-4" /> Continue Shopping
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Recent Orders */}
                    <Card className="md:col-span-2">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-lg">Recent Orders</CardTitle>
                            <Button variant="ghost" size="sm" onClick={() => router.visit('/customer/orders')}>
                                View All
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {recent_orders.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <ShoppingBag className="mx-auto h-12 w-12 opacity-20 mb-3" />
                                    <p>You haven't placed any orders yet.</p>
                                    <Button className="mt-4" onClick={() => router.visit('/')}>Shop Now</Button>
                                </div>
                            ) : (
                                <div className="space-y-4 mt-2">
                                    {recent_orders.map((order) => (
                                        <div key={order.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow">
                                            <div className="flex items-start gap-4 mb-3 sm:mb-0">
                                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                                                    <Package className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-sm">Order #{order.order_number}</p>
                                                    <div className="flex items-center text-xs text-muted-foreground mt-1 gap-2">
                                                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(order.created_at).toLocaleDateString()}</span>
                                                        <span>•</span>
                                                        <span>{order.items_count} items</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 ml-14 sm:ml-0">
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[order.status] ?? 'bg-gray-100 text-gray-700'}`}>
                                                    {order.status}
                                                </span>
                                                <p className="font-bold text-sm">{fmt(order.total_amount)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
