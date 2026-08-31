import { Head } from '@inertiajs/react';
import React, { useEffect } from 'react';
import JsBarcode from 'jsbarcode';

interface ProductVariant { id: number; variant_name: string; sku: string; selling_price: number; mrp: number; product: { name: string; }; }
interface Props { variant: ProductVariant; barcode: string; qty: number; copies: number; size: string; showName: boolean; showPrice: boolean; showSku: boolean; showMRP: boolean; }

// Font & barcode size map — tuned by matching the BarTender 50x30 2-up label photo.
// Key hierarchy from photo: Price is dominant (largest), Name is bold+large,
// Warranty/subtitle is medium bold, SKU/MRP are small regular.
// fontWeight 800 used instead of 'bold' for better thermal ink density.
const fontMap: Record<string, {
    nameSize: string;
    subtitleSize: string;
    priceSize: string;
    skuMrpSize: string;
    barcodeTextSize: number;
    barcodeHeight: number;
    barcodeWidth: number;
}> = {
    '30x20': {
        nameSize: '9px',
        subtitleSize: '7px',
        priceSize: '13px',
        skuMrpSize: '7px',
        barcodeTextSize: 7,
        barcodeHeight: 16,
        barcodeWidth: 1.2,
    },
    '40x30': {
        nameSize: '12px',
        subtitleSize: '9px',
        priceSize: '17px',
        skuMrpSize: '8px',
        barcodeTextSize: 9,
        barcodeHeight: 22,
        barcodeWidth: 1.5,
    },
    '50x30': {
        nameSize: '13px',
        subtitleSize: '10px',
        priceSize: '20px',
        skuMrpSize: '9px',
        barcodeTextSize: 9,
        barcodeHeight: 24,
        barcodeWidth: 1.8,
    },
    '60x40': {
        nameSize: '15px',
        subtitleSize: '11px',
        priceSize: '24px',
        skuMrpSize: '10px',
        barcodeTextSize: 10,
        barcodeHeight: 38,
        barcodeWidth: 2,
    },
    '110x30_2up': {
        nameSize: '12px',
        subtitleSize: '9px',
        priceSize: '18px',
        skuMrpSize: '8px',
        barcodeTextSize: 9,
        barcodeHeight: 22,
        barcodeWidth: 1.5,
    },
};

export default function BarcodeLabelPrintPreviewPage({ variant, barcode, qty, copies, size, showName, showPrice, showSku, showMRP }: Props) {

    useEffect(() => {
        const f = fontMap[size] || fontMap['40x30'];
        const totalLabels = qty * copies;
        for (let i = 0; i < totalLabels; i++) {
            try {
                JsBarcode(`#b-node-${i}`, barcode, {
                    format: 'CODE128',
                    width: f.barcodeWidth,
                    height: f.barcodeHeight,
                    displayValue: true,
                    fontSize: f.barcodeTextSize,
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

    const chunkedItems: number[][] = [];
    if (is2Up) {
        for (let i = 0; i < rawItems.length; i += 2) {
            chunkedItems.push(rawItems.slice(i, i + 2));
        }
    } else {
        rawItems.forEach(item => chunkedItems.push([item]));
    }

    const sizeMap: Record<string, { w: string; h: string; pad: string; innerW?: string }> = {
        '40x30':      { w: '40mm', h: '30mm', pad: '2mm' },
        '50x30':      { w: '50mm', h: '30mm', pad: '2.5mm' },
        '60x40':      { w: '60mm', h: '40mm', pad: '3mm' },
        '30x20':      { w: '30mm', h: '20mm', pad: '1.5mm' },
        '110x30_2up': { w: '104mm', h: '30mm', pad: '2mm', innerW: '50mm' },
    };
    const currentSize = sizeMap[size] || sizeMap['40x30'];
    const f = fontMap[size] || fontMap['40x30'];

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
                        // 2up: always align left so a lone last label sits in the left slot, not centred
                        justifyContent: is2Up ? 'flex-start' : 'center',
                        alignItems: 'center',
                        gap: is2Up ? '6mm' : '0',
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
                                {/* Name line: product name shrinks/truncates, variant name is always shown in full */}
                                {showName && (
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'row',
                                        alignItems: 'baseline',
                                        width: '100%',
                                        marginBottom: '2px',
                                        overflow: 'hidden',
                                        fontSize: f.nameSize,
                                        fontWeight: '800',
                                        textTransform: 'uppercase',
                                        color: '#000',
                                        letterSpacing: '0.01em',
                                        whiteSpace: 'nowrap',
                                    }}>
                                        {/* Product name — shrinks and truncates when long */}
                                        <span style={{
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            minWidth: 0,
                                            flexShrink: 1,
                                        }}>
                                            {variant.product.name}
                                        </span>
                                        {/* Variant name — never truncated, always fully visible */}
                                        {variant.variant_name && (
                                            <span style={{
                                                flexShrink: 0,
                                                whiteSpace: 'nowrap',
                                                paddingLeft: '3px',
                                            }}>
                                                - {variant.variant_name}
                                            </span>
                                        )}
                                    </div>
                                )}

                                <svg id={`b-node-${idx}`} style={{ maxWidth: '100%', display: 'block', margin: '0 auto' }} />

                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'baseline',
                                    gap: '6px',
                                    marginTop: '2px',
                                    width: '100%'
                                }}>
                                    {showPrice && (
                                        <div style={{
                                            fontSize: f.priceSize,
                                            fontWeight: '800',
                                            color: '#000',
                                            letterSpacing: '-0.01em',
                                        }}>
                                            ₹{variant.selling_price.toLocaleString('en-IN')}
                                        </div>
                                    )}
                                    {showMRP && (
                                        <div style={{
                                            fontSize: f.skuMrpSize,
                                            fontWeight: '400',
                                            textDecoration: 'line-through',
                                            color: '#444',
                                        }}>
                                            M:₹{variant.mrp.toFixed(2)}
                                        </div>
                                    )}
                                    {showSku && (
                                        <div style={{
                                            fontSize: f.skuMrpSize,
                                            fontWeight: '400',
                                            fontFamily: 'monospace',
                                            color: '#000',
                                        }}>
                                            {variant.sku}
                                        </div>
                                    )}
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
