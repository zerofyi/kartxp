import { Head, router, usePage } from '@inertiajs/react';
import { Check, Edit2, Eye, FileText, Loader2, Plus, Search, Trash2, X } from 'lucide-react';
import { useState } from 'react';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import type { BreadcrumbItem } from '@/types';

// ─────────────────────────────────────────────
// Breadcrumbs
// ─────────────────────────────────────────────
const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: dashboard().url },
    { title: 'Purchases', href: '' },
];

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type Vendor = {
    id: number;
    name: string;
    phone: string;
    gstin?: string;
};

type PurchaseItem = {
    id?: number;
    product_variant_id: string;
    quantity: string;
    cost_price: string;
    selling_price: string;
    mrp: string;
    batch_no: string;
    expiry_date: string;
};

type Purchase = {
    id: number;
    vendor_id: number;
    vendor?: Vendor;
    invoice_no: string;
    image_path?: string;
    purchase_date: string;
    subtotal: number;
    tax_amount: number;
    total_amount: number;
    status: 'draft' | 'confirmed';
    items?: PurchaseItem[];
    created_at: string;
};

type Warehouse = {
    id: number;
    name: string;
    location?: string;
};

type SharedProps = {
    flash?: { success?: string; error?: string };
    errors?: Record<string, string>;
    [key: string]: unknown;
};

