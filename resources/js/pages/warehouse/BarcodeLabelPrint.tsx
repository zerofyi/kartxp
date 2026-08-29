import { Head } from '@inertiajs/react';
import React, { useEffect } from 'react';
import JsBarcode from 'jsbarcode';

interface ProductVariant { id: number; variant_name: string; sku: string; selling_price: number; mrp: number; product: { name: string; }; }
interface Props { variant: ProductVariant; barcode: string; qty: number; copies: number; size: string; showName: boolean; showPrice: boolean; showSku: boolean; showMRP: boolean; }

export default function BarcodeLabelPrintPreviewPage({ variant, barcode, qty, copies, size, showName, showPrice, showSku, showMRP }: Props) {

    useEffect(() => {
        const totalLabels = qty * copies;
        for (let i = 0; i < totalLabels; i++) {
            try {
                JsBarcode(`#b-node-${i}`, barcode, {
                    format: 'CODE128',
                    width: size === '30x20' ? 1.5 : 2,
                    height: size === '30x20' ? 25 : size === '60x40' ? 55 : 38,
                    displayValue: true,
                    fontSize: size === '30x20' ? 9 : 11,
                    margin: 0,
                    textMargin: 3
                });
            } catch (e) {
                console.error('Barcode parsing compilation fault node error context:', e);
            }
        }

        const triggerTimer = setTimeout(() => {
            window.print();
            window.close();
        }, 600);

        return () => clearTimeout(triggerTimer);
    }, [barcode, qty, copies, size]);

    const totalLabels = qty * copies;
    const rawItems = Array.from({ length: totalLabels }, (_, i) => i);
    const is2Up = size === '110x30_2up';

    const chunkedItems = [];
    if (is2Up) {
        for (let i = 0; i < rawItems.length; i += 2) {
            chunkedItems.push(rawItems.slice(i, i + 2));
        }
    } else {
        rawItems.forEach(item => chunkedItems.push([item]));
    }

    const sizeMap: Record<string, { w: string; h: string; pad: string; font: string; innerW?: string }> = {
        '40x30': { w: '40mm', h: '30mm', pad: '2mm', font: '9px' },
        '50x30': { w: '50mm', h: '30mm', pad: '2.5mm', font: '10px' },
        '60x40': { w: '60mm', h: '40mm', pad: '3mm', font: '11px' },
        '30x20': { w: '30mm', h: '20mm', pad: '1.5mm', font: '8px' },
        '110x30_2up': { w: '110mm', h: '30mm', pad: '0', font: '10px', innerW: '50mm' },
    };
    const currentSize = sizeMap[size] || sizeMap['40x30'];

    return (
        <>
            <Head title={`Thermal Print Preview Target Source — ${barcode}`} />

            <div className="print-canvas">
                {chunkedItems.map((chunk, chunkIdx) => (
                    <div key={`page-${chunkIdx}`} className="sticker-sheet" style={{
                        width: currentSize.w,
                        height: currentSize.h,
                        padding: currentSize.pad,
                        boxSizing: 'border-box',
                        display: 'flex',
                        flexDirection: is2Up ? 'row' : 'column',
                        justifyContent: 'left',
                        alignItems: 'center',
                        gap: is2Up ? '4mm' : '0',
                        overflow: 'hidden',
                        background: '#fff'
                    }}>
                        {chunk.map((idx) => (
                            <div key={idx} style={{
                                width: is2Up ? currentSize.innerW : '100%',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                textAlign: 'center',
                                padding: is2Up ? '2.5mm' : '0',
                                boxSizing: 'border-box',
                                overflow: 'hidden'
                            }}>
                                {showName && (
                                    <div style={{
                                        fontSize: currentSize.font,
                                        fontWeight: 'bold',
                                        whiteSpace: 'nowrap',
                                        textOverflow: 'ellipsis',
                                        overflow: 'hidden',
                                        width: '100%',
                                        marginBottom: '2px',
                                        textTransform: 'uppercase',
                                        color: '#000'
                                    }}>
                                        {variant.product.name}
                                    </div>
                                )}

                                <svg id={`b-node-${idx}`} style={{ maxWidth: '100%', display: 'block', margin: '0 auto' }} />

                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    gap: '8px',
                                    marginTop: '2px',
                                    fontSize: size === '30x20' ? '8px' : '10px',
                                    fontWeight: 'bold',
                                    color: '#000',
                                    width: '100%'
                                }}>
                                    {showPrice && <div>₹{variant.selling_price.toFixed(2)}</div>}
                                    {showMRP && <div style={{ textDecoration: 'line-through', fontWeight: 'normal', color: '#555' }}>M:₹{variant.mrp.toFixed(2)}</div>}
                                    {showSku && <div style={{ fontFamily: 'monospace', fontWeight: 'normal' }}>{variant.sku}</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                html, body {
                    margin: 0 !important;
                    padding: 0 !important;
                    background: #ffffff;
                }
                .print-canvas {
                    display: block;
                    width: ${currentSize.w};
                }
                .sticker-sheet {
                    page-break-inside: avoid !important;
                    page-break-after: always !important;
                }
                @page {
                    size: ${currentSize.w} ${currentSize.h};
                    margin: 0 !important;
                }
                @media print {
                    html, body {
                        width: ${currentSize.w};
                        height: ${currentSize.h};
                    }
                    .sticker-sheet {
                        display: flex !important;
                    }
                }
            `}} />
        </>
    );
}
