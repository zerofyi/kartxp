import { Head } from '@inertiajs/react';
import React, { useMemo } from 'react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type Customer = { id: number; name: string; phone: string; address?: string };

type TaxCategory = { name: string; tax_percent: number; type: 'inclusive' | 'exclusive' };

type OrderItem = {
    id: number;
    product_variant: {
        product: { name: string; tax_category: TaxCategory };
        variant_name: string;
        sku: string;
        unit: { symbol: string };
    };
    quantity: number;
    price: number;
    discount: number;
    tax_percent: number;
};

type Payment = { id: number; method: string; amount: number };

type Order = {
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

type Props = { order: Order };

// ─────────────────────────────────────────────
// Helpers (stable – defined outside component)
// ─────────────────────────────────────────────
function calcItemTotal(item: OrderItem): number {
    const taxType = item.product_variant.product.tax_category.type;
    const gross   = item.quantity * item.price - item.discount;
    if (taxType === 'inclusive') return Math.max(0, gross);
    const base = Math.max(0, gross);
    return base + base * item.tax_percent / 100;
}

function calcDiscountPercent(item: OrderItem): number {
    const subtotal = item.quantity * item.price;
    return subtotal > 0 ? (item.discount / subtotal) * 100 : 0;
}

/** Indian number-to-words (handles up to crores) */
function numberToWords(num: number): string {
    const ones  = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
    const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN',
                   'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
    const tens  = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

    const n = Math.floor(num);
    if (n === 0)           return 'ZERO';
    if (n < 10)            return ones[n];
    if (n < 20)            return teens[n - 10];
    if (n < 100)           return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1_000)         return ones[Math.floor(n / 100)] + ' HUNDRED' + (n % 100 ? ' ' + numberToWords(n % 100) : '');
    if (n < 1_00_000)      return numberToWords(Math.floor(n / 1_000)) + ' THOUSAND' + (n % 1_000 ? ' ' + numberToWords(n % 1_000) : '');
    if (n < 1_00_00_000)   return numberToWords(Math.floor(n / 1_00_000)) + ' LAKH' + (n % 1_00_000 ? ' ' + numberToWords(n % 1_00_000) : '');
    return 'AMOUNT TOO LARGE';
}

