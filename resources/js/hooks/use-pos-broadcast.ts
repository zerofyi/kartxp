import { useEffect, useRef, useMemo } from 'react';

export const POS_BROADCAST_CHANNEL = 'pos-customer-display';

export interface DisplayItem {
    id: number;
    name: string;
    qty: number;
    rate: number;
    disc: number;
    total: number;
    img: string | null;
}

export interface DisplayState {
    status: 'idle' | 'active' | 'complete';
    items: DisplayItem[];
    totalBill: number;
    totalItems: number;
    totalQty: number;
    totalDiscount: number;
    customerName: string;
    shopName: string;
    invoiceNumber: string;
    upiId: string;
    footerMessage: string;
    welcomeMessage: string;
    paymentMethod: string;
}

export const IDLE_DISPLAY_STATE: DisplayState = {
    status: 'idle',
    items: [],
    totalBill: 0,
    totalItems: 0,
    totalQty: 0,
    totalDiscount: 0,
    customerName: '',
    shopName: '',
    invoiceNumber: '',
    upiId: '',
    footerMessage: 'Thank you for shopping with us!',
    welcomeMessage: 'Welcome to our store!',
    paymentMethod: '',
};

/**
 * usePOSBroadcast
 * Broadcasts DisplayState to the customer display tab on every state change.
 * Uses a single BroadcastChannel instance (opened once, closed on unmount).
 * Falls back silently if BroadcastChannel is not supported.
 */
export function usePOSBroadcast(state: DisplayState) {
    const channelRef = useRef<BroadcastChannel | null>(null);

    useEffect(() => {
        if (typeof BroadcastChannel === 'undefined') return;
        channelRef.current = new BroadcastChannel(POS_BROADCAST_CHANNEL);
        return () => {
            channelRef.current?.close();
            channelRef.current = null;
        };
    }, []);

    useEffect(() => {
        channelRef.current?.postMessage(state);
    }, [state]);
}
