import { Head } from '@inertiajs/react';
import React from 'react';
import type { InvoiceProps } from './Types';
import {
    COMPANY_INFO,
    calcItemTotal,
    calcPendingAmount,
    calcTotalPaid,
    formatDate,
    formatINR,
    numberToWords,
} from './Helpers';
import AppLogoIcon from '@/components/app-logo-icon';

// ── Minimal-Modern Color Palette ─────────────────────────────────────────────
const TEXT_MAIN = '#0F172A';   // Slate 900 (High contrast text)
const TEXT_MUTED = '#475569';  // Slate 600 (Clean secondary labels)
const ACCENT_BRAND = '#0E7C66'; // Premium Emerald (Corporate identity accents)
const ACCENT_BG = '#F8FAFC';    // Slate 50 (Row striping and panels)
const LINE_BORDER = '#E2E8F0';  // Slate 200 (Hairline structural borders)

const PAID_TEXT = '#166534';   // Emerald 800
const PAID_BG = '#DCFCE7';     // Emerald 100
const DUE_TEXT = '#9A3412';    // Amber 800
const DUE_BG = '#FFEDD5';     // Amber 100

export default function A4Modern({ order, warehouse, settings }: InvoiceProps) {
    const totalPaid = calcTotalPaid(order);
    const pendingAmount = calcPendingAmount(order);
    const isPaid = pendingAmount <= 0;

    const isGstEnabled = settings?.gst_enabled === '1';
    const cgst = isGstEnabled ? (Number(order.tax_amount) / 2) : 0;
    const sgst = cgst;
    const amountInWords = numberToWords(Number(order.total_amount));

    const storeName = warehouse?.name || COMPANY_INFO.name;
    const upiId = settings?.upi_id || COMPANY_INFO.upiId;
    const dateStr = formatDate(order.created_at);

    const subLabelStyle: React.CSSProperties = {
        fontSize: '9.5px',
        fontWeight: 700,
        color: ACCENT_BRAND,
        textTransform: 'uppercase',
        letterSpacing: '0.8px'
    };

    const tableHeaderStyle: React.CSSProperties = {
        textAlign: 'left',
        padding: '10px 12px',
        fontSize: '9.5px',
        fontWeight: 700,
        color: TEXT_MAIN,
        backgroundColor: ACCENT_BG,
        borderBottom: `2px solid ${LINE_BORDER}`,
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
    };

    const tableCellStyle: React.CSSProperties = {
        padding: '10px 12px',
        fontSize: '10.5px',
        borderBottom: `1px solid ${LINE_BORDER}`,
        verticalAlign: 'top'
    };

    return (
        <>
            <Head title={`Invoice ${order.order_number}`} />

            <div
                id="invoice-a4-modern-root"
                style={{
                    width: '210mm',
                    minHeight: '297mm',
                    margin: '0 auto',
                    backgroundColor: '#ffffff',
                    color: TEXT_MAIN,
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
                    fontSize: '11px',
                    lineHeight: 1.5,
                    padding: '20mm 16mm',
                    boxSizing: 'border-box'
                }}
            >
                {/* ── Header Brand Block ──────────────────────────────────────── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        {/* Dynamic Logo Mapping Component — Matched with A4Standard fallback parameters */}
                        {warehouse?.logo_path ? (
                            <img
                                src={warehouse.logo_path.startsWith('data:') ? warehouse.logo_path : `/storage/${warehouse.logo_path}`}
                                style={{ width: '60px', height: '60px', objectFit: 'contain', marginTop: '2px' }}
                                alt="Store Brand Logo"
                            />
                        ) : (
                            <AppLogoIcon style={{ width: '60px', height: '60px', color: ACCENT_BRAND, flexShrink: 0, marginTop: '2px' }} />
                        )}
                        <div>
                            <div style={{ fontSize: '24px', fontWeight: 800, color: ACCENT_BRAND, letterSpacing: '-0.5px', lineHeight: 1.1 }}>{storeName}</div>
                            <div style={{ fontSize: '10px', color: TEXT_MUTED, marginTop: '4px', maxWidth: '340px' }}>{warehouse?.address || COMPANY_INFO.address}</div>
                            <div style={{ fontSize: '10px', color: TEXT_MUTED, marginTop: '2px' }}>
                                {isGstEnabled && (warehouse?.gstin || settings?.gstin) ? `GSTIN: ${warehouse?.gstin || settings?.gstin} · ` : ''}{warehouse?.email || COMPANY_INFO.email} · {warehouse?.phone || COMPANY_INFO.phone}
                            </div>
                        </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: ACCENT_BRAND, letterSpacing: '0.5px' }}>TAX INVOICE</div>
                        <div style={{ fontSize: '10px', color: TEXT_MUTED, marginTop: '6px' }}>Invoice No: <span style={{ color: TEXT_MAIN, fontWeight: 700, fontFamily: 'monospace' }}>{order.order_number}</span></div>
                        <div style={{ fontSize: '10px', color: TEXT_MUTED }}>Date: <span style={{ color: TEXT_MAIN, fontWeight: 600 }}>{dateStr}</span></div>
                    </div>
                </div>

                <div style={{ borderBottom: `2px solid ${ACCENT_BRAND}`, marginBottom: '20px' }} />

                {/* ── Billing & Transaction Metadata ──────────────────────────── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '40px', marginBottom: '24px' }}>
                    <div style={{ flex: 1 }}>
                        <div style={subLabelStyle}>Billed To</div>
                        <div style={{ fontWeight: 700, fontSize: '12px', marginTop: '4px', color: TEXT_MAIN }}>{order.customer ? order.customer.name : 'Cash Customer'}</div>
                        {order.customer?.address && <div style={{ color: TEXT_MUTED, fontSize: '10px', marginTop: '2px' }}>{order.customer.address}</div>}
                        {order.customer?.phone && <div style={{ color: TEXT_MUTED, fontSize: '10px', marginTop: '1px' }}>Ph: {order.customer.phone}</div>}
                    </div>

                    <div style={{ textAlign: 'right', minWidth: '180px' }}>
                        <div style={subLabelStyle}>Payment Status</div>
                        <div
                            style={{
                                display: 'inline-block',
                                marginTop: '6px',
                                padding: '4px 14px',
                                borderRadius: '6px',
                                fontSize: '10px',
                                fontWeight: 800,
                                backgroundColor: isPaid ? PAID_BG : DUE_BG,
                                color: isPaid ? PAID_TEXT : DUE_TEXT,
                                letterSpacing: '0.3px'
                            }}
                        >
                            {isPaid ? 'PAID IN FULL' : 'BALANCE DUE'}
                        </div>
                        {order.payments.length > 0 && (
                            <div style={{ color: TEXT_MUTED, fontSize: '9.5px', marginTop: '6px' }}>
                                Method: <span className="font-semibold capitalize">{order.payments.map((p: any) => p.method).join(', ')}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Items Grid Ledger Table ─────────────────────────────────── */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                    <thead>
                        <tr>
                            <th style={{ ...tableHeaderStyle, width: '42%' }}>Item Description</th>
                            <th style={{ ...tableHeaderStyle, width: '15%' }}>SKU</th>
                            <th style={{ ...tableHeaderStyle, width: '10%', textAlign: 'right' }}>Qty</th>
                            <th style={{ ...tableHeaderStyle, width: '13%', textAlign: 'right' }}>Rate</th>
                            {isGstEnabled && <th style={{ ...tableHeaderStyle, width: '10%', textAlign: 'right' }}>GST</th>}
                            <th style={{ ...tableHeaderStyle, width: '10%', textAlign: 'right' }}>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {order.items.map((item: any, idx: number) => {
                            const itemTotal = calcItemTotal(item);
                            const isInclusive = item.product_variant.product.tax_category.type === 'inclusive';
                            return (
                                <tr key={item.id} style={{ backgroundColor: idx % 2 === 1 ? ACCENT_BG : 'transparent' }}>
                                    <td style={tableCellStyle}>
                                        <div style={{ fontWeight: 600, color: TEXT_MAIN }}>{item.product_variant.product.name}</div>
                                        <div style={{ color: TEXT_MUTED, fontSize: '9px', marginTop: '1px' }}>{item.product_variant.variant_name}</div>
                                    </td>
                                    <td style={{ ...tableCellStyle, color: TEXT_MUTED, fontSize: '9.5px', fontFamily: 'monospace' }}>{item.product_variant.sku}</td>
                                    <td style={{ ...tableCellStyle, textAlign: 'right', fontWeight: 500 }}>{item.quantity} {item.product_variant.unit.symbol}</td>
                                    <td style={{ ...tableCellStyle, textAlign: 'right', fontFamily: 'monospace' }}>{formatINR(item.price)}</td>
                                    {isGstEnabled && <td style={{ ...tableCellStyle, textAlign: 'right', fontSize: '9.5px', color: TEXT_MUTED }}>{Number(item.tax_percent).toFixed(0)}%{isInclusive ? ' incl.' : ''}</td>}
                                    <td style={{ ...tableCellStyle, textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', color: TEXT_MAIN }}>{formatINR(itemTotal)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* ── Summary & Sharpened QR Code Section ───────────────────────── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '40px', marginTop: '24px' }}>
                    <div style={{ flex: 1 }}>
                        <div style={subLabelStyle}>Amount in Words</div>
                        <div style={{ fontSize: '10.5px', fontWeight: 700, color: TEXT_MUTED, marginTop: '3px' }}>{amountInWords} RUPEES ONLY</div>

                        {settings?.upi_qr_svg && upiId && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '24px', padding: '12px', border: `1px solid ${LINE_BORDER}`, borderRadius: '10px', maxWidth: '260px', backgroundColor: ACCENT_BG }}>
                                {/* Crisper Image Sizing Container Grid Layer with Antialiasing Overrides */}
                                <img
                                    src={settings.upi_qr_svg}
                                    alt="UPI Payment QR"
                                    width={95}
                                    height={95}
                                    style={{
                                        display: 'block',
                                        borderRadius: '6px',
                                        backgroundColor: '#fff',
                                        padding: '4px',
                                        border: `1px solid ${LINE_BORDER}`,
                                        imageRendering: 'pixelated' // Anti-blur guard configuration
                                    }}
                                    loading="eager"
                                />
                                <div>
                                    <div style={{ fontSize: '9.5px', fontWeight: 800, color: ACCENT_BRAND, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Scan to Pay</div>
                                    <div style={{ fontSize: '9.5px', color: TEXT_MUTED, marginTop: '2px', fontFamily: 'monospace' }}>{upiId}</div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ width: '260px', flexShrink: 0 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <tbody>
                                <tr>
                                    <td style={{ padding: '5px 0', fontSize: '10.5px', color: TEXT_MUTED }}>Subtotal</td>
                                    <td style={{ padding: '5px 0', fontSize: '10.5px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 500 }}>₹{formatINR(order.subtotal)}</td>
                                </tr>
                                {isGstEnabled && (
                                    <>
                                        <tr>
                                            <td style={{ padding: '4px 0', fontSize: '10.5px', color: TEXT_MUTED }}>CGST</td>
                                            <td style={{ padding: '4px 0', fontSize: '10.5px', textAlign: 'right', fontFamily: 'monospace' }}>₹{formatINR(cgst)}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '4px 0', fontSize: '10.5px', color: TEXT_MUTED }}>SGST</td>
                                            <td style={{ padding: '4px 0', fontSize: '10.5px', textAlign: 'right', fontFamily: 'monospace' }}>₹{formatINR(sgst)}</td>
                                        </tr>
                                    </>
                                )}
                                {Number(order.discount_amount) > 0 && (
                                    <tr>
                                        <td style={{ padding: '4px 0', fontSize: '10.5px', color: TEXT_MUTED }}>Discount</td>
                                        <td style={{ padding: '4px 0', fontSize: '10.5px', textAlign: 'right', fontFamily: 'monospace', color: '#B91C1C', fontWeight: 600 }}>−₹{formatINR(order.discount_amount)}</td>
                                    </tr>
                                )}
                                <tr><td colSpan={2} style={{ borderTop: `1px solid ${LINE_BORDER}`, paddingTop: '6px', marginBottom: '6px' }} /></tr>
                                <tr>
                                    <td style={{ padding: '4px 0', fontSize: '13px', fontWeight: 700, color: ACCENT_BRAND }}>Total Bill</td>
                                    <td style={{ padding: '4px 0', fontSize: '14px', fontWeight: 800, textAlign: 'right', color: ACCENT_BRAND, fontFamily: 'monospace' }}>₹{formatINR(order.total_amount)}</td>
                                </tr>
                                {totalPaid > 0 && (
                                    <tr>
                                        <td style={{ padding: '4px 0', fontSize: '10px', color: TEXT_MUTED }}>Amount Paid</td>
                                        <td style={{ padding: '4px 0', fontSize: '10px', textAlign: 'right', fontFamily: 'monospace' }}>₹{formatINR(totalPaid)}</td>
                                    </tr>
                                )}
                                {!isPaid && (
                                    <tr>
                                        <td style={{ padding: '4px 0', fontSize: '10px', fontWeight: 700, color: DUE_TEXT }}>Balance Due</td>
                                        <td style={{ padding: '4px 0', fontSize: '10px', fontWeight: 700, textAlign: 'right', color: DUE_TEXT, fontFamily: 'monospace' }}>₹{formatINR(pendingAmount)}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── Signatures & Footer Compliance ─────────────────────────── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '60px' }}>
                    <div style={{ fontSize: '9px', color: TEXT_MUTED, maxWidth: '380px', lineHeight: 1.5 }}>
                        {settings?.receipt_footer || `This is a computer-generated invoice. Goods once sold are exchangeable within 7 days with the original bill. For queries, write to ${COMPANY_INFO.email}.`}
                    </div>
                    <div style={{ textAlign: 'center', minWidth: '160px' }}>
                        <div style={{ borderTop: `1px solid ${TEXT_MAIN}`, paddingTop: '6px', fontSize: '10px', fontWeight: 700, color: TEXT_MAIN }}>Authorised Signatory</div>
                        <div style={{ fontSize: '9px', color: TEXT_MUTED, marginTop: '2px' }}>for {storeName}</div>
                    </div>
                </div>
            </div>

            <style>{`
                @media print {
                    html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    @page { size: A4 portrait; margin: 0mm; }
                    #invoice-a4-modern-root { width: 210mm !important; min-height: 297mm !important; margin: 0 !important; }
                }
            `}</style>
        </>
    );
}
