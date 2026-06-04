import { Head, router, useForm } from '@inertiajs/react';
import React, { useState } from 'react';
import {
    Search, Filter, Download, Package, AlertTriangle,
    TrendingUp, Eye, ArrowUpDown, Barcode, Wand2, X
} from 'lucide-react';

import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import type { BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

import axios from 'axios';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: dashboard().url },
    { title: 'Inventory', href: '' },
];

type Category = { id: number; name: string };
type Warehouse = { id: number; name: string; location?: string };
type ProductStock = {
    product_variant_id: number;
    product_name: string;
    variant_name: string;
    sku: string;
    category_name: string;
    unit_symbol: string;
    total_available: number;
    total_reserved: number;
    reorder_level: number;
    cost_price: number;
    selling_price: number;
    mrp: number;
    warehouse_stocks: {
        warehouse_id: number;
        warehouse_name: string;
        available_quantity: number;
        reserved_quantity: number;
    }[];
    batches: { batch_no: string; expiry_date: string | null; quantity: number; warehouse_name: string }[];
    product_barcodes: { barcode: string; is_primary: boolean }[];
};

type Props = {
    inventory: ProductStock[];
    categories: Category[];
    warehouses: Warehouse[];
    lowStockCount: number;
    outOfStockCount: number;
    totalProducts: number;
    totalStockValue: number;
    variantsWithoutBarcode: number;
};

