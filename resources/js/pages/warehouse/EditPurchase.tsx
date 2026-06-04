import { Head, router } from '@inertiajs/react';
import React, { useState, useEffect } from 'react';
import { Search, Plus, Save, Trash2, ArrowLeft } from 'lucide-react';

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

type TaxCategory = {
    id: number;
    name: string;
    tax_percent: number;
    type: 'inclusive' | 'exclusive';
};

type Product = {
    id: number;
    name: string;
    sku: string;
    unit: string;
    mrp: number;
    min_selling_price: string;
    selling_price: number;
    cost_price: number;
    tax_id: number;
    barcode?: string;
};

type PurchaseItem = {
    id?: number;
    product_variant_id: string;
    product_name?: string;
    quantity: string;
    cost_price: string;
    min_selling_price: string;
    selling_price: string;
    mrp: string;
    tax_id: string;
    tax_category?: TaxCategory;
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
    purchase: Purchase;
    vendors: Vendor[];
    warehouses: Warehouse[];
    products: Product[];
    taxCategories: TaxCategory[];
};

export default function EditPurchase({ purchase, vendors = [], warehouses = [], products = [], taxCategories = [] }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: dashboard().url },
        { title: 'Purchases', href: '/warehouse/purchases' },
        { title: `Edit ${purchase.invoice_no}`, href: '' },
    ];

    const [formData, setFormData] = useState({
        vendor_id: purchase.vendor_id.toString(),
        invoice_no: purchase.invoice_no,
        purchase_date: purchase.purchase_date,
        warehouse_id: warehouses[0]?.id.toString() || '',
        status: purchase.status,
    });

    const [items, setItems] = useState<PurchaseItem[]>(
        purchase.items?.map((item) => ({
            id: item.id,
            product_variant_id: item.product_variant_id.toString(),
            quantity: item.quantity.toString(),
            cost_price: item.cost_price.toString(),
            min_selling_price: item.min_selling_price?.toString() || '0',
            selling_price: item.selling_price.toString(),
            mrp: item.mrp.toString(),
            tax_id: item.tax_id?.toString() || item.tax_category?.id.toString() || '',
            batch_no: item.batch_no,
            expiry_date: item.expiry_date || '',
        })) || []
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
            const taxCategory = taxCategories.find(t => t.id.toString() === item.tax_id);

            if (taxCategory) {
                if (taxCategory.type === 'inclusive') {
                    // For inclusive tax: cost_price already includes tax
                    const baseAmount = (qty * cost) / (1 + (taxCategory.tax_percent / 100));
                    const itemTax = (qty * cost) - baseAmount;

                    subtotal += baseAmount;
                    taxAmount += itemTax;
                } else {
                    // For exclusive tax: tax is added on top
                    const itemTotal = qty * cost;
                    const itemTax = (itemTotal * taxCategory.tax_percent) / 100;

                    subtotal += itemTotal;
                    taxAmount += itemTax;
                }
            }
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
                    min_selling_price: product.min_selling_price.toString(),
                    selling_price: product.selling_price.toString(),
                    mrp: product.mrp.toString(),
                    tax_id: product.tax_id.toString(),
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
                min_selling_price: '',
                selling_price: '',
                mrp: '',
                tax_id: '',
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
                            updated.min_selling_price = product.min_selling_price.toString();
                            updated.selling_price = product.selling_price.toString();
                            updated.mrp = product.mrp.toString();
                            updated.tax_id = product.tax_id.toString();
                            updated.product_name = product.name;
                        }
                    }

                    return updated;
                }
                return item;
            }),
        );
    };

    const calculateItemTotal = (item: PurchaseItem) => {
        const qty = parseFloat(item.quantity) || 0;
        const cost = parseFloat(item.cost_price) || 0;
        const taxCategory = taxCategories.find(t => t.id.toString() === item.tax_id);

        if (!taxCategory) return qty * cost;

        if (taxCategory.type === 'inclusive') {
            // For inclusive tax, the total is just qty * cost_price
            return qty * cost;
        } else {
            // For exclusive tax, add tax on top
            const itemTotal = qty * cost;
            const itemTax = (itemTotal * taxCategory.tax_percent) / 100;
            return itemTotal + itemTax;
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const formDataToSend = new FormData();
        formDataToSend.append('vendor_id', formData.vendor_id);
        formDataToSend.append('invoice_no', formData.invoice_no);
        formDataToSend.append('purchase_date', formData.purchase_date);
        formDataToSend.append('warehouse_id', formData.warehouse_id);
        formDataToSend.append('status', formData.status);
        formDataToSend.append('_method', 'PUT');

        if (invoiceImage) {
            formDataToSend.append('invoice_image', invoiceImage);
        }

        items.forEach((item, index) => {
            if (item.id) formDataToSend.append(`items[${index}][id]`, item.id.toString());
            formDataToSend.append(`items[${index}][product_variant_id]`, item.product_variant_id);
            formDataToSend.append(`items[${index}][quantity]`, item.quantity);
            formDataToSend.append(`items[${index}][cost_price]`, item.cost_price);
            formDataToSend.append(`items[${index}][min_selling_price]`, item.min_selling_price);
            formDataToSend.append(`items[${index}][selling_price]`, item.selling_price);
            formDataToSend.append(`items[${index}][mrp]`, item.mrp);
            formDataToSend.append(`items[${index}][tax_id]`, item.tax_id);
            formDataToSend.append(`items[${index}][batch_no]`, item.batch_no);
            if (item.expiry_date) formDataToSend.append(`items[${index}][expiry_date]`, item.expiry_date);
        });

        router.post(`/warehouse/purchases/${purchase.id}`, formDataToSend, {
            onSuccess: () => router.get('/warehouse/purchases'),
        });
    };

    if (purchase.status === 'confirmed') {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title={`Edit ${purchase.invoice_no}`} />
                <div className="flex h-full flex-1 items-center justify-center p-4">
                    <Card className="w-full max-w-md">
                        <CardHeader>
                            <CardTitle>Cannot Edit Purchase</CardTitle>
                            <CardDescription>This purchase has already been confirmed and cannot be edited.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button onClick={() => router.get('/warehouse/purchases')} className="w-full">
                                <ArrowLeft className="mr-2 size-4" />
                                Back to Purchases
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit ${purchase.invoice_no}`} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-2xl">
                                    Edit Purchase
                                </CardTitle>
                                <CardDescription>
                                    Update purchase details
                                </CardDescription>
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => router.get('/warehouse/purchases')}
                            >
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
                                    <Select
                                        value={formData.vendor_id}
                                        onValueChange={(value) =>
                                            setFormData({
                                                ...formData,
                                                vendor_id: value,
                                            })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Vendor" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {vendors.map((vendor) => (
                                                <SelectItem
                                                    key={vendor.id}
                                                    value={vendor.id.toString()}
                                                >
                                                    {vendor.name} -{' '}
                                                    {vendor.phone}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="invoice_no">
                                        Invoice No *
                                    </Label>
                                    <Input
                                        id="invoice_no"
                                        value={formData.invoice_no}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                invoice_no: e.target.value,
                                            })
                                        }
                                        placeholder="INV-001"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="purchase_date">
                                        Purchase Date *
                                    </Label>
                                    <Input
                                        id="purchase_date"
                                        type="date"
                                        value={
                                            formData.purchase_date
                                                ? formData.purchase_date.split(
                                                      'T',
                                                  )[0]
                                                : ''
                                        }
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                purchase_date: e.target.value,
                                            })
                                        }
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="warehouse">
                                        Warehouse *
                                    </Label>
                                    <Select
                                        value={formData.warehouse_id}
                                        onValueChange={(value) =>
                                            setFormData({
                                                ...formData,
                                                warehouse_id: value,
                                            })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Warehouse" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {warehouses.map((warehouse) => (
                                                <SelectItem
                                                    key={warehouse.id}
                                                    value={warehouse.id.toString()}
                                                >
                                                    {warehouse.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Invoice Image Upload */}
                            <div className="space-y-2">
                                <Label htmlFor="invoice_image">
                                    Invoice Image
                                </Label>
                                <Input
                                    id="invoice_image"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) =>
                                        setInvoiceImage(
                                            e.target.files?.[0] || null,
                                        )
                                    }
                                />
                                {purchase.image_path && !invoiceImage && (
                                    <p className="text-sm text-muted-foreground">
                                        Current image: {purchase.image_path}
                                    </p>
                                )}
                            </div>

                            {/* Barcode Scanner */}
                            <div className="space-y-2">
                                <Label htmlFor="barcode">
                                    Scan Barcode/SKU
                                </Label>
                                <div className="relative">
                                    <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="barcode"
                                        value={barcodeSearch}
                                        onChange={(e) =>
                                            setBarcodeSearch(e.target.value)
                                        }
                                        placeholder="Scan or type barcode/SKU..."
                                        className="pl-9"
                                    />
                                </div>
                            </div>

                            {/* Items Table */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-base font-semibold">
                                        Purchase Items
                                    </Label>
                                    <Button
                                        type="button"
                                        onClick={addItem}
                                        size="sm"
                                    >
                                        <Plus className="mr-2 size-4" />
                                        Add Item
                                    </Button>
                                </div>

                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-75">
                                                    Product *
                                                </TableHead>
                                                <TableHead className="w-25">
                                                    Qty *
                                                </TableHead>
                                                <TableHead>Cost *</TableHead>
                                                <TableHead>
                                                    Min Selling *
                                                </TableHead>
                                                <TableHead>Selling</TableHead>
                                                <TableHead>MRP *</TableHead>
                                                <TableHead>Tax *</TableHead>
                                                <TableHead>
                                                    Batch No *
                                                </TableHead>
                                                <TableHead>Expiry</TableHead>
                                                <TableHead className="text-right">
                                                    Amount
                                                </TableHead>
                                                <TableHead className="w-12.5"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {items.map((item, index) => {
                                                const grandTotal =
                                                    calculateItemTotal(item);
                                                const taxCategory =
                                                    taxCategories.find(
                                                        (t) =>
                                                            t.id.toString() ===
                                                            item.tax_id,
                                                    );

                                                return (
                                                    <TableRow key={index}>
                                                        <TableCell>
                                                            <Select
                                                                value={
                                                                    item.product_variant_id
                                                                }
                                                                onValueChange={(
                                                                    value,
                                                                ) =>
                                                                    updateItem(
                                                                        index,
                                                                        'product_variant_id',
                                                                        value,
                                                                    )
                                                                }
                                                            >
                                                                <SelectTrigger className="h-9">
                                                                    <SelectValue placeholder="Select Product" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {products.map(
                                                                        (
                                                                            product,
                                                                        ) => (
                                                                            <SelectItem
                                                                                key={
                                                                                    product.id
                                                                                }
                                                                                value={product.id.toString()}
                                                                            >
                                                                                {
                                                                                    product.name
                                                                                }{' '}
                                                                                (
                                                                                {
                                                                                    product.sku
                                                                                }
                                                                                )
                                                                            </SelectItem>
                                                                        ),
                                                                    )}
                                                                </SelectContent>
                                                            </Select>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                type="number"
                                                                value={
                                                                    item.quantity
                                                                }
                                                                onChange={(e) =>
                                                                    updateItem(
                                                                        index,
                                                                        'quantity',
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                className="h-9"
                                                                min="1"
                                                                required
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                value={
                                                                    item.cost_price
                                                                }
                                                                onChange={(e) =>
                                                                    updateItem(
                                                                        index,
                                                                        'cost_price',
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                className="h-9"
                                                                required
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                value={
                                                                    item.min_selling_price
                                                                }
                                                                onChange={(e) =>
                                                                    updateItem(
                                                                        index,
                                                                        'min_selling_price',
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                className="h-9"
                                                                required
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                value={
                                                                    item.selling_price
                                                                }
                                                                onChange={(e) =>
                                                                    updateItem(
                                                                        index,
                                                                        'selling_price',
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                className="h-9"
                                                                required
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                value={item.mrp}
                                                                onChange={(e) =>
                                                                    updateItem(
                                                                        index,
                                                                        'mrp',
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                className="h-9"
                                                                required
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Select
                                                                value={
                                                                    item.tax_id
                                                                }
                                                                onValueChange={(
                                                                    value,
                                                                ) =>
                                                                    updateItem(
                                                                        index,
                                                                        'tax_id',
                                                                        value,
                                                                    )
                                                                }
                                                            >
                                                                <SelectTrigger className="h-9">
                                                                    <SelectValue placeholder="Tax" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {taxCategories.map(
                                                                        (
                                                                            tax,
                                                                        ) => (
                                                                            <SelectItem
                                                                                key={
                                                                                    tax.id
                                                                                }
                                                                                value={tax.id.toString()}
                                                                            >
                                                                                {
                                                                                    tax.name
                                                                                }{' '}
                                                                                (
                                                                                {
                                                                                    tax.tax_percent
                                                                                }
                                                                                %{' '}
                                                                                {tax.type ===
                                                                                'inclusive'
                                                                                    ? 'Inc'
                                                                                    : 'Exc'}
                                                                                )
                                                                            </SelectItem>
                                                                        ),
                                                                    )}
                                                                </SelectContent>
                                                            </Select>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                value={
                                                                    item.batch_no
                                                                }
                                                                onChange={(e) =>
                                                                    updateItem(
                                                                        index,
                                                                        'batch_no',
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                className="h-9"
                                                                placeholder="BATCH-001"
                                                                required
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                type="date"
                                                                value={
                                                                    item.expiry_date
                                                                        ? item.expiry_date.split(
                                                                            'T',
                                                                        )[0]
                                                                        : ''
                                                                }
                                                                onChange={(e) =>
                                                                    updateItem(
                                                                        index,
                                                                        'expiry_date',
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                className="h-9"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium">
                                                            ₹
                                                            {grandTotal.toFixed(
                                                                2,
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {items.length >
                                                                1 && (
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() =>
                                                                        removeItem(
                                                                            index,
                                                                        )
                                                                    }
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
                                            <span className="text-muted-foreground">
                                                Subtotal:
                                            </span>
                                            <span className="font-medium">
                                                ₹{totals.subtotal}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">
                                                Tax Amount:
                                            </span>
                                            <span className="font-medium">
                                                ₹{totals.taxAmount}
                                            </span>
                                        </div>
                                        <div className="flex justify-between border-t pt-2 text-base">
                                            <span className="font-semibold">
                                                Total Amount:
                                            </span>
                                            <span className="font-bold">
                                                ₹{totals.total}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Status & Actions */}
                            <div className="flex items-center justify-between gap-4 border-t pt-4">
                                <div className="flex items-center gap-4">
                                    <Label htmlFor="status">Status:</Label>
                                    <Select
                                        value={formData.status}
                                        onValueChange={(
                                            value: 'draft' | 'confirmed',
                                        ) =>
                                            setFormData({
                                                ...formData,
                                                status: value,
                                            })
                                        }
                                    >
                                        <SelectTrigger className="w-45">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="draft">
                                                Save as Draft
                                            </SelectItem>
                                            <SelectItem value="confirmed">
                                                Confirm Purchase
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex gap-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => router.get('/warehouse/purchases')}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit">
                                        <Save className="mr-2 size-4" />
                                        Update Purchase
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
