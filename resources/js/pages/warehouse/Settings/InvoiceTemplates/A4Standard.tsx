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

const INK = '#1F2226';
const NAVY = '#1F3A5F';
const MUTED = '#5B616A';
const BORDER = '#C7CCD1';
const HEAD_BG = '#F2F4F6';
const DUE = '#B3401C';

export default function A4Standard({ order, warehouse, settings }: InvoiceProps) {
    const totalPaid = calcTotalPaid(order);
    const pendingAmount = calcPendingAmount(order);

    const isGstEnabled = settings?.gst_enabled === '1';
    const cgst = isGstEnabled ? (Number(order.tax_amount) / 2) : 0;
    const sgst = cgst;
    const amountInWords = numberToWords(Number(order.total_amount));

    const storeName = warehouse?.name || COMPANY_INFO.name;
    const upiId = settings?.upi_id || COMPANY_INFO.upiId;
    const dateStr = formatDate(order.created_at);

    const th: React.CSSProperties = { textAlign: 'left', padding: '7px 8px', fontSize: '9.5px', fontWeight: 700, color: NAVY, background: HEAD_BG, border: `1px solid ${BORDER}`, textTransform: 'uppercase', letterSpacing: '0.3px' };
    const td: React.CSSProperties = { padding: '7px 8px', fontSize: '10px', border: `1px solid ${BORDER}`, verticalAlign: 'top' };

    return (
        <>
            <Head title={`Invoice ${order.order_number}`} />

            <div id="invoice-a4-standard-root" style={{ width: '210mm', minHeight: '297mm', margin: '0 auto', backgroundColor: '#ffffff', color: INK, fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: '11px', lineHeight: 1.5, padding: '16mm 14mm', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `3px solid ${NAVY}`, paddingBottom: '14px', marginBottom: '18px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {warehouse?.logo_path ? (
                            <img src={warehouse.logo_path.startsWith('data:') ? warehouse.logo_path : `/storage/${warehouse.logo_path}`} style={{ width: '60px', height: '60px', objectFit: 'contain', marginTop: '2px' }} alt="logo" />
                        ) : (
                            <AppLogoIcon style={{ width: '60px', height: '60px', color: NAVY, flexShrink: 0, marginTop: '2px' }} />
                        )}
                        <div>
                            <div style={{ fontSize: '22px', fontWeight: 800, color: NAVY, letterSpacing: '0.5px' }}>{storeName}</div>
                            <div style={{ fontSize: '10px', color: MUTED, marginTop: '4px', maxWidth: '300px' }}>{warehouse?.address || COMPANY_INFO.address}</div>
                            <div style={{ fontSize: '10px', color: MUTED, marginTop: '2px' }}>{isGstEnabled && (warehouse?.gstin || settings?.gstin) ? `GSTIN ${warehouse?.gstin || settings?.gstin} | ` : ''}{warehouse?.email || COMPANY_INFO.email} &nbsp;|&nbsp; {warehouse?.phone || COMPANY_INFO.phone}</div>
                        </div>
                    </div>
                    <div style={{ textTransform: 'uppercase', textAlign: 'right' }}>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: INK, letterSpacing: '1px' }}>TAX INVOICE</div>
                        <div style={{ fontSize: '10px', color: MUTED, marginTop: '6px' }}>Invoice No. <strong style={{ color: INK }}>{order.order_number}</strong></div>
                        <div style={{ fontSize: '10px', color: MUTED }}>Date <strong style={{ color: INK }}>{dateStr}</strong></div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '24px', marginBottom: '22px' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '9.5px', fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Bill To</div>
                        <div style={{ fontWeight: 700 }}>{order.customer ? order.customer.name : 'Cash Customer'}</div>
                        {order.customer?.address && <div style={{ color: MUTED, fontSize: '10px' }}>{order.customer.address}</div>}
                        {order.customer?.phone && <div style={{ color: MUTED, fontSize: '10px' }}>{order.customer.phone}</div>}
                    </div>
                    <div style={{ flex: 1, textAlign: 'right' }}>
                        <div style={{ fontSize: '9.5px', fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Payment Status</div>
                        <div style={{ fontWeight: 700, color: pendingAmount <= 0 ? '#2E7D4F' : DUE }}>{pendingAmount <= 0 ? 'PAID IN FULL' : `BALANCE DUE ₹${formatINR(pendingAmount)}`}</div>
                        <div style={{ color: MUTED, fontSize: '10px' }}>{order.payments.map((p) => p.method).join(' + ')}</div>
                    </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4px' }}>
                    <thead>
                        <tr>
                            <th style={{ ...th, width: '5%' }}>#</th>
                            <th style={{ ...th, width: '29%' }}>Item</th>
                            <th style={{ ...th, width: '10%' }}>HSN/SKU</th>
                            <th style={{ ...th, width: '8%', textAlign: 'right' }}>Qty</th>
                            <th style={{ ...th, width: '11%', textAlign: 'right' }}>Rate</th>
                            <th style={{ ...th, width: '11%', textAlign: 'right' }}>Discount</th>
                            <th style={{ ...th, width: '10%', textAlign: 'right' }}>GST</th>
                            <th style={{ ...th, width: '16%', textAlign: 'right' }}>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {order.items.map((item, idx) => {
                            const itemTotal = calcItemTotal(item);
                            const isInclusive = item.product_variant.product.tax_category.type === 'inclusive';
                            return (
                                <tr key={item.id}>
                                    <td style={td}>{idx + 1}</td>
                                    <td style={td}>
                                        <div style={{ fontWeight: 700 }}>{item.product_variant.product.name}</div>
                                        <div style={{ color: MUTED, fontSize: '9px' }}>{item.product_variant.variant_name}</div>
                                    </td>
                                    <td style={{ ...td, color: MUTED, fontSize: '9px' }}>{item.product_variant.sku}</td>
                                    <td style={{ ...td, textAlign: 'right' }}>{item.quantity} {item.product_variant.unit.symbol}</td>
                                    <td style={{ ...td, textAlign: 'right' }}>{formatINR(item.price)}</td>
                                    <td style={{ ...td, textAlign: 'right' }}>{item.discount > 0 ? `-${formatINR(item.discount)}` : '—'}</td>
                                    <td style={{ ...td, textAlign: 'right', fontSize: '9px', color: MUTED }}>{isGstEnabled ? `${Number(item.tax_percent).toFixed(0)}%${isInclusive ? ' incl.' : ''}` : '0%'}</td>
                                    <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{formatINR(itemTotal)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '24px', marginTop: '18px' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '9.5px', fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Amount in Words</div>
                        <div style={{ fontSize: '10px', color: MUTED, maxWidth: '260px' }}>{amountInWords} RUPEES ONLY</div>
                        {settings?.upi_qr_svg && upiId && (
                            <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <img src={settings.upi_qr_svg} alt="UPI Payment QR" width={70} height={70} style={{ display: 'block', border: `1px solid ${BORDER}` }} loading="eager" />
                                <div style={{ fontSize: '9px', color: MUTED }}>Scan to pay via UPI<br />{upiId}</div>
                            </div>
                        )}
                    </div>

                    <table style={{ width: '290px', borderCollapse: 'collapse', flexShrink: 0 }}>
                        <tbody>
                            <tr><td style={{ padding: '4px 0', fontSize: '10px', color: MUTED }}>Subtotal</td><td style={{ padding: '4px 0', fontSize: '10px', textAlign: 'right' }}>₹{formatINR(order.subtotal)}</td></tr>
                            {isGstEnabled && (
                                <>
                                    <tr><td style={{ padding: '4px 0', fontSize: '10px', color: MUTED }}>CGST</td><td style={{ padding: '4px 0', fontSize: '10px', textAlign: 'right' }}>₹{formatINR(cgst)}</td></tr>
                                    <tr><td style={{ padding: '4px 0', fontSize: '10px', color: MUTED }}>SGST</td><td style={{ padding: '4px 0', fontSize: '10px', textAlign: 'right' }}>₹{formatINR(sgst)}</td></tr>
                                </>
                            )}
                            {Number(order.discount_amount) > 0 && <tr><td style={{ padding: '4px 0', fontSize: '10px', color: MUTED }}>Discount</td><td style={{ padding: '4px 0', fontSize: '10px', textAlign: 'right' }}>-₹{formatINR(order.discount_amount)}</td></tr>}
                            <tr><td colSpan={2} style={{ borderTop: `2px solid ${NAVY}`, paddingTop: '8px' }} /></tr>
                            <tr><td style={{ padding: '2px 0', fontSize: '14px', fontWeight: 800, color: NAVY }}>Total</td><td style={{ padding: '2px 0', fontSize: '14px', fontWeight: 800, textAlign: 'right', color: NAVY }}>₹{formatINR(order.total_amount)}</td></tr>
                            <tr><td style={{ padding: '6px 0 2px', fontSize: '10px', color: MUTED }}>Paid</td><td style={{ padding: '6px 0 2px', fontSize: '10px', textAlign: 'right' }}>₹{formatINR(totalPaid)}</td></tr>
                            <tr><td style={{ padding: '2px 0', fontSize: '10px', color: pendingAmount > 0 ? DUE : MUTED, fontWeight: pendingAmount > 0 ? 700 : 400 }}>Balance Due</td><td style={{ padding: '2px 0', fontSize: '10px', textAlign: 'right', color: pendingAmount > 0 ? DUE : MUTED, fontWeight: pendingAmount > 0 ? 700 : 400 }}>₹{formatINR(pendingAmount)}</td></tr>
                        </tbody>
                    </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '48px', paddingTop: '14px', borderTop: `1px solid ${BORDER}` }}>
                    <div style={{ fontSize: '9px', color: MUTED, maxWidth: '320px' }}>
                        {settings?.receipt_footer || `This is a computer-generated invoice. Goods once sold are exchangeable within 7 days with the original bill. For queries, write to ${COMPANY_INFO.email}.`}
                    </div>
                    <div style={{ textAlign: 'center', minWidth: '160px' }}>
                        <div style={{ height: '36px' }} />
                        <div style={{ borderTop: `1px solid ${INK}`, paddingTop: '4px', fontSize: '9.5px', fontWeight: 700 }}>Authorised Signatory</div>
                        <div style={{ fontSize: '9px', color: MUTED }}>for {storeName}</div>
                    </div>
                </div>
            </div>

            <style>{`
                @media print {
                    html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
                    @page { size: A4; margin: 0mm; }
                    #invoice-a4-standard-root, #invoice-a4-standard-root * { print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
                    #invoice-a4-standard-root { width: 210mm !important; min-height: 297mm !important; margin: 0 !important; }
                }
            `}</style>
        </>
    );
}
