import { Head } from '@inertiajs/react';
import { useState, useRef, useEffect } from 'react';
import { Search, Trash2, Plus, Building2, Calendar, Save, Printer, X, ChevronDown } from 'lucide-react';

import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
    {
        title: 'Purchase Entry',
        href: ''
    },
];

// Mock data - replace with actual data from props/API
const MOCK_PRODUCTS = [
    { id: 1, name: 'Basmati Rice 1kg', sku: 'RICE-001', unit: 'KG', purchasePrice: 85.00, salePrice: 120.00, tax: 5, stock: 150 },
    { id: 2, name: 'Toor Dal 1kg', sku: 'DAL-001', unit: 'KG', purchasePrice: 120.00, salePrice: 160.00, tax: 5, stock: 80 },
    { id: 3, name: 'Cooking Oil 1L', sku: 'OIL-001', unit: 'L', purchasePrice: 180.00, salePrice: 220.00, tax: 5, stock: 50 },
    { id: 4, name: 'Wheat Flour 1kg', sku: 'FLOUR-001', unit: 'KG', purchasePrice: 35.00, salePrice: 50.00, tax: 5, stock: 200 },
    { id: 5, name: 'Sugar 1kg', sku: 'SUGAR-001', unit: 'KG', purchasePrice: 40.00, salePrice: 55.00, tax: 5, stock: 100 },
    { id: 6, name: 'Tea Powder 500g', sku: 'TEA-001', unit: 'PKT', purchasePrice: 180.00, salePrice: 250.00, tax: 12, stock: 60 },
    { id: 7, name: 'Salt 1kg', sku: 'SALT-001', unit: 'KG', purchasePrice: 18.00, salePrice: 25.00, tax: 5, stock: 150 },
    { id: 8, name: 'Milk Powder 500g', sku: 'MILK-001', unit: 'PKT', purchasePrice: 220.00, salePrice: 280.00, tax: 5, stock: 40 },
];

const MOCK_VENDORS = [
    { id: 1, name: 'Ashok Wholesalers', gstin: '27AAAAA1234A1Z5', contact: 'Ashok Kumar', phone: '+91-9876543210', address: 'Market Yard, Mumbai' },
    { id: 2, name: 'Raj Trading Co.', gstin: '27BBBBB5678B1Z5', contact: 'Rajesh Sharma', phone: '+91-9876543211', address: 'APMC Market, Pune' },
    { id: 3, name: 'Ganesh Distributors', gstin: '27CCCCC9012C1Z5', contact: 'Ganesh Patil', phone: '+91-9876543212', address: 'Main Bazaar, Nashik' },
];

type PurchaseItem = {
    id: string;
    productId: number | null;
    productName: string;
    sku: string;
    unit: string;
    quantity: number;
    rate: number;
    discount: number;
    tax: number;
    amount: number;
};

