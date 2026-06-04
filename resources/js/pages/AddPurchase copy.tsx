import { Head, router } from '@inertiajs/react';
import React, { useState, useEffect } from 'react';
import { Search, Plus, Save, X, Trash2, ArrowLeft } from 'lucide-react';

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
    { title: 'Purchases', href: '/warehouse/purchases' },
    { title: 'New Purchase', href: '' },
];

type Vendor = {
    id: number;
    name: string;
    phone: string;
    gstin?: string;
    user_id: number;
};

type Warehouse = {
    id: number;
    name: string;
    location?: string;
    user_id: number;
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

type Props = {
    vendors: Vendor[];
    warehouses: Warehouse[];
    products: Product[];
};

export default function AddPurchase({ vendors = [], warehouses = [], products = [] }: Props) {
    const [formData, setFormData] = useState({
        vendor_id: '',
        invoice_no: '',
        purchase_date: new Date().toISOString().split('T')[0],
        warehouse_id: warehouses[0]?.id.toString() || '',
        status: 'draft' as 'draft' | 'confirmed',
    });

    const [items, setItems] = useState<PurchaseItem[]>([
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
            updateItem(existingIndex, 'quantity', (parseFloat(items[existingIndex].quantity) + 1).toString());
        } else {
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
            formDataToSend.append(`items[${index}][product_variant_id]`, item.product_variant_id);
            formDataToSend.append(`items[${index}][quantity]`, item.quantity);
            formDataToSend.append(`items[${index}][cost_price]`, item.cost_price);
            formDataToSend.append(`items[${index}][selling_price]`, item.selling_price);
            formDataToSend.append(`items[${index}][mrp]`, item.mrp);
            formDataToSend.append(`items[${index}][tax_percent]`, item.tax_percent);
            formDataToSend.append(`items[${index}][batch_no]`, item.batch_no);
            if (item.expiry_date) formDataToSend.append(`items[${index}][expiry_date]`, item.expiry_date);
        });

        router.post('/warehouse/purchases', formDataToSend, {
            onSuccess: () => router.get('/warehouse/purchases'),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="New Purchase" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-2xl">New Purchase</CardTitle>
                                <CardDescription>Create a new purchase order</CardDescription>
                            </div>
                            <Button variant="outline" onClick={() => router.get('/warehouse/purchases')}>
                                <ArrowLeft className="mr-2 size-4" />
                                Back to List
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Header Info */}
                            <div className="grid gap-4 md:grid-cols-4">
                                <div className="space-y-2">
                                    <Label htmlFor="vendor">Vendor *</Label>
                                    <Select value={formData.vendor_id} onValueChange={(value) => setFormData({ ...formData, vendor_id: value })}>
                                        <SelectTrigger className='w-full'>
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
                                        <SelectTrigger className='w-full'>
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

                            {/* Barcode Scanner */}
                            <div className="space-y-2">
                                <Label htmlFor="barcode">Scan Barcode/SKU</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="barcode"
                                        autoFocus={true}
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
                                                <TableHead className="w-75">Product *</TableHead>
                                                <TableHead className="w-25">Qty *</TableHead>
                                                <TableHead>Cost *</TableHead>
                                                <TableHead>Min Selling *</TableHead>
                                                <TableHead>Selling *</TableHead>
                                                <TableHead>MRP *</TableHead>
                                                <TableHead>Tax %</TableHead>
                                                <TableHead>Batch No *</TableHead>
                                                <TableHead>Expiry</TableHead>
                                                <TableHead className="text-right">Amount</TableHead>
                                                <TableHead className="w-12.5"></TableHead>
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
                                                                <SelectTrigger className="w-full">
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
                                        <SelectTrigger className="w-45">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="draft">Save as Draft</SelectItem>
                                            <SelectItem value="confirmed">Confirm Purchase</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center gap-4">
                                    <Label htmlFor="invoice_image">Invoice</Label>
                                    <Input
                                        id="invoice_image"
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setInvoiceImage(e.target.files?.[0] || null)}
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <Button type="button" variant="outline" onClick={() => router.get('/warehouse/purchases')}>
                                        Cancel
                                    </Button>
                                    <Button type="submit">
                                        <Save className="mr-2 size-4" />
                                        Create Purchase
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
