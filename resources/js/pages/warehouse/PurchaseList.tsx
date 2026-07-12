import { Head, router, usePage } from '@inertiajs/react';
import { Check, Edit2, Eye, FileText, Loader2, Plus, Search, Trash2, X, Filter, RefreshCw, Calendar, Building2, UserSquare, IndianRupee, Layers } from 'lucide-react';
import { useState, useEffect } from 'react';

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

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: dashboard().url },
    { title: 'Purchases', href: '' },
];

type Vendor = { id: number; name: string; phone: string };
type Warehouse = { id: number; name: string; location?: string };
type Purchase = {
    id: number;
    vendor_id: number;
    vendor?: Vendor;
    invoice_no: string;
    image_url?: string;
    purchase_date: string;
    subtotal: number;
    tax_amount: number;
    total_amount: number;
    status: 'draft' | 'confirmed';
    items_count: number;
    created_at: string;
};

type PaginationLink = { url: string | null; label: string; active: boolean };
type PaginatedCollection<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: PaginationLink[];
};

type StatsSummary = { total_count: number; confirmed_total: number; draft_total: number; grand_total: number };
type FilterBag = { search: string; status: string; vendor_id: string; warehouse_id: string; start_date: string; end_date: string; per_page: number };

type Props = {
    purchases: PaginatedCollection<Purchase>;
    vendors: Vendor[];
    warehouses: Warehouse[];
    stats: StatsSummary;
    filters: FilterBag;
};

const INR = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