export default function Inventory({
    inventory = [], categories = [], warehouses = [],
    lowStockCount = 0, outOfStockCount = 0, totalProducts = 0,
    totalStockValue = 0, variantsWithoutBarcode = 0,
}: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
    const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock' | 'no_barcode'>('all');
    const [sortBy, setSortBy] = useState<'name' | 'stock' | 'value'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [view, setView] = useState<'summary' | 'detailed'>('summary');

    // Barcode modal state
    const [barcodeModal, setBarcodeModal] = useState<{ open: boolean; item: ProductStock | null }>({ open: false, item: null });
    const [barcodeInput, setBarcodeInput] = useState('');
    const [suggesting, setSuggesting] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [barcodeError, setBarcodeError] = useState('');

    const openBarcodeModal = (item: ProductStock) => {
        setBarcodeModal({ open: true, item });
        setBarcodeInput('');
        setBarcodeError('');
    };

    const closeBarcodeModal = () => {
        setBarcodeModal({ open: false, item: null });
        setBarcodeInput('');
        setBarcodeError('');
    };

    const suggestBarcode = async () => {
        if (!barcodeModal.item) return;
        setSuggesting(true);
        try {
            const { data } = await axios.post('inventory/barcode/suggest', {
                product_variant_id: barcodeModal.item.product_variant_id,
            });
            if (data.barcode) setBarcodeInput(data.barcode);
        } catch {
            setBarcodeError('Failed to suggest barcode.');
        } finally {
            setSuggesting(false);
        }
    };

    const submitBarcode = () => {
        if (!barcodeInput.trim()) {
            setBarcodeError('Please enter or generate a barcode.');
            return;
        }
        if (!barcodeModal.item) return;
        setSubmitting(true);
        router.post('/warehouse/inventory/barcode', {
            product_variant_id: barcodeModal.item.product_variant_id,
            barcode: barcodeInput.trim(),
        }, {
            onSuccess: () => { closeBarcodeModal(); setSubmitting(false); },
            onError: (errors) => {
                setBarcodeError(errors.barcode ?? 'Something went wrong.');
                setSubmitting(false);
            },
        });
    };

    // Filter
    const filteredInventory = inventory.filter((item) => {
        const matchesSearch =
            item.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.product_barcodes.some(b => b.barcode.toLowerCase().includes(searchQuery.toLowerCase())) ||
            item.variant_name.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesCategory = categoryFilter === 'all' || item.category_name === categoryFilter;
        const matchesWarehouse = warehouseFilter === 'all' ||
            item.warehouse_stocks.some(ws => ws.warehouse_id.toString() === warehouseFilter);

        let matchesStock = true;
        if (stockFilter === 'in_stock') matchesStock = item.total_available > item.reorder_level;
        else if (stockFilter === 'low_stock') matchesStock = item.total_available > 0 && item.total_available <= item.reorder_level;
        else if (stockFilter === 'out_of_stock') matchesStock = item.total_available === 0;
        else if (stockFilter === 'no_barcode') matchesStock = item.product_barcodes.length === 0;

        return matchesSearch && matchesCategory && matchesWarehouse && matchesStock;
    });

    const sortedInventory = [...filteredInventory].sort((a, b) => {
        let comparison = 0;
        if (sortBy === 'name') comparison = a.product_name.localeCompare(b.product_name);
        else if (sortBy === 'stock') comparison = a.total_available - b.total_available;
        else if (sortBy === 'value') comparison = (a.total_available * a.cost_price) - (b.total_available * b.cost_price);
        return sortOrder === 'asc' ? comparison : -comparison;
    });

    const toggleSort = (column: 'name' | 'stock' | 'value') => {
        if (sortBy === column) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        else { setSortBy(column); setSortOrder('asc'); }
    };

    const getStockStatus = (item: ProductStock) => {
        if (item.total_available === 0) return { label: 'Out of Stock', variant: 'destructive' as const };
        if (item.total_available <= item.reorder_level) return { label: 'Low Stock', variant: 'secondary' as const };
        return { label: 'In Stock', variant: 'default' as const };
    };

    const handleExport = () => {
        const headers = ['SKU', 'Product Name', 'Variant', 'Category', 'Available', 'Reserved', 'Unit', 'Reorder Level', 'Cost Price', 'Stock Value'];
        const rows = sortedInventory.map((item) => [
            item.sku, item.product_name, item.variant_name, item.category_name,
            item.total_available, item.total_reserved, item.unit_symbol,
            item.reorder_level, item.cost_price, item.total_available * item.cost_price,
        ]);
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inventory" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-2xl">Inventory Management</CardTitle>
                                <CardDescription>Monitor stock levels across all warehouses</CardDescription>
                            </div>
                            <Button onClick={handleExport} variant="outline">
                                <Download className="mr-2 size-4" />
                                Export CSV
                            </Button>
                        </div>
                    </CardHeader>
                </Card>

                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-5">
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardDescription>Total Products</CardDescription>
                                <Package className="size-4 text-muted-foreground" />
                            </div>
                            <CardTitle className="text-3xl">{totalProducts}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xs text-muted-foreground">Active product variants</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardDescription>Stock Value</CardDescription>
                                <TrendingUp className="size-4 text-muted-foreground" />
                            </div>
                            <CardTitle className="text-3xl">₹{totalStockValue.toFixed(0)}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xs text-muted-foreground">Total inventory value</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardDescription>Low Stock Items</CardDescription>
                                <AlertTriangle className="size-4 text-yellow-600" />
                            </div>
                            <CardTitle className="text-3xl text-yellow-600">{lowStockCount}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xs text-muted-foreground">Need reordering soon</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardDescription>Out of Stock</CardDescription>
                                <AlertTriangle className="size-4 text-destructive" />
                            </div>
                            <CardTitle className="text-3xl text-destructive">{outOfStockCount}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xs text-muted-foreground">Require immediate action</div>
                        </CardContent>
                    </Card>

                    {/* Clickable No Barcode Card */}
                    <Card
                        className={`cursor-pointer transition-all hover:ring-2 hover:ring-primary ${stockFilter === 'no_barcode' ? 'ring-2 ring-primary bg-primary/5' : ''}`}
                        onClick={() => setStockFilter(stockFilter === 'no_barcode' ? 'all' : 'no_barcode')}
                    >
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardDescription>Without Barcode</CardDescription>
                                <Barcode className={`size-4 ${stockFilter === 'no_barcode' ? 'text-primary' : 'text-muted-foreground'}`} />
                            </div>
                            <CardTitle className={`text-3xl ${stockFilter === 'no_barcode' ? 'text-primary' : ''}`}>
                                {variantsWithoutBarcode}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xs text-muted-foreground">
                                {stockFilter === 'no_barcode' ? 'Click to show all' : 'Click to filter'}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card>
                    <CardContent className="p-6">
                        <div className="grid gap-4 md:grid-cols-5">
                            <div className="space-y-2">
                                <Label>Search</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        placeholder="Product name or SKU..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Categories</SelectItem>
                                        {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Warehouse</Label>
                                <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Warehouses</SelectItem>
                                        {warehouses.map(w => <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Stock Status</Label>
                                <Select value={stockFilter} onValueChange={(v: any) => setStockFilter(v)}>
                                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Stock</SelectItem>
                                        <SelectItem value="in_stock">In Stock</SelectItem>
                                        <SelectItem value="low_stock">Low Stock</SelectItem>
                                        <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                                        <SelectItem value="no_barcode">Without Barcode</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>View Type</Label>
                                <Select value={view} onValueChange={(v: any) => setView(v)}>
                                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="summary">Summary View</SelectItem>
                                        <SelectItem value="detailed">Detailed View</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Inventory Table */}
                <Card className="flex-1 overflow-hidden">
                    <CardContent className="p-0">
                        <div className="overflow-auto max-h-150">
                            <Table>
                                <TableHeader className="sticky top-0 bg-muted/50">
                                    <TableRow>
                                        <TableHead>
                                            <Button variant="ghost" size="sm" onClick={() => toggleSort('name')} className="h-8 px-2">
                                                Product Name <ArrowUpDown className="ml-2 size-3" />
                                            </Button>
                                        </TableHead>
                                        {view === 'summary' ? (
                                            <>
                                                <TableHead className="text-right">
                                                    <Button variant="ghost" size="sm" onClick={() => toggleSort('stock')} className="h-8 px-2">
                                                        Available <ArrowUpDown className="ml-2 size-3" />
                                                    </Button>
                                                </TableHead>
                                                <TableHead className="text-right">Reserved</TableHead>
                                            </>
                                        ) : (
                                            warehouses.map(w => <TableHead key={w.id} className="text-right">{w.name}</TableHead>)
                                        )}
                                        <TableHead className="text-right">Cost Price</TableHead>
                                        <TableHead className="text-right">
                                            <Button variant="ghost" size="sm" onClick={() => toggleSort('value')} className="h-8 px-2">
                                                Stock Value <ArrowUpDown className="ml-2 size-3" />
                                            </Button>
                                        </TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedInventory.length > 0 ? sortedInventory.map((item) => {
                                        const status = getStockStatus(item);
                                        const stockValue = Number((item.total_available * item.cost_price).toFixed(2));
                                        const hasBarcode = item.product_barcodes.length > 0;

                                        return (
                                            <TableRow key={item.product_variant_id}>
                                                <TableCell className="px-4">
                                                    <div>
                                                        <div className="font-medium">{item.product_name} - {item.variant_name}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {item.category_name} · {item.sku} ·{' '}
                                                            {hasBarcode
                                                                ? item.product_barcodes.find(b => b.is_primary)?.barcode
                                                                : <span className="text-amber-500 font-medium">No barcode</span>
                                                            }
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                {view === 'summary' ? (
                                                    <>
                                                        <TableCell className="text-right font-medium">{item.total_available}</TableCell>
                                                        <TableCell className="text-right">{item.total_reserved}</TableCell>
                                                    </>
                                                ) : (
                                                    warehouses.map(w => {
                                                        const ws = item.warehouse_stocks.find(s => s.warehouse_id === w.id);
                                                        return (
                                                            <TableCell key={w.id} className="text-right">
                                                                {ws ? (
                                                                    <div>
                                                                        <div className="font-medium">{ws.available_quantity}</div>
                                                                        {ws.reserved_quantity > 0 && (
                                                                            <div className="text-xs text-muted-foreground">({ws.reserved_quantity} reserved)</div>
                                                                        )}
                                                                    </div>
                                                                ) : '-'}
                                                            </TableCell>
                                                        );
                                                    })
                                                )}
                                                <TableCell className="text-right">₹{item.cost_price}</TableCell>
                                                <TableCell className="text-right font-semibold">₹{stockValue}</TableCell>
                                                <TableCell>
                                                    <Badge variant={status.variant}>{status.label}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => router.get(`/warehouse/inventory/${item.product_variant_id}`)}
                                                    >
                                                        <Eye className="size-4" />
                                                    </Button>
                                                    {!hasBarcode ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-amber-500 hover:text-amber-600"
                                                            title="Generate barcode"
                                                            onClick={() => openBarcodeModal(item)}
                                                        >
                                                            <Barcode className="size-4" />
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => router.get(`/warehouse/barcode/${item.product_variant_id}`)}
                                                        >
                                                            <Barcode className="size-4" />
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    }) : (
                                        <TableRow>
                                            <TableCell colSpan={view === 'summary' ? 8 : 5 + warehouses.length} className="h-24 text-center text-muted-foreground">
                                                {searchQuery || categoryFilter !== 'all' || warehouseFilter !== 'all' || stockFilter !== 'all'
                                                    ? 'No products match your filters.'
                                                    : 'No inventory data available.'}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {/* Footer */}
                {sortedInventory.length > 0 && (
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">
                                    Showing {sortedInventory.length} of {inventory.length} products
                                </span>
                                <span className="font-medium">
                                    Total Filtered Stock Value: ₹{sortedInventory.reduce((sum, item) => sum + (item.total_available * item.cost_price), 0)}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Barcode Modal */}
            <Dialog open={barcodeModal.open} onOpenChange={(open) => !open && closeBarcodeModal()}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Assign Barcode</DialogTitle>
                        <DialogDescription>
                            {barcodeModal.item && (
                                <span className="font-medium text-foreground">
                                    {barcodeModal.item.product_name} – {barcodeModal.item.variant_name}
                                </span>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="barcode-input">Barcode</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="barcode-input"
                                    placeholder="Enter or generate a barcode..."
                                    value={barcodeInput}
                                    onChange={(e) => { setBarcodeInput(e.target.value); setBarcodeError(''); }}
                                    className={barcodeError ? 'border-destructive' : ''}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    title="Auto-suggest a unique barcode"
                                    onClick={suggestBarcode}
                                    disabled={suggesting}
                                    className="shrink-0 hover:border-primary hover:text-primary"
                                >
                                    {suggesting
                                        ? <span className="animate-spin text-sm">⟳</span>
                                        : <Wand2 className="size-4" />
                                    }
                                </Button>
                            </div>
                            {barcodeError && (
                                <p className="text-xs text-destructive">{barcodeError}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                                Click the wand icon to auto-generate a unique EAN-13 barcode, or enter one manually.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={closeBarcodeModal} disabled={submitting}>Cancel</Button>
                        <Button onClick={submitBarcode} disabled={submitting || !barcodeInput.trim()}>
                            {submitting ? 'Saving...' : 'Assign Barcode'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
