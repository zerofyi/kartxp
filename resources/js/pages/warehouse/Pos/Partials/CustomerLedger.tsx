import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Customer } from '../Index';

interface CustomerLedgerProps {
    saleType: string;         setSaleType: (v: string) => void;
    customerType: string;     setCustomerType: (v: string) => void;
    customerMobile: string;   setCustomerMobile: (v: string) => void;
    customerName: string;     setCustomerName: (v: string) => void;
    customerId: string;       setCustomerId: (v: string) => void;
    currentCreditLimit: number; setCurrentCreditLimit: (v: number) => void;
    currentDueAmount: number;   setCurrentDueAmount: (v: number) => void;
    invoiceNumber: string;
    currentDate: string;
    paymentMethod: string;    setPaymentMethod: (v: string) => void;
    customers: Customer[];
    skipSearchRef: React.MutableRefObject<boolean>;
}

const CustomerLedger = ({
    saleType, setSaleType,
    customerType, setCustomerType,
    customerMobile, setCustomerMobile,
    customerName, setCustomerName,
    customerId, setCustomerId,
    currentCreditLimit, setCurrentCreditLimit,
    currentDueAmount, setCurrentDueAmount,
    invoiceNumber, currentDate,
    paymentMethod, setPaymentMethod,
    customers, skipSearchRef,
}: CustomerLedgerProps) => {
    const [showDrop, setShowDrop]       = useState(false);
    const [focusedIdx, setFocusedIdx]   = useState(-1);
    const dropRef = useRef<HTMLDivElement>(null);

    // ── Filtered customer list ───────────────────────────────────────────────
    const filteredCustomers = useMemo(() => {
        if (customerType === 'walkin' || skipSearchRef.current) return [];
        const mob  = customerMobile.toLowerCase().trim();
        const name = customerName.toLowerCase().trim();
        if (!mob && !name) return [];
        return customers.filter(c =>
            (mob  && c.phone.toLowerCase().includes(mob)) ||
            (name && c.name.toLowerCase().includes(name)),
        );
    }, [customerMobile, customerName, customerType, customers]);

    useEffect(() => {
        if (skipSearchRef.current) { setShowDrop(false); return; }
        setShowDrop(filteredCustomers.length > 0);
        setFocusedIdx(-1);
    }, [filteredCustomers]);

    // Click-outside closes dropdown
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowDrop(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleInputChange = (field: 'mobile' | 'name', val: string) => {
        skipSearchRef.current = false;
        if (field === 'mobile') setCustomerMobile(val);
        else setCustomerName(val);
    };

    const handleSelectCustomer = (c: Customer) => {
        skipSearchRef.current = true;
        setShowDrop(false);
        setFocusedIdx(-1);
        setCustomerId(String(c.id));
        setCustomerName(c.name);
        setCustomerMobile(c.phone);
        // parseFloat + fallback guards against null / string / undefined values coming from the API
        setCurrentCreditLimit(c.credit_limit != null ? parseFloat(String(c.credit_limit)) || 0 : 0);
        setCurrentDueAmount(c.due_amount  != null ? parseFloat(String(c.due_amount))  || 0 : 0);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!showDrop || filteredCustomers.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFocusedIdx(p => (p < filteredCustomers.length - 1 ? p + 1 : 0));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusedIdx(p => (p > 0 ? p - 1 : filteredCustomers.length - 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            if (focusedIdx >= 0 && focusedIdx < filteredCustomers.length) {
                handleSelectCustomer(filteredCustomers[focusedIdx]);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setShowDrop(false);
        }
    };

    const handleCustomerTypeChange = (val: string) => {
        setCustomerType(val);
        if (val === 'walkin') {
            setCustomerName('Walk-in Customer');
            setCustomerMobile('');
            setCustomerId('');
            setCurrentCreditLimit(0);
            setCurrentDueAmount(0);
        } else {
            setCustomerName('');
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="h-min-[15vh] shrink-0 border-b border-border bg-card">
            <div className="grid h-full grid-cols-3 gap-4 p-4">

                {/* Col 1 – sale type + customer search */}
                <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                        <Select value={saleType} onValueChange={setSaleType}>
                            <SelectTrigger className="w-full"><SelectValue placeholder="Sale type" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="retail">Retail</SelectItem>
                                <SelectItem value="wholesale">Wholesale</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={customerType} onValueChange={handleCustomerTypeChange}>
                            <SelectTrigger className="w-full"><SelectValue placeholder="Customer type" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="enter">Enter customer details</SelectItem>
                                <SelectItem value="walkin">Walk-in</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Customer search + autocomplete */}
                    <div className="relative w-full" ref={dropRef} onKeyDown={handleKeyDown}>
                        <div className="flex gap-2 w-full">
                            <Input
                                placeholder="Customer Mobile"
                                className="w-full"
                                value={customerMobile}
                                onChange={e => handleInputChange('mobile', e.target.value)}
                                disabled={customerType === 'walkin'}
                                autoComplete="off"
                                onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
                            />
                            <Input
                                placeholder="Customer Name"
                                className="w-full"
                                value={customerName}
                                onChange={e => handleInputChange('name', e.target.value)}
                                disabled={customerType === 'walkin'}
                                autoComplete="off"
                                onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
                            />
                        </div>

                        {showDrop && (
                            <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-md border border-input bg-popover text-popover-foreground shadow-lg">
                                {filteredCustomers.map((c, i) => (
                                    <div
                                        key={c.id}
                                        className={`cursor-pointer px-4 py-2.5 border-b border-border last:border-b-0 transition-colors flex flex-col gap-0.5
                                            ${focusedIdx === i ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/50 text-foreground'}`}
                                        onClick={() => handleSelectCustomer(c)}
                                        onMouseEnter={() => setFocusedIdx(i)}
                                    >
                                        <div className="font-medium text-sm">{c.name}</div>
                                        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                            <span className="opacity-60">📞</span> {c.phone}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Col 2 – Credit Limit + Due Balance (replaces held invoices panel from original) */}
                <div className="flex items-center justify-around border-x border-border/40 px-2 bg-muted/5 rounded-md">
                    <div className="text-center flex-1">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground/80 tracking-wide block mb-1">Credit Limit</Label>
                        {/* Number() + fallback 0 prevents .toFixed crash when API returns null/string */}
                        <span className="text-lg font-black text-emerald-600">
                            ₹{(Number(currentCreditLimit) || 0).toFixed(2)}
                        </span>
                    </div>
                    <div className="w-[1px] h-10 bg-border/60" />
                    <div className="text-center flex-1">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground/80 tracking-wide block mb-1">Due Balance</Label>
                        <span className={`text-lg font-black ${(Number(currentDueAmount) || 0) > 0 ? 'text-destructive' : 'text-foreground/30'}`}>
                            ₹{(Number(currentDueAmount) || 0).toFixed(2)}
                        </span>
                    </div>
                </div>

                {/* Col 3 – Invoice meta + payment */}
                <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Invoice Number"
                            className="w-full bg-muted/40 font-mono text-xs font-bold"
                            value={invoiceNumber}
                            readOnly
                        />
                        <Input
                            type="date"
                            className="w-full bg-muted/40 text-xs"
                            value={currentDate}
                            readOnly
                        />
                    </div>
                    <div className="flex gap-2">
                        <Input
                            placeholder="Customer ID"
                            className="w-full bg-muted/40 text-xs"
                            value={customerId}
                            readOnly
                        />
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                            <SelectTrigger className="w-full"><SelectValue placeholder="Payment method" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="cash">Cash</SelectItem>
                                <SelectItem value="upi">UPI</SelectItem>
                                <SelectItem value="card">Card</SelectItem>
                                <SelectItem value="bank">Bank Transfer</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default React.memo(CustomerLedger);
