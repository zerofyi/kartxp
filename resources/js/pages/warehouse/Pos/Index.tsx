import { Head, router } from '@inertiajs/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { toast, Toaster } from 'sonner';

// Partials
import PosHeader         from './Partials/PosHeader';
import CustomerLedger    from './Partials/CustomerLedger';
import CategorySidebar   from './Partials/CategorySidebar';
import CartSection       from './Partials/CartSection';
import ProductGrid       from './Partials/ProductGrid';
import HeldInvoicesFab   from './Partials/HeldInvoicesFab';
import { useConfirmDialog } from './Partials/ConfirmDialog';

import { usePOSBroadcast, type DisplayState } from '@/hooks/use-pos-broadcast';
import { qzService } from '@/Services/QzService';
import qz from 'qz-tray';
import ThermalClassic from '../Settings/InvoiceTemplates/ThermalClassic';
import ThermalModern from '../Settings/InvoiceTemplates/ThermalModern';
import A4Standard from '../Settings/InvoiceTemplates/A4Standard';
import A4Modern from '../Settings/InvoiceTemplates/A4Modern';

export interface Product {
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

export interface Settings {
    [key: string]: any; // Index signature to allow clean assignment to template components
    upi_id: string;
    receipt_footer: string;
    welcome_message: string;
    gst_enabled: string;
    invoice_layout: string;
    is_qz_enabled: string;
    thermal_printer_name: string;
    a4_printer_name: string;
    upi_qr_svg?: string;
}

export interface Category  { id: string; name: string; icon?: string; }
export interface Warehouse { id: number; name: string; location?: string; logo_path?: string; address?: string; gstin?: string; email?: string; phone?: string; }
export interface Customer  {
    id: number;
    name: string;
    phone: string;
    credit_limit: any;
    due_amount?: any;
}

export interface InvoiceItem {
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

export interface HeldInvoice {
    id: string;
    items: InvoiceItem[];
    timestamp: string;
    customerName?: string;
    customerMobile?: string;
    saleType: string;
}

interface Props {
    products: Product[];
    categories: Category[];
    warehouse: Warehouse;
    customers: Customer[];
    settings: Settings;
}

function calcItemTotal(
    qty: number, rate: number, disc: number,
    taxPercent: number, taxType: 'inclusive' | 'exclusive',
): number {
    const base = Math.max(0, qty * rate - disc);
    return taxType === 'inclusive' ? base : base + (base * taxPercent) / 100;
}

const POSIndex = ({ products = [], categories = [], warehouse, customers = [], settings }: Props) => {

    // ── UI layout ────────────────────────────────────────────────────────────
    const [showFilter, setShowFilter] = useState(false);

    // PRINTER SYSTEM ROUTING
    const isQzActive = settings?.is_qz_enabled === '1';
    const invoiceLayout = settings?.invoice_layout ?? 'thermal_classic';

    const assignedPrinter = invoiceLayout.startsWith('thermal')
        ? (settings?.thermal_printer_name ?? '')
        : (settings?.a4_printer_name ?? '');

    const [qzHardwareStatus, setQzHardwareStatus] = useState<'active' | 'connecting' | 'missing' | 'inactive'>('inactive');
    const connectionInProgress = useRef<boolean>(false);

    // Dynamic Transaction Carrier States: Pre-hydrates offscreen nodes before printing triggers
    const [activePrintOrder, setActivePrintOrder] = useState<any>(null);
    const [activePrintSettings, setActivePrintSettings] = useState<any>(settings);
    const [activePrintWarehouse, setActivePrintWarehouse] = useState<any>(warehouse);

    useEffect(() => {
        if (isQzActive && !connectionInProgress.current) {
            connectionInProgress.current = true;
            setQzHardwareStatus('connecting');
            qzService.getAvailablePrinters()
                .then(() => setQzHardwareStatus('active'))
                .catch((err) => {
                    console.error("POS Hardware link dropped:", err);
                    setQzHardwareStatus('missing');
                })
                .finally(() => {
                    connectionInProgress.current = false;
                });
        } else if (!isQzActive) {
            setQzHardwareStatus('inactive');
        }
    }, [isQzActive]);

    // ── Invoice state ────────────────────────────────────────────────────────
    const [invoiceNumber,    setInvoiceNumber]    = useState('Generating...');
    const [invoiceItems,     setInvoiceItems]     = useState<InvoiceItem[]>([]);
    const [overallDiscount,  setOverallDiscount]  = useState(0);
    const [discountType,     setDiscountType]     = useState<'percentage' | 'amount'>('percentage');
    const [barcodeInput,     setBarcodeInput]     = useState('');
    const [isProcessing,     setIsProcessing]     = useState(false);

    // ── Product / filter state ───────────────────────────────────────────────
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery,      setSearchQuery]      = useState('');
    const [priceFilter,      setPriceFilter]      = useState({ min: '', max: '' });
    const [stockFilter,      setStockFilter]      = useState('instock');

