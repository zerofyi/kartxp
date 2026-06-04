import { Head, router } from '@inertiajs/react';
import React from 'react';
import { ArrowLeft, Package, Calendar, MapPin, TrendingUp, TrendingDown } from 'lucide-react';

import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import type { BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
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

type ProductVariant = {
    id: number;
    product_name: string;
    variant_name: string;
    sku: string;
    category_name: string;
    unit_symbol: string;
    reorder_level: number;
    cost_price: number;
    selling_price: number;
    mrp: number;
};

type WarehouseStock = {
    warehouse_id: number;
    warehouse_name: string;
    warehouse_location: string;
    available_quantity: number;
    reserved_quantity: number;
};

type Batch = {
    id: number;
    batch_no: string;
    expiry_date: string | null;
    received_quantity: number;
    available_quantity: number;
    warehouse_name: string;
    purchase_invoice_no: string;
    purchase_date: string;
};

type StockMovement = {
    id: number;
    movement_type: 'IN' | 'OUT';
    quantity: number;
    warehouse_name: string;
    batch_no: string;
    source_type: string;
    created_at: string;
    remarks: string;
};

type Props = {
    product: ProductVariant;
    warehouseStocks: WarehouseStock[];
    batches: Batch[];
    stockMovements: StockMovement[];
    totalAvailable: number;
    totalReserved: number;
};

export default function InventoryDetails({
    product,
    warehouseStocks = [],
    batches = [],
    stockMovements = [],
    totalAvailable = 0,
    totalReserved = 0
}: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: dashboard().url },
        { title: 'Inventory', href: '/inventory' },
        { title: product.sku, href: '' },
    ];

    const totalStock = totalAvailable + totalReserved;
    const stockValue = totalAvailable * product.cost_price;
    const isLowStock = totalAvailable <= product.reorder_level;

    // Get expiring batches (within 30 days)
    const expiringBatches = batches.filter(batch => {
        if (!batch.expiry_date) return false;
        const expiryDate = new Date(batch.expiry_date);
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        return expiryDate <= thirtyDaysFromNow && expiryDate >= new Date();
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Inventory - ${product.sku}`} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-2xl">{product.product_name}</CardTitle>
                                <CardDescription className="mt-1">
                                    {product.variant_name} • SKU: {product.sku}
                                </CardDescription>
                            </div>
                            <Button variant="outline" onClick={() => router.get('/inventory')}>
                                <ArrowLeft className="mr-2 size-4" />
                                Back to Inventory
                            </Button>
                        </div>
                    </CardHeader>
                </Card>

                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardDescription>Total Available</CardDescription>
                            <CardTitle className="text-3xl">
                                {totalAvailable} {product.unit_symbol}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLowStock && (
                                <Badge variant="secondary" className="text-xs">
                                    Low Stock Alert
                                </Badge>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardDescription>Reserved Stock</CardDescription>
                            <CardTitle className="text-3xl">
                                {totalReserved} {product.unit_symbol}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xs text-muted-foreground">
                                Allocated for orders
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardDescription>Stock Value</CardDescription>
                            <CardTitle className="text-3xl">₹{stockValue}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xs text-muted-foreground">
                                At cost price
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardDescription>Reorder Level</CardDescription>
                            <CardTitle className="text-3xl">
                                {product.reorder_level} {product.unit_symbol}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xs text-muted-foreground">
                                Minimum stock threshold
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Product Details */}
                <Card>
                    <CardHeader>
                        <CardTitle>Product Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                                <div className="text-sm text-muted-foreground">Category</div>
                                <Badge variant="outline">{product.category_name}</Badge>
                            </div>
                            <div className="space-y-2">
                                <div className="text-sm text-muted-foreground">Cost Price</div>
                                <div className="text-lg font-semibold">₹{product.cost_price}</div>
                            </div>
                            <div className="space-y-2">
                                <div className="text-sm text-muted-foreground">Selling Price</div>
                                <div className="text-lg font-semibold">₹{product.selling_price}</div>
                            </div>
                            <div className="space-y-2">
                                <div className="text-sm text-muted-foreground">MRP</div>
                                <div className="text-lg font-semibold">₹{product.mrp}</div>
                            </div>
                            <div className="space-y-2">
                                <div className="text-sm text-muted-foreground">Unit</div>
                                <div className="text-lg font-semibold">{product.unit_symbol}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Expiring Batches Alert */}
                {expiringBatches.length > 0 && (
                    <Card className="border-yellow-600">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Calendar className="size-5 text-yellow-600" />
                                <CardTitle className="text-yellow-600">Expiring Soon</CardTitle>
                            </div>
                            <CardDescription>
                                {expiringBatches.length} batch(es) expiring within 30 days
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {expiringBatches.map((batch) => (
                                    <div key={batch.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                                        <div>
                                            <div className="font-medium">{batch.batch_no}</div>
                                            <div className="text-sm text-muted-foreground">
                                                {batch.warehouse_name} • {batch.available_quantity} {product.unit_symbol}
                                            </div>
                                        </div>
                                        <Badge variant="secondary">
                                            Expires: {new Date(batch.expiry_date!).toLocaleDateString()}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Warehouse Stock Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle>Stock by Warehouse</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Warehouse</TableHead>
                                    <TableHead>Location</TableHead>
                                    <TableHead className="text-right">Available</TableHead>
                                    <TableHead className="text-right">Reserved</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {warehouseStocks.length > 0 ? (
                                    warehouseStocks.map((stock) => (
                                        <TableRow key={stock.warehouse_id}>
                                            <TableCell className="font-medium">{stock.warehouse_name}</TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {stock.warehouse_location || '-'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {stock.available_quantity} {product.unit_symbol}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {stock.reserved_quantity} {product.unit_symbol}
                                            </TableCell>
                                            <TableCell className="text-right font-semibold">
                                                {stock.available_quantity + stock.reserved_quantity} {product.unit_symbol}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                            No stock in any warehouse
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Batch Details */}
                <Card>
                    <CardHeader>
                        <CardTitle>Batch Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Batch No</TableHead>
                                    <TableHead>Warehouse</TableHead>
                                    <TableHead>Invoice No</TableHead>
                                    <TableHead>Purchase Date</TableHead>
                                    <TableHead className="text-right">Received</TableHead>
                                    <TableHead className="text-right">Available</TableHead>
                                    <TableHead>Expiry Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {batches.length > 0 ? (
                                    batches.map((batch) => (
                                        <TableRow key={batch.id}>
                                            <TableCell className="font-mono font-medium">{batch.batch_no}</TableCell>
                                            <TableCell>{batch.warehouse_name}</TableCell>
                                            <TableCell className="font-mono text-sm">
                                                {batch.purchase_invoice_no}
                                            </TableCell>
                                            <TableCell>
                                                {new Date(batch.purchase_date).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {batch.received_quantity} {product.unit_symbol}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {batch.available_quantity} {product.unit_symbol}
                                            </TableCell>
                                            <TableCell>
                                                {batch.expiry_date ? (
                                                    <Badge variant="outline">
                                                        {new Date(batch.expiry_date).toLocaleDateString()}
                                                    </Badge>
                                                ) : (
                                                    '-'
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                            No batch information available
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Stock Movement History */}
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Stock Movements</CardTitle>
                        <CardDescription>Last 50 transactions</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Date & Time</TableHead>
                                    <TableHead>Warehouse</TableHead>
                                    <TableHead>Batch No</TableHead>
                                    <TableHead className="text-right">Quantity</TableHead>
                                    <TableHead>Source</TableHead>
                                    <TableHead>Remarks</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stockMovements.length > 0 ? (
                                    stockMovements.map((movement) => (
                                        <TableRow key={movement.id}>
                                            <TableCell>
                                                {movement.movement_type === 'IN' ? (
                                                    <Badge variant="default" className="gap-1">
                                                        <TrendingUp className="size-3" />
                                                        IN
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="gap-1">
                                                        <TrendingDown className="size-3" />
                                                        OUT
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {new Date(movement.created_at).toLocaleString()}
                                            </TableCell>
                                            <TableCell>{movement.warehouse_name}</TableCell>
                                            <TableCell className="font-mono text-sm">
                                                {movement.batch_no}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {movement.movement_type === 'IN' ? '+' : '-'}
                                                {movement.quantity} {product.unit_symbol}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-xs">
                                                    {movement.source_type.split('\\').pop()}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {movement.remarks}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                            No stock movements recorded
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
