import { Head, router, useForm } from '@inertiajs/react';
import React, { useState } from 'react';
import { RotateCcw, Eye, CheckCircle, XCircle, ChevronLeft, ChevronRight, AlertCircle, IndianRupee, ClipboardList, Loader2, ArrowLeftRight } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';

type ReturnRow = {
    id: number;
    order: { order_number: string };
    customer: { name: string; phone: string } | null;
    reason: string;
    status: string;
    refund_amount: number | null;
    created_at: string;
};

type Props = {
    returns: { data: ReturnRow[]; current_page: number; last_page: number; total: number };
    filters: { status?: string };
    stats: { requested: number; approved: number; completed: number; total_refunded: number };
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Return Requests', href: '/warehouse/returns' }];

const STATUS_STYLES: Record<string, string> = {
    requested: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-400',
    approved: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400',
    rejected: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400',
};

export default function ReturnsIndex({ returns, filters, stats }: Props) {
    const [activeTab, setActiveTab] = useState(filters.status ?? 'all');
    const [approveOpen, setApproveOpen] = useState(false);
    const [rejectOpen, setRejectOpen] = useState(false);
    const [selectedReturn, setSelectedReturn] = useState<ReturnRow | null>(null);

    const approveForm = useForm({ refund_amount: '', refund_method: 'bank', restock: true, note: '' });
    const rejectForm = useForm({ note: '' });

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        const params: Record<string, string> = {};
        if (tab !== 'all') params.status = tab;
        router.visit('/warehouse/returns', { data: params, preserveState: true, replace: true });
    };

    const openApprove = (ret: ReturnRow) => {
        setSelectedReturn(ret);
        approveForm.setData({ refund_amount: '', refund_method: 'bank', restock: true, note: '' });
        setApproveOpen(true);
    };

    const openReject = (ret: ReturnRow) => {
        setSelectedReturn(ret);
        rejectForm.reset();
        setRejectOpen(true);
    };

    const handleApproveSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedReturn) return;
        approveForm.post(`/warehouse/returns/${selectedReturn.id}/approve`, {
            onSuccess: () => { setApproveOpen(false); setSelectedReturn(null); }
        });
    };

    const handleRejectSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedReturn) return;
        rejectForm.post(`/warehouse/returns/${selectedReturn.id}/reject`, {
            onSuccess: () => { setRejectOpen(false); setSelectedReturn(null); }
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Returns Pipeline Hub" />
            <div className="p-6 space-y-6">

                {/* Heading Block Layout */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Return Claims Registers</h1>
                        <p className="text-muted-foreground">Verify claims, adjust inventory thresholds, and issue customer refunds</p>
                    </div>
                </div>

                {/* Operations Counters Matrix */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border-l-4 border-l-yellow-500 bg-gradient-to-br from-card to-yellow-50/20">
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Awaiting Verification</p>
                                <AlertCircle className="h-4 w-4 text-yellow-600" />
                            </div>
                            <p className="text-2xl font-black font-mono mt-1 text-yellow-700">{stats.requested}</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-card to-blue-50/20">
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Approved Returns</p>
                                <CheckCircle className="h-4 w-4 text-blue-600" />
                            </div>
                            <p className="text-2xl font-black font-mono mt-1 text-blue-700">{stats.approved}</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-emerald-600 bg-gradient-to-br from-card to-emerald-50/20">
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Closed Actions</p>
                                <ClipboardList className="h-4 w-4 text-emerald-600" />
                            </div>
                            <p className="text-2xl font-black font-mono mt-1 text-emerald-700 dark:text-emerald-400">{stats.completed}</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-purple-500 bg-gradient-to-br from-card to-purple-50/20">
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Value Reimbursed</p>
                                <IndianRupee className="h-4 w-4 text-purple-600" />
                            </div>
                            <p className="text-2xl font-black font-mono mt-1 text-purple-700 dark:text-purple-400">
                                ₹{Number(stats.total_refunded).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Pipeline Context Filtration Bar */}
                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                    <TabsList className="flex h-auto flex-wrap gap-1 p-1 bg-muted/60 border rounded-xl">
                        {['all', 'requested', 'approved', 'rejected', 'completed'].map((t) => (
                            <TabsTrigger key={t} value={t} className="capitalize text-xs px-3 py-1.5 data-[state=active]:bg-background">
                                {t}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>

                {/* Data Tables Register */}
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-24">Claim ID</TableHead>
                                <TableHead>Order Reference</TableHead>
                                <TableHead>Consignee Identity</TableHead>
                                <TableHead>Claim Statement Reason</TableHead>
                                <TableHead>Workflow State</TableHead>
                                <TableHead className="text-right">Reimbursement Value</TableHead>
                                <TableHead>Logged Date</TableHead>
                                <TableHead className="w-32 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {returns.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                                        <RotateCcw className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                        No historical return claim manifests logged inside this pipeline configuration.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                returns.data.map((ret) => (
                                    <TableRow key={ret.id} className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="font-mono font-bold text-xs">#{ret.id}</TableCell>
                                        <TableCell className="font-mono font-bold text-xs text-primary">{ret.order?.order_number}</TableCell>
                                        <TableCell>
                                            <div className="font-semibold text-sm">{ret.customer?.name ?? 'Guest Buyer'}</div>
                                            <div className="text-xs font-mono text-muted-foreground">{ret.customer?.phone ?? '—'}</div>
                                        </TableCell>
                                        <TableCell className="max-w-xs truncate text-xs font-medium" title={ret.reason}>{ret.reason}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`capitalize font-mono text-[10px] ${STATUS_STYLES[ret.status] ?? 'bg-slate-100'}`}>
                                                {ret.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-bold text-xs">
                                            {ret.refund_amount != null ? `₹${Number(ret.refund_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground font-medium">
                                            {new Date(ret.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => router.visit(`/warehouse/returns/${ret.id}`)}>
                                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                                </Button>
                                                {ret.status === 'requested' && (
                                                    <>
                                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600 hover:bg-emerald-50" onClick={() => openApprove(ret)}>
                                                            <CheckCircle className="h-4 w-4" />
                                                        </Button>
                                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-600 hover:bg-rose-50" onClick={() => openReject(ret)}>
                                                            <XCircle className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination Context Segment */}
                    {returns.last_page > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
                            <p className="text-xs text-muted-foreground">
                                Displaying page <span className="font-semibold">{returns.current_page}</span> of <span className="font-semibold">{returns.last_page}</span> totals
                            </p>
                            <div className="flex gap-1.5">
                                <Button variant="outline" size="sm" className="h-8 text-xs" disabled={returns.current_page === 1} onClick={() => router.visit(`/warehouse/returns?page=${returns.current_page - 1}`)}>
                                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                                </Button>
                                <Button variant="outline" size="sm" className="h-8 text-xs" disabled={returns.current_page === returns.last_page} onClick={() => router.visit(`/warehouse/returns?page=${returns.current_page + 1}`)}>
                                    Forward <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}
                </Card>

                {/* Approve Setup Dialog Modal */}
                <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-base font-bold">Authorize Claim Reimbursement — #{selectedReturn?.id}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleApproveSubmit} className="space-y-4 mt-2">
                            <div className="space-y-1">
                                <Label htmlFor="refund_amount" className="text-xs font-semibold">Approved Settlement Amount (₹)</Label>
                                <Input id="refund_amount" type="number" step="0.01" min="0" value={approveForm.data.refund_amount} onChange={e => approveForm.setData('refund_amount', e.target.value)} placeholder="0.00" required />
                                {approveForm.errors.refund_amount && <p className="text-xs text-destructive">{approveForm.errors.refund_amount}</p>}
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Settlement Channels Method</Label>
                                <Select value={approveForm.data.refund_method} onValueChange={v => approveForm.setData('refund_method', v)}>
                                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="bank">Direct Bank Remittance</SelectItem>
                                        <SelectItem value="cod">Liquid Cash Reimbursement (COD)</SelectItem>
                                        <SelectItem value="wallet">Virtual Wallet Credit</SelectItem>
                                        <SelectItem value="credit">Store Ledger Credit Note</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl border">
                                <Switch id="restock" checked={approveForm.data.restock} onCheckedChange={checked => approveForm.setData('restock', checked)} />
                                <div className="space-y-0.5">
                                    <Label htmlFor="restock" className="text-xs font-semibold">Automated Stock Adjustment</Label>
                                    <p className="text-[10px] text-muted-foreground">Instantly restock returned items back into active inventory counts.</p>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="note" className="text-xs font-semibold">Settlement Narrative Statement</Label>
                                <Textarea id="note" rows={2} className="text-xs" placeholder="Log details regarding claim checks..." value={approveForm.data.note} onChange={e => approveForm.setData('note', e.target.value)} />
                            </div>

                            <div className="flex gap-2 pt-2 border-t justify-end">
                                <Button type="button" variant="ghost" size="sm" onClick={() => setApproveOpen(false)}>Cancel</Button>
                                <Button size="sm" type="submit" disabled={approveForm.processing} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                    {approveForm.processing ? 'Processing Registry...' : 'Commit Clearance Refund'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Reject Setup Dialog Modal */}
                <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-base font-bold">Reject Return Claim Request — #{selectedReturn?.id}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleRejectSubmit} className="space-y-4 mt-2">
                            <div className="space-y-1">
                                <Label htmlFor="rejection_note" className="text-xs font-semibold">Audit Rejection Narrative Statement Reason</Label>
                                <Textarea id="rejection_note" rows={3} className="text-xs" placeholder="Provide distinct legal audit statements explaining claim rejections..." value={rejectForm.data.note} onChange={e => rejectForm.setData('note', e.target.value)} required />
                                {rejectForm.errors.note && <p className="text-xs text-destructive">{rejectForm.errors.note}</p>}
                            </div>

                            <div className="flex gap-2 pt-2 border-t justify-end">
                                <Button type="button" variant="ghost" size="sm" onClick={() => setRejectOpen(false)}>Cancel</Button>
                                <Button size="sm" type="submit" variant="destructive" disabled={rejectForm.processing}>
                                    {rejectForm.processing ? 'Writing Audit Block...' : 'Reject Claim Request'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
