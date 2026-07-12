import { Head } from '@inertiajs/react';
import React from 'react';
import type { InvoiceProps } from './Types';
import {
    COMPANY_INFO,
    calcDiscountPercent,
    calcItemTotal,
    calcPendingAmount,
    calcTotalPaid,
    formatDate,
    formatPlain,
    formatTime,
    numberToWords,
} from './Helpers';
import AppLogoIcon from '@/components/app-logo-icon';

const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono', 'Courier New', monospace", fontFeatureSettings: '"tnum"' };
const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', padding: '1.5px 0' };

export default function ThermalClassic({ order, warehouse, settings }: InvoiceProps) {
    const totalPaid = calcTotalPaid(order);
    const pendingAmount = calcPendingAmount(order);

    // Adaptive Tax Configuration Rules Switch
    const isGstEnabled = settings?.gst_enabled === '1';
    const cgst = isGstEnabled ? (Number(order.tax_amount) / 2) : 0;
    const sgst = cgst;

    const amountInWords = numberToWords(Number(order.total_amount));

    const storeName = warehouse?.name || COMPANY_INFO.name;
    const dateStr = formatDate(order.created_at);
    const timeStr = formatTime(order.created_at);

    return (
        <>
            <Head title={`Invoice ${order.order_number}`} />

            <div
                id="invoice-thermal-classic-root"
                style={{
                    width: '80mm',
                    margin: '0 auto',
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    fontFamily: "'IBM Plex Sans', Arial, sans-serif",
                    fontSize: '11px',
                    padding: '6px 6px 4px 6px',
                    lineHeight: 1.45,
                }}
            >
                {/* ── Header ──────────────────────────────────── */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '7px', marginBottom: '6px', gap: '1px' }}>
                    {warehouse?.logo_path ? (
                        <img src={warehouse.logo_path.startsWith('data:') ? warehouse.logo_path : `/storage/${warehouse.logo_path}`} style={{ width: '28px', height: '28px', objectFit: 'contain' }} alt="logo" />
                    ) : (
                        <AppLogoIcon style={{ width: '28px', height: '28px', color: '#000' }} />
                    )}
                    <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '2px', letterSpacing: '1.2px', lineHeight: 1.2 }}>
                        {storeName}
                    </div>

                    <div style={{ fontSize: '9px', fontWeight: 700, lineHeight: 1.5 }}>
                        {warehouse?.address || COMPANY_INFO.address}
                    </div>

                    <div style={{ fontSize: '9px', fontWeight: 700, lineHeight: 1.5 }}>
                        {isGstEnabled && (warehouse?.gstin || settings?.gstin) ? `GSTIN: ${warehouse?.gstin || settings?.gstin} · ` : ''}{warehouse?.email || COMPANY_INFO.email} | {warehouse?.phone || COMPANY_INFO.phone}
                    </div>
                </div>

                {/* ── Bill meta ───────────────────────────────── */}
                <div style={{ borderBottom: '1px dashed #000', paddingBottom: '5px', marginBottom: '5px' }}>
                    <div style={{ ...row, fontSize: '9.5px', fontWeight: 700 }}>
                        <span>Bill #{order.order_number}</span>
                        <span style={mono}>{dateStr} {timeStr}</span>
                    </div>
                </div>

                {/* ── Customer ────────────────────────────────── */}
                <div style={{ borderBottom: '1px dashed #000', paddingBottom: '5px', marginBottom: '5px', fontSize: '9.5px', fontWeight: 700 }}>
                    <div>BILL TO: {order.customer ? order.customer.name.toUpperCase() : 'CASH CUSTOMER'}</div>
                    {order.customer?.address && <div style={{ fontWeight: 600 }}>{order.customer.address}</div>}
                    {order.customer?.phone && <div style={{ fontWeight: 600 }}>Ph: {order.customer.phone}</div>}
                </div>

                {/* ── Items column header ───────────────────────── */}
                <div style={{ display: 'flex', borderBottom: '2px solid #000', paddingBottom: '3px', marginBottom: '2px', fontSize: '8.5px', fontWeight: 800, letterSpacing: '0.3px' }}>
                    <span style={{ flex: 1 }}>ITEM</span>
                    <span style={{ width: '32px', textAlign: 'right' }}>QTY</span>
                    <span style={{ width: '52px', textAlign: 'right' }}>RATE</span>
                    <span style={{ width: '56px', textAlign: 'right' }}>AMT</span>
                </div>

                {/* ── Items ───────────────────────────────────── */}
                <div style={{ borderBottom: '1px dashed #000', marginBottom: '5px' }}>
                    {order.items.map((item, idx) => {
                        const itemTotal = calcItemTotal(item);
                        const discountPct = calcDiscountPercent(item);
                        const isInclusive = item.product_variant.product.tax_category.type === 'inclusive';

                        return (
                            <div key={item.id} style={{ padding: '4px 0', borderTop: idx === 0 ? 'none' : '1px dotted #00000055' }}>
                                <div style={{ display: 'flex', fontSize: '9.5px', fontWeight: 700 }}>
                                    <span style={{ flex: 1, wordBreak: 'break-word' }}>{idx + 1}. {item.product_variant.product.name} - {item.product_variant.variant_name}</span>
                                    <span style={{ ...mono, width: '32px', textAlign: 'right' }}>{Number(item.quantity).toFixed(item.quantity % 1 === 0 ? 0 : 2)}</span>
                                    <span style={{ ...mono, width: '52px', textAlign: 'right' }}>{formatPlain(item.price)}</span>
                                    <span style={{ ...mono, width: '56px', textAlign: 'right', fontWeight: 800 }}>{formatPlain(itemTotal)}</span>
                                </div>
                                <div style={{ fontSize: '8px', fontWeight: 700, marginTop: '1px' }}>
                                     {isGstEnabled ? `GST ${Number(item.tax_percent).toFixed(0)}%${isInclusive ? ' INCL' : ' EXCL'}` : ''}
                                    {item.discount > 0 && <> &nbsp;·&nbsp; -{formatPlain(item.discount)} ({discountPct.toFixed(1)}%)</>}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ── Summary ─────────────────────────────────── */}
                <div style={{ borderBottom: '1px dashed #000', paddingBottom: '5px', marginBottom: '5px', fontSize: '9.5px', fontWeight: 700 }}>
                    <div style={row}><span>Subtotal</span><span style={mono}>{formatPlain(order.subtotal)}</span></div>
                    {isGstEnabled && (
                        <>
                            <div style={row}><span>CGST</span><span style={mono}>{formatPlain(cgst)}</span></div>
                            <div style={row}><span>SGST</span><span style={mono}>{formatPlain(sgst)}</span></div>
                        </>
                    )}
                    {Number(order.discount_amount) > 0 && (
                        <div style={row}><span>Discount</span><span style={mono}>-{formatPlain(order.discount_amount)}</span></div>
                    )}
                </div>

                {/* ── Total ───────────────────────────────────── */}
                <div style={{ borderTop: '2px solid #000', borderBottom: '2px solid #000', padding: '5px 0', marginBottom: '5px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '14px', fontWeight: 800 }}>
                        <span style={{ letterSpacing: '0.5px' }}>TOTAL</span>
                        <span style={mono}>Rs.{formatPlain(order.total_amount)}</span>
                    </div>
                </div>

                {/* ── Amount in words (Stays on Top) ──────────────────────────── */}
                <div style={{ borderBottom: '1px dashed #000', paddingBottom: '5px', marginBottom: '5px', textAlign: 'center', fontSize: '9px', fontWeight: 700 }}>
                    <div style={{ fontWeight: 800, marginBottom: '2px', letterSpacing: '0.5px' }}>** RUPEES IN WORDS **</div>
                    <div>{amountInWords} ONLY</div>
                </div>

                {/* ── Split Layout Container (QR Left, Status Right) ───────────────────────────── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px dashed #000', paddingBottom: '5px', marginBottom: '5px' }}>

                    {/* ── QR Component (Left Side) ── */}
                    {settings?.upi_qr_svg && settings?.upi_id ? (
                        <div style={{ width: '90px', flexShrink: 0, textAlign: 'center' }}>
                            <img src={settings.upi_qr_svg} alt="UPI Payment QR" width={90} height={90} style={{ display: 'block', margin: '0 auto' }} loading="eager" />
                            <div style={{ fontSize: '7.5px', fontWeight: 800, marginTop: '3px', whiteSpace: 'nowrap' }}>SCAN TO PAY VIA UPI</div>
                        </div>
                    ) : (
                        /* Fallback spacer so the right side stays aligned if QR is disabled */
                        <div style={{ width: '90px', flexShrink: 0 }} />
                    )}

                    {/* ── Payment status (Right Side) ── */}
                    <div style={{ flex: 1, fontSize: '9.5px', fontWeight: 700 }}>
                        {order.payments.map((p) => (
                            <div key={p.id} style={row}>
                                <span style={{ textTransform: 'uppercase' }}>{p.method}</span>
                                <span style={mono}>{formatPlain(p.amount)}</span>
                            </div>
                        ))}
                        <div style={{ borderTop: '1px solid #000', marginTop: '3px', paddingTop: '3px' }}>
                            <div style={row}>
                                <span>Paid Amount</span>
                                <span style={mono}>{formatPlain(totalPaid)}</span>
                            </div>
                            <div style={{ ...row, fontWeight: 800 }}>
                                <span>{pendingAmount > 0 ? 'Balance Due' : 'Balance'}</span>
                                <span style={mono}>{formatPlain(pendingAmount)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Footer ──────────────────────────────────── */}
                <div style={{ borderTop: '2px solid #000', textAlign: 'center', padding: '6px 0 4px', fontSize: '10px', fontWeight: 800, letterSpacing: '0.5px' }}>
                    {settings?.receipt_footer || '** THANK YOU... VISIT AGAIN! **'}
                </div>
            </div>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@600;700;800&family=IBM+Plex+Mono:wght@600;700;800&display=swap');
                @media print {
                    html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
                    @page { size: 80mm auto; margin: 0mm; }
                    #invoice-thermal-classic-root, #invoice-thermal-classic-root * {
                        print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important;
                        color: #000 !important; background: transparent !important; box-shadow: none !important; text-shadow: none !important;
                    }
                    #invoice-thermal-classic-root { width: 80mm !important; margin: 0 !important; padding: 5px !important; background: #fff !important; }
                    #invoice-thermal-classic-root img { filter: grayscale(1) contrast(1.4); }
                    #invoice-thermal-classic-root svg { fill: #000 !important; color: #000 !important; }
                }
            `}</style>
        </>
    );
}
