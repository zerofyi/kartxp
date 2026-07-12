export type Customer = {
    id: number;
    name: string;
    phone: string;
    address?: string;
};

export type TaxCategory = {
    name: string;
    tax_percent: number;
    type: 'inclusive' | 'exclusive';
};

export type OrderItem = {
    id: number;
    product_variant: {
        product: { name: string; tax_category: TaxCategory };
        variant_name: string;
        sku: string;
        unit: { symbol: string };
    };
    quantity: number;
    price: number;
    discount: number;
    tax_percent: number;
};

export type Payment = {
    id: number;
    method: string;
    amount: number;
};

export type Order = {
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

export interface InvoiceProps {
    order: Order;
    warehouse?: {
        name?: string;
        address?: string;
        gstin?: string;
        email?: string;
        phone?: string;
        logo_path?: string | null;
    };
    settings?: Record<string, string>;
}

export type InvoiceDesignId = 'thermal_classic' | 'thermal_modern' | 'a4_standard' | 'a4_modern';
