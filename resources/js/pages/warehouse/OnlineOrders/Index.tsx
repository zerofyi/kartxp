import { Head, router, useForm } from '@inertiajs/react';
import React, { useState } from 'react';
import { Search, Eye, RefreshCcw, ShoppingCart, TrendingUp, Clock, Truck, ChevronLeft, ChevronRight, CheckSquare, Calendar, Filter, X, Users } from 'lucide-react';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';

type OnlineOrder = {
    id: number;
    order_number: string;
    status: string;
    payment_status: string;
    payment_method: string | null;
    total_amount: number;
    coupon_discount: number;
    shipping_charge: number;
    created_at: string;
    customer: { id: number; name: string; phone: string } | null;
    items_count: number;
};

type Agent = { id: number; name: string; mobile: string };

type Props = {
    orders: { data: OnlineOrder[]; current_page: number; last_page: number; total: number };
    stats: { today_count: number; today_revenue: number; pending: number; dispatched: number };
    filters: Record<string, string>;
    statuses: string[];
    agents: Agent[];
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Online Orders', href: '/warehouse/online-orders' }];

const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-400',
    confirmed: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400',
    processing: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400',
    packed: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400',
    dispatched: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400',
    delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400',
    cancelled: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400',
};

const PAYMENT_COLORS: Record<string, string> = {
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400',
    pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400',
    failed: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400',
};