    // ── Customer state ───────────────────────────────────────────────────────
    const [saleType,            setSaleType]           = useState('retail');
    const [customerType,        setCustomerType]       = useState('enter');
    const [paymentMethod,       setPaymentMethod]      = useState('cash');
    const [customerMobile,      setCustomerMobile]     = useState('');
    const [customerName,        setCustomerName]       = useState('');
    const [customerId,          setCustomerId]         = useState('');
    const [currentCreditLimit,  setCurrentCreditLimit] = useState(0);
    const [currentDueAmount,    setCurrentDueAmount]   = useState(0);

    // ── Held invoices ────────────────────────────────────────────────────────
    const [heldInvoices, setHeldInvoices] = useState<HeldInvoice[]>([]);

    // ── Misc refs ────────────────────────────────────────────────────────────
    const skipSearchRef = useRef(false);
    const [isBustingCache, setIsBustingCache] = useState(false);
    const currentDate = useRef(new Date().toISOString().split('T')[0]).current;

    const { confirm, ConfirmDialogElement } = useConfirmDialog();

    const fetchInvoiceNumber = useCallback(async (signal?: AbortSignal) => {
        try {
            const res = await axios.get('/warehouse/next-invoice', { signal });
            if (res.data?.invoice_number) {
                setInvoiceNumber(res.data.invoice_number);
            }
        } catch (err: any) {
            if (axios.isCancel(err)) return;
            setInvoiceNumber(`INV-${Date.now().toString().slice(-8)}`);
            toast.error('Invoice number error', { description: 'Using fallback transactional sequence.' });
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        fetchInvoiceNumber(controller.signal);
        return () => controller.abort();
    }, [fetchInvoiceNumber]);

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

    const totals = useMemo(() => {
        let subtotal = 0, tax = 0, itemDisc = 0, mrp = 0, qty = 0;

        const isGstEnabled = settings?.gst_enabled === '1';

        for (const item of invoiceItems) {
            itemDisc += item.disc;
            mrp      += item.mrp * item.qty;
            qty      += item.qty;

            const activeTaxPercent = isGstEnabled ? Number(item.taxPercent || 0) : 0;
            const gross = item.qty * item.rate - item.disc;

            if (item.taxType === 'inclusive') {
                const base = activeTaxPercent > 0 ? (gross / (1 + activeTaxPercent / 100)) : gross;
                subtotal += base;
                tax      += gross - base;
            } else {
                subtotal += gross;
                tax      += activeTaxPercent > 0 ? ((gross * activeTaxPercent) / 100) : 0;
            }
        }

        const rawSubtotal = subtotal;

        let overallAmt = 0;
        if (overallDiscount > 0 && subtotal > 0) {
            overallAmt = discountType === 'percentage'
                ? (subtotal * overallDiscount) / 100
                : overallDiscount;
            const ratio = (subtotal - overallAmt) / subtotal;
            tax      *= ratio;
            subtotal -= overallAmt;
        }

        return {
            totalItems:         invoiceItems.length,
            totalQty:           qty,
            subtotalBeforeTax:  rawSubtotal,
            totalTaxAmount:     tax,
            totalDiscount:      itemDisc + overallAmt,
            totalMrp:           mrp,
            totalBill:          Math.max(0, subtotal + tax),
        };

    }, [invoiceItems, overallDiscount, discountType, settings?.gst_enabled]);

    const displayState: DisplayState = useMemo(() => ({
        status:         invoiceItems.length > 0 ? 'active' : 'idle',
        items:          invoiceItems.map(item => ({
            id:    item.id,
            name:  item.name,
            qty:   item.qty,
            rate:  item.rate,
            disc:  item.disc,
            total: item.total,
            img:   productById.get(item.productId)?.img ?? null,
        })),
        totalBill:          totals.totalBill,
        totalItems:         totals.totalItems,
        totalQty:           totals.totalQty,
        totalDiscount:      totals.totalDiscount,
        subtotalBeforeTax:  totals.subtotalBeforeTax, // New
        totalTaxAmount:     totals.totalTaxAmount,    // New
        overallDiscount:    overallDiscount,          // New
        discountType:       discountType,             // New
        customerName:       customerName || '',
        customerMobile:     customerMobile || '',     // New
        saleType:           saleType,                 // New
        paymentMethod:      paymentMethod,            // New
        shopName:           warehouse?.name || '',
        shopAddress:        warehouse?.address || '', // New
        shopGstin:          warehouse?.gstin || '',   // New
        invoiceNumber:      invoiceNumber,
        upiId:              settings?.upi_id          || '',
        footerMessage:      settings?.receipt_footer  || 'Thank you for shopping with us!',
        welcomeMessage:     settings?.welcome_message || 'Welcome!',
    }), [invoiceItems, totals, customerName, customerMobile, saleType, paymentMethod, warehouse, invoiceNumber, settings, productById, overallDiscount, discountType]);

    usePOSBroadcast(displayState);

    const clearInvoice = useCallback(() => {
        setInvoiceItems([]);
        setOverallDiscount(0);
        setCustomerName('');
        setCustomerMobile('');
        setCustomerId('');
        setCustomerType('enter');
        setSaleType('retail');
        setCurrentCreditLimit(0);
        setCurrentDueAmount(0);
    }, []);

    const addToCart = useCallback((productOrBarcode: Product | string) => {
        const product = typeof productOrBarcode === 'string'
            ? productByBarcode.get(productOrBarcode.trim())
            : productOrBarcode;

        if (!product) { toast.error('Product not found!'); return; }
        if (product.qty <= 0) { toast.error('Product is out of stock!'); return; }

        const price = saleType === 'retail' ? product.selling_price : product.min_selling_price;

        setInvoiceItems(prev => {
            const idx = prev.findIndex(i => i.productId === product.id);
            if (idx >= 0) {
                if (prev[idx].qty >= product.qty) {
                    toast.error('Not enough stock available!');
                    return prev;
                }
                const updated = [...prev];
                const item    = { ...updated[idx], qty: updated[idx].qty + 1 };
                item.total    = calcItemTotal(item.qty, item.rate, item.disc, item.taxPercent, item.taxType);
                updated[idx]  = item;
                return updated;
            }
            return [...prev, {
                id:         Date.now(),
                productId:  product.id,
                name:       product.name,
                barcode:    product.barcode,
                qty:        1,
                rate:       price,
                mrp:        product.mrp,
                disc:       0,
                taxPercent: product.tax_percent,
                taxType:    product.tax_type,
                total:      calcItemTotal(1, price, 0, product.tax_percent, product.tax_type),
            }];
        });

        setBarcodeInput('');
    }, [saleType, productByBarcode]);

    const updateItemQty = useCallback((itemId: number, newQty: number) => {
        if (newQty <= 0) { setInvoiceItems(prev => prev.filter(i => i.id !== itemId)); return; }
        setInvoiceItems(prev => prev.map(item => {
            if (item.id !== itemId) return item;
            const product = productById.get(item.productId);
            if (product && newQty > product.qty) { toast.error('Not enough stock available!'); return item; }
            return { ...item, qty: newQty, total: calcItemTotal(newQty, item.rate, item.disc, item.taxPercent, item.taxType) };
        }));
    }, [productById]);

    const updateItemRate = useCallback((itemId: number, newRate: number) => {
        setInvoiceItems(prev => prev.map(item =>
            item.id === itemId
                ? { ...item, rate: newRate, total: calcItemTotal(item.qty, newRate, item.disc, item.taxPercent, item.taxType) }
                : item,
        ));
    }, []);

    const updateItemDisc = useCallback((itemId: number, newDisc: number) => {
        setInvoiceItems(prev => prev.map(item =>
            item.id === itemId
                ? { ...item, disc: newDisc, total: calcItemTotal(item.qty, item.rate, newDisc, item.taxPercent, item.taxType) }
                : item,
        ));
    }, []);

    const removeItem = useCallback((itemId: number) => {
        setInvoiceItems(prev => prev.filter(i => i.id !== itemId));
    }, []);

    const holdInvoice = useCallback(() => {
        if (invoiceItems.length === 0) { toast.error('Cart is empty – nothing to hold.'); return; }
        setHeldInvoices(prev => [...prev, {
            id:            `HOLD-${Date.now()}`,
            items:         [...invoiceItems],
            timestamp:     new Date().toISOString(),
            customerName:  customerName  || undefined,
            customerMobile: customerMobile || undefined,
            saleType,
        }]);
        clearInvoice();
        toast.success('Invoice held.');
    }, [invoiceItems, customerName, customerMobile, saleType, clearInvoice]);

    const retrieveHeldInvoice = useCallback(async (held: HeldInvoice) => {
        if (invoiceItems.length > 0) {
            const ok = await confirm({
                title: 'Replace current cart?',
                description: 'Current cart items will be discarded and replaced with the held invoice.',
                confirmLabel: 'Replace',
                variant: 'destructive',
            });
            if (!ok) return;
        }
        setInvoiceItems(held.items);
        setCustomerName(held.customerName   || '');
        setCustomerMobile(held.customerMobile || '');
        setSaleType(held.saleType);
        setHeldInvoices(prev => prev.filter(inv => inv.id !== held.id));
        toast.success('Invoice retrieved.');
    }, [invoiceItems.length, confirm]);

    const deleteHeldInvoice = useCallback(async (id: string) => {
        const ok = await confirm({
            title: 'Delete held invoice?',
            description: 'This action cannot be undone.',
            confirmLabel: 'Delete',
            variant: 'destructive',
        });
        if (!ok) return;
        setHeldInvoices(prev => prev.filter(inv => inv.id !== id));
        toast.success('Held invoice deleted.');
    }, [confirm]);

    const handleResetCache = useCallback(() => {
        if (!warehouse) return;
        setIsBustingCache(true);
        router.post('/warehouse/maintenance/pos/clear-cache', {}, {
            onSuccess: () => { toast.success('Server cache rebuilt.');        setIsBustingCache(false); },
            onError:   () => { toast.error('Failed to rebuild cache maps.');  setIsBustingCache(false); },
        });
    }, [warehouse]);

    useEffect(() => {
        if (invoiceItems.length === 0) return;
        setInvoiceItems(prev => prev.map(item => {
            const p = productById.get(item.productId);
            if (!p) return item;
            const newRate = saleType === 'retail' ? p.selling_price : p.min_selling_price;
            return { ...item, rate: newRate, total: calcItemTotal(item.qty, newRate, item.disc, item.taxPercent, item.taxType) };
        }));
    }, [saleType]);

    // ── Silent Queue Checkout Engine ─────────────────────────────────────────
    const quickPay = useCallback(async () => {
        if (invoiceItems.length === 0) { toast.error('Cart is empty!'); return; }
        if (!warehouse) { toast.error('No warehouse assigned!'); return; }

        if (paymentMethod === 'mcard') {
            if (customerType === 'walkin') {
                toast.error('M-Card payment is not allowed for Walk-in customers.', {
                    description: 'Please switch the customer type to details entry.'
                });
                return;
            }

            const cleanName = customerName?.trim();
            const cleanMobile = customerMobile?.trim();

            if (!cleanName || !cleanMobile) {
                toast.error('Customer details required for M-Card', {
                    description: 'Please enter a valid customer name and mobile number to proceed.'
                });
                return;
            }
        }

        const ok = await confirm({
            title: `Process ₹${totals.totalBill.toFixed(2)} payment?`,
            description: `Payment via ${paymentMethod.toUpperCase()} for ${totals.totalItems} item(s).`,
            confirmLabel: 'Confirm (Enter)',
        });
        if (!ok) return;

        setIsProcessing(true);

        router.post('/warehouse/sales', {
            customer_id:     customerId   || null,
            customer_name:   customerName || 'Walk-in Customer',
            customer_mobile: customerMobile || null,
            order_channel:   'pos',
            warehouse_id:    warehouse.id,
            payment_method:  paymentMethod,
            sale_type:       saleType,
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
                const flash = (page.props as any).flash?.success;
                if (flash && flash.order) {

                    // ── 1. Build complete state from flash data directly (never stale) ──
                    const completeState: DisplayState = {
                        ...displayState,
                        status:      'complete',
                        totalBill:   parseFloat(flash.total_amount) || displayState.totalBill,
                        invoiceNumber: flash.order_number           || displayState.invoiceNumber,
                        paymentMethod: paymentMethod,
                    };

                    // ── 2. Broadcast FIRST, clear AFTER a safe delay ──
                    if (typeof BroadcastChannel !== 'undefined') {
                        const ch = new BroadcastChannel('pos-customer-display');
                        ch.postMessage(completeState);
                        ch.close();
                    }

                    // ── 3. Print logic (unchanged) ──
                    const liveSettingsPayload = flash.settings || settings;
                    const directLiveIsQzEnabled = liveSettingsPayload?.is_qz_enabled === '1';

                    if (directLiveIsQzEnabled && assignedPrinter) {
                        toast.info("Routing document directly to local hardware print stream...");
                        setActivePrintOrder(flash.order);
                        if (flash.settings)   setActivePrintSettings(flash.settings);
                        if (flash.warehouse)  setActivePrintWarehouse(flash.warehouse);

                        setTimeout(async () => {
                            try {
                                await qzService.init();
                                const config = qz.configs.create(assignedPrinter, { scaleContent: false });
                                const htmlMarkup = document.getElementById('pos-silent-print-vault')?.innerHTML || '';
                                const renderWidthInches = invoiceLayout.startsWith('thermal') ? 3.25 : 8.27;
                                await qz.print(config, [{
                                    type: 'pixel', format: 'html', flavor: 'plain',
                                    data: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:0;background:#fff;width:100%;}</style></head><body>${htmlMarkup}</body></html>`,
                                    options: { pageWidth: renderWidthInches, density: 300, fallbackDensity: 203 }
                                }]);
                                toast.success("Invoice printed silently!");
                            } catch (printErr: any) {
                                console.error("Silent matrix failed, running popup window fallback:", printErr);
                                window.open(`/warehouse/sales/${flash.order.id}/print`, '_blank');
                            }
                        }, 400);
                    } else {
                        window.open(`/warehouse/sales/${flash.order.id}/print`, '_blank');
                    }

                    toast.success(`Order ${flash.order_number} – ₹${flash.total_amount} paid.`);

                    // ── 4. Delay clearInvoice so it doesn't race the broadcast ──
                    setTimeout(() => {
                        clearInvoice();
                        fetchInvoiceNumber();
                    }, 5000);
                }
                setIsProcessing(false);
            },
            onError: (errors) => {
                toast.error('Sale failed: ' + (errors.error || 'Unknown error'));
                setIsProcessing(false);
            },
        });
    }, [
        invoiceItems, warehouse, totals, paymentMethod, customerId, customerName,
        customerMobile, saleType, overallDiscount, discountType, confirm, clearInvoice,
        fetchInvoiceNumber, settings, assignedPrinter, invoiceLayout, displayState
    ]);

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