// ─────────────────────────────────────────────
// Shared inline styles
// ─────────────────────────────────────────────
const S = {
    divSolid:  { borderBottom: '2px solid #000', marginBottom: '0' } as React.CSSProperties,
    divDashed: { borderBottom: '1px dashed #000' } as React.CSSProperties,
    row:       { display: 'flex', justifyContent: 'space-between', padding: '1px 0' } as React.CSSProperties,
    cell:      (align: 'left' | 'right', w: string): React.CSSProperties => ({ textAlign: align, width: w, padding: '0 1px' }),
};

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export default function Invoice({ order }: Props) {

    const totalPaid = useMemo(
        () => order.payments.reduce((s, p) => s + Number(p.amount), 0),
        [order.payments]
    );

    const pendingAmount = useMemo(
        () => Math.max(0, Number(order.total_amount) - totalPaid),
        [order.total_amount, totalPaid]
    );

    const cgst = Number(order.tax_amount) / 2;
    const sgst = cgst;

    const amountInWords = useMemo(
        () => numberToWords(Number(order.total_amount)),
        [order.total_amount]
    );

    // UPI QR – encode once
    const qrUrl = useMemo(() => {
        const upiData = encodeURIComponent(
            `upi://pay?pa=merchant@upi&pn=GhorerBazar&am=${Number(order.total_amount).toFixed(2)}&cu=INR`
        );
        return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${upiData}`;
    }, [order.total_amount]);

    const dateStr = new Date(order.created_at).toLocaleDateString('en-GB');
    const timeStr = new Date(order.created_at)
        .toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
        .toUpperCase();

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
                    fontSize: '11px',
                    padding: '4px 4px 2px 4px',
                    lineHeight: '1.4',
                }}
            >
                {/* ── Header ──────────────────────────────────── */}
                <div style={{ ...S.divSolid, textAlign: 'center', paddingBottom: '6px', marginBottom: '4px' }}>
                    <div style={{ fontSize: '16px', fontWeight: 900, letterSpacing: '2px', lineHeight: '1.2' }}>
                        GHORER BAZAR
                    </div>
                    <div style={{ fontSize: '9px', fontWeight: 700, marginTop: '2px', lineHeight: 1.5 }}>
                        SADIKHANS DEARH, JALANGI, WEST BENGAL - 742303
                    </div>
                    <div style={{ fontSize: '9px', fontWeight: 700, lineHeight: 1.5 }}>GSTIN: 19HBPPB98261Z0</div>
                    <div style={{ fontSize: '9px', fontWeight: 700, lineHeight: 1.5 }}>E-mail: info@kartxp.com</div>
                </div>

                {/* ── Bill info ───────────────────────────────── */}
                <div style={{ ...S.divDashed, paddingBottom: '4px', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontWeight: 700 }}>
                        <span>Dt: {dateStr}</span>
                        <span>{timeStr}</span>
                        <span>Bill#: {order.order_number}</span>
                    </div>
                </div>

                {/* ── Customer ────────────────────────────────── */}
                <div style={{ ...S.divDashed, paddingBottom: '4px', marginBottom: '4px', fontSize: '9px', fontWeight: 700 }}>
                    <div>Bill To: {order.customer ? order.customer.name.toUpperCase() : 'CASH CUSTOMER'}</div>
                    {order.customer?.address && <div>Addr: {order.customer.address}</div>}
                    {order.customer?.phone    && <div>Ph: {order.customer.phone}</div>}
                </div>

                {/* ── Items header ─────────────────────────────── */}
                <div style={{ ...S.divSolid, borderTop: '2px solid #000', fontSize: '9px', fontWeight: 900, padding: '3px 0', marginBottom: 0 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={S.cell('left',  '5%')}>#</th>
                                <th style={S.cell('left',  '33%')}>ITEM</th>
                                <th style={S.cell('right', '11%')}>QTY</th>
                                <th style={S.cell('right', '12%')}>MRP</th>
                                <th style={S.cell('right', '12%')}>RATE</th>
                                <th style={S.cell('right', '10%')}>DIS%</th>
                                <th style={S.cell('right', '17%')}>AMT</th>
                            </tr>
                        </thead>
                    </table>
                </div>

                {/* ── Items ───────────────────────────────────── */}
                <div style={{ ...S.divDashed, marginBottom: '4px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                            {order.items.map((item, idx) => {
                                const itemTotal      = calcItemTotal(item);
                                const discountPct    = calcDiscountPercent(item);

                                return (
                                    <React.Fragment key={item.id}>
                                        <tr style={{ fontSize: '9px', fontWeight: 700 }}>
                                            <td style={{ padding: '2px 1px', verticalAlign: 'top', width: '5%' }}>{idx + 1}</td>
                                            <td style={{ padding: '2px 1px', verticalAlign: 'top', width: '33%', wordBreak: 'break-word' }}>
                                                {item.product_variant.product.name}
                                            </td>
                                            <td style={{ padding: '2px 1px', textAlign: 'right', verticalAlign: 'top', width: '11%' }}>
                                                {Number(item.quantity).toFixed(2)}
                                            </td>
                                            {/* MRP column – show price as MRP (extend model to carry mrp if needed) */}
                                            <td style={{ padding: '2px 1px', textAlign: 'right', verticalAlign: 'top', width: '12%' }}>
                                                {Number(item.price).toFixed(2)}
                                            </td>
                                            <td style={{ padding: '2px 1px', textAlign: 'right', verticalAlign: 'top', width: '12%' }}>
                                                {Number(item.price).toFixed(2)}
                                            </td>
                                            <td style={{ padding: '2px 1px', textAlign: 'right', verticalAlign: 'top', width: '10%' }}>
                                                {discountPct.toFixed(2)}
                                            </td>
                                            <td style={{ padding: '2px 1px', textAlign: 'right', verticalAlign: 'top', width: '17%' }}>
                                                {itemTotal.toFixed(2)}
                                            </td>
                                        </tr>
                                        {/* Sub-row */}
                                        <tr style={{ fontSize: '8px', fontWeight: 700 }}>
                                            <td />
                                            <td colSpan={3} style={{ padding: '0 1px 4px 1px' }}>
                                                {item.product_variant.variant_name}
                                            </td>
                                            <td colSpan={2} style={{ padding: '0 1px 4px 1px' }}>
                                                GST:{Number(item.tax_percent).toFixed(0)}%
                                                {item.product_variant.product.tax_category.type === 'inclusive' ? ' (I)' : ' (E)'}
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

                {/* ── Summary ─────────────────────────────────── */}
                <div style={{ ...S.divDashed, paddingBottom: '4px', marginBottom: '4px', fontSize: '9px', fontWeight: 700 }}>
                    <div style={S.row}><span>Sub Total</span><span>{Number(order.subtotal).toFixed(2)}</span></div>
                    <div style={S.row}><span>Taxable Amount</span><span>{Number(order.subtotal).toFixed(2)}</span></div>
                    <div style={S.row}><span>CGST Amount</span><span>{cgst.toFixed(2)}</span></div>
                    <div style={S.row}><span>SGST Amount</span><span>{sgst.toFixed(2)}</span></div>
                    {Number(order.discount_amount) > 0 && (
                        <div style={S.row}><span>Discount</span><span>-{Number(order.discount_amount).toFixed(2)}</span></div>
                    )}
                </div>

                {/* ── Total ───────────────────────────────────── */}
                <div style={{ borderTop: '2px solid #000', borderBottom: '2px solid #000', padding: '4px 0', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 900 }}>
                        <span>TOTAL AMOUNT</span>
                        <span>Rs.{Number(order.total_amount).toFixed(2)}</span>
                    </div>
                </div>

                {/* ── Amount in words ──────────────────────────── */}
                <div style={{ ...S.divDashed, paddingBottom: '4px', marginBottom: '4px', textAlign: 'center', fontSize: '9px', fontWeight: 700 }}>
                    <div style={{ fontWeight: 900, marginBottom: '2px', letterSpacing: '0.5px' }}>** RUPEES IN WORDS **</div>
                    <div>{amountInWords} ONLY</div>
                </div>

                {/* ── QR + Payment ─────────────────────────────── */}
                <div style={{ ...S.divDashed, paddingBottom: '4px', marginBottom: '4px' }}>
                    <table style={{ width: '100%' }}>
                        <tbody>
                            <tr>
                                <td style={{ width: '42%', verticalAlign: 'top', textAlign: 'center', paddingRight: '4px' }}>
                                    <img
                                        src={qrUrl}
                                        alt="UPI Payment QR"
                                        width={85}
                                        height={85}
                                        style={{ display: 'block', margin: '0 auto' }}
                                        loading="eager"
                                    />
                                </td>
                                <td style={{ width: '58%', verticalAlign: 'top', fontSize: '9px', fontWeight: 700 }}>
                                    {order.payments.map(p => (
                                        <div key={p.id} style={S.row}>
                                            <span style={{ textTransform: 'capitalize' }}>{p.method}</span>
                                            <span>{Number(p.amount).toFixed(2)}</span>
                                        </div>
                                    ))}
                                    <div style={{ borderTop: '1px solid #000', marginTop: '2px', paddingTop: '2px' }}>
                                        <div style={S.row}><span>Paid Amount</span><span>{totalPaid.toFixed(2)}</span></div>
                                        <div style={S.row}><span>Pending Amt</span><span>{pendingAmount.toFixed(2)}</span></div>
                                        <div style={S.row}><span>Refund Amt</span><span>0.00</span></div>
                                        <div style={{ ...S.row, fontWeight: 900, borderTop: '1px solid #000', marginTop: '2px', paddingTop: '2px' }}>
                                            <span>Balance Amt</span>
                                            <span>0.00</span>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* ── Footer ──────────────────────────────────── */}
                <div style={{ textAlign: 'center', padding: '4px 0', fontSize: '10px', fontWeight: 900, letterSpacing: '0.5px' }}>
                    ** THANK YOU... VISIT AGAIN! **
                </div>
            </div>

            {/* ── Print styles ─────────────────────────────────── */}
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
