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
import { ScrollArea } from '@/components/special/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
    Barcode,
    Filter,
    Hotel,
    IndianRupee,
    Pause,
    Percent,
    ShoppingCart,
    Trash2Icon,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface Product {
    id: number;
    name: string;
    price: number;
    qty: number;
    img: string;
    category: string;
    barcode: string;
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
    total: number;
}

interface HeldInvoice {
    id: string;
    items: InvoiceItem[];
    timestamp: Date;
    customerName?: string;
    customerMobile?: string;
}

const Sales = () => {
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
    const [invoiceNumber] = useState(`GBINVOICE-2026-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`);
    const [currentDate] = useState(new Date().toISOString().split('T')[0]);
    const [heldInvoices, setHeldInvoices] = useState<HeldInvoice[]>([]);
    const [showFilter, setShowFilter] = useState(false);
    const [priceFilter, setPriceFilter] = useState({ min: '', max: '' });
    const [stockFilter, setStockFilter] = useState('all');

    const categories = [
        { id: 'all', name: 'All', icon: '📦' },
        { id: 'beverages', name: 'Beverages', icon: '🥤' },
        { id: 'snacks', name: 'Snacks', icon: '🍟' },
        { id: 'dairy', name: 'Dairy', icon: '🥛' },
        { id: 'bakery', name: 'Bakery', icon: '🍞' },
        { id: 'frozen', name: 'Frozen', icon: '🍦' },
        { id: 'canned', name: 'Canned', icon: '🥫' },
        { id: 'personal', name: 'Personal', icon: '🧴' },
    ];

    const [products] = useState<Product[]>([
        {
            id: 1,
            name: 'Coca Cola 330ml Can',
            price: 45,
            qty: 7,
            img: 'https://rukminim2.flixcart.com/image/1536/1536/xif0q/edible-oil/8/7/i/-original-imahhwxgdfb5uhpf.jpeg',
            category: 'beverages',
            barcode: '8901234567890',
        },
        {
            id: 2,
            name: 'Lays Classic Chips 52g',
            price: 20,
            qty: 85,
            img: 'https://rukminim2.flixcart.com/image/1536/1536/xif0q/tea/d/0/h/-original-imahghfbmmcwpj55.jpeg',
            category: 'snacks',
            barcode: '8901234567891',
        },
        {
            id: 3,
            name: 'Amul Taaza Milk 1L',
            price: 65,
            qty: 45,
            img: 'https://picsum.photos/seed/3/350/512',
            category: 'dairy',
            barcode: '8901234567892',
        },
        {
            id: 4,
            name: 'Modern Bread Loaf',
            price: 35,
            qty: 30,
            img: 'https://picsum.photos/seed/4/512/512',
            category: 'bakery',
            barcode: '8901234567893',
        },
        {
            id: 5,
            name: 'Kwality Walls Ice Cream',
            price: 120,
            qty: 25,
            img: 'https://picsum.photos/seed/5/512/512',
            category: 'frozen',
            barcode: '8901234567894',
        },
        {
            id: 6,
            name: 'Sprite 330ml Can',
            price: 45,
            qty: 95,
            img: 'https://picsum.photos/seed/6/512/512',
            category: 'beverages',
            barcode: '8901234567895',
        },
        {
            id: 7,
            name: 'Kurkure Masala Munch',
            price: 20,
            qty: 70,
            img: 'https://picsum.photos/seed/7/512/512',
            category: 'snacks',
            barcode: '8901234567896',
        },
        {
            id: 8,
            name: 'Amul Lassi Cup 200ml',
            price: 25,
            qty: 55,
            img: 'https://picsum.photos/seed/8/512/512',
            category: 'dairy',
            barcode: '8901234567897',
        },
        {
            id: 9,
            name: 'Britannia Cake 250g',
            price: 80,
            qty: 20,
            img: 'https://picsum.photos/seed/9/512/512',
            category: 'bakery',
            barcode: '8901234567898',
        },
        {
            id: 10,
            name: 'McCain French Fries',
            price: 250,
            qty: 15,
            img: 'https://picsum.photos/seed/10/512/512',
            category: 'frozen',
            barcode: '8901234567899',
        },
        {
            id: 11,
            name: 'Heinz Baked Beans',
            price: 55,
            qty: 40,
            img: 'https://picsum.photos/seed/11/512/512',
            category: 'canned',
            barcode: '8901234567800',
        },
        {
            id: 12,
            name: 'Tuna Chunks Can',
            price: 85,
            qty: 35,
            img: 'https://picsum.photos/seed/12/512/512',
            category: 'canned',
            barcode: '8901234567801',
        },
        {
            id: 13,
            name: 'Pepsi 330ml Can',
            price: 45,
            qty: 110,
            img: 'https://picsum.photos/seed/13/512/512',
            category: 'beverages',
            barcode: '8901234567802',
        },
        {
            id: 14,
            name: 'Bingo Mad Angles',
            price: 20,
            qty: 65,
            img: 'https://picsum.photos/seed/14/512/512',
            category: 'snacks',
            barcode: '8901234567803',
        },
        {
            id: 15,
            name: 'Dettol Handwash 200ml',
            price: 75,
            qty: 50,
            img: 'https://picsum.photos/seed/15/512/512',
            category: 'personal',
            barcode: '8901234567804',
        },
        {
            id: 16,
            name: 'Colgate Toothpaste',
            price: 95,
            qty: 60,
            img: 'https://picsum.photos/seed/16/512/512',
            category: 'personal',
            barcode: '8901234567805',
        },
        {
            id: 17,
            name: 'Parle-G Biscuits 376g',
            price: 40,
            qty: 90,
            img: 'https://picsum.photos/seed/17/512/512',
            category: 'snacks',
            barcode: '8901234567806',
        },
        {
            id: 18,
            name: 'Nestle Maggi 280g',
            price: 48,
            qty: 75,
            img: 'https://picsum.photos/seed/18/512/512',
            category: 'canned',
            barcode: '8901234567807',
        },
    ]);

    // Add product to cart by barcode or product object
    const addToCart = (productOrBarcode: Product | string) => {
        let product: Product | undefined;

        if (typeof productOrBarcode === 'string') {
            product = products.find(p => p.barcode === productOrBarcode);
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

        if (existingItemIndex >= 0) {
            const updatedItems = [...invoiceItems];
            updatedItems[existingItemIndex].qty += 1;
            updatedItems[existingItemIndex].total =
                updatedItems[existingItemIndex].qty * updatedItems[existingItemIndex].rate;
            setInvoiceItems(updatedItems);
        } else {
            const newItem: InvoiceItem = {
                id: Date.now(),
                productId: product.id,
                name: product.name,
                barcode: product.barcode,
                qty: 1,
                rate: product.price,
                mrp: product.price + 5,
                disc: 0,
                total: product.price,
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

        const updatedItems = invoiceItems.map(item => {
            if (item.id === itemId) {
                const total = newQty * item.rate - item.disc;
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
                const total = item.qty * newRate - item.disc;
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
                const total = item.qty * item.rate - newDisc;
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

    // Calculate totals
    const calculateTotals = () => {
        const totalItems = invoiceItems.length;
        const totalQty = invoiceItems.reduce((sum, item) => sum + item.qty, 0);
        const subtotal = invoiceItems.reduce((sum, item) => sum + item.total, 0);
        const itemsDiscount = invoiceItems.reduce((sum, item) => sum + item.disc, 0);

        let finalDiscount = itemsDiscount;
        if (overallDiscount > 0) {
            finalDiscount += discountType === 'percentage'
                ? (subtotal * overallDiscount / 100)
                : overallDiscount;
        }

        const totalMrp = invoiceItems.reduce((sum, item) => sum + (item.mrp * item.qty), 0);
        const tax = subtotal * 0.05; // 5% tax for example
        const totalBill = subtotal - (discountType === 'percentage' ? (subtotal * overallDiscount / 100) : overallDiscount) + tax;

        return {
            totalItems,
            totalQty,
            totalDiscount: finalDiscount,
            tax,
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
    };

    // Quick pay
    const quickPay = () => {
        if (invoiceItems.length === 0) {
            alert('No items in cart!');
            return;
        }

        const confirmed = confirm(
            `Process payment of ₹${totals.totalBill.toFixed(2)} via ${paymentMethod.toUpperCase()}?`
        );

        if (confirmed) {
            alert(`Payment successful!\nInvoice: ${invoiceNumber}\nAmount: ₹${totals.totalBill.toFixed(2)}`);
            clearInvoice();
        }
    };

    // Filter products
    const filteredProducts = products.filter(p => {
        const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
        const matchesSearch = searchQuery === '' ||
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.barcode?.includes(searchQuery);

        const matchesPrice = (!priceFilter.min || p.price >= Number(priceFilter.min)) &&
            (!priceFilter.max || p.price <= Number(priceFilter.max));

        const matchesStock = stockFilter === 'all' ||
            (stockFilter === 'instock' && p.qty > 0) ||
            (stockFilter === 'lowstock' && p.qty > 0 && p.qty <= 10) ||
            (stockFilter === 'outofstock' && p.qty === 0);

        return matchesCategory && matchesSearch && matchesPrice && matchesStock;
    });

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            // F2 - Focus barcode input
            if (e.key === 'F2') {
                e.preventDefault();
                document.getElementById('barcode-input')?.focus();
            }
            // F3 - Focus search
            if (e.key === 'F3') {
                e.preventDefault();
                document.getElementById('search-input')?.focus();
            }
            // F4 - Hold invoice
            if (e.key === 'F4') {
                e.preventDefault();
                holdInvoice();
            }
            // F9 - Quick pay
            if (e.key === 'F9') {
                e.preventDefault();
                quickPay();
            }
            // Escape - Clear search
            if (e.key === 'Escape') {
                setSearchQuery('');
                setBarcodeInput('');
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [invoiceItems, customerName, customerMobile]);

    return (
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
                    <div className=""></div>
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
                                    <SelectItem value="netbanking">Net Banking</SelectItem>
                                    <SelectItem value="wallet">Wallet</SelectItem>
                                    <SelectItem value="credit">Credit</SelectItem>
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
                                                    {item.name}
                                                </div>
                                                <div className="text-[10px]">
                                                    {item.barcode}
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
                                            value={totals.tax.toFixed(2)}
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
                                    />
                                </div>
                            </div>
                            <Button
                                className="h-14 bg-linear-to-r from-emerald-600 to-emerald-700 text-lg font-bold text-white shadow-lg transition-all hover:from-emerald-700 hover:to-emerald-800 hover:shadow-xl"
                                onClick={quickPay}
                                title="Quick Pay (F9)"
                            >
                                <ShoppingCart className="mr-2 h-5 w-5" />
                                QUICK PAY
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
                                    {filteredProducts.map((product) => (
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
                                                <img
                                                    src={product.img}
                                                    className="mt-1 mb-3 h-28 w-full object-contain transition-transform group-hover:scale-105"
                                                    alt={product.name}
                                                />
                                                <div className="mb-1 line-clamp-2 h-8 text-left text-xs leading-tight text-gray-800">
                                                    {product.name}
                                                </div>
                                                <div className="rounded-md bg-linear-to-r from-emerald-600 to-emerald-700 py-1 text-center text-sm font-bold text-white shadow-md">
                                                    ₹{product.price}
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </div>
        </div>
    );
};

export default Sales;