type Props = SharedProps & {
    purchases: Purchase[];
    warehouses: Warehouse[];
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const INR = (amount: number) =>
    new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────
export default function PurchaseList({ purchases = [], warehouses = [] }: Props) {
    const { flash, errors: pageErrors } = usePage<SharedProps>().props;

    // ── state ──
    const [searchQuery, setSearchQuery]   = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'confirmed'>('all');

    // Confirm dialog state
    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean;
        purchase: Purchase | null;
        warehouseId: string;
    }>({ open: false, purchase: null, warehouseId: '' });

    // Delete dialog state
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; purchase: Purchase | null }>({
        open: false,
        purchase: null,
    });

    const [processingId, setProcessingId] = useState<number | null>(null);

    // ── derived ──
    const trimmed = searchQuery.trim().toLowerCase();
    const filteredPurchases = purchases.filter((p) => {
        const matchesSearch =
            !trimmed ||
            p.invoice_no.toLowerCase().includes(trimmed) ||
            p.vendor?.name.toLowerCase().includes(trimmed);
        const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // ── handlers ──
    const handleDelete = () => {
        if (!deleteDialog.purchase) return;
        setProcessingId(deleteDialog.purchase.id);
        setDeleteDialog({ open: false, purchase: null });
        router.delete(`/warehouse/purchases/${deleteDialog.purchase.id}`, {
            preserveScroll: true,
            onFinish: () => setProcessingId(null),
        });
    };

    const handleConfirm = () => {
        if (!confirmDialog.purchase || !confirmDialog.warehouseId) return;
        setProcessingId(confirmDialog.purchase.id);
        setConfirmDialog({ open: false, purchase: null, warehouseId: '' });
        router.post(
            `/warehouse/purchases/${confirmDialog.purchase.id}/confirm`,
            { warehouse_id: confirmDialog.warehouseId },
            { preserveScroll: true, onFinish: () => setProcessingId(null) },
        );
    };

    const openConfirmDialog = (purchase: Purchase) => {
        setConfirmDialog({
            open: true,
            purchase,
            warehouseId: warehouses[0]?.id.toString() ?? '',
        });
    };

    // ─────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Purchases" />

            {/* ── Confirm Purchase Dialog ── */}
            <AlertDialog
                open={confirmDialog.open}
                onOpenChange={(open) => !open && setConfirmDialog({ open: false, purchase: null, warehouseId: '' })}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Purchase</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will update stock levels and cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-2 py-2">
                        <label className="text-sm font-medium">Select Warehouse</label>
                        <Select
                            value={confirmDialog.warehouseId}
                            onValueChange={(v) => setConfirmDialog((prev) => ({ ...prev, warehouseId: v }))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select warehouse" />
                            </SelectTrigger>
                            <SelectContent>
                                {warehouses.map((w) => (
                                    <SelectItem key={w.id} value={w.id.toString()}>
                                        {w.name}{w.location ? ` — ${w.location}` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirm}
                            disabled={!confirmDialog.warehouseId}
                        >
                            Confirm Purchase
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ── Delete Dialog ── */}
            <AlertDialog
                open={deleteDialog.open}
                onOpenChange={(open) => !open && setDeleteDialog({ open: false, purchase: null })}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Purchase</AlertDialogTitle>
                        <AlertDialogDescription>
                            Delete invoice <strong>{deleteDialog.purchase?.invoice_no}</strong>? This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="flex h-full flex-1 flex-col gap-4 p-4">

                {/* Flash / error banners */}
                {flash?.success && (
                    <Alert><AlertDescription>{flash.success}</AlertDescription></Alert>
                )}
                {pageErrors?.form && (
                    <Alert variant="destructive"><AlertDescription>{pageErrors.form}</AlertDescription></Alert>
                )}

                {/* Header */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-2xl">Purchase Management</CardTitle>
                                <CardDescription>Manage vendor purchases and inventory</CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => router.get('/warehouse/purchase/report')}>
                                    <FileText className="mr-2 size-4" aria-hidden />
                                    Reports
                                </Button>
                                <Button onClick={() => router.get('/warehouse/purchases/create')}>
                                    <Plus className="mr-2 size-4" aria-hidden />
                                    New Purchase
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                {/* Filters */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                                <Input
                                    placeholder="Search by invoice or vendor…"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 pr-9"
                                    aria-label="Search purchases"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        aria-label="Clear search"
                                    >
                                        <X className="size-4" />
                                    </button>
                                )}
                            </div>
                            <Select
                                value={statusFilter}
                                onValueChange={(value: 'all' | 'draft' | 'confirmed') => setStatusFilter(value)}
                            >
                                <SelectTrigger className="w-40">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="draft">Draft</SelectItem>
                                    <SelectItem value="confirmed">Confirmed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Table */}
                <Card className="flex-1 overflow-hidden">
                    <div className="h-full overflow-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-muted/50">
                                <TableRow>
                                    <TableHead>Invoice No</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Vendor</TableHead>
                                    <TableHead>Items</TableHead>
                                    <TableHead className="text-right">Subtotal</TableHead>
                                    <TableHead className="text-right">Tax</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredPurchases.length > 0 ? (
                                    filteredPurchases.map((purchase) => {
                                        const isProcessing = processingId === purchase.id;
                                        return (
                                            <TableRow key={purchase.id}>
                                                <TableCell className="font-mono font-medium">
                                                    {purchase.invoice_no}
                                                </TableCell>
                                                <TableCell>
                                                    {new Date(purchase.purchase_date).toLocaleDateString('en-IN')}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{purchase.vendor?.name}</div>
                                                    <div className="text-sm text-muted-foreground">{purchase.vendor?.phone}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{purchase.items?.length ?? 0} items</Badge>
                                                </TableCell>
                                                <TableCell className="text-right">₹{INR(purchase.subtotal)}</TableCell>
                                                <TableCell className="text-right">₹{INR(purchase.tax_amount)}</TableCell>
                                                <TableCell className="text-right font-semibold">₹{INR(purchase.total_amount)}</TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={purchase.status === 'confirmed' ? 'default' : 'secondary'}
                                                        className="capitalize"
                                                    >
                                                        {purchase.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => router.get(`/warehouse/purchases/${purchase.id}`)}
                                                            disabled={isProcessing}
                                                            aria-label={`View ${purchase.invoice_no}`}
                                                        >
                                                            {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
                                                        </Button>
                                                        {purchase.status === 'draft' && (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => router.get(`/warehouse/purchases/${purchase.id}/edit`)}
                                                                    disabled={isProcessing}
                                                                    aria-label={`Edit ${purchase.invoice_no}`}
                                                                >
                                                                    <Edit2 className="size-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => openConfirmDialog(purchase)}
                                                                    disabled={isProcessing}
                                                                    aria-label={`Confirm ${purchase.invoice_no}`}
                                                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                                >
                                                                    <Check className="size-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => setDeleteDialog({ open: true, purchase })}
                                                                    disabled={isProcessing}
                                                                    aria-label={`Delete ${purchase.invoice_no}`}
                                                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                >
                                                                    <Trash2 className="size-4" />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                                            {trimmed || statusFilter !== 'all'
                                                ? 'No purchases match your filters.'
                                                : 'No purchases yet. Create your first purchase order.'}
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
