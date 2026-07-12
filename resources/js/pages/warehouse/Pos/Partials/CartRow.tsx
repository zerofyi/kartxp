import React from 'react';
import { Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { InvoiceItem, Product } from '../Index';

interface CartRowProps {
    item: InvoiceItem;
    onQty:    (id: number, qty: number) => void;
    onRate:   (id: number, rate: number) => void;
    onDisc:   (id: number, disc: number) => void;
    onRemove: (id: number) => void;
    productById: Map<number, Product>;
}

function truncateProductName(name: string, maxChars = 38): string {
    if (name.length <= maxChars) return name;
    const parts = name.split(' - ');
    if (parts.length === 2) {
        const [first, second] = parts;
        const avail = maxChars - second.length - 4;
        return avail > 5 ? first.substring(0, avail).trim() + '... - ' + second : '... - ' + second;
    }
    return name.substring(0, maxChars) + '...';
}

const CartRow = ({ item, onQty, onRate, onDisc, onRemove, productById }: CartRowProps) => {
    const handleQty = (raw: string) => {
        const val = Number(raw);
        if (val <= 0) { onRemove(item.id); return; }
        const product = productById.get(item.productId);
        if (product && val > product.qty) {
            toast.error('Not enough stock available!');
            return;
        }
        onQty(item.id, val);
    };

    return (
        <tr className="transition-colors hover:bg-muted/50">
            <td className="w-40 border-y border-border py-1 pl-4">
                <div className="text-sm font-medium">{truncateProductName(item.name)}</div>
                <div className="text-[10px] text-muted-foreground">
                    {item.barcode} • {item.taxType === 'inclusive' ? 'Tax Inc.' : 'Tax Exc.'}
                </div>
            </td>
            <td className="border border-border">
                <Input
                    type="number"
                    className="rounded-none border-0 bg-transparent p-0 text-center focus-visible:ring-0"
                    value={item.qty}
                    onChange={e => handleQty(e.target.value)}
                    min="1"
                />
            </td>
            <td className="border border-border">
                <Input
                    type="number"
                    className="rounded-none border-0 bg-transparent p-0 text-center focus-visible:ring-0"
                    value={item.rate}
                    onChange={e => onRate(item.id, Number(e.target.value))}
                    min="0"
                    step="0.01"
                />
            </td>
            <td className="border border-border">
                <Input className="rounded-none border-0 bg-transparent p-0 text-center" value={item.mrp} readOnly />
            </td>
            <td className="border border-border">
                <Input
                    type="number"
                    className="rounded-none border-0 bg-transparent p-0 text-center focus-visible:ring-0"
                    value={item.disc}
                    onChange={e => onDisc(item.id, Number(e.target.value))}
                    min="0"
                    step="0.01"
                />
            </td>
            <td className="border border-border">
                <Input
                    className="rounded-none border-0 bg-transparent p-0 text-center font-medium"
                    value={item.total.toFixed(2)}
                    readOnly
                />
            </td>
            <td className="border-y border-border text-center">
                <Button
                    variant="ghost"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemove(item.id)}
                >
                    <Trash2Icon className="h-4 w-4" />
                </Button>
            </td>
        </tr>
    );
};

export default React.memo(CartRow);
