import { Head } from '@inertiajs/react';
import { useEffect } from 'react';
import JsBarcode from 'jsbarcode';

interface ProductVariant {
    id: number;
    variant_name: string;
    sku: string;
    selling_price: number;
    mrp: number;
    product: {
        name: string;
    };
}

interface Props {
    variant: ProductVariant;
    barcode: string;
    qty: number;
    copies: number;
    size: string;
    showName: boolean;
    showPrice: boolean;
    showSku: boolean;
    showMRP: boolean;
}

export default function BarcodeLabelPrint({
    variant,
    barcode,
    qty,
    copies,
    size,
    showName,
    showPrice,
    showSku,
    showMRP,
}: Props) {
    useEffect(() => {
        // Generate all barcodes
        const totalLabels = qty * copies;
        for (let i = 0; i < totalLabels; i++) {
            try {
                JsBarcode(`#barcode-${i}`, barcode, {
                    format: 'CODE128',
                    width: 2,
                    height: 40,
                    displayValue: true,
                    fontSize: 12,
                    margin: 0,
                });
            } catch (e) {
                console.error('Barcode generation error:', e);
            }
        }

        // Auto-print after generation
        const timer = setTimeout(() => {
            window.print();
        }, 500);

        return () => clearTimeout(timer);
    }, [barcode, qty, copies]);

    // Get size dimensions
    const getSizeDimensions = () => {
        switch (size) {
            case '40x30':
                return { width: '40mm', height: '30mm', fontSize: '8px', barcodeHeight: 30 };
            case '50x30':
                return { width: '50mm', height: '30mm', fontSize: '9px', barcodeHeight: 35 };
            case '60x40':
                return { width: '60mm', height: '40mm', fontSize: '10px', barcodeHeight: 40 };
            case '30x20':
                return { width: '30mm', height: '20mm', fontSize: '7px', barcodeHeight: 25 };
            default:
                return { width: '40mm', height: '30mm', fontSize: '8px', barcodeHeight: 30 };
        }
    };

    const dimensions = getSizeDimensions();
    const totalLabels = qty * copies;

    // Create array of labels
    const labels = Array.from({ length: totalLabels }, (_, i) => i);

    return (
        <>
            <Head title={`Print Barcode Labels - ${barcode}`} />

            <div className="bg-white p-2">
                <div className="grid gap-2" style={{
                    gridTemplateColumns: 'repeat(auto-fill, minmax(40mm, 1fr))',
                }}>
                    {labels.map((index) => (
                        <div
                            key={index}
                            className="barcode-label"
                            style={{
                                width: dimensions.width,
                                height: dimensions.height,
                                border: '1px dashed #ccc',
                                padding: '2mm',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                pageBreakInside: 'avoid',
                                boxSizing: 'border-box',
                                fontSize: dimensions.fontSize,
                            }}
                        >
                            {/* Product Name */}
                            {showName && (
                                <div
                                    style={{
                                        fontSize: dimensions.fontSize,
                                        fontWeight: 'bold',
                                        textAlign: 'center',
                                        marginBottom: '1mm',
                                        lineHeight: '1.2',
                                        maxHeight: '10mm',
                                        overflow: 'hidden',
                                        width: '100%',
                                    }}
                                >
                                    {variant.product.name}
                                </div>
                            )}

                            {/* Variant Name */}
                            {showName && variant.variant_name && (
                                <div
                                    style={{
                                        fontSize: `calc(${dimensions.fontSize} - 1px)`,
                                        textAlign: 'center',
                                        marginBottom: '1mm',
                                        color: '#666',
                                    }}
                                >
                                    {variant.variant_name}
                                </div>
                            )}

                            {/* Barcode */}
                            <svg
                                id={`barcode-${index}`}
                                style={{
                                    maxWidth: '100%',
                                    height: `${dimensions.barcodeHeight}px`,
                                    marginBottom: '1mm',
                                }}
                            ></svg>

                            {/* Price Section */}
                            <div
                                style={{
                                    display: 'flex',
                                    gap: '3mm',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    width: '100%',
                                    marginTop: '1mm',
                                }}
                            >
                                {showPrice && (
                                    <div
                                        style={{
                                            fontSize: dimensions.fontSize,
                                            fontWeight: 'bold',
                                        }}
                                    >
                                        ₹{variant.selling_price}
                                    </div>
                                )}

                                {showMRP && (
                                    <div
                                        style={{
                                            fontSize: `calc(${dimensions.fontSize} - 1px)`,
                                            color: '#666',
                                        }}
                                    >
                                        MRP: ₹{variant.mrp}
                                    </div>
                                )}
                            </div>

                            {/* SKU */}
                            {showSku && (
                                <div
                                    style={{
                                        fontSize: `calc(${dimensions.fontSize} - 1px)`,
                                        color: '#666',
                                        marginTop: '1mm',
                                        fontFamily: 'monospace',
                                    }}
                                >
                                    SKU: {variant.sku}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Print Styles */}
            <style>{`
                @media print {
                    body {
                        margin: 0;
                        padding: 0;
                    }
                    @page {
                        size: auto;
                        margin: 5mm;
                    }
                    .barcode-label {
                        border: 1px solid #000 !important;
                        page-break-inside: avoid;
                    }
                    * {
                        print-color-adjust: exact;
                        -webkit-print-color-adjust: exact;
                    }
                }

                @media screen {
                    body {
                        background: #f0f0f0;
                    }
                }
            `}</style>

            {/* JsBarcode CDN */}
            <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        </>
    );
}
