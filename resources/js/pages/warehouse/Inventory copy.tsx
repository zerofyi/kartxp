import { Head, router } from '@inertiajs/react';
import React, { useState } from 'react';
import {
    Search,
    Filter,
    Download,
    Package,
    AlertTriangle,
    TrendingUp,
    Eye,
    ArrowUpDown,
    Warehouse as WarehouseIcon,
    Barcode
} from 'lucide-react';

import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import type { BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: dashboard().url },
    { title: 'Inventory', href: '' },
];

type Category = {
    id: number;
    name: string;
};

type Warehouse = {
    id: number;
    name: string;
    location?: string;
};

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
    batches: {
        batch_no: string;
        expiry_date: string | null;
        quantity: number;
        warehouse_name: string;
    }[];
    product_barcodes: {
        barcode: string;
        is_primary: boolean;
    }[];
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
    inventory = [],
    categories = [],
    warehouses = [],
    lowStockCount = 0,
    outOfStockCount = 0,
    totalProducts = 0,
    totalStockValue = 0,
    variantsWithoutBarcode = 0,
}: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
    const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
    const [sortBy, setSortBy] = useState<'name' | 'stock' | 'value'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [view, setView] = useState<'summary' | 'detailed'>('summary');

    // Filter inventory
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
        if (stockFilter === 'in_stock') {
            matchesStock = item.total_available > item.reorder_level;
        } else if (stockFilter === 'low_stock') {
            matchesStock = item.total_available > 0 && item.total_available <= item.reorder_level;
        } else if (stockFilter === 'out_of_stock') {
            matchesStock = item.total_available === 0;
        }

        return matchesSearch && matchesCategory && matchesWarehouse && matchesStock;
    });

    // Sort inventory
    const sortedInventory = [...filteredInventory].sort((a, b) => {
        let comparison = 0;

        if (sortBy === 'name') {
            comparison = a.product_name.localeCompare(b.product_name);
        } else if (sortBy === 'stock') {
            comparison = a.total_available - b.total_available;
        } else if (sortBy === 'value') {
            const valueA = a.total_available * a.cost_price;
            const valueB = b.total_available * b.cost_price;
            comparison = valueA - valueB;
        }

        return sortOrder === 'asc' ? comparison : -comparison;
    });

    const toggleSort = (column: 'name' | 'stock' | 'value') => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('asc');
        }
    };

    const getStockStatus = (item: ProductStock) => {
        if (item.total_available === 0) {
            return { label: 'Out of Stock', variant: 'destructive' as const };
        } else if (item.total_available <= item.reorder_level) {
            return { label: 'Low Stock', variant: 'secondary' as const };
        } else {
            return { label: 'In Stock', variant: 'default' as const };
        }
    };

    const handleExport = () => {
        const headers = ['SKU', 'Product Name', 'Variant', 'Category', 'Available', 'Reserved', 'Unit', 'Reorder Level', 'Cost Price', 'Stock Value'];
        const rows = sortedInventory.map((item) => [
            item.sku,
            item.product_name,
            item.variant_name,
            item.category_name,
            item.total_available,
            item.total_reserved,
            item.unit_symbol,
            item.reorder_level,
            item.cost_price,
            (item.total_available * item.cost_price),
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map((row) => row.join(',')),
        ].join('\n');

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
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardDescription>Total Products</CardDescription>
                                <Package className="size-4 text-muted-foreground" />
                            </div>
                            <CardTitle className="text-3xl">{totalProducts}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xs text-muted-foreground">
                                Active product variants
                            </div>
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
                            <div className="text-xs text-muted-foreground">
                                Total inventory value
                            </div>
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
                            <div className="text-xs text-muted-foreground">
                                Need reordering soon
                            </div>
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
                            <div className="text-xs text-muted-foreground">
                                Require immediate action
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <div className="flex gap-2">
                    <Card className='flex-1'>
                        <CardContent className="p-6">
                            <div className="grid gap-4 md:grid-cols-5">
                                <div className="space-y-2">
                                    <Label htmlFor="search">Search</Label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            id="search"
                                            placeholder="Product name or SKU..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="category">Category</Label>
                                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                        <SelectTrigger className='w-full'>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Categories</SelectItem>
                                            {categories.map((category) => (
                                                <SelectItem key={category.id} value={category.name}>
                                                    {category.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="warehouse">Warehouse</Label>
                                    <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                                        <SelectTrigger className='w-full'>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Warehouses</SelectItem>
                                            {warehouses.map((warehouse) => (
                                                <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                                                    {warehouse.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="stock_status">Stock Status</Label>
                                    <Select value={stockFilter} onValueChange={(value: any) => setStockFilter(value)}>
                                        <SelectTrigger className='w-full'>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Stock</SelectItem>
                                            <SelectItem value="in_stock">In Stock</SelectItem>
                                            <SelectItem value="low_stock">Low Stock</SelectItem>
                                            <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="view_type">View Type</Label>
                                    <Select value={view} onValueChange={(value: any) => setView(value)}>
                                        <SelectTrigger className='w-full'>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="summary">Summary View</SelectItem>
                                            <SelectItem value="detailed">Detailed View</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardDescription>Products Without Barcode</CardDescription>
                                <AlertTriangle className="size-4 text-muted-foreground" />
                            </div>
                            <CardTitle className="text-3xl">{variantsWithoutBarcode}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xs text-muted-foreground">
                                Products without barcode assigned
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Inventory Table */}
                <Card className="flex-1 overflow-hidden">
                    <CardContent className="p-0">
                        <div className="overflow-auto max-h-150">
                            <Table>
                                <TableHeader className="sticky top-0 bg-muted/50">
                                    <TableRow>
                                        {/* <TableHead className="w-25">SKU</TableHead> */}
                                        <TableHead>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => toggleSort('name')}
                                                className="h-8 px-2"
                                            >
                                                Product Name
                                                <ArrowUpDown className="ml-2 size-3" />
                                            </Button>
                                        </TableHead>
                                        {/* <TableHead>Category</TableHead> */}
                                        {view === 'summary' ? (
                                            <>
                                                <TableHead className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => toggleSort('stock')}
                                                        className="h-8 px-2"
                                                    >
                                                        Available
                                                        <ArrowUpDown className="ml-2 size-3" />
                                                    </Button>
                                                </TableHead>
                                                <TableHead className="text-right">Reserved</TableHead>
                                                {/* <TableHead className="text-right">Reorder Level</TableHead> */}
                                            </>
                                        ) : (
                                            <>
                                                {warehouses.map((warehouse) => (
                                                    <TableHead key={warehouse.id} className="text-right">
                                                        {warehouse.name}
                                                    </TableHead>
                                                ))}
                                            </>
                                        )}
                                        <TableHead className="text-right">Cost Price</TableHead>
                                        <TableHead className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => toggleSort('value')}
                                                className="h-8 px-2"
                                            >
                                                Stock Value
                                                <ArrowUpDown className="ml-2 size-3" />
                                            </Button>
                                        </TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedInventory.length > 0 ? (
                                        sortedInventory.map((item) => {
                                            const status = getStockStatus(item);
                                            const stockValue = item.total_available * item.cost_price;

                                            return (
                                                <TableRow key={item.product_variant_id}>
                                                    {/* <TableCell className="font-mono text-xs">{item.sku}</TableCell> */}
                                                    <TableCell className='px-4'>
                                                        <div>
                                                            <div className="font-medium">{item.product_name} - {item.variant_name}</div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {item.category_name} - {item.sku} - {item.product_barcodes.find(b => b.is_primary)?.barcode || 'No barcode'}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    {/* <TableCell>
                                                        <Badge variant="outline">{item.category_name}</Badge>
                                                    </TableCell> */}
                                                    {view === 'summary' ? (
                                                        <>
                                                            <TableCell className="text-right font-medium">
                                                                {item.total_available} {item.unit_symbol}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                {item.total_reserved} {item.unit_symbol}
                                                            </TableCell>
                                                            {/* <TableCell className="text-right text-muted-foreground">
                                                                {item.reorder_level} {item.unit_symbol}
                                                            </TableCell> */}
                                                        </>
                                                    ) : (
                                                        <>
                                                            {warehouses.map((warehouse) => {
                                                                const warehouseStock = item.warehouse_stocks.find(
                                                                    ws => ws.warehouse_id === warehouse.id
                                                                );
                                                                return (
                                                                    <TableCell key={warehouse.id} className="text-right">
                                                                        {warehouseStock ? (
                                                                            <div>
                                                                                <div className="font-medium">
                                                                                    {warehouseStock.available_quantity}
                                                                                </div>
                                                                                {warehouseStock.reserved_quantity > 0 && (
                                                                                    <div className="text-xs text-muted-foreground">
                                                                                        ({warehouseStock.reserved_quantity} reserved)
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            '-'
                                                                        )}
                                                                    </TableCell>
                                                                );
                                                            })}
                                                        </>
                                                    )}
                                                    <TableCell className="text-right">
                                                        ₹{item.cost_price}
                                                    </TableCell>
                                                    <TableCell className="text-right font-semibold">
                                                        ₹{stockValue}
                                                    </TableCell>
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
                                                        {item.product_barcodes.find(b => b.is_primary)?.barcode && (
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
                                        })
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={view === 'summary' ? 10 : 6 + warehouses.length} className="h-24 text-center text-muted-foreground">
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

                {/* Summary Stats */}
                {sortedInventory.length > 0 && (
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">
                                    Showing {sortedInventory.length} of {inventory.length} products
                                </span>
                                <span className="font-medium">
                                    Total Filtered Stock Value: ₹
                                    {sortedInventory.reduce((sum, item) => sum + (item.total_available * item.cost_price), 0)}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