    return (
        <>
            <Head title="POS – Point of Sale"/>
            <Toaster theme="system" position="bottom-left" closeButton richColors />
            {ConfirmDialogElement}

            <div className="flex h-screen flex-col bg-background text-foreground select-none overflow-hidden">
                <PosHeader
                    isBustingCache={isBustingCache}
                    handleResetCache={handleResetCache}
                    warehouse={warehouse}
                    isQZReady={qzHardwareStatus === 'active'}
                    qzStatus={qzHardwareStatus}
                    settings={settings}
                    onOpenDisplay={() => window.open('/warehouse/pos/display', 'customer-display', 'width=1280,height=720,menubar=no,toolbar=no,location=no')}
                />

                <CustomerLedger
                    saleType={saleType}                 setSaleType={setSaleType}
                    customerType={customerType}         setCustomerType={setCustomerType}
                    customerMobile={customerMobile}     setCustomerMobile={setCustomerMobile}
                    customerName={customerName}         setCustomerName={setCustomerName}
                    customerId={customerId}             setCustomerId={setCustomerId}
                    currentCreditLimit={currentCreditLimit} setCurrentCreditLimit={setCurrentCreditLimit}
                    currentDueAmount={currentDueAmount}     setCurrentDueAmount={setCurrentDueAmount}
                    invoiceNumber={invoiceNumber}
                    currentDate={currentDate}
                    paymentMethod={paymentMethod}       setPaymentMethod={setPaymentMethod}
                    customers={customers}
                    skipSearchRef={skipSearchRef}
                />

                <div className="flex min-h-0 flex-1 w-full">
                    <div className="flex w-[35%] flex-col border-r border-border bg-card">
                        <CartSection
                            barcodeInput={barcodeInput}   setBarcodeInput={setBarcodeInput}
                            addToCart={addToCart}
                            holdInvoice={holdInvoice}
                            isProcessing={isProcessing}
                            invoiceItems={invoiceItems}
                            onQty={updateItemQty}
                            onRate={updateItemRate}
                            onDisc={updateItemDisc}
                            onRemove={removeItem}
                            productById={productById}
                            totals={totals}
                            discountType={discountType}     setDiscountType={setDiscountType}
                            overallDiscount={overallDiscount} setOverallDiscount={setOverallDiscount}
                            quickPay={quickPay}
                        />
                    </div>

                    <CategorySidebar
                        categories={categories}
                        selectedCategory={selectedCategory}
                        setSelectedCategory={setSelectedCategory}
                    />

                    <div className="flex flex-1 flex-col bg-muted/10 min-w-0">
                        <ProductGrid
                            products={products}
                            selectedCategory={selectedCategory}
                            searchQuery={searchQuery}         setSearchQuery={setSearchQuery}
                            showFilter={showFilter}           setShowFilter={setShowFilter}
                            priceFilter={priceFilter}         setPriceFilter={setPriceFilter}
                            stockFilter={stockFilter}         setStockFilter={setStockFilter}
                            saleType={saleType}
                            addToCart={addToCart}
                        />
                    </div>
                </div>

                <HeldInvoicesFab
                    heldInvoices={heldInvoices}
                    retrieveHeldInvoice={retrieveHeldInvoice}
                    deleteHeldInvoice={deleteHeldInvoice}
                />

                {/* THE PORTAL VAULT: Instantly compiles off-screen snapshots using actual completed transaction records */}
                {activePrintOrder && settings?.is_qz_enabled === '1' && (
                    <div className="absolute -top-2500 -left-2500 pointer-events-none opacity-0 select-none -z-50">
                        <div id="pos-silent-print-vault" className="bg-white text-black">
                            {invoiceLayout === 'thermal_classic' && <ThermalClassic order={activePrintOrder} warehouse={activePrintWarehouse} settings={activePrintSettings as any} />}
                            {invoiceLayout === 'thermal_modern' && <ThermalModern order={activePrintOrder} warehouse={activePrintWarehouse} settings={activePrintSettings as any} />}
                            {invoiceLayout === 'a4_standard' && <A4Standard order={activePrintOrder} warehouse={activePrintWarehouse} settings={activePrintSettings as any} />}
                            {invoiceLayout === 'a4_modern' && <A4Modern order={activePrintOrder} warehouse={activePrintWarehouse} settings={activePrintSettings as any} />}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default POSIndex;
