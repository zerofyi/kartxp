import { Head, router } from '@inertiajs/react';
import { Activity, Bell, BarChart2, Database, Package, RefreshCcw, Settings, Shield, ShoppingBag, Tag, Users, Warehouse } from 'lucide-react';
import AdminAppLayout from '@/layouts/admin-app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Reports', href: '/admin/reports' }];

type Props = Record<string, never>;

const reportCards = [
    {
        title: 'Sales Report',
        description: 'Orders, revenue & discount breakdown by time period',
        icon: BarChart2,
        href: '/admin/reports/sales',
        color: 'text-blue-500',
        bg: 'bg-blue-50 dark:bg-blue-950',
    },
    {
        title: 'Revenue Report',
        description: 'Daily, weekly, monthly revenue trends and analytics',
        icon: BarChart2,
        href: '/admin/reports/revenue',
        color: 'text-emerald-500',
        bg: 'bg-emerald-50 dark:bg-emerald-950',
    },
    {
        title: 'Inventory Report',
        description: 'Low stock alerts, top movers, stock valuation',
        icon: Package,
        href: '/admin/reports/inventory',
        color: 'text-amber-500',
        bg: 'bg-amber-50 dark:bg-amber-950',
    },
    {
        title: 'Customer Report',
        description: 'Customer acquisition, retention & lifetime value',
        icon: Users,
        href: '/admin/reports/customers',
        color: 'text-purple-500',
        bg: 'bg-purple-50 dark:bg-purple-950',
    },
];

export default function ReportsIndex(_props: Props) {
    return (
        <AdminAppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reports — Admin" />
            <div className="p-6 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Analytics & Reports</h1>
                    <p className="text-muted-foreground mt-1">Comprehensive business intelligence for GhorerBazar</p>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2">
                    {reportCards.map((card) => (
                        <button
                            key={card.href}
                            onClick={() => router.visit(card.href)}
                            className="text-left"
                        >
                            <Card className="hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer border-2 hover:border-primary/30">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start gap-4">
                                        <div className={`p-3 rounded-xl ${card.bg}`}>
                                            <card.icon className={`h-6 w-6 ${card.color}`} />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg">{card.title}</CardTitle>
                                            <CardDescription className="mt-1">{card.description}</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <Button variant="ghost" size="sm" className="text-primary">
                                        View Report →
                                    </Button>
                                </CardContent>
                            </Card>
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white border-0">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <Database className="h-8 w-8 opacity-80" />
                                <div>
                                    <p className="text-blue-100 text-sm">Export Options</p>
                                    <p className="font-semibold">CSV / Excel</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white border-0">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <RefreshCcw className="h-8 w-8 opacity-80" />
                                <div>
                                    <p className="text-emerald-100 text-sm">Data Freshness</p>
                                    <p className="font-semibold">Real-time</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-purple-600 to-purple-700 text-white border-0">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <Activity className="h-8 w-8 opacity-80" />
                                <div>
                                    <p className="text-purple-100 text-sm">Time Range</p>
                                    <p className="font-semibold">Custom Dates</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AdminAppLayout>
    );
}
