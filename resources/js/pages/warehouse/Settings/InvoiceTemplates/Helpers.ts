import type { Order, OrderItem } from './Types';

export const COMPANY_INFO = {
    name: 'GHORER BAZAR',
    tagline: 'Pure & Home-Pressed, Since the Village',
    address: 'Sadikhans Dearh, Jalangi, West Bengal - 742303',
    gstin: '19HBPPB98261Z0',
    email: 'info@kartxp.com',
    phone: '+91 98765 43210',
    upiId: 'merchant@upi',
};

/** Final line total, respecting whether tax is baked into the price or added on top. */
export function calcItemTotal(item: OrderItem): number {
    const taxType = item.product_variant.product.tax_category.type;
    const gross = item.quantity * item.price - item.discount;
    const base = Math.max(0, gross);
    if (taxType === 'inclusive') return base;
    return base + (base * item.tax_percent) / 100;
}

/** Line discount expressed as a percentage of the pre-discount line value. */
export function calcDiscountPercent(item: OrderItem): number {
    const subtotal = item.quantity * item.price;
    return subtotal > 0 ? (item.discount / subtotal) * 100 : 0;
}

export function calcTotalPaid(order: Order): number {
    return order.payments.reduce((sum, p) => sum + Number(p.amount), 0);
}

export function calcPendingAmount(order: Order): number {
    return Math.max(0, Number(order.total_amount) - calcTotalPaid(order));
}

/** Plain "1180.00" style — matches the original thermal-slip formatting. */
export function formatPlain(amount: number): string {
    return Number(amount).toFixed(2);
}

/** Indian-grouped "1,460.00" style — used on the two A4 designs for readability. */
export function formatINR(amount: number): string {
    return Number(amount).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

export function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-GB');
}

export function formatTime(iso: string): string {
    return new Date(iso)
        .toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
        .toUpperCase();
}

/** Dynamic UPI QR URL Generator utilizing store overrides */
export function upiQrUrl(order: Order, upiId?: string, storeName?: string, size = 150): string {
    const activeUpi = upiId || COMPANY_INFO.upiId;
    const activeName = (storeName || COMPANY_INFO.name).replace(/\s+/g, '');
    const data = encodeURIComponent(
        `upi://pay?pa=${activeUpi}&pn=${activeName}&am=${Number(order.total_amount).toFixed(2)}&cu=INR`,
    );
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${data}`;
}

/** Indian number-to-words (handles up to crores). Used for the legal "amount in words" line. */
export function numberToWords(num: number): string {
    const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
    const teens = [
        'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN',
        'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN',
    ];
    const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

    const n = Math.floor(num);
    if (n === 0) return 'ZERO';
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1_000) return ones[Math.floor(n / 100)] + ' HUNDRED' + (n % 100 ? ' ' + numberToWords(n % 100) : '');
    if (n < 1_00_000) return numberToWords(Math.floor(n / 1_000)) + ' THOUSAND' + (n % 1_000 ? ' ' + numberToWords(n % 1_000) : '');
    if (n < 1_00_00_000) return numberToWords(Math.floor(n / 1_00_000)) + ' LAKH' + (n % 1_00_000 ? ' ' + numberToWords(n % 1_00_00_000) : '');
    return 'AMOUNT TOO LARGE';
}
