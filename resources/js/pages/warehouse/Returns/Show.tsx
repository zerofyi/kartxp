import { Head, Link, useForm } from '@inertiajs/react';
import React, { useState } from 'react';
import { ArrowLeft, RotateCcw, ShieldAlert, Calendar, User, Phone, CheckCircle, XCircle, Package, ArrowLeftRight, MessageSquare, IndianRupee } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type Props = {
    returnRequest: {
        id: number; status: string; reason: string; refund_amount: number | null; refund_method: string | null; note: string | null; created_at: string; processed_at: string | null;
        customer: { name: string; phone: string } | null;
        processed_by: { name: string } | null;
        order: { order_number: string; total_amount: number };
        items: Array<{
            id: number; quantity: number; reason: string;
            order_item: { price: number; total: number; product_variant: { variant_name: string; sku: string; product: { name: string } } | null } | null;
        }>;
    };
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Return Requests', href: '/warehouse/returns' },
    { title: 'Claim File Split', href: '#' }
];

const STATUS_STYLES: Record<string, string> = {
    requested: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    approved: 'bg-blue-50 text-blue-700 border-blue-200',
    rejected: 'bg-rose-50 text-rose-700 border-rose-200',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export default function ReturnRequestShowPage({ returnRequest }: Props) {
    const approveForm = useForm({ refund_amount: '', refund_method: 'bank', restock: true, note: '' });
    const rejectForm = useForm({ note: '' });

    const [approveModal, setApproveModal] = useState(false);
    const [rejectModal, setRejectModal] = useState(false);

    const submitApprove = (e: React.FormEvent) => {
        e.preventDefault();
        approveForm.post(`/warehouse/returns/${returnRequest.id}/approve`, { onSuccess: () => setApproveModal(false) });
    };

    const submitReject = (e: React.FormEvent) => {
        e.preventDefault();
        rejectForm.post(`/warehouse/returns/${returnRequest.id}/reject`, { onSuccess: () => setRejectModal(false) });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Claim Manifest File Split — #${returnRequest.id}`} />
            <div className="p-6 space-y-6">

                {/* Subheading Sub-Menu Band Row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" asChild>
                            <Link href="/warehouse/returns"><ArrowLeft className="h-4 w-4" /></Link>
                        </Button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold font-mono tracking-tight text-primary">Claim Request #{returnRequest.id}</h1>
                                <Badge variant="outline" className={`capitalize font-mono text-[10px] ${STATUS_STYLES[returnRequest.status] ?? 'bg-slate-100'}`}>
                                    {returnRequest.status}
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">Logged claim window: {new Date(returnRequest.created_at).toLocaleString('en-IN')}</p>
                        </div>
                    </div>

                    {returnRequest.status === 'requested' && (
                        <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" className="text-xs h-9 border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => setRejectModal(true)}>
                                <XCircle className="h-4 w-4 mr-1.5" /> Reject Claim File
                            </Button>
                            <Button size="sm" className="text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setApproveModal(true)}>
                                <CheckCircle className="h-4 w-4 mr-1.5" /> Clear & Authorize Refund
                            </Button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

                    {/* Primary Left Split Data Details Column */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Claim Items Breakdown Registry Table */}
                        <Card className="overflow-hidden">
                            <CardHeader className="bg-muted/30 border-b py-3.5">
                                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <Package className="h-4 w-4 text-slate-500" /> Dispatched Claim Allocations Item Breakdown
                                </CardTitle>
                            </CardHeader>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Target SKU Inventory Details</TableHead>
                                        <TableHead>Manufacturer SKU Reference</TableHead>
                                        <TableHead className="text-center">Claim Quantity</TableHead>
                                        <TableHead className="text-right">Unit Rate Value</TableHead>
                                        <TableHead className="text-right">Net Charged Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {returnRequest.items.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <div className="font-semibold text-sm">
                                                    {item.order_item?.product_variant?.product?.name ?? 'Orphaned SKU Record Line'}
                                                </div>
                                                <div className="text-xs font-mono text-muted-foreground">
                                                    Style: {item.order_item?.product_variant?.variant_name ?? 'Base Layout'}
                                                </div>
                                                <div className="text-[11px] text-amber-600 italic mt-0.5 flex items-center gap-1">
                                                    <MessageSquare className="h-3 w-3" /> "{item.reason}"
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs text-muted-foreground">
                                                {item.order_item?.product_variant?.sku ?? '—'}
                                            </TableCell>
                                            <td className="text-center font-mono font-bold text-sm text-foreground/80">{item.quantity}</td>
                                            <TableCell className="text-right font-mono text-xs">
                                                ₹{Number(item.order_item?.price ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-bold text-sm">
                                                ₹{Number(item.order_item?.total ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Card>

                        {/* Audit Resolution Summary Log Metrics */}
                        {returnRequest.status !== 'requested' && (
                            <Card>
                                <CardHeader className="py-3.5 border-b bg-muted/10">
                                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                        <ShieldAlert className="h-4 w-4 text-slate-500" /> Resolution Sign-off Parameters Summary
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-3 text-xs font-mono">
                                    <div className="flex justify-between border-b pb-2">
                                        <span className="text-muted-foreground">Clearing Administrator Signee:</span>
                                        <span className="font-bold text-foreground">{returnRequest.processed_by?.name ?? 'System Automated Automation Daemon'}</span>
                                    </div>
                                    <div className="flex justify-between border-b pb-2">
                                        <span className="text-muted-foreground">Audited Closing Timestamp:</span>
                                        <span className="font-medium text-foreground">{returnRequest.processed_at ? new Date(returnRequest.processed_at).toLocaleString('en-IN') : '—'}</span>
                                    </div>
                                    {returnRequest.note && (
                                        <div className="pt-1 font-sans text-sm text-muted-foreground flex items-start gap-1.5">
                                            <MessageSquare className="h-4 w-4 mt-0.5 text-slate-400 shrink-0" />
                                            <div><strong>Resolution Audit Note:</strong> "{returnRequest.note}"</div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Secondary Right Context Identity Cards Column */}
                    <div className="space-y-6">

                        {/* Parent Manifest Base Identity Reference Card */}
                        <Card>
                            <CardHeader className="py-3.5 border-b bg-muted/10">
                                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <ArrowLeftRight className="h-4 w-4" /> Parent Order Context
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 text-xs font-mono space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Invoice Reference:</span>
                                    <span className="font-bold text-primary">{returnRequest.order?.order_number}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Gross Invoice Value:</span>
                                    <span className="font-bold text-foreground">₹{Number(returnRequest.order?.total_amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Claimant Identity Profile Card */}
                        <Card>
                            <CardHeader className="py-3.5 border-b bg-muted/10">
                                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <User className="h-4 w-4" /> Claimant Metadata Profile
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 text-xs space-y-2">
                                <div className="font-bold text-sm text-foreground">{returnRequest.customer?.name ?? 'Walk-in Client Account'}</div>
                                {returnRequest.customer?.phone && <div className="flex items-center gap-1.5 text-muted-foreground font-mono"><Phone className="h-3.5 w-3.5" /> {returnRequest.customer.phone}</div>}
                                <div className="pt-2 border-t mt-2 text-[11px] text-slate-500">
                                    <strong>Claim Statement Summary Reason:</strong>
                                    <p className="italic font-sans text-xs text-foreground/80 mt-1">"{returnRequest.reason}"</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Cleared Reimbursement Assets Status Summary Card */}
                        {returnRequest.status === 'approved' && (
                            <Card className="border-l-4 border-l-blue-600 bg-gradient-to-br from-card to-blue-50/20">
                                <CardHeader className="py-3.5 border-b border-blue-100 bg-transparent">
                                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                                        <IndianRupee className="h-4 w-4" /> Approved Settlement Value
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4 text-xs font-mono space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-blue-900/60">Cleared Reimbursement:</span>
                                        <span className="font-black text-sm text-blue-800">₹{Number(returnRequest.refund_amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between capitalize">
                                        <span className="text-blue-900/60">Remittance Route:</span>
                                        <span className="font-bold text-blue-800">{returnRequest.refund_method}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>

                {/* Approve Layout Dialog Modal */}
                <Dialog open={approveModal} onOpenChange={setApproveModal}>
                    <DialogContent className="max-w-md">
                        <DialogHeader><DialogTitle className="text-base font-bold">Authorize Claim Reimbursement</DialogTitle></DialogHeader>
                        <form onSubmit={submitApprove} className="space-y-4 mt-2">
                            <div className="space-y-1">
                                <Label htmlFor="refund" className="text-xs font-semibold">Approved Settlement Amount (₹)</Label>
                                <Input id="refund" type="number" step="0.01" min="0" value={approveForm.data.refund_amount} onChange={e => approveForm.setData('refund_amount', e.target.value)} required />
                                {approveForm.errors.refund_amount && <p className="text-xs text-destructive">{approveForm.errors.refund_amount}</p>}
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Remittance Method Channel</Label>
                                <Select value={approveForm.data.refund_method} onValueChange={v => approveForm.setData('refund_method', v)}>
                                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="bank">Bank Wire Remittance</SelectItem>
                                        <SelectItem value="cod">Liquid Cash Recovery (COD)</SelectItem>
                                        <SelectItem value="wallet">Virtual Wallet Credit</SelectItem>
                                        <SelectItem value="credit">Store Credit Note Memo</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl border">
                                <Switch id="restock_switch" checked={approveForm.data.restock} onCheckedChange={checked => approveForm.setData('restock', checked)} />
                                <div className="space-y-0.5">
                                    <Label htmlFor="restock_switch" className="text-xs font-semibold">Automated Stock Re-allocation</Label>
                                    <p className="text-[10px] text-muted-foreground">Adjust warehouse quantities back into available stock on completion.</p>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="approve_note" className="text-xs font-semibold">Settlement Narrative</Label>
                                <Textarea id="approve_note" rows={2} className="text-xs" placeholder="Log compliance check notes..." value={approveForm.data.note} onChange={e => approveForm.setData('note', e.target.value)} />
                            </div>
                            <div className="flex gap-2 pt-2 border-t justify-end">
                                <Button type="button" variant="ghost" size="sm" onClick={() => setApproveModal(false)}>Cancel</Button>
                                <Button size="sm" type="submit" disabled={approveForm.processing} className="bg-emerald-600 hover:bg-emerald-700 text-white">Commit Clearance Approval</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Reject Layout Dialog Modal */}
                <Dialog open={rejectModal} onOpenChange={setRejectModal}>
                    <DialogContent className="max-w-md">
                        <DialogHeader><DialogTitle className="text-base font-bold">Reject Return Claim Request</DialogTitle></DialogHeader>
                        <form onSubmit={submitReject} className="space-y-4 mt-2">
                            <div className="space-y-1">
                                <Label htmlFor="reject_reason" className="text-xs font-semibold">Audit Rejection Narrative Statement Reason</Label>
                                <Textarea id="reject_reason" rows={3} className="text-xs" placeholder="Provide reason parameters..." value={rejectForm.data.note} onChange={e => rejectForm.setData('note', e.target.value)} required />
                                {rejectForm.errors.note && <p className="text-xs text-destructive">{rejectForm.errors.note}</p>}
                            </div>
                            <div className="flex gap-2 pt-2 border-t justify-end">
                                <Button type="button" variant="ghost" size="sm" onClick={() => setRejectModal(false)}>Cancel</Button>
                                <Button size="sm" type="submit" variant="destructive" disabled={rejectForm.processing}>Reject Claim Request</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
