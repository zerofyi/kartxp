import { Head, router } from '@inertiajs/react';
import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Save, X, Trash2, ArrowLeft, Zap, Settings } from 'lucide-react';

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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

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
    product_variant_id: string;
    product_name?: string;
    quantity: string;
    cost_price: string;
    min_selling_price: string;
    selling_price: string;
    mrp: string;
    tax_id: string;
    batch_no: string;
    expiry_date: string;
};

type Props = {
    vendors: Vendor[];
    warehouses: Warehouse[];
    products: Product[];
    taxCategories: TaxCategory[];
};

export default function AddPurchase({ vendors = [], warehouses = [], products = [], taxCategories = [] }: Props) {
    // Generate auto invoice number
    const generateInvoiceNo = () => {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
        return `INV-${year}${month}${day}-${random}`;
    };

    const [formData, setFormData] = useState({
        vendor_id: '',
        invoice_no: generateInvoiceNo(),
        purchase_date: new Date().toISOString().split('T')[0],
        warehouse_id: warehouses[0]?.id.toString() || '',
        status: 'draft' as 'draft' | 'confirmed',
    });

    const [items, setItems] = useState<PurchaseItem[]>([]);
    const [barcodeSearch, setBarcodeSearch] = useState('');
    const [invoiceImage, setInvoiceImage] = useState<File | null>(null);

    // Quick entry modal state
    const [quickEntryEnabled, setQuickEntryEnabled] = useState(true);
    const [showQuickModal, setShowQuickModal] = useState(false);
    const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
    const [quickFormData, setQuickFormData] = useState({
        quantity: '1',
        cost_price: '',
        min_selling_price: '',
        selling_price: '',
        mrp: '',
        tax_id: '',
        batch_no: '',
        expiry_date: '',
    });

    // Refs for keyboard navigation
    const barcodeInputRef = useRef<HTMLInputElement>(null);
    const qtyInputRef = useRef<HTMLInputElement>(null);
    const batchInputRef = useRef<HTMLInputElement>(null);
    const expiryInputRef = useRef<HTMLInputElement>(null);

    // Auto-focus barcode input on mount
    useEffect(() => {
        barcodeInputRef.current?.focus();
    }, []);

    // Generate batch number
    const generateBatchNo = () => {
        const date = new Date();
        const year = String(date.getFullYear()).slice(-2);
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
        return `0BN-${year}${month}${random}`;
    };

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
                    const baseAmount = (qty * cost) / (1 + (taxCategory.tax_percent / 100));
                    const itemTax = (qty * cost) - baseAmount;
                    subtotal += baseAmount;
                    taxAmount += itemTax;
                } else {
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
    // const handleBarcodeInput = (value: string) => {
    //     setBarcodeSearch(value);

    //     if (value.length > 3) {
    //         const product = products.find((p) =>
    //             p.barcode?.toLowerCase() === value.toLowerCase() ||
    //             p.sku.toLowerCase() === value.toLowerCase()
    //         );

    //         if (product) {
    //             if (quickEntryEnabled) {
    //                 // Open quick entry modal
    //                 setCurrentProduct(product);
    //                 setQuickFormData({
    //                     quantity: '1',
    //                     cost_price: product.cost_price.toString(),
    //                     min_selling_price: product.min_selling_price.toString(),
    //                     selling_price: product.selling_price.toString(),
    //                     mrp: product.mrp.toString(),
    //                     tax_id: product.tax_id.toString(),
    //                     batch_no: generateBatchNo(),
    //                     expiry_date: '',
    //                 });
    //                 setShowQuickModal(true);
    //                 setBarcodeSearch('');

    //                 // Focus quantity input after modal opens
    //                 setTimeout(() => qtyInputRef.current?.focus(), 100);
    //             } else {
    //                 // Add directly to table
    //                 addProductToItems(product);
    //                 setBarcodeSearch('');
    //             }
    //         } else {
    //             // Barcode not found - show error briefly
    //             alert('Product not found! Please check barcode/SKU');
    //             setBarcodeSearch('');
    //         }
    //     }
    // };

    const handleBarcodeInput = (value: string) => {
        setBarcodeSearch(value);
        // Don't search on every keystroke - wait for Enter or scanner completion
    };

    const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && barcodeSearch.length > 3) {
            e.preventDefault();
            searchBarcode(barcodeSearch);
        }
    };

    const searchBarcode = (value: string) => {
        const product = products.find((p) =>
            p.barcode?.toLowerCase() === value.toLowerCase() ||
            p.sku.toLowerCase() === value.toLowerCase()
        );

        if (product) {
            if (quickEntryEnabled) {
                setCurrentProduct(product);
                setQuickFormData({
                    quantity: '1',
                    cost_price: product.cost_price.toString(),
                    min_selling_price: product.min_selling_price.toString(),
                    selling_price: product.selling_price.toString(),
                    mrp: product.mrp.toString(),
                    tax_id: product.tax_id.toString(),
                    batch_no: generateBatchNo(),
                    expiry_date: '',
                });
                setShowQuickModal(true);
                setBarcodeSearch('');
                setTimeout(() => qtyInputRef.current?.focus(), 100);
            } else {
                addProductToItems(product);
                setBarcodeSearch('');
            }
        } else {
            alert('Product not found! Please check barcode/SKU');
            setBarcodeSearch('');
        }
    };

    const addProductToItems = (product: Product, customData?: any) => {
        const existingIndex = items.findIndex((item) =>
            item.product_variant_id === product.id.toString() &&
            item.batch_no === (customData?.batch_no || '')
        );

        if (existingIndex >= 0) {
            // Update existing item quantity
            const updatedItems = [...items];
            const newQty = parseFloat(updatedItems[existingIndex].quantity) + parseFloat(customData?.quantity || '1');
            updatedItems[existingIndex].quantity = newQty.toString();
            setItems(updatedItems);
        } else {
            // Add new item
            const newItem: PurchaseItem = {
                product_variant_id: product.id.toString(),
                product_name: product.name,
                quantity: customData?.quantity || '1',
                cost_price: customData?.cost_price || product.cost_price.toString(),
                min_selling_price: customData?.min_selling_price || product.min_selling_price.toString(),
                selling_price: customData?.selling_price || product.selling_price.toString(),
                mrp: customData?.mrp || product.mrp.toString(),
                tax_id: customData?.tax_id || product.tax_id.toString(),
                batch_no: customData?.batch_no || generateBatchNo(),
                expiry_date: customData?.expiry_date || '',
            };
            setItems([...items, newItem]);
        }
    };

    // Handle quick modal submit (F3)
    const handleQuickSubmit = () => {
        if (!currentProduct) return;

        if (!quickFormData.quantity || parseFloat(quickFormData.quantity) <= 0) {
            alert('Please enter a valid quantity');
            qtyInputRef.current?.focus();
            return;
        }

        addProductToItems(currentProduct, quickFormData);
        setShowQuickModal(false);
        setCurrentProduct(null);

        // Focus back to barcode input
        setTimeout(() => barcodeInputRef.current?.focus(), 100);
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
                batch_no: generateBatchNo(),
                expiry_date: '',
            },
        ]);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
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
                            if (!updated.batch_no) {
                                updated.batch_no = generateBatchNo();
                            }
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
            return qty * cost;
        } else {
            const itemTotal = qty * cost;
            const itemTax = (itemTotal * taxCategory.tax_percent) / 100;
            return itemTotal + itemTax;
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.vendor_id) {
            alert('Please select a vendor');
            return;
        }

        if (items.length === 0) {
            alert('Please add at least one item');
            return;
        }

        // Validate all items
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (!item.product_variant_id) {
                alert(`Item ${i + 1}: Please select a product`);
                return;
            }
            if (!item.quantity || parseFloat(item.quantity) <= 0) {
                alert(`Item ${i + 1}: Please enter valid quantity`);
                return;
            }
            if (!item.batch_no) {
                alert(`Item ${i + 1}: Please enter batch number`);
                return;
            }
        }

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
            formDataToSend.append(`items[${index}][min_selling_price]`, item.min_selling_price);
            formDataToSend.append(`items[${index}][selling_price]`, item.selling_price);
            formDataToSend.append(`items[${index}][mrp]`, item.mrp);
            formDataToSend.append(`items[${index}][tax_id]`, item.tax_id);
            formDataToSend.append(`items[${index}][batch_no]`, item.batch_no);
            if (item.expiry_date) formDataToSend.append(`items[${index}][expiry_date]`, item.expiry_date);
        });

        router.post('/warehouse/purchases', formDataToSend, {
            onSuccess: () => {
                alert('Purchase created successfully!');
                router.get('/warehouse/purchases');
            },
            onError: (errors) => {
                alert('Failed to create purchase: ' + (errors.error || Object.values(errors)[0] || 'Unknown error'));
            },
        });
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // F2 - Focus barcode input
            if (e.key === 'F2') {
                e.preventDefault();
                barcodeInputRef.current?.focus();
            }

            // F3 - Submit quick modal (only if modal is open)
            if (e.key === 'F3' && showQuickModal) {
                e.preventDefault();
                handleQuickSubmit();
            }

            // ESC - Close quick modal
            if (e.key === 'Escape' && showQuickModal) {
                setShowQuickModal(false);
                setTimeout(() => barcodeInputRef.current?.focus(), 100);
            }

            // Prevent form submit on Enter key
            if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
                if ((e.target as HTMLInputElement).id === 'barcode-input') {
                    e.preventDefault();
                    return;
                }

                // In quick modal, Tab to next field
                if (showQuickModal) {
                    e.preventDefault();
                    const form = e.target.form;
                    if (form) {
                        const inputs = Array.from(form.querySelectorAll('input, select'));
                        const index = inputs.indexOf(e.target);
                        const nextInput = inputs[index + 1] as HTMLElement;
                        if (nextInput) {
                            nextInput.focus();
                        }
                    }
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [showQuickModal, quickFormData, currentProduct, items]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="New Purchase" />

            {/* Quick Entry Modal */}
            <Dialog open={showQuickModal} onOpenChange={setShowQuickModal}>
                <DialogContent className="sm:max-w-125">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-emerald-600" />
                            Quick Entry
                        </DialogTitle>
                        <DialogDescription>
                            {currentProduct && (
                                <span className="font-semibold text-emerald-700">{currentProduct.name}</span>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={(e) => { e.preventDefault(); handleQuickSubmit(); }} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <Label htmlFor="quick-qty">Quantity *</Label>
                                <Input
                                    id="quick-qty"
                                    ref={qtyInputRef}
                                    type="number"
                                    step="1"
                                    min="1"
                                    value={quickFormData.quantity}
                                    onChange={(e) => setQuickFormData({ ...quickFormData, quantity: e.target.value })}
                                    className="border-2 border-emerald-200 text-lg font-bold focus:border-emerald-500"
                                    required
                                />
                            </div>

                            <div className="col-span-2">
                                <Label htmlFor="quick-expiry">Expiry Date</Label>
                                <Input
                                    id="quick-expiry"
                                    ref={expiryInputRef}
                                    type="date"
                                    value={quickFormData.expiry_date}
                                    onChange={(e) => setQuickFormData({ ...quickFormData, expiry_date: e.target.value })}
                                    min={new Date().toISOString().split('T')[0]}
                                />
                            </div>

                            <div>
                                <Label htmlFor="quick-cost">Cost Price *</Label>
                                <Input
                                    id="quick-cost"
                                    type="number"
                                    step="0.01"
                                    value={quickFormData.cost_price}
                                    onChange={(e) => setQuickFormData({ ...quickFormData, cost_price: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <Label htmlFor="quick-mrp">MRP *</Label>
                                <Input
                                    id="quick-mrp"
                                    type="number"
                                    step="0.01"
                                    value={quickFormData.mrp}
                                    onChange={(e) => setQuickFormData({ ...quickFormData, mrp: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <Label htmlFor="quick-selling">Selling Price *</Label>
                                <Input
                                    id="quick-selling"
                                    type="number"
                                    step="0.01"
                                    value={quickFormData.selling_price}
                                    onChange={(e) => setQuickFormData({ ...quickFormData, selling_price: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <Label htmlFor="quick-min-selling">Min Selling *</Label>
                                <Input
                                    id="quick-min-selling"
                                    type="number"
                                    step="0.01"
                                    value={quickFormData.min_selling_price}
                                    onChange={(e) => setQuickFormData({ ...quickFormData, min_selling_price: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="col-span-2">
                                <Label htmlFor="quick-batch">Batch Number *</Label>
                                <Input
                                    id="quick-batch"
                                    ref={batchInputRef}
                                    value={quickFormData.batch_no}
                                    onChange={(e) => setQuickFormData({ ...quickFormData, batch_no: e.target.value })}
                                    placeholder="0BN-000"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 border-t pt-4">

                            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                                Add to Purchase (F3)
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setShowQuickModal(false);
                                    setTimeout(() => barcodeInputRef.current?.focus(), 100);
                                }}
                            >
                                Cancel (ESC)
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-2xl">New Purchase</CardTitle>
                                <CardDescription>Quick entry with barcode scanning</CardDescription>
                            </div>
                            <div className="flex items-center gap-3">
                                {/* Quick Entry Toggle */}
                                <div className="flex items-center gap-2 rounded-lg border-2 border-emerald-200 bg-emerald-50 px-4 py-2">
                                    <Zap className={`h-4 w-4 ${quickEntryEnabled ? 'text-emerald-600' : 'text-gray-400'}`} />
                                    <Label htmlFor="quick-toggle" className="cursor-pointer text-sm font-medium">
                                        Quick Entry
                                    </Label>
                                    <Switch
                                        id="quick-toggle"
                                        checked={quickEntryEnabled}
                                        onCheckedChange={setQuickEntryEnabled}
                                        className="data-[state=checked]:bg-emerald-600"
                                    />
                                </div>
                                <Button variant="outline" onClick={() => router.get('/warehouse/purchases')}>
                                    <ArrowLeft className="mr-2 size-4" />
                                    Back
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Header Info */}
                            <div className="grid gap-4 md:grid-cols-4">
                                <div className="space-y-2">
                                    <Label htmlFor="vendor">Vendor *</Label>
                                    <Select value={formData.vendor_id} onValueChange={(value) => setFormData({ ...formData, vendor_id: value })}>
                                        <SelectTrigger className='w-full border-2 border-emerald-200'>
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
                                        className="border-2 border-emerald-200"
                                        placeholder="INV-001"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="purchase_date">Purchase Date *</Label>
                                    <Input
                                        id="purchase_date"
                                        type="date"
                                        className="border-2 border-emerald-200"
                                        value={formData.purchase_date}
                                        onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="warehouse">Warehouse *</Label>
                                    <Select value={formData.warehouse_id} onValueChange={(value) => setFormData({ ...formData, warehouse_id: value })}>
                                        <SelectTrigger className='w-full border-2 border-emerald-200'>
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
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="barcode">Scan Barcode/SKU</Label>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                            Press F2 to focus
                                        </Badge>
                                        <Button type="button" onClick={addItem} size="sm" variant="outline">
                                            <Plus className="mr-2 size-4" />
                                            Add Item Manually
                                        </Button>
                                    </div>
                                </div>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="barcode-input"
                                        ref={barcodeInputRef}
                                        value={barcodeSearch}
                                        onChange={(e) => handleBarcodeInput(e.target.value)}
                                        onKeyDown={handleBarcodeKeyDown}
                                        placeholder="Scan or type barcode/SKU... (F2)"
                                        className="border-2 border-emerald-300 pl-9 text-lg focus:border-emerald-500"
                                        autoComplete="off"
                                    />
                                </div>
                            </div>

                            {/* Items Table or Empty State */}
                            {items.length === 0 ? (
                                <div className="rounded-lg border-2 border-dashed border-emerald-200 bg-emerald-50 p-12 text-center">
                                    <Zap className="mx-auto h-12 w-12 text-emerald-400" />
                                    <h3 className="mt-2 text-lg font-semibold text-emerald-900">No items yet</h3>
                                    <p className="mt-1 text-sm text-emerald-600">
                                        Start scanning barcodes or click "Add Item Manually" to begin
                                    </p>
                                    <Button type="button" onClick={addItem} className="mt-4" variant="outline">
                                        <Plus className="mr-2 size-4" />
                                        Add First Item
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-base font-semibold">
                                            Purchase Items ({items.length})
                                        </Label>
                                        <Button type="button" onClick={addItem} size="sm" variant="outline">
                                            <Plus className="mr-2 size-4" />
                                            Add Item
                                        </Button>
                                    </div>

                                    <div className="rounded-md border-2 border-emerald-200">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-emerald-50">
                                                    <TableHead className="w-10">#</TableHead>
                                                    <TableHead className="w-75">Product</TableHead>
                                                    <TableHead className="w-20">Qty</TableHead>
                                                    <TableHead>Cost</TableHead>
                                                    <TableHead>Min Sell</TableHead>
                                                    <TableHead>Selling</TableHead>
                                                    <TableHead>MRP</TableHead>
                                                    <TableHead>Batch</TableHead>
                                                    <TableHead>Expiry</TableHead>
                                                    <TableHead className="text-right">Amount</TableHead>
                                                    <TableHead className="w-12.5"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {items.map((item, index) => {
                                                    const grandTotal = calculateItemTotal(item);

                                                    return (
                                                        <TableRow key={index}>
                                                            <TableCell className="font-medium">{index + 1}</TableCell>
                                                            <TableCell>
                                                                {item.product_name ? (
                                                                    <div className="font-medium">{item.product_name}</div>
                                                                ) : (
                                                                    <Select
                                                                        value={item.product_variant_id}
                                                                        onValueChange={(value) => updateItem(index, 'product_variant_id', value)}
                                                                    >
                                                                        <SelectTrigger className="h-9 w-full border-emerald-200">
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
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Input
                                                                    type="number"
                                                                    value={item.quantity}
                                                                    onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                                                    className="h-9 w-20 border-emerald-200"
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
                                                                    className="h-9 w-24 border-emerald-200"
                                                                    required
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Input
                                                                    type="number"
                                                                    step="0.01"
                                                                    value={item.min_selling_price}
                                                                    onChange={(e) => updateItem(index, 'min_selling_price', e.target.value)}
                                                                    className="h-9 w-24 border-emerald-200"
                                                                    required
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Input
                                                                    type="number"
                                                                    step="0.01"
                                                                    value={item.selling_price}
                                                                    onChange={(e) => updateItem(index, 'selling_price', e.target.value)}
                                                                    className="h-9 w-24 border-emerald-200"
                                                                    required
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Input
                                                                    type="number"
                                                                    step="0.01"
                                                                    value={item.mrp}
                                                                    onChange={(e) => updateItem(index, 'mrp', e.target.value)}
                                                                    className="h-9 w-24 border-emerald-200"
                                                                    required
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Input
                                                                    value={item.batch_no}
                                                                    onChange={(e) => updateItem(index, 'batch_no', e.target.value)}
                                                                    className="h-9 border-emerald-200"
                                                                    placeholder="0BN-000"
                                                                    required
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Input
                                                                    type="date"
                                                                    value={item.expiry_date}
                                                                    onChange={(e) => updateItem(index, 'expiry_date', e.target.value)}
                                                                    className="h-9 border-emerald-200"
                                                                    min={new Date().toISOString().split('T')[0]}
                                                                />
                                                            </TableCell>
                                                            <TableCell className="text-right font-bold text-emerald-700">
                                                                ₹{grandTotal.toFixed(2)}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => removeItem(index)}
                                                                    className="h-9 w-9 text-destructive"
                                                                >
                                                                    <Trash2 className="size-4" />
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            )}

                            {/* Totals */}
                            {items.length > 0 && (
                                <Card className="border-2 border-emerald-300 bg-emerald-50">
                                    <CardContent className="p-4">
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-emerald-700">Subtotal:</span>
                                                <span className="font-medium text-emerald-900">₹{totals.subtotal}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-emerald-700">Tax Amount:</span>
                                                <span className="font-medium text-emerald-900">₹{totals.taxAmount}</span>
                                            </div>
                                            <div className="flex justify-between border-t-2 border-emerald-300 pt-2 text-lg">
                                                <span className="font-bold text-emerald-700">Total Amount:</span>
                                                <span className="text-xl font-bold text-emerald-900">₹{totals.total}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Status & Actions */}
                            <div className="flex items-center justify-between gap-4 border-t-2 border-emerald-200 pt-4">
                                <div className="flex items-center gap-4">
                                    <Label htmlFor="status">Status:</Label>
                                    <Select value={formData.status} onValueChange={(value: 'draft' | 'confirmed') => setFormData({ ...formData, status: value })}>
                                        <SelectTrigger className="w-45 border-2 border-emerald-200">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="draft">Save as Draft</SelectItem>
                                            <SelectItem value="confirmed">Confirm Purchase</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center gap-4">
                                    <Label htmlFor="invoice_image">Invoice Image</Label>
                                    <Input
                                        id="invoice_image"
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setInvoiceImage(e.target.files?.[0] || null)}
                                        className="w-64 border-2 border-emerald-200"
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <Button type="button" variant="outline" onClick={() => router.get('/warehouse/purchases')}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
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
