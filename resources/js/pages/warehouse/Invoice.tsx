import { Head } from '@inertiajs/react';
import React from 'react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type Customer = {
    id: number;
    name: string;
    phone: string;
    address?: string;
};

type TaxCategory = {
    name: string;
    tax_percent: number;
    type: string;
};

type OrderItem = {
    id: number;
    product_variant: {
        product: {
            name: string;
            tax_category: TaxCategory;
        };
        variant_name: string;
        sku: string;
        unit: { symbol: string };
    };
    quantity: number;
    price: number;
    discount: number;
    tax_percent: number;
};

type Payment = {
    id: number;
    method: string;
    amount: number;
};

type Sale = {
    id: number;
    order_number: string;
    customer?: Customer;
    subtotal: number;
    tax_amount: number;
    discount_amount: number;
    total_amount: number;
    items: OrderItem[];
    payments: Payment[];
    created_at: string;
};

type Props = {
    order: Sale;
};

export default function Invoice({ order }: Props) {
    const calculateItemTotal = (item: OrderItem) => {
        const subtotal = Number(item.quantity) * Number(item.price);
        const afterDiscount = subtotal - Number(item.discount);
        const taxType = item.product_variant.product.tax_category.type;

        if (taxType === 'inclusive') {
            return afterDiscount;
        } else {
            const tax = (afterDiscount * Number(item.tax_percent)) / 100;
            return afterDiscount + tax;
        }
    };

    const calculateCGST = () => Number(order.tax_amount) / 2;
    const calculateSGST = () => Number(order.tax_amount) / 2;

    const totalPaid = order.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const pendingAmount = Number(order.total_amount) - totalPaid;
    const balanceAmount = 0;

    const numberToWords = (num: number): string => {
        const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
        const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
        const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

        if (num === 0) return 'ZERO';
        const amount = Math.floor(num);
        if (amount < 10) return ones[amount];
        if (amount < 20) return teens[amount - 10];
        if (amount < 100) return tens[Math.floor(amount / 10)] + (amount % 10 ? ' ' + ones[amount % 10] : '');
        if (amount < 1000) return ones[Math.floor(amount / 100)] + ' HUNDRED' + (amount % 100 ? ' ' + numberToWords(amount % 100) : '');
        if (amount < 100000) {
            const thousands = Math.floor(amount / 1000);
            const remainder = amount % 1000;
            return numberToWords(thousands) + ' THOUSAND' + (remainder ? ' ' + numberToWords(remainder) : '');
        }
        if (amount < 10000000) {
            const lakhs = Math.floor(amount / 100000);
            const remainder = amount % 100000;
            return numberToWords(lakhs) + ' LAKH' + (remainder ? ' ' + numberToWords(remainder) : '');
        }
        return 'AMOUNT TOO LARGE';
    };

    // ── Shared inline styles ──────────────────────────────────────────
    const dividerSolid: React.CSSProperties = {
        borderBottom: '2px solid #000',
        marginBottom: '0',
    };

    const dividerDashed: React.CSSProperties = {
        borderBottom: '1px dashed #000',
    };

    const row: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '1px 0',
    };

    return (
        <>
            <Head title={`Invoice ${order.order_number}`} />

            <div
                id="invoice-root"
                style={{
                    width: '80mm',
                    margin: '0 auto',
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    // fontFamily: '"Courier New", Courier, monospace',
                    // fontFamily: '"Tahoma", "Arial", sans-serif',
                    fontSize: '11px',
                    padding: '4px 4px 2px 4px',
                    lineHeight: '1.4',
                }}
            >
                {/* ── Header ──────────────────────────────────────────── */}
                <div style={{ ...dividerSolid, textAlign: 'center', paddingBottom: '6px', marginBottom: '4px' }}>
                    <div style={{ fontSize: '16px', fontWeight: '900', letterSpacing: '2px', lineHeight: '1.2' }}>
                        GHORER BAZAR
                    </div>
                    <div style={{ fontSize: '9px', fontWeight: '700', marginTop: '2px', lineHeight: '1.5' }}>
                        SADIKHANS DEARH, JALANGI, WEST BENGAL - 742303
                    </div>
                    <div style={{ fontSize: '9px', fontWeight: '700', lineHeight: '1.5' }}>
                        GSTIN: 19HBPPB98261Z0
                    </div>
                    <div style={{ fontSize: '9px', fontWeight: '700', lineHeight: '1.5' }}>
                        E-mail: info@kartxp.com
                    </div>
                </div>

                {/* ── Bill Info ────────────────────────────────────────── */}
                <div style={{ ...dividerDashed, paddingBottom: '4px', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontWeight: '700' }}>
                        <span>
                            Dt: {new Date(order.created_at).toLocaleDateString('en-GB')}
                        </span>
                        <span>
                            {new Date(order.created_at)
                                .toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                                .toUpperCase()}
                        </span>
                        <span>Bill#: {order.order_number}</span>
                    </div>
                </div>

                {/* ── Customer Info ────────────────────────────────────── */}
                <div style={{ ...dividerDashed, paddingBottom: '4px', marginBottom: '4px', fontSize: '9px', fontWeight: '700' }}>
                    <div>Bill To: {order.customer ? order.customer.name.toUpperCase() : 'CASH CUSTOMER'}</div>
                    {order.customer && (
                        <>
                            {order.customer.address && (
                                <div>Addr: {order.customer.address}</div>
                            )}
                            <div>Ph: {order.customer.phone}</div>
                        </>
                    )}
                </div>

                {/* ── Items Table Header ───────────────────────────────── */}
                <div
                    style={{
                        ...dividerSolid,
                        borderTop: '2px solid #000',
                        fontSize: '9px',
                        fontWeight: '900',
                        paddingTop: '3px',
                        paddingBottom: '3px',
                        marginBottom: '0',
                    }}
                >
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left',  width: '5%',  padding: '0 1px' }}>#</th>
                                <th style={{ textAlign: 'left',  width: '33%', padding: '0 1px' }}>ITEM</th>
                                <th style={{ textAlign: 'right', width: '11%', padding: '0 1px' }}>QTY</th>
                                <th style={{ textAlign: 'right', width: '12%', padding: '0 1px' }}>MRP</th>
                                <th style={{ textAlign: 'right', width: '12%', padding: '0 1px' }}>RATE</th>
                                <th style={{ textAlign: 'right', width: '10%', padding: '0 1px' }}>DIS%</th>
                                <th style={{ textAlign: 'right', width: '17%', padding: '0 1px' }}>AMT</th>
                            </tr>
                        </thead>
                    </table>
                </div>

                {/* ── Items ────────────────────────────────────────────── */}
                <div style={{ ...dividerDashed, marginBottom: '4px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                            {order.items.map((item, index) => {
                                const itemTotal = calculateItemTotal(item);
                                const itemSubtotal = Number(item.quantity) * Number(item.price);
                                const discountPercent =
                                    itemSubtotal > 0
                                        ? (Number(item.discount) / itemSubtotal) * 100
                                        : 0;

                                return (
                                    <React.Fragment key={item.id}>
                                        {/* Main item row */}
                                        <tr style={{ fontSize: '9px', fontWeight: '700' }}>
                                            <td style={{ padding: '2px 1px', verticalAlign: 'top', width: '5%' }}>
                                                {index + 1}
                                            </td>
                                            <td style={{ padding: '2px 1px', verticalAlign: 'top', width: '33%', wordBreak: 'break-word' }}>
                                                {item.product_variant.product.name}
                                            </td>
                                            <td style={{ padding: '2px 1px', textAlign: 'right', verticalAlign: 'top', width: '11%' }}>
                                                {Number(item.quantity).toFixed(2)}
                                            </td>
                                            <td style={{ padding: '2px 1px', textAlign: 'right', verticalAlign: 'top', width: '12%' }}>
                                                {Number(item.price).toFixed(2)}
                                            </td>
                                            <td style={{ padding: '2px 1px', textAlign: 'right', verticalAlign: 'top', width: '12%' }}>
                                                {Number(item.price).toFixed(2)}
                                            </td>
                                            <td style={{ padding: '2px 1px', textAlign: 'right', verticalAlign: 'top', width: '10%' }}>
                                                {discountPercent.toFixed(2)}
                                            </td>
                                            <td style={{ padding: '2px 1px', textAlign: 'right', verticalAlign: 'top', width: '17%' }}>
                                                {itemTotal.toFixed(2)}
                                            </td>
                                        </tr>
                                        {/* Sub-row: variant / unit / gst / disc */}
                                        <tr style={{ fontSize: '8px', fontWeight: '700' }}>
                                            <td></td>
                                            <td colSpan={3} style={{ padding: '0 1px 4px 1px' }}>
                                                {item.product_variant.variant_name}
                                            </td>
                                            <td colSpan={2} style={{ padding: '0 1px 4px 1px' }}>
                                                {/* {item.product_variant.unit.symbol} */}
                                                GST:{Number(item.tax_percent).toFixed(0)}%
                                            </td>
                                            <td style={{ padding: '0 1px 4px 1px', textAlign: 'right' }}>
                                                -{Number(item.discount).toFixed(2)}
                                            </td>
                                        </tr>
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* ── Summary ──────────────────────────────────────────── */}
                <div style={{ ...dividerDashed, paddingBottom: '4px', marginBottom: '4px', fontSize: '9px', fontWeight: '700' }}>
                    <div style={row}>
                        <span>Sub Total</span>
                        <span>{Number(order.subtotal).toFixed(2)}</span>
                    </div>
                    <div style={row}>
                        <span>Taxable Amount</span>
                        <span>{Number(order.subtotal).toFixed(2)}</span>
                    </div>
                    <div style={row}>
                        <span>CGST Amount</span>
                        <span>{calculateCGST().toFixed(2)}</span>
                    </div>
                    <div style={row}>
                        <span>SGST Amount</span>
                        <span>{calculateSGST().toFixed(2)}</span>
                    </div>
                    {Number(order.discount_amount) > 0 && (
                        <div style={row}>
                            <span>Discount</span>
                            <span>-{Number(order.discount_amount).toFixed(2)}</span>
                        </div>
                    )}
                </div>

                {/* ── Total Amount ─────────────────────────────────────── */}
                <div
                    style={{
                        borderTop: '2px solid #000',
                        borderBottom: '2px solid #000',
                        padding: '4px 0',
                        marginBottom: '4px',
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '900' }}>
                        <span>TOTAL AMOUNT</span>
                        <span>Rs.{Number(order.total_amount).toFixed(2)}</span>
                    </div>
                </div>

                {/* ── Amount in Words ──────────────────────────────────── */}
                <div style={{ ...dividerDashed, paddingBottom: '4px', marginBottom: '4px', textAlign: 'center', fontSize: '9px', fontWeight: '700' }}>
                    <div style={{ fontWeight: '900', marginBottom: '2px', letterSpacing: '0.5px' }}>
                        ** RUPEES IN WORDS **
                    </div>
                    <div>{numberToWords(Number(order.total_amount))} ONLY</div>
                </div>

                {/* ── QR Code + Payment Details ────────────────────────── */}
                <div style={{ ...dividerDashed, paddingBottom: '4px', marginBottom: '4px' }}>
                    <table style={{ width: '100%' }}>
                        <tbody>
                            <tr>
                                {/* QR */}
                                <td style={{ width: '42%', verticalAlign: 'top', textAlign: 'center', paddingRight: '4px' }}>
                                    {/* <div style={{ fontSize: '8px', fontWeight: '900', marginBottom: '2px' }}>SCAN & PAY</div> */}
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=merchant@upi%26pn=GhorerBazar%26am=${Number(order.total_amount).toFixed(2)}%26cu=INR`}
                                        alt="Payment QR"
                                        style={{ width: '85px', height: '85px', display: 'block', margin: '0 auto' }}
                                    />
                                </td>

                                {/* Payment breakdown */}
                                <td style={{ width: '58%', verticalAlign: 'top', fontSize: '9px', fontWeight: '700' }}>
                                    {order.payments.map((payment) => (
                                        <div key={payment.id} style={row}>
                                            <span style={{ textTransform: 'capitalize' }}>{payment.method}</span>
                                            <span>{Number(payment.amount).toFixed(2)}</span>
                                        </div>
                                    ))}
                                    <div style={{ borderTop: '1px solid #000', marginTop: '2px', paddingTop: '2px' }}>
                                        <div style={row}>
                                            <span>Paid Amount</span>
                                            <span>{totalPaid.toFixed(2)}</span>
                                        </div>
                                        <div style={row}>
                                            <span>Pending Amt</span>
                                            <span>{pendingAmount.toFixed(2)}</span>
                                        </div>
                                        <div style={row}>
                                            <span>Refund Amt</span>
                                            <span>0.00</span>
                                        </div>
                                        <div style={{ ...row, fontWeight: '900', borderTop: '1px solid #000', marginTop: '2px', paddingTop: '2px' }}>
                                            <span>Balance Amt</span>
                                            <span>{balanceAmount.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* ── Footer ───────────────────────────────────────────── */}
                <div style={{ textAlign: 'center', paddingTop: '4px', paddingBottom: '4px', fontSize: '10px', fontWeight: '900', letterSpacing: '0.5px' }}>
                    ** THANK YOU... VISIT AGAIN! **
                </div>
            </div>

            {/* ── Print Styles ─────────────────────────────────────────── */}
            <style>{`
                @media print {
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #fff !important;
                    }
                    @page {
                        size: 80mm auto;
                        margin: 0mm;
                    }
                    * {
                        print-color-adjust: exact !important;
                        -webkit-print-color-adjust: exact !important;
                        color: #000 !important;
                        background: transparent !important;
                        -webkit-font-smoothing: none !important;
                        font-smoothing: none !important;
                        text-rendering: optimizeSpeed !important;
                    }
                    #invoice-root {
                        width: 80mm !important;
                        margin: 0 !important;
                        padding: 4px !important;
                    }
                }
            `}</style>
        </>
    );
}
