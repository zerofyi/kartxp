import { Head, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Mail,
    Phone,
    Shield,
    ShoppingCart,
    TrendingUp,
    Calendar,
    UserCheck,
    UserX,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import AdminAppLayout from '@/layouts/admin-app-layout';
import type { BreadcrumbItem } from '@/types';
import admin from '@/routes/admin';

type UserDetail = {
    id: number;
    name: string;
    mobile: string;
    email: string;
    role: string;
    status: string;
    last_login_at: string | null;
    avatar: string | null;
    created_at: string;
    orders_count: number;
    total_spent: number;
};

type Props = {
    user: UserDetail;
};

function formatCurrency(amount: number) {
    return '₹' + (amount ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function formatDate(dateStr: string | null) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'long', year: 'numeric',
    });
}

function getRoleBadge(role: string) {
    const map: Record<string, string> = {
        admin: 'bg-red-100 text-red-700 border-red-200',
        manager: 'bg-purple-100 text-purple-700 border-purple-200',
        staff: 'bg-blue-100 text-blue-700 border-blue-200',
        warehouse: 'bg-amber-100 text-amber-700 border-amber-200',
        delivery_agent: 'bg-cyan-100 text-cyan-700 border-cyan-200',
        customer: 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return (
        <Badge variant="outline" className={map[role] ?? 'bg-gray-100 text-gray-700'}>
            <Shield className="mr-1 h-3 w-3" />
            {role.replace('_', ' ')}
        </Badge>
    );
}

function getInitials(name: string) {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function UserShow({ user }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: admin.dashboard().url },
        { title: 'Users', href: '/admin/users' },
        { title: user.name, href: '' },
    ];

    const toggleStatus = () => {
        const newStatus = user.status === 'active' ? 'inactive' : 'active';
        router.patch(`/admin/users/${user.id}/status`, { status: newStatus });
    };

    const handleDelete = () => {
        if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            router.delete(`/admin/users/${user.id}`, {
                onSuccess: () => router.visit('/admin/users'),
            });
        }
    };

    return (
        <AdminAppLayout breadcrumbs={breadcrumbs}>
            <Head title={`User: ${user.name}`} />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2"
                        onClick={() => router.visit('/admin/users')}
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Users
                    </Button>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className={user.status === 'active' ? 'text-amber-600 border-amber-300' : 'text-green-600 border-green-300'}
                            onClick={toggleStatus}
                        >
                            {user.status === 'active' ? (
                                <><UserX className="mr-1 h-4 w-4" />Disable Account</>
                            ) : (
                                <><UserCheck className="mr-1 h-4 w-4" />Enable Account</>
                            )}
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDelete}
                        >
                            Delete User
                        </Button>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Profile Card */}
                    <div className="lg:col-span-1">
                        <Card>
                            <CardContent className="flex flex-col items-center p-6 text-center">
                                {user.avatar ? (
                                    <img
                                        src={user.avatar}
                                        alt={user.name}
                                        className="h-24 w-24 rounded-full object-cover ring-4 ring-indigo-100"
                                    />
                                ) : (
                                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-3xl font-bold text-white ring-4 ring-indigo-100">
                                        {getInitials(user.name)}
                                    </div>
                                )}

                                <h2 className="mt-4 text-xl font-bold">{user.name}</h2>
                                <div className="mt-2">{getRoleBadge(user.role)}</div>

                                <div className="mt-1">
                                    {user.status === 'active' ? (
                                        <Badge className="bg-green-100 text-green-700 border-green-200">
                                            <UserCheck className="mr-1 h-3 w-3" /> Active
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-gray-100 text-gray-500 border-gray-200">
                                            <UserX className="mr-1 h-3 w-3" /> Inactive
                                        </Badge>
                                    )}
                                </div>

                                <Separator className="my-4" />

                                <div className="w-full space-y-3 text-left">
                                    <div className="flex items-center gap-3 text-sm">
                                        <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <span className="truncate">{user.email || '—'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <span>{user.mobile || '—'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <span>Joined {formatDate(user.created_at)}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <span>Last login: {formatDate(user.last_login_at)}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Stats + Activity */}
                    <div className="space-y-6 lg:col-span-2">
                        {/* Activity Stats */}
                        <div className="grid grid-cols-2 gap-4">
                            <Card className="border border-emerald-100 bg-emerald-50">
                                <CardContent className="flex items-center gap-4 p-5">
                                    <div className="rounded-xl bg-emerald-100 p-3">
                                        <ShoppingCart className="h-6 w-6 text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-emerald-600">Total Orders</p>
                                        <p className="text-3xl font-bold text-emerald-900">
                                            {user.orders_count ?? 0}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border border-indigo-100 bg-indigo-50">
                                <CardContent className="flex items-center gap-4 p-5">
                                    <div className="rounded-xl bg-indigo-100 p-3">
                                        <TrendingUp className="h-6 w-6 text-indigo-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-indigo-600">Total Spent</p>
                                        <p className="text-2xl font-bold text-indigo-900">
                                            {formatCurrency(user.total_spent ?? 0)}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Account Details Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Account Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">User ID</p>
                                        <p className="mt-1 font-mono text-sm">#{user.id}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Role</p>
                                        <p className="mt-1 text-sm capitalize">{user.role?.replace('_', ' ')}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</p>
                                        <p className="mt-1 text-sm">{user.email || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mobile</p>
                                        <p className="mt-1 text-sm">{user.mobile || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Account Status</p>
                                        <p className="mt-1 text-sm capitalize">{user.status}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Member Since</p>
                                        <p className="mt-1 text-sm">{formatDate(user.created_at)}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Quick Actions */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Quick Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-wrap gap-3">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        router.visit('/admin/orders?search=' + encodeURIComponent(user.name))
                                    }
                                >
                                    <ShoppingCart className="mr-2 h-4 w-4" />
                                    View Orders
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AdminAppLayout>
    );
}