export default function Purchase() {
    const [selectedVendor, setSelectedVendor] = useState(MOCK_VENDORS[0]);
    const [showVendorModal, setShowVendorModal] = useState(false);
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
    const [invoiceNo, setInvoiceNo] = useState('');
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);

    const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([
        {
            id: '1',
            productId: null,
            productName: '',
            sku: '',
            unit: '',
            quantity: 0,
            rate: 0,
            discount: 0,
            tax: 0,
            amount: 0,
        }
    ]);

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<typeof MOCK_PRODUCTS>([]);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Additional charges
    const [packingCharges, setPackingCharges] = useState(0);
    const [transportCharges, setTransportCharges] = useState(0);
    const [otherCharges, setOtherCharges] = useState(0);

    // Calculate totals
    const calculateItemAmount = (item: PurchaseItem) => {
        const baseAmount = item.quantity * item.rate;
        const discountAmount = (baseAmount * item.discount) / 100;
        const taxableAmount = baseAmount - discountAmount;
        const taxAmount = (taxableAmount * item.tax) / 100;
        return taxableAmount + taxAmount;
    };

    const subtotal = purchaseItems.reduce((sum, item) => {
        if (!item.productId) return sum;
        const baseAmount = item.quantity * item.rate;
        const discountAmount = (baseAmount * item.discount) / 100;
        return sum + (baseAmount - discountAmount);
    }, 0);

    const totalTax = purchaseItems.reduce((sum, item) => {
        if (!item.productId) return sum;
        const baseAmount = item.quantity * item.rate;
        const discountAmount = (baseAmount * item.discount) / 100;
        const taxableAmount = baseAmount - discountAmount;
        return sum + (taxableAmount * item.tax) / 100;
    }, 0);

    const additionalCharges = packingCharges + transportCharges + otherCharges;
    const grandTotal = subtotal + totalTax + additionalCharges;

    // Search products
    const handleSearch = (query: string, rowIndex: number) => {
        setSearchQuery(query);
        setActiveRowIndex(rowIndex);
        if (query.length > 0) {
            const results = MOCK_PRODUCTS.filter(p =>
                p.name.toLowerCase().includes(query.toLowerCase()) ||
                p.sku.toLowerCase().includes(query.toLowerCase())
            );
            setSearchResults(results);
            setShowSearchResults(true);
        } else {
            setShowSearchResults(false);
        }
    };

    const selectProduct = (product: typeof MOCK_PRODUCTS[0], rowIndex: number) => {
        const updatedItems = [...purchaseItems];
        updatedItems[rowIndex] = {
            ...updatedItems[rowIndex],
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            unit: product.unit,
            rate: product.purchasePrice,
            tax: product.tax,
            quantity: updatedItems[rowIndex].quantity || 1,
        };
        updatedItems[rowIndex].amount = calculateItemAmount(updatedItems[rowIndex]);
        setPurchaseItems(updatedItems);
        setShowSearchResults(false);
        setSearchQuery('');
    };

    const updateItem = (index: number, field: keyof PurchaseItem, value: any) => {
        const updatedItems = [...purchaseItems];
        updatedItems[index] = { ...updatedItems[index], [field]: value };
        updatedItems[index].amount = calculateItemAmount(updatedItems[index]);
        setPurchaseItems(updatedItems);
    };

    const addNewRow = () => {
        setPurchaseItems([
            ...purchaseItems,
            {
                id: Date.now().toString(),
                productId: null,
                productName: '',
                sku: '',
                unit: '',
                quantity: 0,
                rate: 0,
                discount: 0,
                tax: 0,
                amount: 0,
            }
        ]);
    };

    const removeRow = (index: number) => {
        if (purchaseItems.length > 1) {
            setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
        }
    };

    const handleSave = () => {
        const validItems = purchaseItems.filter(item => item.productId !== null);
        if (validItems.length === 0) {
            alert('Please add at least one product');
            return;
        }
        if (!invoiceNo) {
            alert('Please enter invoice number');
            return;
        }

        const purchaseData = {
            vendor: selectedVendor,
            purchaseDate,
            invoiceNo,
            invoiceDate,
            items: validItems,
            subtotal,
            totalTax,
            packingCharges,
            transportCharges,
            otherCharges,
            grandTotal,
        };

        console.log('Purchase Data:', purchaseData);
        alert('Purchase saved successfully!');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Purchase Entry" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header Section */}
                <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="grid gap-4 md:grid-cols-4">
                        {/* Vendor Details */}
                        <div className="md:col-span-2">
                            <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                                Vendor Name *
                            </label>
                            <div
                                onClick={() => setShowVendorModal(true)}
                                className="flex cursor-pointer items-center justify-between rounded border border-neutral-300 bg-neutral-50 px-3 py-2 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                            >
                                <div>
                                    <p className="font-medium text-neutral-900 dark:text-neutral-100">{selectedVendor.name}</p>
                                    <p className="text-xs text-neutral-600 dark:text-neutral-400">GSTIN: {selectedVendor.gstin}</p>
                                </div>
                                <ChevronDown className="size-4 text-neutral-600" />
                            </div>
                        </div>

                        {/* Purchase Date */}
                        <div>
                            <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                                Purchase Date *
                            </label>
                            <input
                                type="date"
                                value={purchaseDate}
                                onChange={(e) => setPurchaseDate(e.target.value)}
                                className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                            />
                        </div>

                        {/* Invoice No */}
                        <div>
                            <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                                Invoice No *
                            </label>
                            <input
                                type="text"
                                value={invoiceNo}
                                onChange={(e) => setInvoiceNo(e.target.value)}
                                placeholder="INV-2024-001"
                                className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                            />
                        </div>
                    </div>

                    <div className="mt-3 grid gap-4 md:grid-cols-4">
                        {/* Vendor Contact */}
                        <div className="md:col-span-2">
                            <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                                Address
                            </label>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">{selectedVendor.address}</p>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">{selectedVendor.phone}</p>
                        </div>

                        {/* Invoice Date */}
                        <div>
                            <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                                Invoice Date
                            </label>
                            <input
                                type="date"
                                value={invoiceDate}
                                onChange={(e) => setInvoiceDate(e.target.value)}
                                className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                            />
                        </div>
                    </div>
                </div>

                {/* Items Table */}
                <div className="flex-1 overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800">
                                    <th className="px-2 py-3 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-300" style={{ width: '40px' }}>
                                        #
                                    </th>
                                    <th className="px-2 py-3 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-300" style={{ width: '300px' }}>
                                        Product Name
                                    </th>
                                    <th className="px-2 py-3 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-300" style={{ width: '100px' }}>
                                        SKU
                                    </th>
                                    <th className="px-2 py-3 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-300" style={{ width: '80px' }}>
                                        Unit
                                    </th>
                                    <th className="px-2 py-3 text-right text-xs font-semibold text-neutral-700 dark:text-neutral-300" style={{ width: '100px' }}>
                                        Quantity
                                    </th>
                                    <th className="px-2 py-3 text-right text-xs font-semibold text-neutral-700 dark:text-neutral-300" style={{ width: '120px' }}>
                                        Rate
                                    </th>
                                    <th className="px-2 py-3 text-right text-xs font-semibold text-neutral-700 dark:text-neutral-300" style={{ width: '100px' }}>
                                        Disc %
                                    </th>
                                    <th className="px-2 py-3 text-right text-xs font-semibold text-neutral-700 dark:text-neutral-300" style={{ width: '100px' }}>
                                        Tax %
                                    </th>
                                    <th className="px-2 py-3 text-right text-xs font-semibold text-neutral-700 dark:text-neutral-300" style={{ width: '150px' }}>
                                        Amount
                                    </th>
                                    <th className="px-2 py-3 text-center text-xs font-semibold text-neutral-700 dark:text-neutral-300" style={{ width: '50px' }}>

                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {purchaseItems.map((item, index) => (
                                    <tr key={item.id} className="border-b border-neutral-100 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/50">
                                        <td className="px-2 py-2 text-center text-sm text-neutral-600 dark:text-neutral-400">
                                            {index + 1}
                                        </td>
                                        <td className="px-2 py-2 relative">
                                            <input
                                                type="text"
                                                value={item.productName || searchQuery}
                                                onChange={(e) => handleSearch(e.target.value, index)}
                                                onFocus={() => setActiveRowIndex(index)}
                                                placeholder="Search product..."
                                                className="w-full rounded border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                                            />
                                            {showSearchResults && activeRowIndex === index && (
                                                <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded border border-neutral-300 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
                                                    {searchResults.map((product) => (
                                                        <div
                                                            key={product.id}
                                                            onClick={() => selectProduct(product, index)}
                                                            className="cursor-pointer border-b border-neutral-100 p-2 hover:bg-blue-50 dark:border-neutral-700 dark:hover:bg-blue-900/20"
                                                        >
                                                            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{product.name}</p>
                                                            <p className="text-xs text-neutral-600 dark:text-neutral-400">{product.sku} - ₹{product.purchasePrice}</p>
                                                        </div>
                                                    ))}
                                                    {searchResults.length === 0 && (
                                                        <div className="p-2 text-sm text-neutral-500">No products found</div>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-2 py-2">
                                            <input
                                                type="text"
                                                value={item.sku}
                                                readOnly
                                                className="w-full rounded border border-neutral-200 bg-neutral-50 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-400"
                                            />
                                        </td>
                                        <td className="px-2 py-2">
                                            <input
                                                type="text"
                                                value={item.unit}
                                                readOnly
                                                className="w-full rounded border border-neutral-200 bg-neutral-50 px-2 py-1 text-center text-sm dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-400"
                                            />
                                        </td>
                                        <td className="px-2 py-2">
                                            <input
                                                type="number"
                                                value={item.quantity || ''}
                                                onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                                                className="w-full rounded border border-neutral-300 px-2 py-1 text-right text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                                            />
                                        </td>
                                        <td className="px-2 py-2">
                                            <input
                                                type="number"
                                                value={item.rate || ''}
                                                onChange={(e) => updateItem(index, 'rate', Number(e.target.value))}
                                                step="0.01"
                                                className="w-full rounded border border-neutral-300 px-2 py-1 text-right text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                                            />
                                        </td>
                                        <td className="px-2 py-2">
                                            <input
                                                type="number"
                                                value={item.discount || ''}
                                                onChange={(e) => updateItem(index, 'discount', Number(e.target.value))}
                                                className="w-full rounded border border-neutral-300 px-2 py-1 text-right text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                                            />
                                        </td>
                                        <td className="px-2 py-2">
                                            <input
                                                type="number"
                                                value={item.tax || ''}
                                                onChange={(e) => updateItem(index, 'tax', Number(e.target.value))}
                                                className="w-full rounded border border-neutral-300 px-2 py-1 text-right text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                                            />
                                        </td>
                                        <td className="px-2 py-2">
                                            <input
                                                type="text"
                                                value={item.amount.toFixed(2)}
                                                readOnly
                                                className="w-full rounded border border-neutral-200 bg-neutral-50 px-2 py-1 text-right text-sm font-medium dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-100"
                                            />
                                        </td>
                                        <td className="px-2 py-2 text-center">
                                            <button
                                                onClick={() => removeRow(index)}
                                                className="text-red-600 hover:text-red-700 dark:text-red-400"
                                                disabled={purchaseItems.length === 1}
                                            >
                                                <Trash2 className="size-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="border-t border-neutral-200 p-2 dark:border-neutral-800">
                        <button
                            onClick={addNewRow}
                            className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                        >
                            <Plus className="size-4" />
                            Add Row
                        </button>
                    </div>
                </div>

                {/* Summary Section */}
                <div className="grid gap-4 md:grid-cols-3">
                    {/* Additional Charges */}
                    <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900 md:col-span-2">
                        <h3 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Additional Charges</h3>
                        <div className="grid gap-3 md:grid-cols-3">
                            <div>
                                <label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">Packing Charges</label>
                                <input
                                    type="number"
                                    value={packingCharges || ''}
                                    onChange={(e) => setPackingCharges(Number(e.target.value))}
                                    className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                                    step="0.01"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">Transport Charges</label>
                                <input
                                    type="number"
                                    value={transportCharges || ''}
                                    onChange={(e) => setTransportCharges(Number(e.target.value))}
                                    className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                                    step="0.01"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">Other Charges</label>
                                <input
                                    type="number"
                                    value={otherCharges || ''}
                                    onChange={(e) => setOtherCharges(Number(e.target.value))}
                                    className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                                    step="0.01"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Total Summary */}
                    <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-neutral-600 dark:text-neutral-400">Subtotal</span>
                                <span className="font-medium text-neutral-900 dark:text-neutral-100">₹{subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-neutral-600 dark:text-neutral-400">Tax</span>
                                <span className="font-medium text-neutral-900 dark:text-neutral-100">₹{totalTax.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-neutral-600 dark:text-neutral-400">Additional Charges</span>
                                <span className="font-medium text-neutral-900 dark:text-neutral-100">₹{additionalCharges.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between border-t border-neutral-300 pt-2 text-lg font-bold dark:border-neutral-700">
                                <span className="text-neutral-900 dark:text-neutral-100">Grand Total</span>
                                <span className="text-green-600 dark:text-green-400">₹{grandTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3">
                    <button
                        onClick={() => {
                            setPurchaseItems([{
                                id: '1',
                                productId: null,
                                productName: '',
                                sku: '',
                                unit: '',
                                quantity: 0,
                                rate: 0,
                                discount: 0,
                                tax: 0,
                                amount: 0,
                            }]);
                            setInvoiceNo('');
                            setPackingCharges(0);
                            setTransportCharges(0);
                            setOtherCharges(0);
                        }}
                        className="rounded-lg border border-neutral-300 bg-white px-6 py-2 font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                    >
                        Clear
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2 font-medium text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                    >
                        <Save className="size-4" />
                        Save Purchase
                    </button>
                    <button
                        className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                    >
                        <Printer className="size-4" />
                        Print
                    </button>
                </div>
            </div>

            {/* Vendor Selection Modal */}
            {showVendorModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-2xl rounded-lg bg-white p-6 dark:bg-neutral-900">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Select Vendor</h2>
                            <button onClick={() => setShowVendorModal(false)}>
                                <X className="size-5 text-neutral-600" />
                            </button>
                        </div>
                        <div className="space-y-2">
                            {MOCK_VENDORS.map((vendor) => (
                                <button
                                    key={vendor.id}
                                    onClick={() => {
                                        setSelectedVendor(vendor);
                                        setShowVendorModal(false);
                                    }}
                                    className={`w-full rounded-lg border p-4 text-left transition-colors ${
                                        selectedVendor.id === vendor.id
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                                            : 'border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800'
                                    }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-semibold text-neutral-900 dark:text-neutral-100">{vendor.name}</p>
                                            <p className="text-sm text-neutral-600 dark:text-neutral-400">GSTIN: {vendor.gstin}</p>
                                            <p className="text-sm text-neutral-600 dark:text-neutral-400">{vendor.contact} - {vendor.phone}</p>
                                            <p className="text-sm text-neutral-500 dark:text-neutral-500">{vendor.address}</p>
                                        </div>
                                        {selectedVendor.id === vendor.id && (
                                            <div className="rounded-full bg-blue-600 p-1">
                                                <svg className="size-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
