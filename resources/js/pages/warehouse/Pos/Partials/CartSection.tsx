import React from 'react';
import { Barcode, IndianRupee, Pause, Percent, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/special/scroll-area';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import CartRow from './CartRow';
import { InvoiceItem, Product } from '../Index';

interface Totals {
    totalItems: number;
    totalQty: number;
    totalDiscount: number;
    totalTaxAmount: number;
    totalMrp: number;
    totalBill: number;
}

interface CartSectionProps {
    barcodeInput: string;
    setBarcodeInput: (v: string) => void;
    addToCart: (v: string) => void;
    holdInvoice: () => void;
    isProcessing: boolean;
    invoiceItems: InvoiceItem[];
    onQty:    (id: number, qty: number) => void;
    onRate:   (id: number, rate: number) => void;
    onDisc:   (id: number, disc: number) => void;
    onRemove: (id: number) => void;
    productById: Map<number, Product>;
    totals: Totals;
    discountType: 'percentage' | 'amount';
    setDiscountType: (v: 'percentage' | 'amount') => void;
    overallDiscount: number;
    setOverallDiscount: (v: number) => void;
    quickPay: () => void;
}

const CartSection = ({
    barcodeInput, setBarcodeInput, addToCart, holdInvoice, isProcessing,
    invoiceItems, onQty, onRate, onDisc, onRemove, productById,
    totals, discountType, setDiscountType, overallDiscount, setOverallDiscount, quickPay,
}: CartSectionProps) => (
    <>
        {/* Barcode + Hold */}
        <div className="flex gap-4 border-b border-border p-4">
            <form
                onSubmit={e => { e.preventDefault(); if (barcodeInput.trim()) addToCart(barcodeInput.trim()); }}
                className="flex-1"
            >
                <InputGroup className="border-input">
                    <InputGroupInput
                        id="barcode-input"
                        placeholder="Scan barcode (F2)"
                        value={barcodeInput}
                        onChange={e => setBarcodeInput(e.target.value)}
                        autoFocus
                    />
                    <InputGroupAddon><Barcode /></InputGroupAddon>
                </InputGroup>
            </form>
            <Button
                className="bg-yellow-500 text-white hover:bg-yellow-600 shadow"
                onClick={holdInvoice}
                title="Hold (F4)"
                disabled={isProcessing}
            >
                <Pause /> Hold (F4)
            </Button>
        </div>

        {/* Cart table */}
        <ScrollArea className="flex-1">
            <table className="w-full text-xs">
                <thead className="sticky top-0 z-10 bg-gradient-to-r from-emerald-700 to-emerald-800 text-white">
                    <tr>
                        <th className="w-50 border-y border-emerald-600 py-2 pl-4 text-left">Product</th>
                        <th className="w-5 border border-emerald-600 px-1 text-center">Qty</th>
                        <th className="w-10 border border-emerald-600 px-1 text-center">Rate</th>
                        <th className="w-10 border border-emerald-600 px-1 text-center">MRP</th>
                        <th className="w-5 border border-emerald-600 px-1 text-center">Disc</th>
                        <th className="w-15 border border-emerald-600 px-1 text-center">Total</th>
                        <th className="w-5 border-y border-emerald-600 px-1">/</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {invoiceItems.length === 0 ? (
                        <tr>
                            <td colSpan={7} className="py-8 text-center text-muted-foreground">
                                No items added yet. Scan or click products to add.
                            </td>
                        </tr>
                    ) : invoiceItems.map(item => (
                        <CartRow
                            key={item.id}
                            item={item}
                            onQty={onQty}
                            onRate={onRate}
                            onDisc={onDisc}
                            onRemove={onRemove}
                            productById={productById}
                        />
                    ))}
                </tbody>
            </table>
        </ScrollArea>

        {/* Totals footer */}
        <div className="border-t border-border">
            <table className="w-full text-xs">
                <thead className="bg-gradient-to-r from-emerald-700 to-emerald-800 text-white">
                    <tr>
                        <th className="border-y border-emerald-600 py-2 pl-4 text-left">ITEMS</th>
                        <th className="border border-emerald-600 px-1 text-center">QTY</th>
                        <th className="border border-emerald-600 px-1 text-center">DISCOUNT</th>
                        <th className="border border-emerald-600 px-1 text-center">TAX</th>
                        <th className="border border-emerald-600 px-1 text-center">TOTAL MRP</th>
                        <th className="border-y border-emerald-600 px-1 text-center">TOTAL BILL</th>
                    </tr>
                </thead>
                <tbody>
                    <tr className="bg-muted/50 divide-x divide-border">
                        <td className="border-y border-border"><Input className="rounded-none border-0 bg-transparent p-0 text-center font-semibold" value={totals.totalItems} readOnly /></td>
                        <td className="border-y border-border"><Input className="rounded-none border-0 bg-transparent p-0 text-center font-semibold" value={totals.totalQty} readOnly /></td>
                        <td className="border-y border-border"><Input className="rounded-none border-0 bg-transparent p-0 text-center font-semibold" value={totals.totalDiscount.toFixed(2)} readOnly /></td>
                        <td className="border-y border-border"><Input className="rounded-none border-0 bg-transparent p-0 text-center font-semibold" value={totals.totalTaxAmount.toFixed(2)} readOnly /></td>
                        <td className="border-y border-border"><Input className="rounded-none border-0 bg-transparent p-0 text-center font-semibold" value={totals.totalMrp.toFixed(2)} readOnly /></td>
                        <td className="border-y border-border"><Input className="rounded-none border-0 bg-transparent p-0 text-center font-bold text-emerald-600 dark:text-emerald-400" value={`₹${totals.totalBill.toFixed(2)}`} readOnly /></td>
                    </tr>
                </tbody>
            </table>

            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/20">
                <div className="space-y-2">
                    <Label className="text-s text-muted-foreground">Overall Discount on Invoice</Label>
                    <div className="flex gap-2">
                        <div className="flex items-center gap-2 rounded-md border border-input bg-card px-3 shadow-sm">
                            <Percent className={`h-4 w-4 ${discountType === 'percentage' ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                            <Switch
                                checked={discountType === 'amount'}
                                onCheckedChange={c => setDiscountType(c ? 'amount' : 'percentage')}
                                className="data-[state=checked]:bg-emerald-600"
                            />
                            <IndianRupee className={`h-4 w-4 ${discountType === 'amount' ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                        </div>
                        <Input
                            type="number"
                            placeholder="0.00"
                            className="flex-1 font-semibold"
                            value={overallDiscount || ''}
                            onChange={e => setOverallDiscount(Number(e.target.value))}
                            min="0"
                            step="0.01"
                        />
                    </div>
                </div>
                <Button
                    className="h-14 bg-gradient-to-r from-emerald-600 to-emerald-700 text-lg font-bold text-white shadow-lg hover:from-emerald-700 hover:to-emerald-800 border-0"
                    onClick={quickPay}
                    title="Quick Pay (F9)"
                    disabled={isProcessing}
                >
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    {isProcessing ? 'PROCESSING...' : 'QUICK PAY (F9)'}
                </Button>
            </div>
        </div>
    </>
);

export default React.memo(CartSection);
