import { Head, router } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
    Barcode,
    Filter,
    Hotel,
    Image,
    IndianRupee,
    Pause,
    Percent,
    ShoppingCart,
    Trash2Icon,
    Printer,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import AppLayout from '@/layouts/app-layout';

interface Product {
    id: number;
    name: string;
    selling_price: number;
    min_selling_price: number;
    qty: number;
    img: string;
    category: string;
    barcode: string;
    sku: string;
    mrp: number;
    cost_price: number;
    tax_category_id: number;
    tax_percent: number;
    tax_type: 'inclusive' | 'exclusive';
}

interface Category {
    id: string;
    name: string;
    icon: string;
}

interface Warehouse {
    id: number;
    name: string;
    location?: string;
}

interface Customer {
    id: number;
    name: string;
    phone: string;
    credit_limit: number;
}

interface InvoiceItem {
    id: number;
    productId: number;
    name: string;
    barcode: string;
    qty: number;
    rate: number;
    mrp: number;
    disc: number;
    taxPercent: number;
    taxType: 'inclusive' | 'exclusive';
    total: number;
}

interface HeldInvoice {
    id: string;
    items: InvoiceItem[];
    timestamp: Date;
    customerName?: string;
    customerMobile?: string;
    saleType: string;
}

interface Props {
    products: Product[];
    categories: Category[];
    warehouse: Warehouse;
    customers: Customer[];
}