export default function OnlineOrdersIndex({ orders, stats, filters, statuses, agents }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [dateFrom, setDateFrom] = useState(filters.from ?? '');
    const [dateTo, setDateTo] = useState(filters.to ?? '');
    const [activeTab, setActiveTab] = useState(filters.status ?? 'all');
    const [showFilters, setShowFilters] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const [bulkModalOpen, setBulkModalOpen] = useState(false);
    const [bulkActionType, setBulkActionType] = useState<'status' | 'agent'>('status');
    const [bulkStatus, setBulkStatus] = useState('');
    const [bulkAgentId, setBulkAgentId] = useState('');

    const applyFilters = (overrides: Record<string, string> = {}) => {
        const params = {
            ...(search && { search }),
            ...(dateFrom && { from: dateFrom }),
            ...(dateTo && { to: dateTo }),
            ...(activeTab && activeTab !== 'all' && { status: activeTab }),
            ...overrides,
        };
        router.visit('/warehouse/online-orders', { data: params, preserveState: true, replace: true });
    };

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        setSelectedIds([]);
        applyFilters({ status: tab });
    };

    const clearFilters = () => {
        setSearch(''); setDateFrom(''); setDateTo(''); setActiveTab('all');
        router.visit('/warehouse/online-orders', { replace: true });
    };

    const toggleSelect = (id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const toggleAll = () => {
        setSelectedIds(selectedIds.length === orders.data.length ? [] : orders.data.map(o => o.id));
    };

    const submitBulkAction = () => {
        if (selectedIds.length === 0) return;

        if (bulkActionType === 'status' && bulkStatus) {
            router.post('/warehouse/online-orders/bulk-status', { order_ids: selectedIds, status: bulkStatus }, {
                onSuccess: () => { setBulkModalOpen(false); setSelectedIds([]); setBulkStatus(''); }
            });
        } else if (bulkActionType === 'agent' && bulkAgentId) {
            router.post('/warehouse/online-orders/bulk-assign', { order_ids: selectedIds, agent_id: bulkAgentId }, {
                onSuccess: () => { setBulkModalOpen(false); setSelectedIds([]); setBulkAgentId(''); }
            });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Online Processing Pipeline" />
            <div className="p-6 space-y-6">

                {/* Heading Segment */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Online Order Pipeline</h1>
                        <p className="text-muted-foreground">Monitor, dispatch, and transition customer fulfillment lifecycle workflows</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="text-xs h-9">
                            <Filter className="mr-1.5 h-3.5 w-3.5" /> Context Filters
                        </Button>
                        {selectedIds.length > 0 && (
                            <div className="flex items-center gap-1.5">
                                <Button size="sm" variant="outline" onClick={() => { setBulkActionType('status'); setBulkModalOpen(true); }} className="text-xs h-9 border-indigo-200">
                                    <CheckSquare className="mr-1.5 h-3.5 w-3.5 text-indigo-600" /> Status Batch
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => { setBulkActionType('agent'); setBulkModalOpen(true); }} className="text-xs h-9 border-orange-200">
                                    <Users className="mr-1.5 h-3.5 w-3.5 text-orange-600" /> Route Fleet ({selectedIds.length})
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Operations Core Statistics Gauges */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border-l-4 border-l-blue-600 bg-gradient-to-br from-card to-blue-50/20">
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Today's Load</p>
                                <ShoppingCart className="h-4 w-4 text-blue-600" />
                            </div>
                            <p className="text-2xl font-black font-mono mt-1">{stats.today_count} orders</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-emerald-600 bg-gradient-to-br from-card to-emerald-50/20">
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pipeline Revenue</p>
                                <TrendingUp className="h-4 w-4 text-emerald-600" />
                            </div>
                            <p className="text-2xl font-black font-mono mt-1 text-emerald-700 dark:text-emerald-400">
                                ₹{Number(stats.today_revenue).toLocaleString('en-IN')}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-amber-500 bg-gradient-to-br from-card to-amber-50/20">
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Awaiting Confirmation</p>
                                <Clock className="h-4 w-4 text-amber-500" />
                            </div>
                            <p className="text-2xl font-black font-mono mt-1 text-amber-600">{stats.pending}</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-orange-500 bg-gradient-to-br from-card to-orange-50/20">
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Road Dispatches</p>
                                <Truck className="h-4 w-4 text-orange-500" />
                            </div>
                            <p className="text-2xl font-black font-mono mt-1 text-orange-600">{stats.dispatched}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filter Management Workspace Panels */}
                <Card className={`transition-all overflow-hidden ${showFilters ? 'block' : 'hidden'}`}>
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end bg-muted/30">
                        <div className="space-y-1">
                            <Label className="text-xs font-bold">Context Lookup Query</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                <Input className="pl-9 h-9 text-xs font-mono" placeholder="Order ID or Mobile..." value={search} onChange={e => setSearch(e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-bold flex items-center gap-1"><Calendar className="h-3 w-3" /> Execution Bounds (From)</Label>
                            <Input type="date" className="h-9 text-xs" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-bold flex items-center gap-1"><Calendar className="h-3 w-3" /> Execution Bounds (To)</Label>
                            <Input type="date" className="h-9 text-xs" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                        </div>
                        <div className="sm:col-span-3 flex justify-end gap-2 pt-2 border-t">
                            <Button size="sm" variant="ghost" className="text-xs" onClick={clearFilters}><X className="h-3.5 w-3.5 mr-1" /> Reset</Button>
                            <Button size="sm" onClick={() => applyFilters()} className="text-xs">Apply Sorting Parameters</Button>
                        </div>
                    </div>
                </Card>

                {/* Workflow Routing Status Tabs */}
                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                    <TabsList className="flex h-auto flex-wrap gap-1 p-1 bg-muted/60 border rounded-xl">
                        {['all', ...statuses].map((s) => (
                            <TabsTrigger key={s} value={s} className="capitalize text-xs px-3 py-1.5 data-[state=active]:bg-background">
                                {s.replace('_', ' ')}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>

                {/* Central Data Pipeline Sheet Grid */}
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">
                                    <Checkbox checked={orders.data.length > 0 && selectedIds.length === orders.data.length} onCheckedChange={toggleAll} />
                                </TableHead>
                                <TableHead>Order reference</TableHead>
                                <TableHead>Consignee Customer Profile</TableHead>
                                <TableHead className="text-center">Cargo Weight</TableHead>
                                <TableHead className="text-right">Financial Invoice Value</TableHead>
                                <TableHead>Financial Clearings</TableHead>
                                <TableHead>Tracking state</TableHead>
                                <TableHead>Registered Booked At</TableHead>
                                <TableHead className="w-[100px] text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                                        <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                        No active transaction entries found matching context rules inside this pipeline window.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                orders.data.map((order) => (
                                    <TableRow key={order.id} className={`hover:bg-muted/30 transition-colors ${selectedIds.includes(order.id) ? 'bg-primary/5' : ''}`}>
                                        <TableCell>
                                            <Checkbox checked={selectedIds.includes(order.id)} onCheckedChange={() => toggleSelect(order.id)} />
                                        </TableCell>
                                        <TableCell className="font-mono font-bold text-xs text-primary">{order.order_number}</TableCell>
                                        <TableCell>
                                            <div className="font-semibold text-sm">{order.customer?.name ?? 'Guest Account Line'}</div>
                                            <div className="text-xs font-mono text-muted-foreground">{order.customer?.phone ?? '—'}</div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="secondary" className="font-mono text-xs">{order.items_count} SKU item(s)</Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-bold text-sm">
                                            ₹{Number(order.total_amount).toLocaleString('en-IN')}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`capitalize text-[10px] font-mono ${PAYMENT_COLORS[order.payment_status] ?? 'bg-slate-100'}`}>
                                                {order.payment_status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`capitalize text-[10px] font-mono ${STATUS_COLORS[order.status] ?? 'bg-slate-100'}`}>
                                                {order.status.replace('_', ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground font-medium">
                                            {new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => router.visit(`/warehouse/online-orders/${order.id}`)}>
                                                    <Eye className="h-3.5 w-3.5 mr-1" /> Split Logs
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination Context Navigation Footer */}
                    {orders.last_page > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
                            <p className="text-xs text-muted-foreground">
                                Displaying page <span className="font-semibold">{orders.current_page}</span> of <span className="font-semibold">{orders.last_page}</span> totals
                            </p>
                            <div className="flex gap-1.5">
                                <Button variant="outline" size="sm" className="h-8 text-xs" disabled={orders.current_page === 1} onClick={() => router.visit(`/warehouse/online-orders?page=${orders.current_page - 1}`)}>
                                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                                </Button>
                                <Button variant="outline" size="sm" className="h-8 text-xs" disabled={orders.current_page === orders.last_page} onClick={() => router.visit(`/warehouse/online-orders?page=${orders.current_page + 1}`)}>
                                    Forward <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}
                </Card>

                {/* Consolidated Pipeline Processing Dialog Modal */}
                <Dialog open={bulkModalOpen} onOpenChange={setBulkModalOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-base font-bold">
                                {bulkActionType === 'status' ? 'Commit Batch Status Transformation' : 'Route Orders to Logistics Fleet'}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-2">
                            {bulkActionType === 'status' ? (
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">Target Workflow Registry Status</Label>
                                    <Select value={bulkStatus} onValueChange={setBulkStatus}>
                                        <SelectTrigger><SelectValue placeholder="Select target status..." /></SelectTrigger>
                                        <SelectContent>
                                            {statuses.filter(s => s !== 'pending').map(s => (
                                                <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ) : (
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">Assign Fleet Dispatch Vehicle Operator</Label>
                                    <Select value={bulkAgentId} onValueChange={setBulkAgentId}>
                                        <SelectTrigger><SelectValue placeholder="Select dispatch driver..." /></SelectTrigger>
                                        <SelectContent>
                                            {agents.map(agent => (
                                                <SelectItem key={agent.id} value={agent.id.toString()}>{agent.name} ({agent.mobile})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="flex gap-2 pt-2 border-t justify-end">
                                <Button type="button" variant="ghost" size="sm" onClick={() => setBulkModalOpen(false)}>Cancel</Button>
                                <Button size="sm" onClick={submitBulkAction} disabled={(bulkActionType === 'status' ? !bulkStatus : !bulkAgentId)}>
                                    Execute Batch Operations Update
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
