import { Head, router, useForm } from '@inertiajs/react';
import React, { useState } from 'react';
import { Users, Search, Plus, Eye, CheckCircle2, XCircle, ShieldCheck, Star, CreditCard, ChevronLeft, ChevronRight, Loader2, X, Filter } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type CustomerRow = {
    id: number; name: string; phone: string; email: string | null; loyalty_points: number; total_spent: number; credit_limit: number; is_verified: boolean; orders_count: number;
};

type Props = {
    customers: { data: CustomerRow[]; current_page: number; last_page: number; total: number };
    stats: { total: number; verified: number; total_loyalty: number };
    filters: Record<string, string>;
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Customers', href: '/warehouse/customers' }];

export default function CustomersIndexPage({ customers, stats, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [verifiedFilter, setVerifiedFilter] = useState(filters.verified ?? 'all');
    const [addOpen, setAddOpen] = useState(false);

    const addForm = useForm({ name: '', phone: '', email: '', credit_limit: '0' });

    const applyFilters = (overrides: Record<string, string> = {}) => {
        const params = {
            ...(search && { search }),
            ...(verifiedFilter !== 'all' && { verified: verifiedFilter }),
            ...overrides,
        };
        router.visit('/warehouse/customers', { data: params, preserveState: true, replace: true });
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const clearFilters = () => {
        setSearch(''); setVerifiedFilter('all');
        router.visit('/warehouse/customers', { replace: true });
    };

    const submitCreationForm = (e: React.FormEvent) => {
        e.preventDefault();
        addForm.post('/warehouse/customers', {
            onSuccess: () => { setAddOpen(false); addForm.reset(); }
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Master Client Directory" />
            <div className="p-6 space-y-6">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Customer Management</h1>
                        <p className="text-muted-foreground">Manage client accounts, loyalty records, and credit ceiling parameters</p>
                    </div>
                    <Button onClick={() => setAddOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Add Customer Profile
                    </Button>
                </div>

                {/* Performance Analytics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-l-4 border-l-blue-600 bg-gradient-to-br from-card to-blue-50/20">
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Registered Accounts</p>
                                <Users className="h-4 w-4 text-blue-600" />
                            </div>
                            <p className="text-2xl font-black font-mono mt-1 text-blue-700">{stats.total}</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-emerald-600 bg-gradient-to-br from-card to-emerald-50/20">
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Verified Connections</p>
                                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                            </div>
                            <p className="text-2xl font-black font-mono mt-1 text-emerald-700 dark:text-emerald-400">{stats.verified}</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-amber-500 bg-gradient-to-br from-card to-amber-50/20">
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Cumulative Loyalty Pool</p>
                                <Star className="h-4 w-4 text-amber-500" />
                            </div>
                            <p className="text-2xl font-black font-mono mt-1 text-amber-600">
                                {Number(stats.total_loyalty).toLocaleString('en-IN')} Pts
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filtration Workspace Actions Bar */}
                <Card>
                    <CardContent className="p-4">
                        <form onSubmit={handleSearchSubmit} className="flex flex-wrap gap-3">
                            <div className="relative min-w-[280px] flex-1">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input placeholder="Lookup name, phone contact or email strings..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-xs font-mono" />
                            </div>
                            <Select value={verifiedFilter} onValueChange={v => { setVerifiedFilter(v); applyFilters({ verified: v }); }}>
                                <SelectTrigger className="w-44 h-9 text-xs">
                                    <Filter className="mr-2 h-3.5 w-3.5" /> <SelectValue placeholder="Verification Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Profiles</SelectItem>
                                    <SelectItem value="1">Verified Lines Only</SelectItem>
                                    <SelectItem value="0">Unverified Profiles</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button type="submit" size="sm" className="h-9 px-4 text-xs">Execute Query</Button>
                            {(search || verifiedFilter !== 'all') && (
                                <Button type="button" variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-xs text-rose-600"><X className="mr-1 h-4 w-4" /> Clear</Button>
                            )}
                        </form>
                    </CardContent>
                </Card>

                {/* Data Sheet Grid */}
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Customer Full Name</TableHead>
                                <TableHead>Contact Identifiers</TableHead>
                                <TableHead className="text-center">Loyalty Balance</TableHead>
                                <TableHead className="text-right">Total Purchase Weight</TableHead>
                                <TableHead className="text-right">Assigned Credit Limit</TableHead>
                                <TableHead className="text-center">Gross Invoices</TableHead>
                                <TableHead className="text-center">Verified</TableHead>
                                <TableHead className="w-24 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {customers.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                                        <Users className="h-8 w-8 mx-auto mb-2 opacity-30" /> No customer accounts match those filtration criteria.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                customers.data.map((customer) => (
                                    <TableRow key={customer.id} className="hover:bg-muted/30 transition-colors">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary">
                                                    {customer.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="font-semibold text-sm text-foreground">{customer.name}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-xs font-mono text-foreground font-medium">{customer.phone}</div>
                                            {customer.email && <div className="text-[11px] text-muted-foreground font-mono">{customer.email}</div>}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className="border-yellow-200 bg-yellow-50 text-yellow-700 font-mono text-xs">
                                                {Number(customer.loyalty_points).toLocaleString('en-IN')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-bold text-sm text-foreground">
                                            ₹{Number(customer.total_spent).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-xs font-medium">
                                            ₹{Number(customer.credit_limit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </TableCell>
                                        <TableCell className="text-center font-mono text-xs font-bold">{customer.orders_count} manifest(s)</TableCell>
                                        <TableCell>
                                            {customer.is_verified ? (
                                                <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-600" />
                                            ) : (
                                                <XCircle className="mx-auto h-4 w-4 text-muted-foreground/40" />
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => router.visit(`/warehouse/customers/${customer.id}`)}>
                                                <Eye className="h-4 w-4 text-muted-foreground" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination Interface */}
                    {customers.last_page > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
                            <p className="text-xs text-muted-foreground">Displaying page <span className="font-semibold">{customers.current_page}</span> of <span className="font-semibold">{customers.last_page}</span> totals</p>
                            <div className="flex gap-1.5">
                                <Button variant="outline" size="sm" className="h-8 text-xs" disabled={customers.current_page === 1} onClick={() => router.visit(`/warehouse/customers?page=${customers.current_page - 1}`)}>
                                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                                </Button>
                                <Button variant="outline" size="sm" className="h-8 text-xs" disabled={customers.current_page === customers.last_page} onClick={() => router.visit(`/warehouse/customers?page=${customers.current_page + 1}`)}>
                                    Forward <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}
                </Card>

                {/* Append Customer Dialog Modal Layout */}
                <Dialog open={addOpen} onOpenChange={setAddOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader><DialogTitle className="text-base font-bold">Provision Master Customer Record</DialogTitle></DialogHeader>
                        <form onSubmit={submitCreationForm} className="space-y-4 pt-2">
                            <div className="space-y-1">
                                <Label htmlFor="name" className="text-xs">Full Legal Account Name *</Label>
                                <Input id="name" value={addForm.data.name} onChange={e => addForm.setData('name', e.target.value)} required />
                                {addForm.errors.name && <p className="text-xs text-destructive">{addForm.errors.name}</p>}
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="phone" className="text-xs">Primary Contact Mobile *</Label>
                                <Input id="phone" className="font-mono text-xs" value={addForm.data.phone} onChange={e => addForm.setData('phone', e.target.value)} placeholder="+91" required />
                                {addForm.errors.phone && <p className="text-xs text-destructive">{addForm.errors.phone}</p>}
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="email" className="text-xs">Email Communication Endpoint</Label>
                                <Input id="email" type="email" value={addForm.data.email} onChange={e => addForm.setData('email', e.target.value)} placeholder="name@domain.com" />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="credit" className="text-xs">Assigned Credit Limit Threshold (₹)</Label>
                                <Input id="credit" type="number" min="0" value={addForm.data.credit_limit} onChange={e => addForm.setData('credit_limit', e.target.value)} />
                            </div>
                            <div className="flex gap-2 pt-2 border-t justify-end">
                                <Button type="button" variant="ghost" size="sm" onClick={() => setAddOpen(false)}>Cancel</Button>
                                <Button size="sm" type="submit" disabled={addForm.processing}>
                                    {addForm.processing ? 'Writing entry records...' : 'Provision Client Profile'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