const POS = ({ products = [], categories = [], warehouse, customers = [] }: Props) => {
    // Truncate product name, keeping the part after hyphen
    const truncateProductName = (name: string, maxChars: number = 38): string => {
        if (name.length <= maxChars) return name;

        const parts = name.split(' - ');
        if (parts.length === 2) {
            const [firstPart, secondPart] = parts;
            const suffixLength = secondPart.length + 4; // " - " + secondPart
            const availableForFirst = maxChars - suffixLength;

            if (availableForFirst > 5) {
                return firstPart.substring(0, availableForFirst).trim() + '... - ' + secondPart;
            } else {
                return '... - ' + secondPart;
            }
        }

        return name.substring(0, maxChars) + '...';
    };

    const [discountType, setDiscountType] = useState<'percentage' | 'amount'>('percentage');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [barcodeInput, setBarcodeInput] = useState('');
    const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
    const [overallDiscount, setOverallDiscount] = useState(0);
    const [saleType, setSaleType] = useState('retail');
    const [customerType, setCustomerType] = useState('enter');
    const [customerMobile, setCustomerMobile] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [customerId, setCustomerId] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [invoiceNumber] = useState(`INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`);
    const [currentDate] = useState(new Date().toISOString().split('T')[0]);
    const [heldInvoices, setHeldInvoices] = useState<HeldInvoice[]>([]);
    const [showFilter, setShowFilter] = useState(false);
    const [priceFilter, setPriceFilter] = useState({ min: '', max: '' });
    const [stockFilter, setStockFilter] = useState('all');
    const [isProcessing, setIsProcessing] = useState(false);

    // Calculate item totals considering tax type
    const calculateItemTotal = (qty: number, rate: number, disc: number, taxPercent: number, taxType: 'inclusive' | 'exclusive'): number => {
        if (taxType === 'inclusive') {
            // Tax already included in rate
            const itemSubtotal = (qty * rate) - disc;
            return itemSubtotal;
        } else {
            // Tax is exclusive - add on top
            const baseAmount = (qty * rate) - disc;
            const taxAmount = (baseAmount * taxPercent) / 100;
            return baseAmount + taxAmount;
        }
    };

    // Add product to cart by barcode or product object
    const addToCart = (productOrBarcode: Product | string) => {
        let product: Product | undefined;

        if (typeof productOrBarcode === 'string') {
            product = products.find(p => p.barcode === productOrBarcode || p.sku === productOrBarcode);
        } else {
            product = productOrBarcode;
        }

        if (!product) {
            alert('Product not found!');
            return;
        }

        if (product.qty <= 0) {
            alert('Product out of stock!');
            return;
        }

        const existingItemIndex = invoiceItems.findIndex(
            item => item.productId === product!.id
        );

        // Determine price based on sale type
        const price = saleType === 'retail' ? product.selling_price : product.min_selling_price;

        if (existingItemIndex >= 0) {
            const updatedItems = [...invoiceItems];
            if (updatedItems[existingItemIndex].qty >= product.qty) {
                alert('Not enough stock available!');
                return;
            }
            updatedItems[existingItemIndex].qty += 1;
            updatedItems[existingItemIndex].total = calculateItemTotal(
                updatedItems[existingItemIndex].qty,
                updatedItems[existingItemIndex].rate,
                updatedItems[existingItemIndex].disc,
                updatedItems[existingItemIndex].taxPercent,
                updatedItems[existingItemIndex].taxType
            );
            setInvoiceItems(updatedItems);
        } else {
            const newItem: InvoiceItem = {
                id: Date.now(),
                productId: product.id,
                name: product.name,
                barcode: product.barcode,
                qty: 1,
                rate: price,
                mrp: product.mrp,
                disc: 0,
                taxPercent: product.tax_percent,
                taxType: product.tax_type,
                total: calculateItemTotal(1, price, 0, product.tax_percent, product.tax_type),
            };
            setInvoiceItems([...invoiceItems, newItem]);
        }

        setBarcodeInput('');
    };

    // Handle barcode scan
    const handleBarcodeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (barcodeInput.trim()) {
            addToCart(barcodeInput.trim());
        }
    };

    // Update item quantity
    const updateItemQty = (itemId: number, newQty: number) => {
        if (newQty <= 0) {
            removeItem(itemId);
            return;
        }

        const item = invoiceItems.find(i => i.id === itemId);
        if (item) {
            const product = products.find(p => p.id === item.productId);
            if (product && newQty > product.qty) {
                alert('Not enough stock available!');
                return;
            }
        }

        const updatedItems = invoiceItems.map(item => {
            if (item.id === itemId) {
                const total = calculateItemTotal(newQty, item.rate, item.disc, item.taxPercent, item.taxType);
                return { ...item, qty: newQty, total };
            }
            return item;
        });
        setInvoiceItems(updatedItems);
    };

    // Update item rate
    const updateItemRate = (itemId: number, newRate: number) => {
        const updatedItems = invoiceItems.map(item => {
            if (item.id === itemId) {
                const total = calculateItemTotal(item.qty, newRate, item.disc, item.taxPercent, item.taxType);
                return { ...item, rate: newRate, total };
            }
            return item;
        });
        setInvoiceItems(updatedItems);
    };

    // Update item discount
    const updateItemDisc = (itemId: number, newDisc: number) => {
        const updatedItems = invoiceItems.map(item => {
            if (item.id === itemId) {
                const total = calculateItemTotal(item.qty, item.rate, newDisc, item.taxPercent, item.taxType);
                return { ...item, disc: newDisc, total };
            }
            return item;
        });
        setInvoiceItems(updatedItems);
    };

    // Remove item
    const removeItem = (itemId: number) => {
        setInvoiceItems(invoiceItems.filter(item => item.id !== itemId));
    };

    // Calculate totals with proper tax handling
    const calculateTotals = () => {
        const totalItems = invoiceItems.length;
        const totalQty = invoiceItems.reduce((sum, item) => sum + item.qty, 0);

        let subtotalBeforeTax = 0;
        let totalTaxAmount = 0;
        let itemDiscounts = 0;

        // Calculate each item
        invoiceItems.forEach(item => {
            itemDiscounts += item.disc;

            if (item.taxType === 'inclusive') {
                // Extract base price from inclusive tax
                const itemTotal = (item.qty * item.rate) - item.disc;
                const basePrice = itemTotal / (1 + (item.taxPercent / 100));
                const taxAmount = itemTotal - basePrice;

                subtotalBeforeTax += basePrice;
                totalTaxAmount += taxAmount;
            } else {
                // Tax is exclusive
                const baseAmount = (item.qty * item.rate) - item.disc;
                const taxAmount = (baseAmount * item.taxPercent) / 100;

                subtotalBeforeTax += baseAmount;
                totalTaxAmount += taxAmount;
            }
        });

        // Apply overall discount to subtotal before tax
        let overallDiscountAmount = 0;
        if (overallDiscount > 0) {
            overallDiscountAmount = discountType === 'percentage'
                ? (subtotalBeforeTax * overallDiscount / 100)
                : overallDiscount;

            // Adjust tax proportionally after overall discount
            const discountRatio = (subtotalBeforeTax - overallDiscountAmount) / subtotalBeforeTax;
            totalTaxAmount = totalTaxAmount * discountRatio;
            subtotalBeforeTax -= overallDiscountAmount;
        }

        const totalMrp = invoiceItems.reduce((sum, item) => sum + (item.mrp * item.qty), 0);
        const totalDiscount = itemDiscounts + overallDiscountAmount;
        const totalBill = subtotalBeforeTax + totalTaxAmount;

        return {
            totalItems,
            totalQty,
            subtotalBeforeTax,
            totalTaxAmount,
            totalDiscount,
            totalMrp,
            totalBill: Math.max(0, totalBill),
        };
    };

    const totals = calculateTotals();

    // Hold invoice
    const holdInvoice = () => {
        if (invoiceItems.length === 0) {
            alert('No items in cart to hold!');
            return;
        }

        const heldInvoice: HeldInvoice = {
            id: `HOLD-${Date.now()}`,
            items: [...invoiceItems],
            timestamp: new Date(),
            customerName,
            customerMobile,
            saleType,
        };

        setHeldInvoices([...heldInvoices, heldInvoice]);
        clearInvoice();
        alert('Invoice held successfully!');
    };

    // Clear invoice
    const clearInvoice = () => {
        setInvoiceItems([]);
        setOverallDiscount(0);
        setCustomerName('');
        setCustomerMobile('');
        setCustomerId('');
        setCustomerType('enter');
        setSaleType('retail');
    };

    // Quick pay - Submit to backend
    const quickPay = () => {
        if (invoiceItems.length === 0) {
            alert('No items in cart!');
            return;
        }

        if (!warehouse) {
            alert('No warehouse assigned!');
            return;
        }

        const confirmed = confirm(
            `Process payment of ₹${totals.totalBill.toFixed(2)} via ${paymentMethod.toUpperCase()}?`
        );

        if (confirmed) {
            setIsProcessing(true);

            // Prepare data for backend
            const saleData = {
                customer_id: customerId || null,
                customer_name: customerName || 'Walk-in Customer',
                customer_mobile: customerMobile || null,
                order_channel: 'pos',
                warehouse_id: warehouse.id,
                payment_method: paymentMethod,
                sale_type: saleType,
                items: invoiceItems.map(item => ({
                    product_variant_id: item.productId,
                    quantity: item.qty,
                    price: item.rate,
                    discount: item.disc,
                    tax_percent: item.taxPercent,
                    tax_type: item.taxType,
                })),
                overall_discount: overallDiscount,
                discount_type: discountType,
            };

            // Submit to backend
            router.post('/warehouse/sales', saleData, {
                onSuccess: (page) => {
                    const success = (page.props as any).flash?.success;
                    if (success) {
                        // Print invoice automatically
                        if (success.order) {
                            printInvoice(success.order);
                        }

                        alert(`Payment successful!\nOrder: ${success.order_number}\nAmount: ₹${success.total_amount}`);
                        clearInvoice();
                    }
                    setIsProcessing(false);
                },
                onError: (errors) => {
                    alert('Failed to process sale: ' + (errors.error || 'Unknown error'));
                    setIsProcessing(false);
                },
            });
        }
    };

    // Print invoice
    const printInvoice = (order: any) => {
        // Open invoice in new window for printing
        const printWindow = window.open(`/warehouse/sales/${order.id}/print`, '_blank');
        if (printWindow) {
            printWindow.onload = () => {
                setTimeout(() => {
                    printWindow.print();
                }, 1200);
            };
        }
    };

    // Filter products
    const filteredProducts = products.filter(p => {
        const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
        const matchesSearch = searchQuery === '' ||
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.barcode?.includes(searchQuery) ||
            p.sku.includes(searchQuery);

        const currentPrice = saleType === 'retail' ? p.selling_price : p.min_selling_price;
        const matchesPrice = (!priceFilter.min || currentPrice >= Number(priceFilter.min)) &&
            (!priceFilter.max || currentPrice <= Number(priceFilter.max));

        const matchesStock = stockFilter === 'all' ||
            (stockFilter === 'instock' && p.qty > 0) ||
            (stockFilter === 'lowstock' && p.qty > 0 && p.qty <= 10) ||
            (stockFilter === 'outofstock' && p.qty === 0);

        return matchesCategory && matchesSearch && matchesPrice && matchesStock;
    });

    // Update prices when sale type changes
    useEffect(() => {
        if (invoiceItems.length > 0) {
            const updatedItems = invoiceItems.map(item => {
                const product = products.find(p => p.id === item.productId);
                if (product) {
                    const newRate = saleType === 'retail' ? product.selling_price : product.min_selling_price;
                    return {
                        ...item,
                        rate: newRate,
                        total: calculateItemTotal(item.qty, newRate, item.disc, item.taxPercent, item.taxType),
                    };
                }
                return item;
            });
            setInvoiceItems(updatedItems);
        }
    }, [saleType]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key === 'F2') {
                e.preventDefault();
                document.getElementById('barcode-input')?.focus();
            }
            if (e.key === 'F3') {
                e.preventDefault();
                document.getElementById('search-input')?.focus();
            }
            if (e.key === 'F4') {
                e.preventDefault();
                holdInvoice();
            }
            if (e.key === 'F9') {
                e.preventDefault();
                quickPay();
            }
            if (e.key === 'Escape') {
                setSearchQuery('');
                setBarcodeInput('');
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [invoiceItems, customerName, customerMobile]);

    return (
        <>
            <Head title="POS - Point of Sale" />
            <div className="flex h-screen flex-col bg-neutral-100">
                {/* TOP SECTION */}
                <div className="flex w-full items-center gap-2 bg-emerald-700 p-2 px-4 text-3xl font-bold text-white shadow-md">
                    <Hotel />
                    Ghorer Bazar
                </div>
                <div className="h-min-[15vh] shrink-0 border-b-2 border-emerald-700 bg-white">
                    <div className="grid h-full grid-cols-3 gap-4 p-4">
                        <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                                <Select value={saleType} onValueChange={setSaleType}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select sale type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="retail">Retail</SelectItem>
                                        <SelectItem value="wholesale">Wholesale</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={customerType} onValueChange={setCustomerType}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select customer type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="enter">Enter customer details</SelectItem>
                                        <SelectItem value="walkin">Walk-in</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Customer Mobile"
                                    className="w-full"
                                    value={customerMobile}
                                    onChange={(e) => setCustomerMobile(e.target.value)}
                                    disabled={customerType === 'walkin'}
                                />
                                <Input
                                    placeholder="Customer Name"
                                    className="w-full"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    disabled={customerType === 'walkin'}
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-center">
                            {/* <div className="rounded-lg border-2 border-emerald-300 bg-emerald-50 p-4 text-center">
                                <div className="text-sm font-medium text-emerald-700">Warehouse</div>
                                <div className="text-lg font-bold text-emerald-900">{warehouse?.name}</div>
                                {warehouse?.location && (
                                    <div className="text-xs text-emerald-600">{warehouse.location}</div>
                                )}
                            </div> */}
                        </div>
                        <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Invoice Number"
                                    className="w-full"
                                    value={invoiceNumber}
                                    readOnly
                                />
                                <Input
                                    type="date"
                                    className="w-full"
                                    value={currentDate}
                                    readOnly
                                />
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Customer ID"
                                    className="w-full"
                                    value={customerId}
                                    onChange={(e) => setCustomerId(e.target.value)}
                                />
                                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select payment method" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cash">Cash</SelectItem>
                                        <SelectItem value="upi">UPI</SelectItem>
                                        <SelectItem value="card">Card</SelectItem>
                                        <SelectItem value="bank">Bank Transfer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* MAIN POS SECTION */}
                <div className="h-min-[85vh] flex min-h-0 flex-1">
                    <div className="flex w-[35%] flex-col border-r bg-white">
                        <div className="flex gap-4 border-b p-4">
                            <form onSubmit={handleBarcodeSubmit} className="flex-1">
                                <InputGroup className='border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500'>
                                    <InputGroupInput
                                        id="barcode-input"
                                        placeholder="Scan barcode (F2)"
                                        value={barcodeInput}
                                        onChange={(e) => setBarcodeInput(e.target.value)}
                                        autoFocus
                                    />
                                    <InputGroupAddon>
                                        <Barcode />
                                    </InputGroupAddon>
                                </InputGroup>
                            </form>
                            <Button
                                type="button"
                                className="bg-yellow-500 text-white hover:bg-yellow-600"
                                onClick={holdInvoice}
                                title="Hold Invoice (F4)"
                                disabled={isProcessing}
                            >
                                <Pause /> Hold
                            </Button>
                        </div>
                        <ScrollArea className="flex-1">
                            <table className="w-full text-xs">
                                <thead className="sticky top-0 z-10 bg-linear-to-r from-emerald-700 to-emerald-800 text-white">
                                    <tr>
                                        <th className="w-50 border-y py-2 pl-4 text-left">
                                            Product
                                        </th>
                                        <th className="w-5 border px-1 text-center">
                                            Qty
                                        </th>
                                        <th className="w-10 border px-1 text-center">
                                            Rate
                                        </th>
                                        <th className="w-10 border px-1 text-center">
                                            MRP
                                        </th>
                                        <th className="w-5 border px-1 text-center">
                                            Disc
                                        </th>
                                        <th className="w-15 border px-1 text-center">
                                            Total
                                        </th>
                                        <th className="w-5 border-y px-1">/</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoiceItems.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="py-8 text-center text-gray-400">
                                                No items added yet. Scan or click products to add.
                                            </td>
                                        </tr>
                                    ) : (
                                        invoiceItems.map((item) => (
                                            <tr
                                                key={item.id}
                                                className="transition-colors hover:bg-emerald-50/50"
                                            >
                                                <td className="w-40 border-y py-1 pl-4">
                                                    <div className="text-sm">
                                                        {truncateProductName(item.name)}
                                                    </div>
                                                    <div className="text-[10px] text-gray-500">
                                                        {item.barcode} • {item.taxType === 'inclusive' ? 'Tax Inc.' : 'Tax Exc.'}
                                                    </div>
                                                </td>
                                                <td className="border">
                                                    <Input
                                                        type="number"
                                                        className="rounded-none border-0 p-0 text-center"
                                                        value={item.qty}
                                                        onChange={(e) => updateItemQty(item.id, Number(e.target.value))}
                                                        min="1"
                                                    />
                                                </td>
                                                <td className="border">
                                                    <Input
                                                        type="number"
                                                        className="rounded-none border-0 p-0 text-center"
                                                        value={item.rate}
                                                        onChange={(e) => updateItemRate(item.id, Number(e.target.value))}
                                                        min="0"
                                                        step="0.01"
                                                    />
                                                </td>
                                                <td className="border">
                                                    <Input
                                                        className="rounded-none border-0 p-0 text-center"
                                                        value={item.mrp}
                                                        readOnly
                                                    />
                                                </td>
                                                <td className="border">
                                                    <Input
                                                        type="number"
                                                        className="rounded-none border-0 p-0 text-center"
                                                        value={item.disc}
                                                        onChange={(e) => updateItemDisc(item.id, Number(e.target.value))}
                                                        min="0"
                                                        step="0.01"
                                                    />
                                                </td>
                                                <td className="border">
                                                    <Input
                                                        className="rounded-none border-0 p-0 text-center"
                                                        value={item.total.toFixed(2)}
                                                        readOnly
                                                    />
                                                </td>
                                                <td className="border-y text-center">
                                                    <Button
                                                        variant="ghost"
                                                        className="rounded-1 text-red-400 hover:text-red-800"
                                                        onClick={() => removeItem(item.id)}
                                                        title="Remove item"
                                                    >
                                                        <Trash2Icon />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </ScrollArea>
                        <div className="">
                            <table className="w-full text-xs">
                                <thead className="sticky top-0 z-10 bg-linear-to-r from-emerald-700 to-emerald-800 text-white">
                                    <tr>
                                        <th className="w-15 border-y py-2 pl-4 text-left">
                                            ITEMS
                                        </th>
                                        <th className="w-15 border px-1 text-center">
                                            QTY
                                        </th>
                                        <th className="w-15 border px-1 text-center">
                                            DISCOUNT
                                        </th>
                                        <th className="w-15 border px-1 text-center">
                                            TAX
                                        </th>
                                        <th className="w-20 border px-1 text-center">
                                            TOTAL MRP
                                        </th>
                                        <th className="w-20 border-y px-1 text-center">
                                            TOTAL BILL
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="border-y">
                                            <Input
                                                className="rounded-none border-0 p-0 text-center font-semibold"
                                                value={totals.totalItems}
                                                readOnly
                                            />
                                        </td>
                                        <td className="border">
                                            <Input
                                                className="rounded-none border-0 p-0 text-center font-semibold"
                                                value={totals.totalQty}
                                                readOnly
                                            />
                                        </td>
                                        <td className="border">
                                            <Input
                                                className="rounded-none border-0 p-0 text-center font-semibold"
                                                value={totals.totalDiscount.toFixed(2)}
                                                readOnly
                                            />
                                        </td>
                                        <td className="border">
                                            <Input
                                                className="rounded-none border-0 p-0 text-center font-semibold"
                                                value={totals.totalTaxAmount.toFixed(2)}
                                                readOnly
                                            />
                                        </td>
                                        <td className="border">
                                            <Input
                                                className="rounded-none border-0 p-0 text-center font-semibold"
                                                value={totals.totalMrp.toFixed(2)}
                                                readOnly
                                            />
                                        </td>
                                        <td className="border-y">
                                            <Input
                                                className="rounded-none border-0 p-0 text-center font-bold text-emerald-700"
                                                value={`₹${totals.totalBill.toFixed(2)}`}
                                                readOnly
                                            />
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            <div className="grid grid-cols-2 gap-4 p-4">
                                <div className="space-y-2">
                                    <Label className="text-s text-gray-700">
                                        Overall Discount on Invoice
                                    </Label>
                                    <div className="flex gap-2">
                                        <div className="flex items-center gap-2 rounded-md border-2 border-emerald-300 bg-white px-3 shadow-sm">
                                            <Percent
                                                className={`h-4 w-4 transition-colors ${discountType === 'percentage' ? 'text-emerald-600' : 'text-gray-400'}`}
                                            />
                                            <Switch
                                                checked={discountType === 'amount'}
                                                onCheckedChange={(checked) =>
                                                    setDiscountType(
                                                        checked
                                                            ? 'amount'
                                                            : 'percentage',
                                                    )
                                                }
                                                className="data-[state=checked]:bg-emerald-600"
                                            />
                                            <IndianRupee
                                                className={`h-4 w-4 transition-colors ${discountType === 'amount' ? 'text-emerald-600' : 'text-gray-400'}`}
                                            />
                                        </div>
                                        <Input
                                            type="number"
                                            placeholder="0.00"
                                            className="flex-1 border-2 border-emerald-300 font-semibold focus:border-emerald-600"
                                            value={overallDiscount}
                                            onChange={(e) => setOverallDiscount(Number(e.target.value))}
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                </div>
                                <Button
                                    className="h-14 bg-linear-to-r from-emerald-600 to-emerald-700 text-lg font-bold text-white shadow-lg transition-all hover:from-emerald-700 hover:to-emerald-800 hover:shadow-xl"
                                    onClick={quickPay}
                                    title="Quick Pay (F9)"
                                    disabled={isProcessing}
                                >
                                    <ShoppingCart className="mr-2 h-5 w-5" />
                                    {isProcessing ? 'PROCESSING...' : 'QUICK PAY'}
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="flex w-[10%] flex-col border-r bg-neutral-100">
                        <ScrollArea>
                            <div className="space-y-2 p-2">
                                {categories.map((cat) => (
                                    <Button
                                        key={cat.id}
                                        variant={
                                            selectedCategory === cat.id
                                                ? 'default'
                                                : 'outline'
                                        }
                                        className={`flex h-auto w-full flex-col items-center justify-center px-2 py-4 text-xs shadow-md transition-all ${
                                            selectedCategory === cat.id
                                                ? 'scale-105 bg-linear-to-r from-emerald-600 to-emerald-700 text-white shadow-lg hover:from-emerald-700 hover:to-emerald-800'
                                                : 'border-2 border-emerald-300 bg-white text-emerald-700 hover:border-emerald-500 hover:bg-emerald-50'
                                        }`}
                                        onClick={() => setSelectedCategory(cat.id)}
                                    >
                                        <div className="text-center leading-tight font-semibold wrap-break-word">
                                            {cat.name}
                                        </div>
                                    </Button>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>

                    <div className="flex flex-1 flex-col bg-neutral-100">
                        <div className="border-b bg-white p-4">
                            <div className="flex gap-2 mb-2">
                                <Input
                                    id="search-input"
                                    placeholder="Search products... (F3)"
                                    className="w-full"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                <Button
                                    className={`${showFilter ? 'bg-emerald-700' : 'bg-gray-500'} text-white hover:bg-emerald-700`}
                                    onClick={() => setShowFilter(!showFilter)}
                                    title="Toggle filters"
                                >
                                    <Filter/>
                                </Button>
                            </div>

                            {showFilter && (
                                <div className="grid grid-cols-3 gap-2 mt-2 p-3 bg-gray-50 rounded-md border">
                                    <div className="flex gap-2">
                                        <Input
                                            type="number"
                                            placeholder="Min price"
                                            value={priceFilter.min}
                                            onChange={(e) => setPriceFilter({...priceFilter, min: e.target.value})}
                                            className="text-sm"
                                        />
                                        <Input
                                            type="number"
                                            placeholder="Max price"
                                            value={priceFilter.max}
                                            onChange={(e) => setPriceFilter({...priceFilter, max: e.target.value})}
                                            className="text-sm"
                                        />
                                    </div>
                                    <Select value={stockFilter} onValueChange={setStockFilter}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Stock status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Stock</SelectItem>
                                            <SelectItem value="instock">In Stock</SelectItem>
                                            <SelectItem value="lowstock">Low Stock (≤10)</SelectItem>
                                            <SelectItem value="outofstock">Out of Stock</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setPriceFilter({min: '', max: ''});
                                            setStockFilter('all');
                                        }}
                                        className="text-sm"
                                    >
                                        Clear Filters
                                    </Button>
                                </div>
                            )}
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="p-4">
                                {filteredProducts.length === 0 ? (
                                    <div className="flex h-64 items-center justify-center text-gray-400">
                                        No products found
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-6 gap-2">
                                        {filteredProducts.map((product) => {
                                            const displayPrice = saleType === 'retail' ? product.selling_price : product.min_selling_price;
                                            return (
                                                <Card
                                                    key={product.id}
                                                    className="group relative cursor-pointer overflow-hidden border border-emerald-200 bg-white py-0 transition-all hover:border-emerald-500 hover:shadow-2xl active:scale-95"
                                                    onClick={() => addToCart(product)}
                                                >
                                                    <div className="flex h-full flex-col p-2">
                                                        <Badge
                                                            variant={
                                                                product.qty > 10
                                                                    ? 'default'
                                                                    : 'destructive'
                                                            }
                                                            className={`${product.qty > 10 ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : ''} absolute top-2 right-2 z-10`}
                                                        >
                                                            {product.qty}
                                                        </Badge>
                                                        {product.img ? (
                                                            <img
                                                                src={product.img}
                                                                className="mt-1 mb-3 h-28 w-full object-contain transition-transform group-hover:scale-105"
                                                                alt={product.name}
                                                            />
                                                        ) : (
                                                            <div className="mt-1 mb-3 flex h-28 w-full items-center justify-center rounded-md border border-dashed border-emerald-200 bg-emerald-50 text-emerald-400">
                                                                <Image className="h-8 w-8" aria-label="No image" />
                                                            </div>
                                                        )}
                                                        <div className="mb-1 line-clamp-2 h-8 text-left text-xs leading-tight text-gray-800">
                                                            {product.name}
                                                        </div>
                                                        <div className="rounded-md bg-linear-to-r from-emerald-600 to-emerald-700 py-1 text-center text-sm font-bold text-white shadow-md">
                                                            ₹{displayPrice.toFixed(2)}
                                                        </div>
                                                    </div>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            </div>
        </>
    );
};

// POS.layout = (page: React.ReactNode) => <AppLayout children={page} />;

export default POS;
