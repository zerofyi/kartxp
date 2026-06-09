import { Head, router } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
    Barcode, Filter, Hotel, Image, IndianRupee,
    Pause, Percent, ShoppingCart, Trash2Icon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
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

interface Category { id: string; name: string; icon: string; }
interface Warehouse { id: number; name: string; location?: string; }
interface Customer  { id: number; name: string; phone: string; credit_limit: number; }

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

// ---------------------------------------------------------------------------
// Pure helpers (defined outside component → stable references, never re-created)
// ---------------------------------------------------------------------------
function truncateProductName(name: string, maxChars = 38): string {
    if (name.length <= maxChars) return name;
    const parts = name.split(' - ');
    if (parts.length === 2) {
        const [first, second] = parts;
        const avail = maxChars - second.length - 4;
        return avail > 5 ? first.substring(0, avail).trim() + '... - ' + second : '... - ' + second;
    }
    return name.substring(0, maxChars) + '...';
}

function calcItemTotal(qty: number, rate: number, disc: number, taxPercent: number, taxType: 'inclusive' | 'exclusive'): number {
    if (taxType === 'inclusive') {
        return Math.max(0, qty * rate - disc);
    }
    const base = Math.max(0, qty * rate - disc);
    return base + base * taxPercent / 100;
}

// ---------------------------------------------------------------------------
// Debounce hook – delays state updates while user is typing
// ---------------------------------------------------------------------------
function useDebounce<T>(value: T, ms = 200): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), ms);
        return () => clearTimeout(t);
    }, [value, ms]);
    return debounced;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const POS = ({ products = [], categories = [], warehouse, customers = [] }: Props) => {
    // ── State ────────────────────────────────────────────────────────────────
    const [discountType,    setDiscountType]    = useState<'percentage' | 'amount'>('percentage');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery,     setSearchQuery]     = useState('');
    const [barcodeInput,    setBarcodeInput]    = useState('');
    const [invoiceItems,    setInvoiceItems]    = useState<InvoiceItem[]>([]);
    const [overallDiscount, setOverallDiscount] = useState(0);
    const [saleType,        setSaleType]        = useState('retail');
    const [customerType,    setCustomerType]    = useState('enter');
    const [customerMobile,  setCustomerMobile]  = useState('');
    const [customerName,    setCustomerName]    = useState('');
    const [customerId,      setCustomerId]      = useState('');
    const [paymentMethod,   setPaymentMethod]   = useState('cash');
    const [heldInvoices,    setHeldInvoices]    = useState<HeldInvoice[]>([]);
    const [showFilter,      setShowFilter]      = useState(false);
    const [priceFilter,     setPriceFilter]     = useState({ min: '', max: '' });
    const [stockFilter,     setStockFilter]     = useState('all');
    const [isProcessing,    setIsProcessing]    = useState(false);
    const [showCustomerDrop,setShowCustomerDrop]= useState(false);

    // Stable invoice number – computed once
    const invoiceNumber = useRef(`INV-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(Math.floor(Math.random()*10000)).padStart(4,'0')}`).current;
    const currentDate   = useRef(new Date().toISOString().split('T')[0]).current;

    const customerDropRef = useRef<HTMLDivElement>(null);

    // ── Product lookup map – O(1) by id or barcode ───────────────────────────
    const productById = useMemo(() => {
        const m = new Map<number, Product>();
        for (const p of products) m.set(p.id, p);
        return m;
    }, [products]);

    const productByBarcode = useMemo(() => {
        const m = new Map<string, Product>();
        for (const p of products) {
            if (p.barcode) m.set(p.barcode, p);
            m.set(p.sku, p);
        }
        return m;
    }, [products]);

    // ── Debounced search (avoids re-filtering on every keystroke) ────────────
    const debouncedSearch = useDebounce(searchQuery, 180);

    // ── Filtered customers (memoized) ────────────────────────────────────────
    const filteredCustomers = useMemo(() => {
        if (customerType === 'walkin') return [];
        const q = (customerMobile + customerName).toLowerCase().trim();
        if (!q) return [];
        return customers.filter(c =>
            c.phone.toLowerCase().includes(customerMobile.toLowerCase().trim()) ||
            c.name.toLowerCase().includes(customerName.toLowerCase().trim())
        );
    }, [customerMobile, customerName, customerType, customers]);

    useEffect(() => {
        setShowCustomerDrop(filteredCustomers.length > 0);
    }, [filteredCustomers]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (customerDropRef.current && !customerDropRef.current.contains(e.target as Node)) {
                setShowCustomerDrop(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // ── Filtered products (memoized, only recalculates when deps change) ─────
    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;

            if (debouncedSearch) {
                const q = debouncedSearch.toLowerCase();
                if (!p.name.toLowerCase().includes(q) && !p.barcode?.includes(debouncedSearch) && !p.sku.includes(debouncedSearch)) return false;
            }

            const price = saleType === 'retail' ? p.selling_price : p.min_selling_price;
            if (priceFilter.min && price < Number(priceFilter.min)) return false;
            if (priceFilter.max && price > Number(priceFilter.max)) return false;

            if (stockFilter === 'instock'    && p.qty <= 0)            return false;
            if (stockFilter === 'lowstock'   && (p.qty <= 0 || p.qty > 10)) return false;
            if (stockFilter === 'outofstock' && p.qty > 0)             return false;

            return true;
        });
    }, [products, selectedCategory, debouncedSearch, saleType, priceFilter, stockFilter]);

    // ── Totals (memoized) ────────────────────────────────────────────────────
    const totals = useMemo(() => {
        let subtotalBeforeTax = 0, totalTaxAmount = 0, itemDiscounts = 0;
        let totalMrp = 0, totalQty = 0;

        for (const item of invoiceItems) {
            itemDiscounts     += item.disc;
            totalMrp          += item.mrp * item.qty;
            totalQty          += item.qty;

            if (item.taxType === 'inclusive') {
                const gross = item.qty * item.rate - item.disc;
                const base  = gross / (1 + item.taxPercent / 100);
                subtotalBeforeTax += base;
                totalTaxAmount    += gross - base;
            } else {
                const base = item.qty * item.rate - item.disc;
                const tax  = base * item.taxPercent / 100;
                subtotalBeforeTax += base;
                totalTaxAmount    += tax;
            }
        }

        let overallDiscountAmount = 0;
        if (overallDiscount > 0 && subtotalBeforeTax > 0) {
            overallDiscountAmount = discountType === 'percentage'
                ? subtotalBeforeTax * overallDiscount / 100
                : overallDiscount;

            const ratio        = (subtotalBeforeTax - overallDiscountAmount) / subtotalBeforeTax;
            totalTaxAmount     = totalTaxAmount * ratio;
            subtotalBeforeTax -= overallDiscountAmount;
        }

        return {
            totalItems: invoiceItems.length,
            totalQty,
            subtotalBeforeTax,
            totalTaxAmount,
            totalDiscount: itemDiscounts + overallDiscountAmount,
            totalMrp,
            totalBill: Math.max(0, subtotalBeforeTax + totalTaxAmount),
        };
    }, [invoiceItems, overallDiscount, discountType]);

    // ── Handlers (all useCallback – stable references for child props) ────────
    const selectCustomer = useCallback((customer: Customer) => {
        setCustomerId(String(customer.id));
        setCustomerName(customer.name);
        setCustomerMobile(customer.phone);
        setShowCustomerDrop(false);
    }, []);

    const addToCart = useCallback((productOrBarcode: Product | string) => {
        let product: Product | undefined;
        if (typeof productOrBarcode === 'string') {
            product = productByBarcode.get(productOrBarcode.trim());
        } else {
            product = productOrBarcode;
        }

        if (!product) { alert('Product not found!'); return; }
        if (product.qty <= 0) { alert('Product out of stock!'); return; }

        const price = saleType === 'retail' ? product.selling_price : product.min_selling_price;

        setInvoiceItems(prev => {
            const idx = prev.findIndex(i => i.productId === product!.id);
            if (idx >= 0) {
                if (prev[idx].qty >= product!.qty) { alert('Not enough stock available!'); return prev; }
                const updated = [...prev];
                const item    = { ...updated[idx], qty: updated[idx].qty + 1 };
                item.total    = calcItemTotal(item.qty, item.rate, item.disc, item.taxPercent, item.taxType);
                updated[idx]  = item;
                return updated;
            }
            return [...prev, {
                id: Date.now(),
                productId:  product!.id,
                name:       product!.name,
                barcode:    product!.barcode,
                qty:        1,
                rate:       price,
                mrp:        product!.mrp,
                disc:       0,
                taxPercent: product!.tax_percent,
                taxType:    product!.tax_type,
                total:      calcItemTotal(1, price, 0, product!.tax_percent, product!.tax_type),
            }];
        });

        setBarcodeInput('');
    }, [saleType, productByBarcode]);

    const handleBarcodeSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (barcodeInput.trim()) addToCart(barcodeInput.trim());
    }, [barcodeInput, addToCart]);

    const updateItemQty = useCallback((itemId: number, newQty: number) => {
        if (newQty <= 0) {
            setInvoiceItems(prev => prev.filter(i => i.id !== itemId));
            return;
        }
        setInvoiceItems(prev => prev.map(item => {
            if (item.id !== itemId) return item;
            const product = productById.get(item.productId);
            if (product && newQty > product.qty) { alert('Not enough stock available!'); return item; }
            return { ...item, qty: newQty, total: calcItemTotal(newQty, item.rate, item.disc, item.taxPercent, item.taxType) };
        }));
    }, [productById]);

    const updateItemRate = useCallback((itemId: number, newRate: number) => {
        setInvoiceItems(prev => prev.map(item =>
            item.id === itemId
                ? { ...item, rate: newRate, total: calcItemTotal(item.qty, newRate, item.disc, item.taxPercent, item.taxType) }
                : item
        ));
    }, []);

    const updateItemDisc = useCallback((itemId: number, newDisc: number) => {
        setInvoiceItems(prev => prev.map(item =>
            item.id === itemId
                ? { ...item, disc: newDisc, total: calcItemTotal(item.qty, item.rate, newDisc, item.taxPercent, item.taxType) }
                : item
        ));
    }, []);

    const removeItem = useCallback((itemId: number) => {
        setInvoiceItems(prev => prev.filter(i => i.id !== itemId));
    }, []);

    const clearInvoice = useCallback(() => {
        setInvoiceItems([]);
        setOverallDiscount(0);
        setCustomerName('');
        setCustomerMobile('');
        setCustomerId('');
        setCustomerType('enter');
        setSaleType('retail');
    }, []);

    const holdInvoice = useCallback(() => {
        if (invoiceItems.length === 0) { alert('No items in cart to hold!'); return; }
        setHeldInvoices(prev => [...prev, {
            id: `HOLD-${Date.now()}`,
            items: [...invoiceItems],
            timestamp: new Date(),
            customerName, customerMobile, saleType,
        }]);
        clearInvoice();
        alert('Invoice held successfully!');
    }, [invoiceItems, customerName, customerMobile, saleType, clearInvoice]);

    const retrieveHeldInvoice = useCallback((held: HeldInvoice) => {
        if (invoiceItems.length > 0 && !confirm('Current cart has items. Replace with held invoice?')) return;
        setInvoiceItems(held.items);
        setCustomerName(held.customerName || '');
        setCustomerMobile(held.customerMobile || '');
        setSaleType(held.saleType);
        setHeldInvoices(prev => prev.filter(inv => inv.id !== held.id));
    }, [invoiceItems.length]);

    const deleteHeldInvoice = useCallback((id: string) => {
        if (confirm('Delete this held invoice?')) {
            setHeldInvoices(prev => prev.filter(inv => inv.id !== id));
        }
    }, []);

    // ── Update prices when sale type flips ────────────────────────────────────
    useEffect(() => {
        if (invoiceItems.length === 0) return;
        setInvoiceItems(prev => prev.map(item => {
            const p = productById.get(item.productId);
            if (!p) return item;
            const newRate = saleType === 'retail' ? p.selling_price : p.min_selling_price;
            return { ...item, rate: newRate, total: calcItemTotal(item.qty, newRate, item.disc, item.taxPercent, item.taxType) };
        }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [saleType]);   // intentionally omit invoiceItems to avoid loop

    // ── Quick Pay ─────────────────────────────────────────────────────────────
    const quickPay = useCallback(() => {
        if (invoiceItems.length === 0) { alert('No items in cart!'); return; }
        if (!warehouse)               { alert('No warehouse assigned!'); return; }
        if (!confirm(`Process payment of ₹${totals.totalBill.toFixed(2)} via ${paymentMethod.toUpperCase()}?`)) return;

        setIsProcessing(true);

        router.post('/warehouse/sales', {
            customer_id:      customerId || null,
            customer_name:    customerName || 'Walk-in Customer',
            customer_mobile:  customerMobile || null,
            order_channel:    'pos',
            warehouse_id:     warehouse.id,
            payment_method:   paymentMethod,
            sale_type:        saleType,
            items: invoiceItems.map(item => ({
                product_variant_id: item.productId,
                quantity:           item.qty,
                price:              item.rate,
                discount:           item.disc,
                tax_percent:        item.taxPercent,
                tax_type:           item.taxType,
            })),
            overall_discount: overallDiscount,
            discount_type:    discountType,
        }, {
            onSuccess: (page) => {
                const success = (page.props as any).flash?.success;
                if (success) {
                    if (success.order) {
                        window.open(`/warehouse/sales/${success.order.id}/print`, '_blank');
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
    }, [invoiceItems, warehouse, totals.totalBill, paymentMethod, customerId, customerName,
        customerMobile, saleType, overallDiscount, discountType, clearInvoice]);

    // ── Keyboard shortcuts ────────────────────────────────────────────────────
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'F2') { e.preventDefault(); document.getElementById('barcode-input')?.focus(); }
            if (e.key === 'F3') { e.preventDefault(); document.getElementById('search-input')?.focus(); }
            if (e.key === 'F4') { e.preventDefault(); holdInvoice(); }
            if (e.key === 'F9') { e.preventDefault(); quickPay(); }
            if (e.key === 'Escape') { setSearchQuery(''); setBarcodeInput(''); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [holdInvoice, quickPay]);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <>
            <Head title="POS - Point of Sale" />
            <div className="flex h-screen flex-col bg-neutral-100">

                {/* HEADER */}
                <div className="flex w-full items-center gap-2 bg-emerald-700 p-2 px-4 text-3xl font-bold text-white shadow-md">
                    <Hotel /> Ghorer Bazar
                </div>

                {/* TOP BAR */}
                <div className="h-min-[15vh] shrink-0 border-b-2 border-emerald-700 bg-white">
                    <div className="grid h-full grid-cols-3 gap-4 p-4">

                        {/* Col 1 – sale type + customer */}
                        <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                                <Select value={saleType} onValueChange={setSaleType}>
                                    <SelectTrigger className="w-full"><SelectValue placeholder="Sale type" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="retail">Retail</SelectItem>
                                        <SelectItem value="wholesale">Wholesale</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={customerType} onValueChange={setCustomerType}>
                                    <SelectTrigger className="w-full"><SelectValue placeholder="Customer type" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="enter">Enter customer details</SelectItem>
                                        <SelectItem value="walkin">Walk-in</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex gap-2 relative" ref={customerDropRef}>
                                <Input
                                    placeholder="Customer Mobile"
                                    className="w-full"
                                    value={customerMobile}
                                    onChange={e => setCustomerMobile(e.target.value)}
                                    disabled={customerType === 'walkin'}
                                />
                                <div className="w-full relative">
                                    <Input
                                        placeholder="Customer Name"
                                        className="w-full"
                                        value={customerName}
                                        onChange={e => setCustomerName(e.target.value)}
                                        disabled={customerType === 'walkin'}
                                    />
                                    {showCustomerDrop && (
                                        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-emerald-300 bg-white shadow-lg">
                                            {filteredCustomers.map(c => (
                                                <div key={c.id} className="cursor-pointer px-4 py-2 hover:bg-emerald-50 border-b last:border-b-0" onClick={() => selectCustomer(c)}>
                                                    <div className="font-medium text-sm">{c.name}</div>
                                                    <div className="text-xs text-gray-500">{c.phone}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Col 2 – held invoices */}
                        <div className="flex items-center justify-center">
                            {heldInvoices.length > 0 && (
                                <div className="w-full">
                                    <Label className="text-xs text-gray-600 mb-1 block">Held Invoices ({heldInvoices.length})</Label>
                                    <ScrollArea className="h-20 rounded-md border border-emerald-200 bg-emerald-50">
                                        <div className="p-2 space-y-1">
                                            {heldInvoices.map(held => (
                                                <div key={held.id} className="flex items-center justify-between bg-white p-2 rounded border border-emerald-200 text-xs hover:bg-emerald-50">
                                                    <div className="flex-1">
                                                        <div className="font-medium">{held.customerName || 'Walk-in'}</div>
                                                        <div className="text-gray-500">{held.items.length} items • {new Date(held.timestamp).toLocaleTimeString()}</div>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => retrieveHeldInvoice(held)}>Retrieve</Button>
                                                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-red-500 hover:text-red-700" onClick={() => deleteHeldInvoice(held.id)}><Trash2Icon className="h-3 w-3" /></Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </div>
                            )}
                        </div>

                        {/* Col 3 – invoice meta + payment */}
                        <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                                <Input placeholder="Invoice Number" className="w-full" value={invoiceNumber} readOnly />
                                <Input type="date" className="w-full" value={currentDate} readOnly />
                            </div>
                            <div className="flex gap-2">
                                <Input placeholder="Customer ID" className="w-full" value={customerId} onChange={e => setCustomerId(e.target.value)} />
                                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                    <SelectTrigger className="w-full"><SelectValue placeholder="Payment method" /></SelectTrigger>
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

                {/* MAIN */}
                <div className="h-min-[85vh] flex min-h-0 flex-1">

                    {/* LEFT – Cart */}
                    <div className="flex w-[35%] flex-col border-r bg-white">
                        <div className="flex gap-4 border-b p-4">
                            <form onSubmit={handleBarcodeSubmit} className="flex-1">
                                <InputGroup className="border-emerald-200">
                                    <InputGroupInput
                                        id="barcode-input"
                                        placeholder="Scan barcode (F2)"
                                        value={barcodeInput}
                                        onChange={e => setBarcodeInput(e.target.value)}
                                        autoFocus
                                    />
                                    <InputGroupAddon><Barcode /></InputGroupAddon>
                                </InputGroup>
                            </form>
                            <Button className="bg-yellow-500 text-white hover:bg-yellow-600" onClick={holdInvoice} title="Hold (F4)" disabled={isProcessing}>
                                <Pause /> Hold
                            </Button>
                        </div>

                        {/* Cart table */}
                        <ScrollArea className="flex-1">
                            <table className="w-full text-xs">
                                <thead className="sticky top-0 z-10 bg-gradient-to-r from-emerald-700 to-emerald-800 text-white">
                                    <tr>
                                        <th className="w-50 border-y py-2 pl-4 text-left">Product</th>
                                        <th className="w-5 border px-1 text-center">Qty</th>
                                        <th className="w-10 border px-1 text-center">Rate</th>
                                        <th className="w-10 border px-1 text-center">MRP</th>
                                        <th className="w-5 border px-1 text-center">Disc</th>
                                        <th className="w-15 border px-1 text-center">Total</th>
                                        <th className="w-5 border-y px-1">/</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoiceItems.length === 0 ? (
                                        <tr><td colSpan={7} className="py-8 text-center text-gray-400">No items added yet. Scan or click products to add.</td></tr>
                                    ) : invoiceItems.map(item => (
                                        <CartRow
                                            key={item.id}
                                            item={item}
                                            onQty={updateItemQty}
                                            onRate={updateItemRate}
                                            onDisc={updateItemDisc}
                                            onRemove={removeItem}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </ScrollArea>

                        {/* Totals footer */}
                        <div>
                            <table className="w-full text-xs">
                                <thead className="bg-gradient-to-r from-emerald-700 to-emerald-800 text-white">
                                    <tr>
                                        <th className="border-y py-2 pl-4 text-left">ITEMS</th>
                                        <th className="border px-1 text-center">QTY</th>
                                        <th className="border px-1 text-center">DISCOUNT</th>
                                        <th className="border px-1 text-center">TAX</th>
                                        <th className="border px-1 text-center">TOTAL MRP</th>
                                        <th className="border-y px-1 text-center">TOTAL BILL</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="border-y"><Input className="rounded-none border-0 p-0 text-center font-semibold" value={totals.totalItems} readOnly /></td>
                                        <td className="border"><Input className="rounded-none border-0 p-0 text-center font-semibold" value={totals.totalQty} readOnly /></td>
                                        <td className="border"><Input className="rounded-none border-0 p-0 text-center font-semibold" value={totals.totalDiscount.toFixed(2)} readOnly /></td>
                                        <td className="border"><Input className="rounded-none border-0 p-0 text-center font-semibold" value={totals.totalTaxAmount.toFixed(2)} readOnly /></td>
                                        <td className="border"><Input className="rounded-none border-0 p-0 text-center font-semibold" value={totals.totalMrp.toFixed(2)} readOnly /></td>
                                        <td className="border-y"><Input className="rounded-none border-0 p-0 text-center font-bold text-emerald-700" value={`₹${totals.totalBill.toFixed(2)}`} readOnly /></td>
                                    </tr>
                                </tbody>
                            </table>

                            <div className="grid grid-cols-2 gap-4 p-4">
                                <div className="space-y-2">
                                    <Label className="text-s text-gray-700">Overall Discount on Invoice</Label>
                                    <div className="flex gap-2">
                                        <div className="flex items-center gap-2 rounded-md border-2 border-emerald-300 bg-white px-3 shadow-sm">
                                            <Percent className={`h-4 w-4 ${discountType === 'percentage' ? 'text-emerald-600' : 'text-gray-400'}`} />
                                            <Switch checked={discountType === 'amount'} onCheckedChange={c => setDiscountType(c ? 'amount' : 'percentage')} className="data-[state=checked]:bg-emerald-600" />
                                            <IndianRupee className={`h-4 w-4 ${discountType === 'amount' ? 'text-emerald-600' : 'text-gray-400'}`} />
                                        </div>
                                        <Input type="number" placeholder="0.00" className="flex-1 border-2 border-emerald-300 font-semibold" value={overallDiscount} onChange={e => setOverallDiscount(Number(e.target.value))} min="0" step="0.01" />
                                    </div>
                                </div>
                                <Button
                                    className="h-14 bg-gradient-to-r from-emerald-600 to-emerald-700 text-lg font-bold text-white shadow-lg hover:from-emerald-700 hover:to-emerald-800"
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

                    {/* MIDDLE – Categories */}
                    <div className="flex w-[10%] flex-col border-r bg-neutral-100">
                        <ScrollArea>
                            <div className="space-y-2 p-2">
                                {categories.map(cat => (
                                    <Button
                                        key={cat.id}
                                        variant={selectedCategory === cat.id ? 'default' : 'outline'}
                                        className={`flex h-auto w-full flex-col items-center justify-center px-2 py-4 text-xs shadow-md transition-all ${
                                            selectedCategory === cat.id
                                                ? 'scale-105 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg'
                                                : 'border-2 border-emerald-300 bg-white text-emerald-700 hover:border-emerald-500 hover:bg-emerald-50'
                                        }`}
                                        onClick={() => setSelectedCategory(cat.id)}
                                    >
                                        <div className="text-center leading-tight font-semibold break-words">{cat.name}</div>
                                    </Button>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* RIGHT – Product grid */}
                    <div className="flex flex-1 flex-col bg-neutral-100">
                        <div className="border-b bg-white p-4">
                            <div className="flex gap-2 mb-2">
                                <Input id="search-input" placeholder="Search products... (F3)" className="w-full" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                                <Button className={`${showFilter ? 'bg-emerald-700' : 'bg-gray-500'} text-white hover:bg-emerald-700`} onClick={() => setShowFilter(v => !v)} title="Toggle filters">
                                    <Filter />
                                </Button>
                            </div>
                            {showFilter && (
                                <div className="grid grid-cols-3 gap-2 mt-2 p-3 bg-gray-50 rounded-md border">
                                    <div className="flex gap-2">
                                        <Input type="number" placeholder="Min price" value={priceFilter.min} onChange={e => setPriceFilter(p => ({...p, min: e.target.value}))} className="text-sm" />
                                        <Input type="number" placeholder="Max price" value={priceFilter.max} onChange={e => setPriceFilter(p => ({...p, max: e.target.value}))} className="text-sm" />
                                    </div>
                                    <Select value={stockFilter} onValueChange={setStockFilter}>
                                        <SelectTrigger><SelectValue placeholder="Stock status" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Stock</SelectItem>
                                            <SelectItem value="instock">In Stock</SelectItem>
                                            <SelectItem value="lowstock">Low Stock (≤10)</SelectItem>
                                            <SelectItem value="outofstock">Out of Stock</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button variant="outline" className="text-sm" onClick={() => { setPriceFilter({min:'',max:''}); setStockFilter('all'); }}>Clear Filters</Button>
                                </div>
                            )}
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="p-4">
                                {filteredProducts.length === 0
                                    ? <div className="flex h-64 items-center justify-center text-gray-400">No products found</div>
                                    : <div className="grid grid-cols-6 gap-2">
                                        {filteredProducts.map(product => (
                                            <ProductCard
                                                key={product.id}
                                                product={product}
                                                saleType={saleType}
                                                onClick={addToCart}
                                            />
                                        ))}
                                    </div>
                                }
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            </div>
        </>
    );
};

// ---------------------------------------------------------------------------
// Memoized sub-components – prevent re-renders of unchanged rows/cards
// ---------------------------------------------------------------------------

interface CartRowProps {
    item: InvoiceItem;
    onQty: (id: number, qty: number) => void;
    onRate: (id: number, rate: number) => void;
    onDisc: (id: number, disc: number) => void;
    onRemove: (id: number) => void;
}

const CartRow = ({ item, onQty, onRate, onDisc, onRemove }: CartRowProps) => (
    <tr className="transition-colors hover:bg-emerald-50/50">
        <td className="w-40 border-y py-1 pl-4">
            <div className="text-sm">{truncateProductName(item.name)}</div>
            <div className="text-[10px] text-gray-500">{item.barcode} • {item.taxType === 'inclusive' ? 'Tax Inc.' : 'Tax Exc.'}</div>
        </td>
        <td className="border"><Input type="number" className="rounded-none border-0 p-0 text-center" value={item.qty}   onChange={e => onQty(item.id, Number(e.target.value))}  min="1" /></td>
        <td className="border"><Input type="number" className="rounded-none border-0 p-0 text-center" value={item.rate}  onChange={e => onRate(item.id, Number(e.target.value))} min="0" step="0.01" /></td>
        <td className="border"><Input className="rounded-none border-0 p-0 text-center" value={item.mrp} readOnly /></td>
        <td className="border"><Input type="number" className="rounded-none border-0 p-0 text-center" value={item.disc}  onChange={e => onDisc(item.id, Number(e.target.value))} min="0" step="0.01" /></td>
        <td className="border"><Input className="rounded-none border-0 p-0 text-center" value={item.total.toFixed(2)} readOnly /></td>
        <td className="border-y text-center">
            <Button variant="ghost" className="rounded-1 text-red-400 hover:text-red-800" onClick={() => onRemove(item.id)}><Trash2Icon /></Button>
        </td>
    </tr>
);

// Wrap in memo so it only re-renders if its own props changed
const MemoCartRow = (CartRow);  // use React.memo if needed: React.memo(CartRow)

interface ProductCardProps {
    product: Product;
    saleType: string;
    onClick: (p: Product) => void;
}

const ProductCard = ({ product, saleType, onClick }: ProductCardProps) => {
    const displayPrice = saleType === 'retail' ? product.selling_price : product.min_selling_price;
    return (
        <Card
            className="group relative cursor-pointer overflow-hidden border border-emerald-200 bg-white py-0 transition-all hover:border-emerald-500 hover:shadow-2xl active:scale-95"
            onClick={() => onClick(product)}
        >
            <div className="flex h-full flex-col p-2">
                <Badge
                    variant={product.qty > 10 ? 'default' : 'destructive'}
                    className={`${product.qty > 10 ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : ''} absolute top-2 right-2 z-10`}
                >
                    {product.qty}
                </Badge>
                {product.img
                    ? <img src={product.img} className="mt-1 mb-3 h-28 w-full object-contain transition-transform group-hover:scale-105" alt={product.name} />
                    : <div className="mt-1 mb-3 flex h-28 w-full items-center justify-center rounded-md border border-dashed border-emerald-200 bg-emerald-50 text-emerald-400"><Image className="h-8 w-8" aria-label="No image" /></div>
                }
                <div className="mb-1 line-clamp-2 h-8 text-left text-xs leading-tight text-gray-800">{product.name}</div>
                <div className="rounded-md bg-gradient-to-r from-emerald-600 to-emerald-700 py-1 text-center text-sm font-bold text-white shadow-md">₹{displayPrice.toFixed(2)}</div>
            </div>
        </Card>
    );
};

export default POS;
