import { Head, router } from '@inertiajs/react';
import React, { useState } from 'react';
import { Search, Plus, Edit2, Trash2, Check, Eye, FileText } from 'lucide-react';

import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import type { BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: dashboard().url },
    { title: 'Purchases', href: '' },
];

type Vendor = {
    id: number;
    name: string;
    phone: string;
    gstin?: string;
};

type PurchaseItem = {
    id?: number;
    product_variant_id: string;
    product_name?: string;
    quantity: string;
    cost_price: string;
    selling_price: string;
    mrp: string;
    tax_percent: string;
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
    created_by?: number;
    created_at: string;
};

type Warehouse = {
    id: number;
    name: string;
    location?: string;
};

type Props = {
    purchases: Purchase[];
    warehouses: Warehouse[];
};

export default function PurchaseList({ purchases = [], warehouses = [] }: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'confirmed'>('all');

    const filteredPurchases = purchases.filter((purchase) => {
        const matchesSearch =
            purchase.invoice_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
            purchase.vendor?.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || purchase.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const handleDelete = (purchase: Purchase) => {
        if (purchase.status === 'confirmed') {
            alert('Cannot delete confirmed purchase');
            return;
        }

        if (confirm('Are you sure you want to delete this purchase?')) {
            router.delete(`/warehouse/purchases/${purchase.id}`);
        }
    };

    const handleConfirm = (purchase: Purchase) => {
        if (confirm('Confirm this purchase? This will update stock levels.')) {
            router.post(`/warehouse/purchases/${purchase.id}/confirm`, {
                warehouse_id: warehouses[0]?.id,
            });
        }
    };

    const handleViewDetails = (purchaseId: number) => {
        router.get(`/warehouse/purchases/${purchaseId}`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Purchases" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
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
                                    <FileText className="mr-2 size-4" />
                                    Reports
                                </Button>
                                <Button onClick={() => router.get('/warehouse/purchases/create')}>
                                    <Plus className="mr-2 size-4" />
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
                                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search by invoice or vendor..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                                <SelectTrigger className="w-45">
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

                {/* Purchases Table */}
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
                                    filteredPurchases.map((purchase) => (
                                        <TableRow key={purchase.id} className="hover:bg-accent/50">
                                            <TableCell className="font-mono font-medium">{purchase.invoice_no}</TableCell>
                                            <TableCell>
                                                {new Date(purchase.purchase_date).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium">{purchase.vendor?.name}</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {purchase.vendor?.phone}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{purchase.items?.length || 0} items</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">₹{purchase.subtotal}</TableCell>
                                            <TableCell className="text-right">₹{purchase.tax_amount}</TableCell>
                                            <TableCell className="text-right font-semibold">
                                                ₹{purchase.total_amount}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={purchase.status === 'confirmed' ? 'default' : 'secondary'}>
                                                    {purchase.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleViewDetails(purchase.id)}
                                                        title="View Details"
                                                    >
                                                        <Eye className="size-4" />
                                                    </Button>
                                                    {purchase.status === 'draft' && (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => router.get(`/warehouse/purchases/${purchase.id}/edit`)}
                                                                title="Edit"
                                                            >
                                                                <Edit2 className="size-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleConfirm(purchase)}
                                                                title="Confirm Purchase"
                                                            >
                                                                <Check className="size-4 text-green-600" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleDelete(purchase)}
                                                                className="text-destructive"
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="size-4" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                                            {searchQuery || statusFilter !== 'all'
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
