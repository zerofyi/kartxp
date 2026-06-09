import { Head, router } from '@inertiajs/react';
import { AlertTriangle, BarChart3, Package, ShoppingBag, TrendingDown, TrendingUp, Users } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Dashboard', href: '/manager' }];

type Props = {
    stats: {
        today_revenue: number;
        today_orders: number;
        week_revenue: number;
        last_week_revenue: number;
        low_stock_alerts: number;
        staff_count: number;
    };
    top_products: Array<{ name: string; qty_sold: number; revenue: number }>;
};

export default function ManagerDashboard({ stats, top_products }: Props) {
    const fmt = (n: number) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

    const weekChange = stats.last_week_revenue > 0
        ? ((stats.week_revenue - stats.last_week_revenue) / stats.last_week_revenue) * 100
        : 0;

    const weekTrend = weekChange >= 0 ? 'up' : 'down';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Manager Dashboard" />
            <div className="p-6 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Manager Dashboard</h1>
                    <p className="text-muted-foreground">Warehouse performance overview</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    <Card className="bg-gradient-to-br from-emerald-500 to-green-600 text-white border-0">
                        <CardContent className="pt-5">
                            <p className="text-green-100 text-xs">Today Revenue</p>
                            <p className="text-2xl font-bold mt-1">{fmt(stats.today_revenue)}</p>
                            <p className="text-green-200 text-xs mt-1">{stats.today_orders} orders</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0">
                        <CardContent className="pt-5">
                            <p className="text-blue-100 text-xs">This Week</p>
                            <p className="text-2xl font-bold mt-1">{fmt(stats.week_revenue)}</p>
                            <div className={`flex items-center gap-1 mt-1 text-xs ${weekTrend === 'up' ? 'text-emerald-300' : 'text-red-300'}`}>
                                {weekTrend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                <span>{Math.abs(weekChange).toFixed(1)}% vs last week</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className={stats.low_stock_alerts > 0 ? 'border-amber-200 dark:border-amber-800' : ''}>
                        <CardContent className="pt-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs text-muted-foreground">Low Stock Alerts</p>
                                    <p className={`text-2xl font-bold mt-1 ${stats.low_stock_alerts > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                        {stats.low_stock_alerts}
                                    </p>
                                </div>
                                {stats.low_stock_alerts > 0 && <AlertTriangle className="h-5 w-5 text-amber-500" />}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs text-muted-foreground">Active Staff</p>
                                    <p className="text-2xl font-bold mt-1">{stats.staff_count}</p>
                                </div>
                                <Users className="h-5 w-5 text-primary" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Links */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                        { label: 'Online Orders', icon: ShoppingBag, href: '/warehouse/online-orders', color: 'text-blue-500' },
                        { label: 'Inventory', icon: Package, href: '/warehouse/inventory', color: 'text-green-500' },
                        { label: 'Sales Report', icon: BarChart3, href: '/warehouse/accounting/pl-statement', color: 'text-purple-500' },
                    ].map((link) => (
                        <button key={link.href} onClick={() => router.visit(link.href)} className="text-left">
                            <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
                                <CardContent className="pt-5 pb-4">
                                    <link.icon className={`h-6 w-6 ${link.color} mb-2`} />
                                    <p className="text-sm font-medium">{link.label}</p>
                                </CardContent>
                            </Card>
                        </button>
                    ))}
                </div>

                {/* Top Products This Week */}
                <Card>
                    <CardHeader>
                        <CardTitle>Top Products This Week</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {top_products.length === 0 ? (
                            <p className="text-muted-foreground text-sm py-4 text-center">No sales data for this week</p>
                        ) : (
                            <div className="space-y-4">
                                {top_products.map((product, i) => (
                                    <div key={i} className="flex items-center gap-4">
                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-gray-400' : 'bg-amber-700'}`}>
                                            {i + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">{product.name}</p>
                                            <p className="text-xs text-muted-foreground">{product.qty_sold} units sold</p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="font-semibold text-emerald-600">{fmt(product.revenue)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