export default function PurchaseList({ purchases, vendors = [], warehouses = [], stats, filters }: Props) {
    const { errors: pageErrors } = usePage().props;

    // Filter local states synchronized from backend props
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? 'all');
    const [vendorId, setVendorId] = useState(filters.vendor_id ?? 'all');
    const [warehouseId, setWarehouseId] = useState(filters.warehouse_id ?? 'all');
    const [startDate, setStartDate] = useState(filters.start_date ?? '');
    const [endDate, setEndDate] = useState(filters.end_date ?? '');

    const [processingId, setProcessingId] = useState<number | null>(null);
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; purchase: Purchase | null; warehouseId: string }>({ open: false, purchase: null, warehouseId: '' });
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; purchase: Purchase | null }>({ open: false, purchase: null });

    // Change your applyFilters function to this:
    const applyFilters = (updatedFields = {}) => {
        const currentBag = { search, status, vendor_id: vendorId, warehouse_id: warehouseId, start_date: startDate, end_date: endDate };
        const finalBag = { ...currentBag, ...updatedFields };

        // 1. Explicitly cast Object.keys so TypeScript knows they are valid keys of our filter object
        (Object.keys(finalBag) as Array<keyof typeof finalBag>).forEach(key => {
            if (finalBag[key] === 'all' || finalBag[key] === '') {
                // 2. We use a temporary any mapping or delete the property to bypass the strict index write rule
                (finalBag as any)[key] = null;
            }
        });

        router.get('/warehouse/purchases', finalBag, {
            preserveState: true,
            replace: true,
        });
    };

    // Debounce search submissions cleanly using input keystroke enter trigger
    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') applyFilters();
    };

    const resetFilters = () => {
        setSearch(''); setStatus('all'); setVendorId('all'); setWarehouseId('all'); setStartDate(''); setEndDate('');
        router.get('/warehouse/purchases', {}, { replace: true });
    };

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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Purchase Orders" />

            {/* ── Dialogue Overlays ── */}
            <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, purchase: null, warehouseId: '' })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Stock Ingestion</AlertDialogTitle>
                        <AlertDialogDescription>This commits operational batches directly to inventory ledgers. This lifecycle stage cannot be reverted.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-2 py-2">
                        <label className="text-sm font-medium">Select Target Allocation Warehouse</label>
                        <Select value={confirmDialog.warehouseId} onValueChange={(v) => setConfirmDialog(prev => ({ ...prev, warehouseId: v }))}>
                            <SelectTrigger><SelectValue placeholder="Choose destination" /></SelectTrigger>
                            <SelectContent>
                                {warehouses.map((w) => (
                                    <SelectItem key={w.id} value={w.id.toString()}>{w.name} {w.location && `(${w.location})`}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirm} disabled={!confirmDialog.warehouseId}>Finalize Ingestion</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, purchase: null })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Purge Purchase Record</AlertDialogTitle>
                        <AlertDialogDescription>Are you sure you want to permanently delete draft invoice <strong>{deleteDialog.purchase?.invoice_no}</strong>?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Confirm Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="flex flex-col gap-4 p-6">
                {/* Global Notification Banner */}
                {pageErrors?.form && (
                    <Alert variant="destructive"><AlertDescription>{pageErrors.form}</AlertDescription></Alert>
                )}

                {/* Page Heading Title block */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Procurement Orders</h1>
                        <p className="text-muted-foreground">Inbound suppliers, structured cost invoicing, and transactional ledger matching records</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => router.get('/warehouse/purchase/report')} className="h-10">
                            <FileText className="mr-2 size-4" /> Export Analytics
                        </Button>
                        <Button onClick={() => router.get('/warehouse/purchases/create')} className="h-10 shadow-sm">
                            <Plus className="mr-2 size-4" /> New Inbound Invoice
                        </Button>
                    </div>
                </div>

                {/* ── Dynamic Top Stats Cards Overview Dashboard Row ── */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className="shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Inbound Bills</CardTitle>
                            <Layers className="size-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total_count}</div>
                            <p className="text-xs text-muted-foreground">Aggregated invoices matching filters</p>
                        </CardContent>
                    </Card>
                    <Card className="shadow-sm border-l-4 border-l-emerald-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Committed Stock Valuation</CardTitle>
                            <IndianRupee className="size-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-600">{INR(stats.confirmed_total)}</div>
                            <p className="text-xs text-muted-foreground">Inventory added permanently to stock</p>
                        </CardContent>
                    </Card>
                    <Card className="shadow-sm border-l-4 border-l-amber-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Draft Queue Valuation</CardTitle>
                            <RefreshCw className="size-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-amber-600">{INR(stats.draft_total)}</div>
                            <p className="text-xs text-muted-foreground">Pending verification review records</p>
                        </CardContent>
                    </Card>
                    <Card className="shadow-sm bg-muted/30">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Volume Passed</CardTitle>
                            <IndianRupee className="size-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{INR(stats.grand_total)}</div>
                            <p className="text-xs text-muted-foreground">Cumulative value across filter scopes</p>
                        </CardContent>
                    </Card>
                </div>

                {/* ── Comprehensive Robust Server Filter Console ── */}
                <Card className="shadow-sm">
                    <CardContent className="p-4 flex flex-col gap-3">
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Main Keystroke Search input */}
                            <div className="relative flex-1 min-w-[260px]">
                                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Enter invoice # or vendor name and hit Enter..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={handleSearchKeyDown}
                                    className="pl-9 pr-9 h-10"
                                />
                                {search && (
                                    <button onClick={() => { setSearch(''); router.get('/warehouse/purchases', { ...filters, search: null }); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                        <X className="size-4" />
                                    </button>
                                )}
                            </div>

                            {/* Status Filter */}
                            <Select value={status} onValueChange={(v) => { setStatus(v); applyFilters({ status: v }); }}>
                                <SelectTrigger className="w-[160px] h-10"><SelectValue placeholder="Status" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Lifecycles</SelectItem>
                                    <SelectItem value="draft">Draft State</SelectItem>
                                    <SelectItem value="confirmed">Confirmed Stock</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Controls Button Toggles */}
                            <Button variant="outline" onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} className="h-10">
                                <Filter className="mr-2 size-4" /> {showAdvancedFilters ? "Hide" : "More"} Filters
                            </Button>

                            {(search || status !== 'all' || vendorId !== 'all' || warehouseId !== 'all' || startDate || endDate) && (
                                <Button variant="ghost" onClick={resetFilters} className="h-10 text-muted-foreground hover:text-foreground">
                                    Reset
                                </Button>
                            )}
                        </div>

                        {/* Collapsible Advanced Filtering Console panel */}
                        {showAdvancedFilters && (
                            <div className="grid gap-4 pt-3 border-t grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 animate-in fade-in duration-200">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><UserSquare className="size-3" /> Supplier Vendor</label>
                                    <Select value={vendorId} onValueChange={(v) => { setVendorId(v); applyFilters({ vendor_id: v }); }}>
                                        <SelectTrigger className="h-10"><SelectValue placeholder="Select Supplier" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Active Vendors</SelectItem>
                                            {vendors.map(v => <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Building2 className="size-3" /> Warehouse Location</label>
                                    <Select value={warehouseId} onValueChange={(v) => { setWarehouseId(v); applyFilters({ warehouse_id: v }); }}>
                                        <SelectTrigger className="h-10"><SelectValue placeholder="Select Warehouse" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Warehouses</SelectItem>
                                            {warehouses.map(w => <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Calendar className="size-3" /> From Purchase Date</label>
                                    <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); applyFilters({ start_date: e.target.value }); }} className="h-10" />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Calendar className="size-3" /> To Purchase Date</label>
                                    <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); applyFilters({ end_date: e.target.value }); }} className="h-10" />
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ── Table Grid Dataset Representation ── */}
                <Card className="shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/40">
                            <TableRow>
                                <TableHead className="font-semibold">Invoice ID</TableHead>
                                <TableHead className="font-semibold">Date</TableHead>
                                <TableHead className="font-semibold">Vendor Supplier</TableHead>
                                <TableHead className="font-semibold">Item Count</TableHead>
                                <TableHead className="text-right font-semibold">Subtotal</TableHead>
                                <TableHead className="text-right font-semibold">Tax Collected</TableHead>
                                <TableHead className="text-right font-semibold">Grand Total</TableHead>
                                <TableHead className="font-semibold">Status</TableHead>
                                <TableHead className="text-right font-semibold">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {purchases.data.length > 0 ? (
                                purchases.data.map((purchase) => {
                                    const isProcessing = processingId === purchase.id;
                                    return (
                                        <TableRow key={purchase.id} className="hover:bg-muted/20 transition-colors">
                                            <TableCell className="font-mono font-bold text-primary">{purchase.invoice_no}</TableCell>
                                            <TableCell>{new Date(purchase.purchase_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</TableCell>
                                            <TableCell>
                                                <div className="font-medium">{purchase.vendor?.name}</div>
                                                <div className="text-xs text-muted-foreground">{purchase.vendor?.phone}</div>
                                            </TableCell>
                                            <TableCell><Badge variant="outline" className="px-2">{purchase.items_count} SKU items</Badge></TableCell>
                                            <TableCell className="text-right font-mono text-muted-foreground">{INR(purchase.subtotal)}</TableCell>
                                            <TableCell className="text-right font-mono text-muted-foreground">{INR(purchase.tax_amount)}</TableCell>
                                            <TableCell className="text-right font-mono font-semibold text-foreground">{INR(purchase.total_amount)}</TableCell>
                                            <TableCell>
                                                <Badge variant={purchase.status === 'confirmed' ? 'default' : 'secondary'} className={`capitalize font-medium tracking-wide ${purchase.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : 'bg-amber-100 text-amber-800 hover:bg-amber-100'}`}>
                                                    {purchase.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" onClick={() => router.get(`/warehouse/purchases/${purchase.id}`)} disabled={isProcessing} title="Inspect Inbound Invoice">
                                                        {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4 text-muted-foreground hover:text-foreground" />}
                                                    </Button>
                                                    {purchase.status === 'draft' && (
                                                        <>
                                                            <Button variant="ghost" size="icon" onClick={() => router.get(`/warehouse/purchases/${purchase.id}/edit`)} disabled={isProcessing} title="Modify Entry Configuration">
                                                                <Edit2 className="size-4 text-blue-500" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" onClick={() => setConfirmDialog({ open: true, purchase, warehouseId: warehouses[0]?.id.toString() ?? '' })} disabled={isProcessing} className="text-emerald-600 hover:bg-emerald-50" title="Ingest Directly to Inventory">
                                                                <Check className="size-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" onClick={() => setDeleteDialog({ open: true, purchase })} disabled={isProcessing} className="text-destructive hover:bg-destructive/10" title="Purge Record Structure">
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
                                    <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                                        No documented purchase data packages matches current selected filters console criteria.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>

                    {/* ── Standard Server-Driven Pagination Footer Navigation Controls bar ── */}
                    {purchases.last_page > 1 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/20">
                            <div className="text-sm text-muted-foreground">
                                Showing page <span className="font-semibold text-foreground">{purchases.current_page}</span> of <span className="font-semibold text-foreground">{purchases.last_page}</span> tracking <span className="font-semibold text-foreground">{purchases.total}</span> entries
                            </div>
                            <div className="flex items-center gap-1">
                                {purchases.links.map((link, i) => {
                                    // Filter down structural labels out from displaying as text characters
                                    const isNavLabel = link.label.includes('&laquo;') || link.label.includes('&raquo;');
                                    let cleanLabel = link.label;
                                    if (link.label.includes('&laquo;')) cleanLabel = "‹ Previous";
                                    if (link.label.includes('&raquo;')) cleanLabel = "Next ›";

                                    return (
                                        <Button
                                            key={i}
                                            variant={link.active ? "default" : "outline"}
                                            size={isNavLabel ? "default" : "sm"}
                                            disabled={!link.url}
                                            onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                                            className={`h-9 min-w-[36px] ${!link.url && 'opacity-40 cursor-not-allowed'}`}
                                        >
                                            {cleanLabel}
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}
