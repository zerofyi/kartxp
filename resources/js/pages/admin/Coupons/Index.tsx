import { Head, router, useForm } from '@inertiajs/react';
import {
    Search,
    Tag,
    Plus,
    Edit2,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Filter,
    Percent,
    IndianRupee,
    Truck,
} from 'lucide-react';
import { useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AdminAppLayout from '@/layouts/admin-app-layout';
import type { BreadcrumbItem } from '@/types';
import admin from '@/routes/admin';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: admin.dashboard().url },
    { title: 'Coupons', href: '/admin/coupons' },
];

type Coupon = {
    id: number;
    code: string;
    name: string;
    type: 'percent' | 'flat' | 'free_shipping';
    value: number;
    min_order_amount: number;
    max_discount: number | null;
    usage_limit: number | null;
    used_count: number;
    is_active: boolean;
    starts_at: string | null;
    ends_at: string | null;
    usages_count: number;
};

type Props = {
    coupons: { data: Coupon[]; current_page: number; last_page: number; total: number };
    filters: Record<string, string>;
};

function formatCurrency(amount: number) {
    return '₹' + (amount ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function formatDate(dateStr: string | null) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getTypeBadge(type: string) {
    const map: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
        percent: { label: '% Off', icon: <Percent className="h-3 w-3 mr-1" />, className: 'bg-blue-100 text-blue-700 border-blue-200' },
        flat: { label: 'Flat Off', icon: <IndianRupee className="h-3 w-3 mr-1" />, className: 'bg-green-100 text-green-700 border-green-200' },
        free_shipping: { label: 'Free Shipping', icon: <Truck className="h-3 w-3 mr-1" />, className: 'bg-purple-100 text-purple-700 border-purple-200' },
    };
    const t = map[type] ?? { label: type, icon: null, className: 'bg-gray-100 text-gray-700' };
    return (
        <Badge variant="outline" className={`flex items-center ${t.className}`}>
            {t.icon}{t.label}
        </Badge>
    );
}

const defaultForm = {
    code: '',
    name: '',
    type: 'percent' as 'percent' | 'flat' | 'free_shipping',
    value: '',
    min_order_amount: '',
    max_discount: '',
    usage_limit: '',
    is_active: true,
    starts_at: '',
    ends_at: '',
};

export default function CouponsIndex({ coupons, filters = {} }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [typeFilter, setTypeFilter] = useState(filters.type ?? 'all');
    const [activeFilter, setActiveFilter] = useState(filters.is_active ?? 'all');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

    const { data, setData, post, put, processing, errors, reset } = useForm(defaultForm);

    const openCreateModal = () => {
        setEditingCoupon(null);
        reset();
        setModalOpen(true);
    };

    const openEditModal = (coupon: Coupon) => {
        setEditingCoupon(coupon);
        setData({
            code: coupon.code,
            name: coupon.name,
            type: coupon.type,
            value: String(coupon.value),
            min_order_amount: String(coupon.min_order_amount ?? ''),
            max_discount: coupon.max_discount != null ? String(coupon.max_discount) : '',
            usage_limit: coupon.usage_limit != null ? String(coupon.usage_limit) : '',
            is_active: coupon.is_active,
            starts_at: coupon.starts_at?.slice(0, 10) ?? '',
            ends_at: coupon.ends_at?.slice(0, 10) ?? '',
        });
        setModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingCoupon) {
            put(`/admin/coupons/${editingCoupon.id}`, {
                onSuccess: () => { setModalOpen(false); reset(); },
            });
        } else {
            post('/admin/coupons', {
                onSuccess: () => { setModalOpen(false); reset(); },
            });
        }
    };

    const handleDelete = (id: number) => {
        router.delete(`/admin/coupons/${id}`, {
            onSuccess: () => setDeleteConfirmId(null),
        });
    };

    const toggleActive = (coupon: Coupon) => {
        router.patch(`/admin/coupons/${coupon.id}/toggle`, {}, { preserveState: false });
    };

    const applyFilters = (overrides: Record<string, string> = {}) => {
        const params: Record<string, string> = {};
        const s = overrides.search ?? search;
        const t = overrides.type ?? typeFilter;
        const a = overrides.is_active ?? activeFilter;
        if (s) params.search = s;
        if (t && t !== 'all') params.type = t;
        if (a && a !== 'all') params.is_active = a;
        router.visit('/admin/coupons', { data: params, preserveState: true });
    };

    const activeCount = coupons?.data?.filter((c) => c.is_active).length ?? 0;
    const totalUsage = coupons?.data?.reduce((sum, c) => sum + (c.usages_count ?? 0), 0) ?? 0;

    return (
        <AdminAppLayout breadcrumbs={breadcrumbs}>
            <Head title="Coupons" />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Coupons</h1>
                        <p className="mt-1 text-sm text-muted-foreground">Manage discount coupons and offers</p>
                    </div>
                    <Button className="gap-2" onClick={openCreateModal}>
                        <Plus className="h-4 w-4" />
                        Add Coupon
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                    <Card className="border-indigo-100 bg-indigo-50">
                        <CardContent className="flex items-center gap-3 p-4">
                            <Tag className="h-6 w-6 text-indigo-600" />
                            <div>
                                <p className="text-xs text-indigo-600">Total Coupons</p>
                                <p className="text-xl font-bold text-indigo-900">{coupons?.total ?? 0}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-green-100 bg-green-50">
                        <CardContent className="flex items-center gap-3 p-4">
                            <Tag className="h-6 w-6 text-green-600" />
                            <div>
                                <p className="text-xs text-green-600">Active (this page)</p>
                                <p className="text-xl font-bold text-green-900">{activeCount}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-purple-100 bg-purple-50">
                        <CardContent className="flex items-center gap-3 p-4">
                            <Tag className="h-6 w-6 text-purple-600" />
                            <div>
                                <p className="text-xs text-purple-600">Total Uses (this page)</p>
                                <p className="text-xl font-bold text-purple-900">{totalUsage}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card>
                    <CardContent className="p-4">
                        <form
                            onSubmit={(e) => { e.preventDefault(); applyFilters(); }}
                            className="flex flex-col gap-3 md:flex-row"
                        >
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search by code or name…"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); applyFilters({ type: v }); }}>
                                <SelectTrigger className="w-40">
                                    <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="percent">Percent</SelectItem>
                                    <SelectItem value="flat">Flat</SelectItem>
                                    <SelectItem value="free_shipping">Free Shipping</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={activeFilter} onValueChange={(v) => { setActiveFilter(v); applyFilters({ is_active: v }); }}>
                                <SelectTrigger className="w-36">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="1">Active</SelectItem>
                                    <SelectItem value="0">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button type="submit" className="gap-2">
                                <Filter className="h-4 w-4" /> Filter
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Table */}
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Code / Name</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Value</TableHead>
                                    <TableHead>Min. Order</TableHead>
                                    <TableHead>Usage</TableHead>
                                    <TableHead>Validity</TableHead>
                                    <TableHead>Active</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {!coupons?.data?.length ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-32 text-center">
                                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                <Tag className="h-8 w-8" />
                                                <p>No coupons found</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    coupons.data.map((coupon) => (
                                        <TableRow key={coupon.id}>
                                            <TableCell>
                                                <div className="font-mono font-bold text-indigo-700 text-sm">{coupon.code}</div>
                                                <div className="text-xs text-muted-foreground">{coupon.name}</div>
                                            </TableCell>
                                            <TableCell>{getTypeBadge(coupon.type)}</TableCell>
                                            <TableCell className="font-semibold text-sm">
                                                {coupon.type === 'percent'
                                                    ? `${coupon.value}%`
                                                    : coupon.type === 'flat'
                                                    ? formatCurrency(coupon.value)
                                                    : '—'}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {coupon.min_order_amount > 0 ? formatCurrency(coupon.min_order_amount) : '—'}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                <span className="font-medium">{coupon.usages_count}</span>
                                                {coupon.usage_limit && (
                                                    <span className="text-muted-foreground"> / {coupon.usage_limit}</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                <div>{formatDate(coupon.starts_at)}</div>
                                                <div>→ {formatDate(coupon.ends_at)}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Switch
                                                    checked={coupon.is_active}
                                                    onCheckedChange={() => toggleActive(coupon)}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openEditModal(coupon)}
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-600 hover:text-red-700"
                                                        onClick={() => setDeleteConfirmId(coupon.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
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
                {coupons && coupons.last_page > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            Page {coupons.current_page} of {coupons.last_page}
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={coupons.current_page <= 1}
                                onClick={() => router.visit('/admin/coupons', { data: { ...filters, page: coupons.current_page - 1 }, preserveState: true })}
                            >
                                <ChevronLeft className="h-4 w-4" /> Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={coupons.current_page >= coupons.last_page}
                                onClick={() => router.visit('/admin/coupons', { data: { ...filters, page: coupons.current_page + 1 }, preserveState: true })}
                            >
                                Next <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingCoupon ? 'Edit Coupon' : 'Create Coupon'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Code *</Label>
                                <Input
                                    value={data.code}
                                    onChange={(e) => setData('code', e.target.value.toUpperCase())}
                                    placeholder="e.g. SAVE20"
                                    className={errors.code ? 'border-red-400' : ''}
                                />
                                {errors.code && <p className="text-xs text-red-600">{errors.code}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label>Name *</Label>
                                <Input
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="Coupon display name"
                                    className={errors.name ? 'border-red-400' : ''}
                                />
                                {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Type *</Label>
                                <Select value={data.type} onValueChange={(v: 'percent' | 'flat' | 'free_shipping') => setData('type', v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="percent">Percent Off</SelectItem>
                                        <SelectItem value="flat">Flat Amount Off</SelectItem>
                                        <SelectItem value="free_shipping">Free Shipping</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Value {data.type !== 'free_shipping' && '*'}</Label>
                                <Input
                                    type="number"
                                    value={data.value}
                                    onChange={(e) => setData('value', e.target.value)}
                                    placeholder={data.type === 'percent' ? 'e.g. 20' : 'e.g. 100'}
                                    disabled={data.type === 'free_shipping'}
                                    className={errors.value ? 'border-red-400' : ''}
                                />
                                {errors.value && <p className="text-xs text-red-600">{errors.value}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Min. Order Amount</Label>
                                <Input
                                    type="number"
                                    value={data.min_order_amount}
                                    onChange={(e) => setData('min_order_amount', e.target.value)}
                                    placeholder="e.g. 500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Max Discount (₹)</Label>
                                <Input
                                    type="number"
                                    value={data.max_discount}
                                    onChange={(e) => setData('max_discount', e.target.value)}
                                    placeholder="Optional cap"
                                    disabled={data.type !== 'percent'}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Usage Limit (leave blank = unlimited)</Label>
                            <Input
                                type="number"
                                value={data.usage_limit}
                                onChange={(e) => setData('usage_limit', e.target.value)}
                                placeholder="e.g. 100"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Starts At</Label>
                                <Input
                                    type="date"
                                    value={data.starts_at}
                                    onChange={(e) => setData('starts_at', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Ends At</Label>
                                <Input
                                    type="date"
                                    value={data.ends_at}
                                    onChange={(e) => setData('ends_at', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between rounded-lg border p-3">
                            <Label>Active</Label>
                            <Switch
                                checked={data.is_active}
                                onCheckedChange={(v) => setData('is_active', v)}
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button type="submit" className="flex-1" disabled={processing}>
                                {processing ? 'Saving…' : editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                                Cancel
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Delete Coupon?</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        This action cannot be undone. Any existing uses of this coupon will remain in order records.
                    </p>
                    <div className="flex gap-3 pt-2">
                        <Button
                            variant="destructive"
                            className="flex-1"
                            onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
                        >
                            Yes, Delete
                        </Button>
                        <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
                            Cancel
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </AdminAppLayout>
    );
}
