import { Head, router } from '@inertiajs/react';
import {
    Search,
    Users,
    UserCheck,
    UserX,
    Shield,
    ChevronLeft,
    ChevronRight,
    Eye,
    Download,
    Filter,
} from 'lucide-react';
import { useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AdminAppLayout from '@/layouts/admin-app-layout';
import type { BreadcrumbItem } from '@/types';
import admin from '@/routes/admin';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: admin.dashboard().url },
    { title: 'Users', href: '/admin/users' },
];

type User = {
    id: number;
    name: string;
    mobile: string;
    email: string;
    role: string;
    status: string;
    last_login_at: string | null;
    avatar: string | null;
};

type Props = {
    users: {
        data: User[];
        current_page: number;
        last_page: number;
        total: number;
    };
    filters: Record<string, string>;
};

const ROLE_OPTIONS = [
    { value: 'all', label: 'All Roles' },
    { value: 'admin', label: 'Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'staff', label: 'Staff' },
    { value: 'warehouse', label: 'Warehouse' },
    { value: 'delivery_agent', label: 'Delivery Agent' },
    { value: 'customer', label: 'Customer' },
];

const STATUS_OPTIONS = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
];

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
            {role.replace('_', ' ')}
        </Badge>
    );
}

function getStatusBadge(status: string) {
    if (status === 'active') {
        return (
            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                <UserCheck className="mr-1 h-3 w-3" /> Active
            </Badge>
        );
    }
    return (
        <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-200">
            <UserX className="mr-1 h-3 w-3" /> Inactive
        </Badge>
    );
}

function formatDate(dateStr: string | null) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

function getInitials(name: string) {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

export default function UsersIndex({ users, filters = {} }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [role, setRole] = useState(filters.role ?? 'all');
    const [status, setStatus] = useState(filters.status ?? 'all');

    const applyFilters = (overrides: Record<string, string> = {}) => {
        const params: Record<string, string> = {};
        const s = overrides.search ?? search;
        const r = overrides.role ?? role;
        const st = overrides.status ?? status;
        if (s) params.search = s;
        if (r && r !== 'all') params.role = r;
        if (st && st !== 'all') params.status = st;
        router.visit('/admin/users', { data: params, preserveState: true });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const handleRoleChange = (val: string) => {
        setRole(val);
        applyFilters({ role: val });
    };

    const handleStatusChange = (val: string) => {
        setStatus(val);
        applyFilters({ status: val });
    };

    const toggleUserStatus = (userId: number, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        router.patch(`/admin/users/${userId}/status`, { status: newStatus }, { preserveState: false });
    };

    const handleDelete = (userId: number) => {
        if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            router.delete(`/admin/users/${userId}`);
        }
    };

    const activeCount = users?.data?.filter((u) => u.status === 'active').length ?? 0;
    const staffCount = users?.data?.filter((u) => ['admin', 'manager', 'staff'].includes(u.role)).length ?? 0;

    return (
        <AdminAppLayout breadcrumbs={breadcrumbs}>
            <Head title="Users" />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Manage all user accounts and permissions
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => window.open('/admin/users/export/csv', '_blank')}
                    >
                        <Download className="h-4 w-4" />
                        Export CSV
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                    <Card className="border border-blue-100 bg-blue-50">
                        <CardContent className="flex items-center gap-3 p-4">
                            <div className="rounded-lg bg-blue-100 p-2">
                                <Users className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs text-blue-600">Total Users</p>
                                <p className="text-xl font-bold text-blue-900">{users?.total ?? 0}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border border-green-100 bg-green-50">
                        <CardContent className="flex items-center gap-3 p-4">
                            <div className="rounded-lg bg-green-100 p-2">
                                <UserCheck className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-xs text-green-600">Active (this page)</p>
                                <p className="text-xl font-bold text-green-900">{activeCount}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border border-purple-100 bg-purple-50">
                        <CardContent className="flex items-center gap-3 p-4">
                            <div className="rounded-lg bg-purple-100 p-2">
                                <Shield className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-xs text-purple-600">Staff (this page)</p>
                                <p className="text-xl font-bold text-purple-900">{staffCount}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card>
                    <CardContent className="p-4">
                        <form onSubmit={handleSearch} className="flex flex-col gap-3 md:flex-row md:items-end">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name, email, or mobile…"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                            <div className="flex gap-3">
                                <Select value={role} onValueChange={handleRoleChange}>
                                    <SelectTrigger className="w-40">
                                        <SelectValue placeholder="Role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ROLE_OPTIONS.map((o) => (
                                            <SelectItem key={o.value} value={o.value}>
                                                {o.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={status} onValueChange={handleStatusChange}>
                                    <SelectTrigger className="w-36">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STATUS_OPTIONS.map((o) => (
                                            <SelectItem key={o.value} value={o.value}>
                                                {o.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button type="submit" className="gap-2">
                                    <Filter className="h-4 w-4" />
                                    Filter
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Table */}
                <Card>
                    <CardHeader className="pb-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {users?.total ?? 0} users found
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Mobile</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Last Login</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {!users?.data?.length ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center">
                                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                <Users className="h-8 w-8" />
                                                <p>No users found</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    users.data.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    {user.avatar ? (
                                                        <img
                                                            src={user.avatar}
                                                            alt={user.name}
                                                            className="h-8 w-8 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                                                            {getInitials(user.name)}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="font-medium">{user.name}</div>
                                                        <div className="text-xs text-muted-foreground">{user.email}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">{user.mobile || '—'}</TableCell>
                                            <TableCell>{getRoleBadge(user.role)}</TableCell>
                                            <TableCell>{getStatusBadge(user.status)}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {formatDate(user.last_login_at)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 px-2"
                                                        onClick={() => router.visit('/admin/users/' + user.id)}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className={`h-8 px-2 text-xs ${user.status === 'active' ? 'text-amber-600 hover:text-amber-700' : 'text-green-600 hover:text-green-700'}`}
                                                        onClick={() => toggleUserStatus(user.id, user.status)}
                                                    >
                                                        {user.status === 'active' ? 'Disable' : 'Enable'}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 px-2 text-red-600 hover:text-red-700"
                                                        onClick={() => handleDelete(user.id)}
                                                    >
                                                        Delete
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Pagination */}
                {users && users.last_page > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            Page {users.current_page} of {users.last_page}
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={users.current_page <= 1}
                                onClick={() =>
                                    router.visit('/admin/users', {
                                        data: { ...filters, page: users.current_page - 1 },
                                        preserveState: true,
                                    })
                                }
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={users.current_page >= users.last_page}
                                onClick={() =>
                                    router.visit('/admin/users', {
                                        data: { ...filters, page: users.current_page + 1 },
                                        preserveState: true,
                                    })
                                }
                            >
                                Next
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </AdminAppLayout>
    );
}
