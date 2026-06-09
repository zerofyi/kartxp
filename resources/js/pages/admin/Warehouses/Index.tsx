import { Head, router } from '@inertiajs/react';
import {
    Warehouse as WarehouseIcon,
    Plus,
    Search,
    CheckCircle,
    XCircle,
    Eye,
    Edit2,
    ToggleLeft,
    ToggleRight,
    MapPin,
    User,
    X,
} from 'lucide-react';
import { useState } from 'react';

import AppLayout from '@/layouts/admin-app-layout';
import type { BreadcrumbItem } from '@/types';
import admin from '@/routes/admin';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type WarehouseRow = {
    id: number;
    name: string;
    address: string | null;
    location: string | null;
    is_active: boolean;
    orders_count: number;
    warehouse_users_count: number;
    user: {
        id: number;
        name: string;
        email: string;
        mobile: string;
        status: string;
    } | null;
};

type Props = {
    warehouses: WarehouseRow[];
    stats: { total: number; active: number; inactive: number };
    filters: { search?: string; status?: string };
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: admin.dashboard().url },
    { title: 'Warehouses', href: '' },
];

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export default function WarehousesIndex({ warehouses, stats, filters }: Props) {
    const [search, setSearch]       = useState(filters.search ?? '');
    const [status, setStatus]       = useState(filters.status ?? 'all');

    const applyFilters = (overrides: Record<string, string> = {}) => {
        const params: Record<string, string> = {
            ...(search && { search }),
            ...(status !== 'all' && { status }),
            ...overrides,
        };
        router.visit('/admin/warehouses', { data: params, preserveState: true, replace: true });
    };

    const clearFilters = () => {
        setSearch('');
        setStatus('all');
        router.visit('/admin/warehouses', { replace: true });
    };

    const handleToggle = (warehouse: WarehouseRow) => {
        router.patch(`/admin/warehouses/${warehouse.id}/toggle`);
    };

    const hasFilters = search || status !== 'all';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Warehouses" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                {/* Header */}
                <Card>
                    <CardHeader>
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-2xl font-bold">Warehouses</CardTitle>
                                <CardDescription>
                                    Manage warehouse locations and their managers · {stats.total} total
                                </CardDescription>
                            </div>
                            <Button onClick={() => router.visit('/admin/warehouses/create')}>
                                <Plus className="mr-2 size-4" />
                                Add Warehouse
                            </Button>
                        </div>
                    </CardHeader>
                </Card>

                {/* Stats */}
                <div className="grid gap-4 sm:grid-cols-3">
                    <Card className="border-l-4 border-l-blue-500">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total</p>
                                    <p className="text-3xl font-bold">{stats.total}</p>
                                </div>
                                <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/30">
                                    <WarehouseIcon className="size-6 text-blue-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-green-500">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Active</p>
                                    <p className="text-3xl font-bold">{stats.active}</p>
                                </div>
                                <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/30">
                                    <CheckCircle className="size-6 text-green-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-red-500">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Inactive</p>
                                    <p className="text-3xl font-bold">{stats.inactive}</p>
                                </div>
                                <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/30">
                                    <XCircle className="size-6 text-red-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex flex-wrap gap-3">
                            <div className="relative min-w-56 flex-1">
                                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name, location or manager…"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                                    className="pl-9"
                                />
                            </div>
                            <Select
                                value={status}
                                onValueChange={(v) => { setStatus(v); applyFilters({ status: v }); }}
                            >
                                <SelectTrigger className="w-36">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="1">Active</SelectItem>
                                    <SelectItem value="0">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button onClick={() => applyFilters()}>Search</Button>
                            {hasFilters && (
                                <Button variant="ghost" onClick={clearFilters}>
                                    <X className="mr-1 size-4" />Clear
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Table */}
                <Card className="flex-1 overflow-hidden">
                    <div className="overflow-auto">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead>Warehouse</TableHead>
                                    <TableHead>Location</TableHead>
                                    <TableHead>Manager</TableHead>
                                    <TableHead className="text-center">Staff</TableHead>
                                    <TableHead className="text-center">Orders</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {warehouses.length > 0 ? (
                                    warehouses.map((w) => (
                                        <TableRow key={w.id} className="hover:bg-accent/40 transition-colors">
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                                                        <WarehouseIcon className="size-4" />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium">{w.name}</div>
                                                        {w.address && (
                                                            <div className="max-w-[200px] truncate text-xs text-muted-foreground">
                                                                {w.address}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {w.location ? (
                                                    <div className="flex items-center gap-1 text-sm">
                                                        <MapPin className="size-3 text-muted-foreground" />
                                                        {w.location}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {w.user ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex size-7 items-center justify-center rounded-full bg-muted font-semibold text-xs">
                                                            {w.user.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-medium">{w.user.name}</div>
                                                            <div className="text-xs text-muted-foreground">{w.user.mobile}</div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="secondary">{w.warehouse_users_count}</Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline">{w.orders_count}</Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {w.is_active ? (
                                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">
                                                        Active
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400">
                                                        Inactive
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        size="sm" variant="ghost"
                                                        onClick={() => router.visit(`/admin/warehouses/${w.id}`)}
                                                    >
                                                        <Eye className="size-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm" variant="ghost"
                                                        onClick={() => router.visit(`/admin/warehouses/${w.id}/edit`)}
                                                    >
                                                        <Edit2 className="size-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm" variant="ghost"
                                                        className={w.is_active ? 'text-red-600 hover:bg-red-50 hover:text-red-700' : 'text-green-600 hover:bg-green-50 hover:text-green-700'}
                                                        onClick={() => handleToggle(w)}
                                                    >
                                                        {w.is_active
                                                            ? <ToggleRight className="size-4" />
                                                            : <ToggleLeft className="size-4" />}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center gap-2">
                                                <WarehouseIcon className="size-8 opacity-30" />
                                                <p>{hasFilters ? 'No warehouses match your search' : 'No warehouses yet'}</p>
                                                {!hasFilters && (
                                                    <Button size="sm" onClick={() => router.visit('/admin/warehouses/create')}>
                                                        <Plus className="mr-1 size-4" />Add First Warehouse
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            </div>
        </AppLayout>
    );
}
