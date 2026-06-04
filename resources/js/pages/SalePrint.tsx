import { Head } from '@inertiajs/react';
import React, { useEffect } from 'react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type Customer = {
    id: number;
    name: string;
    phone: string;
    address?: string;
};

type OrderItem = {
    id: number;
    product_variant: {
        product: { name: string };
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
    sale: Sale;
};

export default function SalePrint({ sale }: Props) {
    useEffect(() => {
        // Auto-print when page loads
        const timer = setTimeout(() => {
            window.print();
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    const calculateItemTotal = (item: OrderItem) => {
        const subtotal = Number(item.quantity) * Number(item.price);
        const afterDiscount = subtotal - Number(item.discount);
        const tax = (afterDiscount * Number(item.tax_percent)) / 100;
        return afterDiscount + tax;
    };

    const calculateCGST = () => {
        return Number(sale.tax_amount) / 2;
    };

    const calculateSGST = () => {
        return Number(sale.tax_amount) / 2;
    };

    const totalPaid = sale.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const pendingAmount = Number(sale.total_amount) - totalPaid;
    const balanceAmount = 0;

    // Function to convert number to words (simplified)
    const numberToWords = (num: number): string => {
        // This is a simplified version - you might want to use a library for complete conversion
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
        return 'AMOUNT TOO LARGE';
    };

    return (
        <>
            <Head title={`Invoice ${sale.order_number}`} />

            <div className="mx-auto bg-white px-2 py-1" style={{ width: '80mm', fontFamily: 'monospace', fontSize: '12px' }}>
                {/* Header */}
                <div className="border-b-2 border-black pb-1 text-center">
                    <h1 className="text-base font-bold uppercase" style={{ letterSpacing: '1px' }}>GHORER BAZAR</h1>
                    <p className="text-[9px] leading-tight" style={{ lineHeight: '1.3' }}>
                        123 MARKET STREET, HALDIA<br />
                        WEST BENGAL - 721657<br />
                        GSTIN: 19AAAAA0000A1Z5<br />
                        E-mail: info@ghorerbazar.com
                    </p>
                </div>

                {/* Bill Info */}
                <div className="border-b border-gray-400 py-1 text-[9px]" style={{ borderStyle: 'dashed' }}>
                    <div className="flex justify-between">
                        <span>Dt: {new Date(sale.created_at).toLocaleDateString('en-GB')}</span>
                        <span>{new Date(sale.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()}</span>
                        <span>Bill No: {sale.order_number}</span>
                    </div>
                </div>

                {/* Customer Info */}
                <div className="border-b border-gray-400 py-1 text-[9px]" style={{ borderStyle: 'dashed' }}>
                    <div><strong>Bill To: Cash</strong></div>
                    {sale.customer && (
                        <>
                            <div>Name: {sale.customer.name}</div>
                            {sale.customer.address && <div>Address: {sale.customer.address}</div>}
                            <div>Phone: {sale.customer.phone}</div>
                            <div>GSTIN: N/A</div>
                        </>
                    )}
                </div>

                {/* Items Table Header */}
                <div className="border-b-2 border-black text-[8px] font-bold" style={{ backgroundColor: '#f0f0f0' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={{ padding: '2px', textAlign: 'left', width: '5%' }}>#</th>
                                <th style={{ padding: '2px', textAlign: 'left', width: '35%' }}>Item</th>
                                <th style={{ padding: '2px', textAlign: 'right', width: '10%' }}>Qty</th>
                                <th style={{ padding: '2px', textAlign: 'right', width: '12%' }}>MRP</th>
                                <th style={{ padding: '2px', textAlign: 'right', width: '12%' }}>Rate</th>
                                <th style={{ padding: '2px', textAlign: 'right', width: '10%' }}>Dis%</th>
                                <th style={{ padding: '2px', textAlign: 'right', width: '16%' }}>Amount</th>
                            </tr>
                        </thead>
                    </table>
                </div>

                {/* Items */}
                <div className="border-b border-gray-400 text-[8px]" style={{ borderStyle: 'dashed' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                            {sale.items.map((item, index) => {
                                const itemTotal = calculateItemTotal(item);
                                const itemSubtotal = Number(item.quantity) * Number(item.price);
                                const discountPercent = itemSubtotal > 0
                                    ? ((Number(item.discount) / itemSubtotal) * 100)
                                    : 0;

                                return (
                                    <React.Fragment key={item.id}>
                                        <tr>
                                            <td style={{ padding: '2px 2px', verticalAlign: 'top', width: '5%' }}>{index + 1}</td>
                                            <td style={{ padding: '2px 2px', verticalAlign: 'top', width: '35%' }}>
                                                <strong>{item.product_variant.product.name}</strong>
                                            </td>
                                            <td style={{ padding: '2px 2px', textAlign: 'right', verticalAlign: 'top', width: '10%' }}>
                                                {Number(item.quantity).toFixed(3)}
                                            </td>
                                            <td style={{ padding: '2px 2px', textAlign: 'right', verticalAlign: 'top', width: '12%' }}>
                                                {Number(item.price).toFixed(2)}
                                            </td>
                                            <td style={{ padding: '2px 2px', textAlign: 'right', verticalAlign: 'top', width: '12%' }}>
                                                {Number(item.price).toFixed(2)}
                                            </td>
                                            <td style={{ padding: '2px 2px', textAlign: 'right', verticalAlign: 'top', width: '10%' }}>
                                                {discountPercent.toFixed(2)}
                                            </td>
                                            <td style={{ padding: '2px 2px', textAlign: 'right', verticalAlign: 'top', width: '16%' }}>
                                                {itemTotal.toFixed(2)}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td></td>
                                            <td colSpan={3} style={{ padding: '0 2px 4px 2px', fontSize: '7px', color: '#666' }}>
                                                {item.product_variant.variant_name}
                                            </td>
                                            <td colSpan={2} style={{ padding: '0 2px 4px 2px', fontSize: '7px', color: '#666' }}>
                                                {item.product_variant.unit.symbol} <span style={{ color: '#d00' }}>GST: {Number(item.tax_percent).toFixed(2)}%</span>
                                            </td>
                                            <td style={{ padding: '0 2px 4px 2px', textAlign: 'right', fontSize: '7px' }}>
                                                {Number(item.discount).toFixed(2)}
                                            </td>
                                        </tr>
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Summary */}
                <div className="border-b border-gray-400 py-1 text-[9px]" style={{ borderStyle: 'dashed' }}>
                    <table style={{ width: '100%' }}>
                        <tbody>
                            <tr>
                                <td style={{ padding: '1px 0', fontWeight: 'bold' }}>Sub Total</td>
                                <td style={{ padding: '1px 0', textAlign: 'right', fontWeight: 'bold' }}>
                                    {Number(sale.subtotal).toFixed(2)}
                                </td>
                            </tr>
                            <tr>
                                <td style={{ padding: '1px 0' }}>Taxable Amount</td>
                                <td style={{ padding: '1px 0', textAlign: 'right' }}>
                                    {(Number(sale.subtotal) - Number(sale.discount_amount)).toFixed(2)}
                                </td>
                            </tr>
                            <tr>
                                <td style={{ padding: '1px 0' }}>CGST Amount</td>
                                <td style={{ padding: '1px 0', textAlign: 'right' }}>
                                    {calculateCGST().toFixed(2)}
                                </td>
                            </tr>
                            <tr>
                                <td style={{ padding: '1px 0' }}>SGST Amount</td>
                                <td style={{ padding: '1px 0', textAlign: 'right' }}>
                                    {calculateSGST().toFixed(2)}
                                </td>
                            </tr>
                            <tr>
                                <td style={{ padding: '1px 0' }}>Discount</td>
                                <td style={{ padding: '1px 0', textAlign: 'right' }}>
                                    {Number(sale.discount_amount).toFixed(2)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Total Amount */}
                <div className="border-b-2 border-black py-1 text-[10px] font-bold" style={{ backgroundColor: '#f0f0f0' }}>
                    <table style={{ width: '100%' }}>
                        <tbody>
                            <tr>
                                <td style={{ padding: '2px 0' }}>Total Amount</td>
                                <td style={{ padding: '2px 0', textAlign: 'right' }}>
                                    {Number(sale.total_amount).toFixed(2)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Amount in Words */}
                <div className="border-b border-gray-400 py-2 text-center text-[8px]" style={{ borderStyle: 'dashed' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>RUPEES IN WORDS</div>
                    <div>{numberToWords(Number(sale.total_amount))} ONLY</div>
                </div>

                {/* QR Code and Payment Details */}
                <div className="border-b border-gray-400 py-2" style={{ borderStyle: 'dashed' }}>
                    <table style={{ width: '100%' }}>
                        <tbody>
                            <tr>
                                <td style={{ width: '40%', verticalAlign: 'top', textAlign: 'center' }}>
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=upi://pay?pa=merchant@upi%26pn=GhorerBazar%26am=${Number(sale.total_amount).toFixed(2)}%26cu=INR`}
                                        alt="Payment QR"
                                        style={{ width: '90px', height: '90px', margin: '0 auto' }}
                                    />
                                </td>
                                <td style={{ width: '60%', verticalAlign: 'top', fontSize: '9px' }}>
                                    <table style={{ width: '100%' }}>
                                        <tbody>
                                            {sale.payments.map((payment) => (
                                                <tr key={payment.id}>
                                                    <td style={{ padding: '1px 0', textTransform: 'capitalize' }}>
                                                        {payment.method}
                                                    </td>
                                                    <td style={{ padding: '1px 0', textAlign: 'right' }}>
                                                        {Number(payment.amount).toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))}
                                            <tr>
                                                <td style={{ padding: '1px 0' }}>Paid Amount</td>
                                                <td style={{ padding: '1px 0', textAlign: 'right' }}>
                                                    {totalPaid.toFixed(2)}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style={{ padding: '1px 0' }}>Pending Amount</td>
                                                <td style={{ padding: '1px 0', textAlign: 'right' }}>
                                                    {pendingAmount.toFixed(2)}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style={{ padding: '1px 0' }}>Refund Amount</td>
                                                <td style={{ padding: '1px 0', textAlign: 'right' }}>0.00</td>
                                            </tr>
                                            <tr style={{ fontWeight: 'bold' }}>
                                                <td style={{ padding: '1px 0' }}>Balance Amount</td>
                                                <td style={{ padding: '1px 0', textAlign: 'right' }}>
                                                    {balanceAmount.toFixed(2)}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="py-2 text-center text-[9px]">
                    <p style={{ fontWeight: 'bold' }}>Thank You... Visit Again !</p>
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
                        size: 80mm auto;
                        margin: 0;
                    }
                    * {
                        print-color-adjust: exact;
                        -webkit-print-color-adjust: exact;
                    }
                }
            `}</style>
        </>
    );
}
