import { Head, router } from '@inertiajs/react';
import React, { useState, useRef } from 'react';
import {
    Search, Download, Package, TrendingUp, Eye,
    ArrowUpDown, Barcode, X, AlertTriangle, CircleDot, Printer
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Inventory Levels', href: '/warehouse/inventory' }];

type Category = { id: number; name: string };
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
    product_barcodes: { barcode: string; is_primary: boolean }[];
};

type Props = {
    inventory: { data: ProductStock[]; current_page: number; last_page: number; total: number };
    categories: Category[];
    totalProducts: number;
    outOfStockCount: number;
    totalStockValue: number;
    variantsWithoutBarcode: number;
    filters: Record<string, string>;
};

export default function InventoryIndexPage({
    inventory, categories, totalProducts, outOfStockCount, totalStockValue, variantsWithoutBarcode, filters
}: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [catFilter, setCatFilter] = useState(filters.category_id ?? 'all');
    const [stockFilter, setStockFilter] = useState(filters.stock_status ?? 'all');
    const [sortBy, setSortBy] = useState(filters.sort_by ?? 'name');
    const [sortOrder, setSortOrder] = useState(filters.sort_order ?? 'asc');
    const searchRef = useRef<HTMLInputElement>(null);

    const buildParams = (overrides: Record<string, string> = {}) => ({
        ...(search && { search }),
        ...(catFilter !== 'all' && { category_id: catFilter }),
        ...(stockFilter !== 'all' && { stock_status: stockFilter }),
        sort_by: sortBy,
        sort_order: sortOrder,
        ...overrides,
    });

    const applyFilters = (overrides: Record<string, string> = {}) => {
        router.visit('/warehouse/inventory', {
            data: buildParams(overrides),
            preserveState: true,
            replace: true,
        });
    };

    // Search fires only on Enter — ideal for barcode scanner input
    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') applyFilters({ search });
    };

    const runSort = (column: string) => {
        const nextOrder = sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc';
        setSortBy(column);
        setSortOrder(nextOrder);
        applyFilters({ sort_by: column, sort_order: nextOrder });
    };

    const clearFilters = () => {
        setSearch('');
        setCatFilter('all');
        setStockFilter('all');
        router.visit('/warehouse/inventory', { replace: true });
        setTimeout(() => searchRef.current?.focus(), 100);
    };

    const hasActiveFilters = search || catFilter !== 'all' || stockFilter !== 'all';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inventory" />
            <div className="p-6 space-y-5">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Stock levels, reorder alerts, and barcode management
                        </p>
                    </div>
                    <div className="flex gap-2 w-fit">
                        <Button variant="outline" size="sm" className="h-9 text-xs w-fit" onClick={() => router.visit('/warehouse/inventory/print')}>
                            <Printer className="mr-1.5 h-3.5 w-3.5" /> Print Stock
                        </Button>
                        <Button variant="outline" size="sm" className="h-9 text-xs w-fit">
                            <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
                        </Button>
                    </div>
                </div>

                {/* Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <Card className="border-l-4 border-l-slate-700">
                        <CardContent className="pt-4 pb-4">
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total SKUs</p>
                                <Package className="h-4 w-4 text-slate-500" />
                            </div>
                            <p className="text-3xl font-black font-mono text-slate-900 dark:text-slate-100">{totalProducts}</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-emerald-600">
                        <CardContent className="pt-4 pb-4">
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stock Value</p>
                                <TrendingUp className="h-4 w-4 text-emerald-600" />
                            </div>
                            <p className="text-3xl font-black font-mono text-emerald-700">
                                ₹{Number(totalStockValue).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-red-600">
                        <CardContent className="pt-4 pb-4">
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Out of Stock</p>
                                <TrendingUp className="h-4 w-4 text-red-600" />
                            </div>
                            <p className="text-3xl font-black font-mono text-red-700">
                                {outOfStockCount}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-amber-500">
                        <CardContent className="pt-4 pb-4">
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Missing Barcodes</p>
                                <Barcode className="h-4 w-4 text-amber-500" />
                            </div>
                            <p className="text-3xl font-black font-mono text-amber-600">{variantsWithoutBarcode}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filter Bar */}
                <Card>
                    <div className="p-3 flex flex-wrap gap-3 items-end bg-muted/20 border-b">
                        {/* Barcode / search — fires on Enter */}
                        <div className="flex-1 min-w-[200px] max-w-xs space-y-1">
                            <Label className="text-xs font-semibold">Search / Scan Barcode</Label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    ref={searchRef}
                                    className="h-9 text-xs pl-8 font-mono"
                                    placeholder="Scan or type — press Enter"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    onKeyDown={handleSearchKeyDown}
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="w-44 space-y-1">
                            <Label className="text-xs font-semibold">Category</Label>
                            <Select value={catFilter} onValueChange={v => { setCatFilter(v); applyFilters({ category_id: v }); }}>
                                <SelectTrigger className="h-9 text-xs w-full"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {categories.map(c => (
                                        <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="w-44 space-y-1">
                            <Label className="text-xs font-semibold">Stock Status</Label>
                            <Select value={stockFilter} onValueChange={v => { setStockFilter(v); applyFilters({ stock_status: v }); }}>
                                <SelectTrigger className="h-9 text-xs w-full"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Items</SelectItem>
                                    <SelectItem value="low_stock">Low Stock</SelectItem>
                                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                                    <SelectItem value="no_barcode">Missing Barcode</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {hasActiveFilters && (
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-9 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 self-end"
                                onClick={clearFilters}
                            >
                                <X className="h-3.5 w-3.5 mr-1" /> Clear
                            </Button>
                        )}
                    </div>

                    {/* Table */}
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                <TableHead className="w-[40%]">
                                    <Button variant="ghost" size="sm" onClick={() => runSort('name')} className="text-xs -ml-2 font-semibold">
                                        Product <ArrowUpDown className="ml-1 h-3 w-3" />
                                    </Button>
                                </TableHead>
                                <TableHead className="text-right">
                                    <Button variant="ghost" size="sm" onClick={() => runSort('sku')} className="text-xs font-semibold">
                                        Available <ArrowUpDown className="ml-1 h-3 w-3" />
                                    </Button>
                                </TableHead>
                                <TableHead className="text-right text-xs font-semibold">Reserved</TableHead>
                                <TableHead className="text-right">
                                    <Button variant="ghost" size="sm" onClick={() => runSort('value')} className="text-xs font-semibold">
                                        Cost Price <ArrowUpDown className="ml-1 h-3 w-3" />
                                    </Button>
                                </TableHead>
                                <TableHead className="text-right text-xs font-semibold">Stock Value</TableHead>
                                <TableHead className="w-20 text-center text-xs font-semibold">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {inventory.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-16 text-muted-foreground text-sm">
                                        No inventory items match your filters.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                inventory.data.map((item) => {
                                    const isOut = item.total_available === 0;
                                    const isLow = !isOut && item.total_available <= item.reorder_level;
                                    const primaryBarcode = item.product_barcodes.find(b => b.is_primary)?.barcode;

                                    return (
                                        <TableRow
                                            key={item.product_variant_id}
                                            className="hover:bg-muted/30 transition-colors cursor-pointer"
                                            onClick={() => router.visit(`/warehouse/inventory/${item.product_variant_id}`)}
                                        >
                                            <TableCell>
                                                <div className="flex items-start gap-2">
                                                    {/* Stock status dot */}
                                                    <div className="mt-1 flex-shrink-0">
                                                        {isOut ? (
                                                            <CircleDot className="h-3 w-3 text-rose-500" />
                                                        ) : isLow ? (
                                                            <CircleDot className="h-3 w-3 text-amber-500" />
                                                        ) : (
                                                            <CircleDot className="h-3 w-3 text-emerald-500" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-sm">{item.product_name}</div>
                                                        <div className="flex flex-wrap items-center gap-x-2 mt-0.5 text-xs text-muted-foreground font-mono">
                                                            <span>{item.category_name}</span>
                                                            <span className="text-muted-foreground/40">·</span>
                                                            <span className="text-foreground/70">{item.sku}</span>
                                                            {item.variant_name && (
                                                                <>
                                                                    <span className="text-muted-foreground/40">·</span>
                                                                    <span>{item.variant_name}</span>
                                                                </>
                                                            )}
                                                            <span className="text-muted-foreground/40">·</span>
                                                            {primaryBarcode ? (
                                                                <span className="text-primary font-medium">{primaryBarcode}</span>
                                                            ) : (
                                                                <span className="text-amber-500 italic not-italic font-sans">No barcode</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>

                                            <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                                                <span className={`font-mono font-bold text-sm ${isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-foreground'}`}>
                                                    {item.total_available}
                                                </span>
                                                {/* <span className="text-[10px] text-muted-foreground ml-0.5">{item.unit_symbol}</span>
                                                {isOut && (
                                                    <div className="text-[10px] text-rose-500 font-semibold mt-0.5">OUT OF STOCK</div>
                                                )}
                                                {isLow && (
                                                    <div className="text-[10px] text-amber-500 font-semibold mt-0.5">LOW STOCK</div>
                                                )} */}
                                            </TableCell>

                                            <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                                {item.total_reserved}
                                                <span className="ml-0.5 text-[10px]">{item.unit_symbol}</span>
                                            </TableCell>

                                            <TableCell className="text-right font-mono text-xs">
                                                ₹{Number(item.cost_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </TableCell>

                                            <TableCell className="text-right font-mono font-bold text-sm">
                                                ₹{Number(item.total_available * item.cost_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </TableCell>

                                            <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                                                <div className="flex justify-center gap-1">
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-7 w-7"
                                                        onClick={() => router.visit(`/warehouse/inventory/${item.product_variant_id}`)}
                                                        title="View Details"
                                                    >
                                                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-7 w-7 text-indigo-600 hover:bg-indigo-50"
                                                        onClick={() => router.visit(`/warehouse/barcode/${item.product_variant_id}`)}
                                                        title="Manage Barcode"
                                                    >
                                                        <Barcode className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination */}
                    {inventory.last_page > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t text-xs text-muted-foreground">
                            <span>
                                Page {inventory.current_page} of {inventory.last_page} &mdash; {inventory.total} items
                            </span>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    disabled={inventory.current_page === 1}
                                    onClick={() => applyFilters({ page: String(inventory.current_page - 1) })}
                                >
                                    Previous
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    disabled={inventory.current_page === inventory.last_page}
                                    onClick={() => applyFilters({ page: String(inventory.current_page + 1) })}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}
