import type { Order } from './Types';

export const mockOrderData: Order = {
    id: 1,
    order_number: 'TXP-2026-9912',
    subtotal: 1300.0, // sum of qty * price across items: 1000 + 300
    tax_amount: 210.0, // sum of per-item tax: 180 + 30
    discount_amount: 50.0, // sum of per-item discount: 0 + 50
    total_amount: 1460.0, // subtotal - discount + tax: 1300 - 50 + 210
    created_at: new Date().toISOString(),
    customer: {
        id: 101,
        name: 'Sayan Pramanik',
        phone: '+91 9876543210',
        address: 'Jalangi, Murshidabad, WB',
    },
    items: [
        {
            id: 1,
            quantity: 2,
            price: 500.0,
            discount: 0,
            tax_percent: 18,
            product_variant: {
                variant_name: 'Premium Pack (1L)',
                sku: 'GB-MO-1L',
                unit: { symbol: 'BTL' },
                product: {
                    name: 'Pure Kachi Ghani Mustard Oil',
                    tax_category: { name: 'GST 18%', tax_percent: 18, type: 'exclusive' },
                },
            },
        },
        {
            id: 2,
            quantity: 1,
            price: 300.0,
            discount: 50.0,
            tax_percent: 12,
            product_variant: {
                variant_name: 'Mason Jar (400g)',
                sku: 'GB-PK-400',
                unit: { symbol: 'JAR' },
                product: {
                    name: 'Sun-Dried Mango Pickle',
                    tax_category: { name: 'GST 12%', tax_percent: 12, type: 'exclusive' },
                },
            },
        },
    ],
    payments: [
        { id: 1, method: 'UPI', amount: 1000.0 },
        { id: 2, method: 'Cash', amount: 460.0 },
    ],
};
