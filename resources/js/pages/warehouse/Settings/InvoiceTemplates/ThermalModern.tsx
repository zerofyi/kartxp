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

const INK = '#1A1A1A';
const MUTED = '#8C8C8C';
const PAPER = '#FFFFFF';
const ACCENT = '#C9912B';
const ACCENT_TINT = '#FBF1DE';
const LINE = '#E5E1D8';
const PAID_GREEN = '#3F7D4F';

// Strict Monospace Font Stack to completely eradicate font substitute glitches on hardware prints
const monoFont: React.CSSProperties = {
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontFeatureSettings: '"tnum"'
};

export default function ThermalModern({ order, warehouse, settings }: InvoiceProps) {
    const totalPaid = calcTotalPaid(order);
    const pendingAmount = calcPendingAmount(order);
    const isPaid = pendingAmount <= 0;

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

            <div id="invoice-thermal-modern-root" style={{ width: '80mm', margin: '0 auto', backgroundColor: PAPER, color: INK, fontFamily: "'IBM Plex Sans', Arial, sans-serif", fontSize: '10.5px', lineHeight: 1.45, padding: '10px 9px 0 9px' }}>

                {/* ── Header ──────────────────────────────────── */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '10px', gap: '1px' }}>
                    {warehouse?.logo_path ? (
                        <img src={warehouse.logo_path.startsWith('data:') ? warehouse.logo_path : `/storage/${warehouse.logo_path}`} style={{ width: '30px', height: '30px', objectFit: 'contain' }} alt="logo" />
                    ) : (
                        <AppLogoIcon style={{ width: '30px', height: '30px', color: INK }} />
                    )}

                    <div style={{ fontSize: '17px', fontWeight: 800, letterSpacing: '1px', color: INK, marginTop: '4px' }}>
                        {storeName}
                    </div>
                    <div style={{ fontSize: '8.5px', color: MUTED, marginTop: '3px' }}>{warehouse?.address || COMPANY_INFO.address}</div>
                    <div style={{ fontSize: '8.5px', color: MUTED }}>{isGstEnabled && (warehouse?.gstin || settings?.gstin) ? `GSTIN ${warehouse?.gstin || settings?.gstin} · ` : ''}
                        {warehouse?.email || COMPANY_INFO.email} | {warehouse?.phone || COMPANY_INFO.phone}</div>
                </div>

                {/* ── Bill meta strip ───────────────────────────── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: ACCENT_TINT, borderRadius: '7px', padding: '6px 8px', marginBottom: '8px', fontSize: '8.5px', fontWeight: 700 }}>
                    <div>
                        <div style={{ color: MUTED, fontWeight: 600, fontSize: '7.5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bill No.</div>
                        <div style={monoFont}>{order.order_number}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ color: MUTED, fontWeight: 600, fontSize: '7.5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{dateStr}</div>
                        <div style={monoFont}>{timeStr}</div>
                    </div>
                </div>

                {/* ── Items ───────────────────────────────────── */}
                <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: '6px' }}>
                    {order.items.map((item, idx) => {
                        const itemTotal = calcItemTotal(item);
                        const discountPct = calcDiscountPercent(item);
                        const isInclusive = item.product_variant.product.tax_category.type === 'inclusive';

                        return (
                            <div key={item.id} style={{ padding: '6px 0', borderBottom: idx === order.items.length - 1 ? 'none' : `1px solid ${LINE}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px' }}>
                                    <span style={{ fontWeight: 700 }}><span style={{ color: MUTED, fontWeight: 600 }}>{idx + 1}.</span> {item.product_variant.product.name}</span>
                                    <span style={{ ...monoFont, fontWeight: 800, whiteSpace: 'nowrap' }}>{formatPlain(itemTotal)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: MUTED, fontSize: '8.5px', marginTop: '2px' }}>
                                    <span>{item.product_variant.variant_name} · {item.quantity} {item.product_variant.unit.symbol} × <span style={monoFont}>{formatPlain(item.price)}</span></span>
                                </div>
                                <div style={{ display: 'flex', gap: '5px', marginTop: '3px' }}>
                                    <span style={{ fontSize: '7.5px', fontWeight: 700, background: ACCENT_TINT, color: ACCENT, borderRadius: '4px', padding: '1px 5px' }}>
                                        {isGstEnabled ? `GST ${Number(item.tax_percent).toFixed(0)}% ${isInclusive ? 'INCL' : 'EXCL'}` : 'Tax Exempt'}
                                    </span>
                                    {item.discount > 0 && <span style={{ fontSize: '7.5px', fontWeight: 700, color: PAID_GREEN }}>-<span style={monoFont}>{formatPlain(item.discount)}</span> ({discountPct.toFixed(1)}%)</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ── Summary Breakdowns ──────────────────────── */}
                <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: `1px solid ${LINE}`, fontSize: '9px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5px 0', color: MUTED }}><span>Subtotal</span><span style={monoFont}>{formatPlain(order.subtotal)}</span></div>
                    {isGstEnabled && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5px 0', color: MUTED }}><span>CGST + SGST</span><span style={monoFont}>{formatPlain(order?.tax_amount)}</span></div>}
                    {Number(order.discount_amount) > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5px 0', color: PAID_GREEN, fontWeight: 700 }}><span>Discount</span><span style={monoFont}>-{formatPlain(order.discount_amount)}</span></div>}
                </div>

                {/* ── Total Ribbon Bar ────────────────────────── */}
                <div data-total-bar style={{ background: INK, color: PAPER, borderRadius: '8px', padding: '8px 10px', margin: '8px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.5px' }}>TOTAL</span>
                    {/* Exchanged '₹' symbol out completely for hardware safe 'Rs.' string using the protected mono font stack */}
                    <span style={{ ...monoFont, fontSize: '15px', fontWeight: 800 }}>Rs. {formatPlain(order.total_amount)}</span>
                </div>

                <div style={{ textAlign: 'center', fontSize: '8px', color: MUTED, marginBottom: '8px', padding: '0 4px' }}>{amountInWords} RUPEES ONLY</div>

                {/* ── Settlement & QR Code ───────────────────── */}
                <div style={{ display: 'flex', gap: '8px', border: `1px solid ${LINE}`, borderRadius: '8px', padding: '8px', marginBottom: '8px', alignItems: 'center' }}>
                    {settings?.upi_qr_svg && settings?.upi_id ? (
                        <img src={settings.upi_qr_svg} alt="UPI Payment QR" width={72} height={72} style={{ display: 'block', borderRadius: '4px', flexShrink: 0 }} loading="eager" />
                    ) : (
                        <div style={{ width: '72px', height: '72px', display: 'flex', background: '#f5f5f5', borderRadius: '4px' }} />
                    )}
                    <div style={{ fontSize: '8.5px', flex: 1 }}>
                        {order.payments.map((p) => <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', color: MUTED }}><span className="uppercase">{p.method}</span><span style={monoFont}>{formatPlain(p.amount)}</span></div>)}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, marginTop: '4px', paddingTop: '4px', borderTop: `1px solid ${LINE}`, color: isPaid ? PAID_GREEN : ACCENT }}>
                            <span>{isPaid ? 'PAID' : 'DUE'}</span><span style={monoFont}>{isPaid ? formatPlain(totalPaid) : formatPlain(pendingAmount)}</span>
                        </div>
                    </div>
                </div>

                {/* ── Footer compliance notes ─────────────────── */}
                <div style={{ textAlign: 'center', fontSize: '9px', fontWeight: 700, color: ACCENT, paddingBottom: '6px' }}>
                    {settings?.receipt_footer || 'Thank you for shopping home-style ♥'}
                </div>
                <div className="torn-edge" style={{ height: '10px', backgroundImage: `linear-gradient(135deg, ${PAPER} 50%, transparent 50%), linear-gradient(45deg, ${PAPER} 50%, transparent 50%)`, backgroundSize: '10px 10px', backgroundPosition: 'bottom', backgroundColor: '#D8D4C9' }} />
            </div>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Sora:wght@700;800&family=IBM+Plex+Mono:wght@600;700;800&display=swap');
                @media print {
                    html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
                    @page { size: 80mm auto; margin: 0mm; }
                    #invoice-thermal-modern-root .torn-edge { display: none !important; }
                    #invoice-thermal-modern-root, #invoice-thermal-modern-root * {
                        print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important;
                        border-radius: 0 !important; box-shadow: none !important; text-shadow: none !important; background: transparent !important; color: #000 !important; border-color: #000 !important;
                    }
                    #invoice-thermal-modern-root { width: 80mm !important; margin: 0 !important; padding: 6px !important; background: #fff !important; }
                    #invoice-thermal-modern-root [data-total-bar] { background: #000 !important; color: #fff !important; }
                    #invoice-thermal-modern-root [data-total-bar] * { color: #fff !important; }
                    #invoice-thermal-modern-root img { filter: grayscale(1) contrast(1.5); }
                    #invoice-thermal-modern-root svg { fill: #000 !important; color: #000 !important; }
                }
            `}</style>
        </>
    );
}
