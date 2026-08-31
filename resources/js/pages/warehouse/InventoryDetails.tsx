import { Head, router, useForm } from '@inertiajs/react';
import React, { useState } from 'react';
import {
    ArrowLeft, Package, TrendingUp, TrendingDown,
    AlertTriangle, Clock, Layers, ShieldAlert
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type Product = {
    id: number;
    product_name: string;
    variant_name: string;
    sku: string;
    category_name: string;
    reorder_level: number;
    cost_price: number;
    selling_price: number;
    mrp: number;
};

type Batch = {
    id: number;
    batch_no: string;
    expiry_date: string | null;
    received_quantity: number;
    available_quantity: number;
    purchase_invoice_no: string;
    purchase_date: string | null;
};

type StockMovement = {
    id: number;
    movement_type: 'IN' | 'OUT';
    quantity: number;
    batch_no: string;
    source_type: string;
    created_at: string;
    remarks: string;
};

type Props = {
    product: Product;
    batches: Batch[];
    stockMovements: StockMovement[];
    totalAvailable: number;
    totalReserved: number;
};

function daysUntil(dateStr: string): number {
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function InventoryDetails({
    product,
    batches = [],
    stockMovements = [],
    totalAvailable = 0,
    totalReserved = 0,
}: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inventory', href: '/warehouse/inventory' },
        { title: product.sku, href: '' },
    ];

    const isOut = totalAvailable === 0;
    const isLow = !isOut && totalAvailable <= product.reorder_level;
    const stockValue = totalAvailable * product.cost_price;

    const expiredBatches  = batches.filter(b => b.expiry_date && daysUntil(b.expiry_date) < 0 && b.available_quantity > 0);
    const criticalBatches = batches.filter(b => b.expiry_date && daysUntil(b.expiry_date) >= 0 && daysUntil(b.expiry_date) <= 7);
    const warningBatches  = batches.filter(b => b.expiry_date && daysUntil(b.expiry_date) > 7 && daysUntil(b.expiry_date) <= 30);

    // Inertia Form Hook
    const [adjustModal, setAdjustModal] = useState(false);
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        product_variant_id: product.id,
        adjustment_type: 'increase' as 'increase' | 'decrease',
        quantity: '',
        reason: '',
        batch_id: '',
    });

    const selectedBatch = batches.find(b => b.id.toString() === data.batch_id);
    const maxAvailableForAdjustment = data.adjustment_type === 'decrease'
        ? (selectedBatch ? selectedBatch.available_quantity : totalAvailable)
        : undefined;

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/warehouse/inventory/adjust', {
            preserveScroll: true,
            onSuccess: () => {
                setAdjustModal(false);
                reset('quantity', 'reason', 'batch_id');
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Inventory · ${product.sku}`} />
            <div className="p-6 space-y-5">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex items-start gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 mt-0.5 shrink-0"
                            onClick={() => router.visit('/warehouse/inventory')}
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">{product.product_name}</h1>
                            <p className="text-sm text-muted-foreground mt-0.5 font-mono">
                                {product.variant_name && <span>{product.variant_name} · </span>}
                                SKU: <span className="text-foreground">{product.sku}</span>
                                <span className="mx-2 text-muted-foreground/40">·</span>
                                <span>{product.category_name}</span>
                            </p>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-9 text-xs w-fit self-start"
                        onClick={() => {
                            clearErrors();
                            setAdjustModal(true);
                        }}
                    >
                        Adjust Stock
                    </Button>
                </div>

                {/* Expiry Alerts */}
                {expiredBatches.length > 0 && (
                    <div className="flex items-start gap-3 rounded-lg border border-rose-300 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800 px-4 py-3">
                        <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-bold text-rose-700 dark:text-rose-400">
                                {expiredBatches.length} expired batch{expiredBatches.length > 1 ? 'es' : ''} with stock remaining
                            </p>
                            <p className="text-xs text-rose-600/80 mt-0.5">
                                {expiredBatches.map(b => `${b.batch_no} (${b.available_quantity} units)`).join(', ')} — quarantine immediately.
                            </p>
                        </div>
                    </div>
                )}

                {criticalBatches.length > 0 && (
                    <div className="flex items-start gap-3 rounded-lg border border-orange-300 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-800 px-4 py-3">
                        <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-bold text-orange-700 dark:text-orange-400">
                                Expiring within 7 days
                            </p>
                            <p className="text-xs text-orange-600/80 mt-0.5">
                                {criticalBatches.map(b => `${b.batch_no} — expires ${new Date(b.expiry_date!).toLocaleDateString()}`).join(' · ')}
                            </p>
                        </div>
                    </div>
                )}

                {warningBatches.length > 0 && (
                    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 px-4 py-3">
                        <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
                                {warningBatches.length} batch{warningBatches.length > 1 ? 'es' : ''} expiring within 30 days
                            </p>
                            <p className="text-xs text-amber-600/80 mt-0.5">
                                {warningBatches.map(b => `${b.batch_no} (${daysUntil(b.expiry_date!)}d)`).join(' · ')}
                            </p>
                        </div>
                    </div>
                )}

                {/* Summary Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Card className={`border-l-4 ${isOut ? 'border-l-rose-500' : isLow ? 'border-l-amber-500' : 'border-l-emerald-500'}`}>
                        <CardContent className="pt-4 pb-4">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Available</p>
                            <p className={`text-3xl font-black font-mono ${isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-foreground'}`}>
                                {totalAvailable}
                            </p>
                            {isOut && <p className="text-[10px] text-rose-500 font-bold mt-0.5 uppercase">Out of Stock</p>}
                            {isLow && <p className="text-[10px] text-amber-500 font-bold mt-0.5 uppercase">Low Stock</p>}
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-slate-400">
                        <CardContent className="pt-4 pb-4">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Reserved</p>
                            <p className="text-3xl font-black font-mono text-slate-600 dark:text-slate-300">{totalReserved}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Held for orders</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-emerald-600">
                        <CardContent className="pt-4 pb-4">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Stock Value</p>
                            <p className="text-2xl font-black font-mono text-emerald-700">
                                ₹{Number(stockValue).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">At cost price</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-indigo-400">
                        <CardContent className="pt-4 pb-4">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Reorder Level</p>
                            <p className="text-3xl font-black font-mono text-indigo-600">{product.reorder_level}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Minimum threshold</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Pricing Info */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Pricing</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                            {[
                                { label: 'Cost Price', value: product.cost_price },
                                { label: 'Selling Price', value: product.selling_price },
                                { label: 'MRP', value: product.mrp },
                            ].map(({ label, value }) => (
                                <div key={label} className="space-y-1">
                                    <p className="text-xs text-muted-foreground font-medium">{label}</p>
                                    <p className="text-lg font-bold font-mono">
                                        ₹{Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Batches Table */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-bold">Batches</CardTitle>
                            <CardDescription>{batches.length} batch{batches.length !== 1 ? 'es' : ''}</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/30">
                                    <TableHead className="text-xs font-semibold pl-4">Batch No</TableHead>
                                    <TableHead className="text-xs font-semibold">Invoice</TableHead>
                                    <TableHead className="text-xs font-semibold">Purchase Date</TableHead>
                                    <TableHead className="text-right text-xs font-semibold">Received</TableHead>
                                    <TableHead className="text-right text-xs font-semibold">Available</TableHead>
                                    <TableHead className="text-xs font-semibold">Expiry</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {batches.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-sm">
                                            No batch records found.
                                        </TableCell>
                                    </TableRow>
                                ) : batches.map((batch) => {
                                    const days = batch.expiry_date ? daysUntil(batch.expiry_date) : null;
                                    const rowHighlight =
                                        days !== null && days < 0 ? 'bg-rose-50/60 dark:bg-rose-950/20' :
                                        days !== null && days <= 7 ? 'bg-orange-50/60 dark:bg-orange-950/20' :
                                        days !== null && days <= 30 ? 'bg-amber-50/40 dark:bg-amber-950/10' : '';

                                    return (
                                        <TableRow key={batch.id} className={`${rowHighlight} hover:bg-muted/20 transition-colors`}>
                                            <TableCell className="font-mono font-bold text-sm pl-4">{batch.batch_no}</TableCell>
                                            <TableCell className="font-mono text-xs text-muted-foreground">{batch.purchase_invoice_no}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {batch.purchase_date ? new Date(batch.purchase_date).toLocaleDateString('en-IN') : '—'}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-sm">{batch.received_quantity}</TableCell>
                                            <TableCell className="text-right font-mono font-bold text-sm">{batch.available_quantity}</TableCell>
                                            <TableCell>
                                                {batch.expiry_date ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-mono">
                                                            {new Date(batch.expiry_date).toLocaleDateString('en-IN')}
                                                        </span>
                                                        {days !== null && (
                                                            days < 0 ? (
                                                                <Badge className="bg-rose-600 text-white text-[10px] px-1.5">Expired</Badge>
                                                            ) : days <= 7 ? (
                                                                <Badge className="bg-orange-500 text-white text-[10px] px-1.5">{days}d</Badge>
                                                            ) : days <= 30 ? (
                                                                <Badge className="bg-amber-500 text-white text-[10px] px-1.5">{days}d</Badge>
                                                            ) : days <= 90 ? (
                                                                <Badge variant="outline" className="text-[10px] text-yellow-700 border-yellow-400 px-1.5">{days}d</Badge>
                                                            ) : null
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Stock Movements */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-bold">Stock Movements</CardTitle>
                            <CardDescription>Last 50 transactions</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/30">
                                    <TableHead className="text-xs font-semibold pl-4 w-20">Type</TableHead>
                                    <TableHead className="text-xs font-semibold">Date & Time</TableHead>
                                    <TableHead className="text-xs font-semibold">Batch</TableHead>
                                    <TableHead className="text-right text-xs font-semibold">Qty</TableHead>
                                    <TableHead className="text-xs font-semibold">Source</TableHead>
                                    <TableHead className="text-xs font-semibold">Remarks</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stockMovements.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-sm">
                                            No movements recorded.
                                        </TableCell>
                                    </TableRow>
                                ) : stockMovements.map((m) => (
                                    <TableRow key={m.id} className="hover:bg-muted/20 transition-colors">
                                        <TableCell className="pl-4">
                                            {m.movement_type === 'IN' ? (
                                                <div className="flex items-center gap-1.5">
                                                    <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                                                    <span className="text-xs font-bold text-emerald-700">IN</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5">
                                                    <TrendingDown className="h-3.5 w-3.5 text-rose-600" />
                                                    <span className="text-xs font-bold text-rose-700">OUT</span>
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground font-mono">
                                            {new Date(m.created_at).toLocaleString('en-IN', {
                                                day: '2-digit', month: 'short', year: 'numeric',
                                                hour: '2-digit', minute: '2-digit'
                                            })}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">{m.batch_no}</TableCell>
                                        <TableCell className="text-right font-mono font-bold text-sm">
                                            <span className={m.movement_type === 'IN' ? 'text-emerald-700' : 'text-rose-700'}>
                                                {m.movement_type === 'IN' ? '+' : '−'}{m.quantity}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="text-[10px] font-mono">
                                                {m.source_type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                                            {m.remarks || '—'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Adjust Stock Modal */}
            <Dialog open={adjustModal} onOpenChange={open => { setAdjustModal(open); clearErrors(); }}>
                <DialogContent className="max-w-sm">
                    <form onSubmit={handleFormSubmit}>
                        <DialogHeader>
                            <DialogTitle className="text-base font-bold">Adjust Stock</DialogTitle>
                            <DialogDescription className="text-xs">
                                {product.product_name} · {product.sku}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 pt-3">
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Adjustment Type</Label>
                                <Select
                                    value={data.adjustment_type}
                                    onValueChange={(v: 'increase' | 'decrease') => setData('adjustment_type', v)}
                                >
                                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="increase">Increase (Stock In)</SelectItem>
                                        <SelectItem value="decrease">Decrease (Stock Out)</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.adjustment_type && <p className="text-xs text-rose-600 font-medium">{errors.adjustment_type}</p>}
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">
                                    Quantity {maxAvailableForAdjustment !== undefined && `(Max: ${maxAvailableForAdjustment})`}
                                </Label>
                                <Input
                                    type="number"
                                    min="1"
                                    max={maxAvailableForAdjustment}
                                    className="h-9 text-xs font-mono"
                                    placeholder="Enter quantity..."
                                    value={data.quantity}
                                    onChange={e => setData('quantity', e.target.value)}
                                    required
                                />
                                {errors.quantity && <p className="text-xs text-rose-600 font-medium">{errors.quantity}</p>}
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Batch (optional)</Label>
                                <Select
                                    value={data.batch_id || 'none'}
                                    onValueChange={v => setData('batch_id', v === 'none' ? '' : v)}
                                >
                                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select batch..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No specific batch</SelectItem>
                                        {batches.map(b => (
                                            <SelectItem key={b.id} value={b.id.toString()}>
                                                {b.batch_no} ({b.available_quantity} available)
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.batch_id && <p className="text-xs text-rose-600 font-medium">{errors.batch_id}</p>}
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Reason <span className="text-rose-500">*</span></Label>
                                <Textarea
                                    className="text-xs resize-none"
                                    rows={2}
                                    placeholder="Reason for adjustment..."
                                    value={data.reason}
                                    onChange={e => setData('reason', e.target.value)}
                                    required
                                />
                                {errors.reason && <p className="text-xs text-rose-600 font-medium">{errors.reason}</p>}
                            </div>
                        </div>

                        <DialogFooter className="gap-2 pt-4">
                            <Button type="button" variant="ghost" size="sm" onClick={() => setAdjustModal(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" size="sm" disabled={processing}>
                                {processing ? 'Saving...' : 'Confirm Adjustment'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
