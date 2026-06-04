import { Head, router } from '@inertiajs/react';
import React, { useState, useEffect } from 'react';
import {
    Search,
    Plus,
    Edit2,
    Save,
    X,
    Trash2,
    Check,
    FileText,
    Calendar,
    Package,
    ShoppingCart,
    Upload,
    Eye,
    Image as ImageIcon,
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
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

type Warehouse = {
    id: number;
    name: string;
    location?: string;
};

type Product = {
    id: number;
    name: string;
    sku: string;
    unit: string;
    mrp: number;
    selling_price: number;
    cost_price: number;
    tax_percent: number;
    barcode?: string;
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

type Props = {
    purchases: Purchase[];
    vendors: Vendor[];
    warehouses: Warehouse[];
    products: Product[];
};

// ─────────────────────────────────────────────
// PurchaseFormModal
// ─────────────────────────────────────────────
function PurchaseFormModal({
    purchase,
    vendors,
    warehouses,
    products,
    onClose,
}: {
    purchase?: Purchase;
    vendors: Vendor[];
    warehouses: Warehouse[];
    products: Product[];
    onClose: () => void;
}) {
    const isEdit = !!purchase;
    const [formData, setFormData] = useState({
        vendor_id: purchase?.vendor_id.toString() || '',
        invoice_no: purchase?.invoice_no || '',
        purchase_date: purchase?.purchase_date || new Date().toISOString().split('T')[0],
        warehouse_id: warehouses[0]?.id.toString() || '',
        status: purchase?.status || 'draft',
    });

    const [items, setItems] = useState<PurchaseItem[]>(
        purchase?.items?.map((item) => ({
            id: item.id,
            product_variant_id: item.product_variant_id.toString(),
            quantity: item.quantity.toString(),
            cost_price: item.cost_price.toString(),
            selling_price: item.selling_price.toString(),
            mrp: item.mrp.toString(),
            tax_percent: item.tax_percent.toString(),
            batch_no: item.batch_no,
            expiry_date: item.expiry_date || '',
        })) || [
            {
                product_variant_id: '',
                quantity: '',
                cost_price: '',
                selling_price: '',
                mrp: '',
                tax_percent: '',
                batch_no: '',
                expiry_date: '',
            },
        ],
    );

    const [barcodeSearch, setBarcodeSearch] = useState('');
    const [invoiceImage, setInvoiceImage] = useState<File | null>(null);

    // Calculate totals
    const calculateTotals = () => {
        let subtotal = 0;
        let taxAmount = 0;

        items.forEach((item) => {
            const qty = parseFloat(item.quantity) || 0;
            const cost = parseFloat(item.cost_price) || 0;
            const tax = parseFloat(item.tax_percent) || 0;

            const itemTotal = qty * cost;
            const itemTax = (itemTotal * tax) / 100;

            subtotal += itemTotal;
            taxAmount += itemTax;
        });

        return {
            subtotal: subtotal.toFixed(2),
            taxAmount: taxAmount.toFixed(2),
            total: (subtotal + taxAmount).toFixed(2),
        };
    };

    const totals = calculateTotals();

    // Handle barcode scan
    useEffect(() => {
        if (barcodeSearch.length > 3) {
            const product = products.find((p) => p.barcode === barcodeSearch || p.sku === barcodeSearch);
            if (product) {
                addProductToItems(product);
                setBarcodeSearch('');
            }
        }
    }, [barcodeSearch]);

    const addProductToItems = (product: Product) => {
        const existingIndex = items.findIndex((item) => item.product_variant_id === product.id.toString());

        if (existingIndex >= 0) {
            // Increment quantity if product already exists
            updateItem(existingIndex, 'quantity', (parseFloat(items[existingIndex].quantity) + 1).toString());
        } else {
            // Add new item
            setItems([
                ...items,
                {
                    product_variant_id: product.id.toString(),
                    product_name: product.name,
                    quantity: '1',
                    cost_price: product.cost_price.toString(),
                    selling_price: product.selling_price.toString(),
                    mrp: product.mrp.toString(),
                    tax_percent: product.tax_percent.toString(),
                    batch_no: '',
                    expiry_date: '',
                },
            ]);
        }
    };

    const addItem = () => {
        setItems([
            ...items,
            {
                product_variant_id: '',
                quantity: '',
                cost_price: '',
                selling_price: '',
                mrp: '',
                tax_percent: '',
                batch_no: '',
                expiry_date: '',
            },
        ]);
    };

    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const updateItem = (index: number, field: string, value: string) => {
        setItems(
            items.map((item, i) => {
                if (i === index) {
                    const updated = { ...item, [field]: value };

                    // Auto-fill prices when product is selected
                    if (field === 'product_variant_id' && value) {
                        const product = products.find((p) => p.id.toString() === value);
                        if (product) {
                            updated.cost_price = product.cost_price.toString();
                            updated.selling_price = product.selling_price.toString();
                            updated.mrp = product.mrp.toString();
                            updated.tax_percent = product.tax_percent.toString();
                            updated.product_name = product.name;
                        }
                    }

                    return updated;
                }
                return item;
            }),
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const formDataToSend = new FormData();
        formDataToSend.append('vendor_id', formData.vendor_id);
        formDataToSend.append('invoice_no', formData.invoice_no);
        formDataToSend.append('purchase_date', formData.purchase_date);
        formDataToSend.append('warehouse_id', formData.warehouse_id);
        formDataToSend.append('status', formData.status);

        if (invoiceImage) {
            formDataToSend.append('invoice_image', invoiceImage);
        }

        items.forEach((item, index) => {
            if (item.id) formDataToSend.append(`items[${index}][id]`, item.id.toString());
            formDataToSend.append(`items[${index}][product_variant_id]`, item.product_variant_id);
            formDataToSend.append(`items[${index}][quantity]`, item.quantity);
            formDataToSend.append(`items[${index}][cost_price]`, item.cost_price);
            formDataToSend.append(`items[${index}][selling_price]`, item.selling_price);
            formDataToSend.append(`items[${index}][mrp]`, item.mrp);
            formDataToSend.append(`items[${index}][tax_percent]`, item.tax_percent);
            formDataToSend.append(`items[${index}][batch_no]`, item.batch_no);
            if (item.expiry_date) formDataToSend.append(`items[${index}][expiry_date]`, item.expiry_date);
        });

        if (isEdit) {
            formDataToSend.append('_method', 'PUT');
            router.post(`/purchases/${purchase.id}`, formDataToSend, {
                onSuccess: () => onClose(),
            });
        } else {
            router.post('/purchases', formDataToSend, {
                onSuccess: () => onClose(),
            });
        }
    };

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl">
                        {isEdit ? 'Edit Purchase' : 'New Purchase'}
                    </DialogTitle>
                    <DialogDescription>
                        {isEdit ? 'Update purchase details' : 'Create a new purchase order'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Header Info */}
                    <div className="grid gap-4 md:grid-cols-4">
                        <div className="space-y-2">
                            <Label htmlFor="vendor">Vendor *</Label>
                            <Select value={formData.vendor_id} onValueChange={(value) => setFormData({ ...formData, vendor_id: value })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Vendor" />
                                </SelectTrigger>
                                <SelectContent>
                                    {vendors.map((vendor) => (
                                        <SelectItem key={vendor.id} value={vendor.id.toString()}>
                                            {vendor.name} - {vendor.phone}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="invoice_no">Invoice No *</Label>
                            <Input
                                id="invoice_no"
                                value={formData.invoice_no}
                                onChange={(e) => setFormData({ ...formData, invoice_no: e.target.value })}
                                placeholder="INV-001"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="purchase_date">Purchase Date *</Label>
                            <Input
                                id="purchase_date"
                                type="date"
                                value={formData.purchase_date}
                                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="warehouse">Warehouse *</Label>
                            <Select value={formData.warehouse_id} onValueChange={(value) => setFormData({ ...formData, warehouse_id: value })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Warehouse" />
                                </SelectTrigger>
                                <SelectContent>
                                    {warehouses.map((warehouse) => (
                                        <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                                            {warehouse.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Invoice Image Upload */}
                    <div className="space-y-2">
                        <Label htmlFor="invoice_image">Invoice Image</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                id="invoice_image"
                                type="file"
                                accept="image/*"
                                onChange={(e) => setInvoiceImage(e.target.files?.[0] || null)}
                            />
                            {purchase?.image_path && (
                                <Button type="button" variant="outline" size="sm">
                                    <Eye className="mr-2 size-4" />
                                    View
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Barcode Scanner */}
                    <div className="space-y-2">
                        <Label htmlFor="barcode">Scan Barcode/SKU</Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="barcode"
                                value={barcodeSearch}
                                onChange={(e) => setBarcodeSearch(e.target.value)}
                                placeholder="Scan or type barcode/SKU..."
                                className="pl-9"
                            />
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold">Purchase Items</Label>
                            <Button type="button" onClick={addItem} size="sm">
                                <Plus className="mr-2 size-4" />
                                Add Item
                            </Button>
                        </div>

                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[300px]">Product *</TableHead>
                                        <TableHead className="w-[100px]">Qty *</TableHead>
                                        <TableHead>Cost *</TableHead>
                                        <TableHead>Selling</TableHead>
                                        <TableHead>MRP *</TableHead>
                                        <TableHead>Tax %</TableHead>
                                        <TableHead>Batch No *</TableHead>
                                        <TableHead>Expiry</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((item, index) => {
                                        const itemTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.cost_price) || 0);
                                        const itemTax = (itemTotal * (parseFloat(item.tax_percent) || 0)) / 100;
                                        const grandTotal = itemTotal + itemTax;

                                        return (
                                            <TableRow key={index}>
                                                <TableCell>
                                                    <Select
                                                        value={item.product_variant_id}
                                                        onValueChange={(value) => updateItem(index, 'product_variant_id', value)}
                                                    >
                                                        <SelectTrigger className="h-9">
                                                            <SelectValue placeholder="Select Product" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {products.map((product) => (
                                                                <SelectItem key={product.id} value={product.id.toString()}>
                                                                    {product.name} ({product.sku})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        value={item.quantity}
                                                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                                        className="h-9"
                                                        min="1"
                                                        required
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        value={item.cost_price}
                                                        onChange={(e) => updateItem(index, 'cost_price', e.target.value)}
                                                        className="h-9"
                                                        required
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        value={item.selling_price}
                                                        onChange={(e) => updateItem(index, 'selling_price', e.target.value)}
                                                        className="h-9"
                                                        required
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        value={item.mrp}
                                                        onChange={(e) => updateItem(index, 'mrp', e.target.value)}
                                                        className="h-9"
                                                        required
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        value={item.tax_percent}
                                                        onChange={(e) => updateItem(index, 'tax_percent', e.target.value)}
                                                        className="h-9"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        value={item.batch_no}
                                                        onChange={(e) => updateItem(index, 'batch_no', e.target.value)}
                                                        className="h-9"
                                                        placeholder="BATCH-001"
                                                        required
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="date"
                                                        value={item.expiry_date}
                                                        onChange={(e) => updateItem(index, 'expiry_date', e.target.value)}
                                                        className="h-9"
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    ₹{grandTotal.toFixed(2)}
                                                </TableCell>
                                                <TableCell>
                                                    {items.length > 1 && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => removeItem(index)}
                                                            className="h-9 w-9 text-destructive"
                                                        >
                                                            <Trash2 className="size-4" />
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {/* Totals */}
                    <Card>
                        <CardContent className="p-4">
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Subtotal:</span>
                                    <span className="font-medium">₹{totals.subtotal}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Tax Amount:</span>
                                    <span className="font-medium">₹{totals.taxAmount}</span>
                                </div>
                                <div className="flex justify-between border-t pt-2 text-base">
                                    <span className="font-semibold">Total Amount:</span>
                                    <span className="font-bold">₹{totals.total}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Status & Actions */}
                    <div className="flex items-center justify-between gap-4 border-t pt-4">
                        <div className="flex items-center gap-4">
                            <Label htmlFor="status">Status:</Label>
                            <Select value={formData.status} onValueChange={(value: 'draft' | 'confirmed') => setFormData({ ...formData, status: value })}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="draft">Save as Draft</SelectItem>
                                    <SelectItem value="confirmed">Confirm Purchase</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex gap-3">
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit">
                                <Save className="mr-2 size-4" />
                                {isEdit ? 'Update' : 'Create'} Purchase
                            </Button>
                        </div>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// ─────────────────────────────────────────────
// Main Purchases Component
// ─────────────────────────────────────────────
export default function Purchases({ purchases = [], vendors = [], warehouses = [], products = [] }: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'confirmed'>('all');
    const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
    const [showNewPurchaseModal, setShowNewPurchaseModal] = useState(false);

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
            router.delete(`/purchases/${purchase.id}`);
        }
    };

    const handleConfirm = (purchase: Purchase) => {
        if (confirm('Confirm this purchase? This will update stock levels.')) {
            router.post(`/purchases/${purchase.id}/confirm`, {
                warehouse_id: warehouses[0]?.id,
            });
        }
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
                            <Button onClick={() => setShowNewPurchaseModal(true)}>
                                <Plus className="mr-2 size-4" />
                                New Purchase
                            </Button>
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
                                <SelectTrigger className="w-[180px]">
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
                                            <TableCell className="text-right">₹{purchase.subtotal.toFixed(2)}</TableCell>
                                            <TableCell className="text-right">₹{purchase.tax_amount.toFixed(2)}</TableCell>
                                            <TableCell className="text-right font-semibold">
                                                ₹{purchase.total_amount.toFixed(2)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={purchase.status === 'confirmed' ? 'default' : 'secondary'}>
                                                    {purchase.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    {purchase.status === 'draft' && (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => setEditingPurchase(purchase)}
                                                            >
                                                                <Edit2 className="size-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleConfirm(purchase)}
                                                            >
                                                                <Check className="size-4 text-green-600" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleDelete(purchase)}
                                                                className="text-destructive"
                                                            >
                                                                <Trash2 className="size-4" />
                                                            </Button>
                                                        </>
                                                    )}
                                                    {purchase.status === 'confirmed' && (
                                                        <Button variant="ghost" size="icon">
                                                            <Eye className="size-4" />
                                                        </Button>
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

            {/* Modals */}
            {showNewPurchaseModal && (
                <PurchaseFormModal
                    vendors={vendors}
                    warehouses={warehouses}
                    products={products}
                    onClose={() => setShowNewPurchaseModal(false)}
                />
            )}

            {editingPurchase && (
                <PurchaseFormModal
                    purchase={editingPurchase}
                    vendors={vendors}
                    warehouses={warehouses}
                    products={products}
                    onClose={() => setEditingPurchase(null)}
                />
            )}
        </AppLayout>
    );
}
