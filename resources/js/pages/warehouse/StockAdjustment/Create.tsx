import React, { useState, useRef } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import axios from 'axios';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Search, Camera, ArrowLeft, Plus, Minus,
    Check, RefreshCw, X
} from 'lucide-react';
import BarcodeScannerModal from '@/components/barcode-scanner-modal';

type Batch = {
    id: number;
    batch_no: string;
    available_quantity: number;
    expiry_date: string | null;
};

type VariantItem = {
    id: number;
    product_name: string;
    variant_name: string | null;
    sku: string;
    category_name: string;
    cost_price: number;
    total_available: number;
    total_reserved: number;
    primary_barcode: string | null;
    batches: Batch[];
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Inventory', href: '/warehouse/inventory' },
    { title: 'Quick Stock Adjustment', href: '' },
];

const PRESET_REASONS = ['Damaged Item', 'Stock Audit Correction', 'Returned Goods', 'Lost / Expired'];

export default function Create() {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<VariantItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchPerformed, setSearchPerformed] = useState(false);
    const [selectedVariant, setSelectedVariant] = useState<VariantItem | null>(null);
    const [scannerOpen, setScannerOpen] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        product_variant_id: '',
        adjustment_type: 'increase' as 'increase' | 'decrease',
        quantity: '1',
        reason: '',
        batch_id: '',
    });

    const executeLookup = async (term?: string, autoSelectIfSingle = false) => {
        const query = (term !== undefined ? term : searchQuery).trim();
        if (!query) {
            setSearchResults([]);
            setSearchPerformed(false);
            return;
        }

        setIsSearching(true);
        setSearchPerformed(true);
        try {
            const res = await axios.get('/warehouse/inventory-lookup', { params: { q: query } });
            const items: VariantItem[] = res.data.data;
            setSearchResults(items);

            if (autoSelectIfSingle && items.length === 1) {
                handleSelectVariant(items[0]);
            }
        } catch (e) {
            console.error('Lookup failed:', e);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectVariant = (variant: VariantItem) => {
        setSelectedVariant(variant);
        setData('product_variant_id', variant.id.toString());
        // Pre-select if exactly 1 batch exists
        setData('batch_id', variant.batches.length === 1 ? variant.batches[0].id.toString() : '');
        setSearchResults([]);
        setSearchQuery('');
        setSearchPerformed(false);
        clearErrors();
    };

    const handleBarcodeScanned = (barcode: string) => {
        setScannerOpen(false);
        setSearchQuery(barcode);
        executeLookup(barcode, true);
    };

    const handleClearSelected = () => {
        setSelectedVariant(null);
        reset();
        setSearchPerformed(false);
        setTimeout(() => searchInputRef.current?.focus(), 100);
    };

    const handleQuickQty = (delta: number) => {
        const current = parseInt(data.quantity) || 0;
        const next = Math.max(1, current + delta);
        setData('quantity', next.toString());
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/warehouse/inventory/adjust', {
            preserveScroll: true,
            onSuccess: () => {
                if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
                handleClearSelected();
            },
        });
    };

    const selectedBatch = selectedVariant?.batches.find((b) => b.id.toString() === data.batch_id);
    const currentMax = data.adjustment_type === 'decrease' && selectedVariant
        ? (selectedBatch ? selectedBatch.available_quantity : selectedVariant.total_available)
        : undefined;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Quick Stock Adjustment" />
            <div className="max-w-lg mx-auto p-4 space-y-4 pb-20">

                {/* Top Nav Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => router.visit('/warehouse/inventory')}
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <h1 className="text-lg font-bold">Stock Adjustment</h1>
                            <p className="text-xs text-muted-foreground">Search item or scan barcode to adjust quantity</p>
                        </div>
                    </div>
                </div>

                {/* Search & Scan Control */}
                {!selectedVariant && (
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    ref={searchInputRef}
                                    className="pl-9 pr-8 text-sm h-11 font-mono"
                                    placeholder="Enter Name, SKU, or Barcode..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') executeLookup(undefined, true);
                                    }}
                                    autoFocus
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => { setSearchQuery(''); setSearchResults([]); setSearchPerformed(false); }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>

                            <Button
                                type="button"
                                className="h-11 px-4 text-xs font-semibold shrink-0"
                                onClick={() => executeLookup(undefined, true)}
                                disabled={isSearching || !searchQuery.trim()}
                            >
                                {isSearching ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Search'}
                            </Button>

                            <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="h-11 w-11 shrink-0"
                                onClick={() => setScannerOpen(true)}
                                title="Scan Barcode"
                            >
                                <Camera className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* Search Results List */}
                        {searchResults.length > 0 && (
                            <div className="divide-y rounded-lg border bg-card shadow-sm overflow-hidden">
                                {searchResults.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => handleSelectVariant(item)}
                                        className="p-3 hover:bg-muted/50 active:bg-muted cursor-pointer transition-colors flex items-center justify-between"
                                    >
                                        <div>
                                            <p className="font-semibold text-sm text-foreground">{item.product_name}</p>
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono mt-0.5">
                                                <span>{item.sku}</span>
                                                {item.variant_name && <span>· {item.variant_name}</span>}
                                                {item.primary_barcode && <span className="text-primary font-medium">· {item.primary_barcode}</span>}
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0 ml-2">
                                            <Badge variant={item.total_available > 0 ? 'secondary' : 'destructive'} className="font-mono text-xs">
                                                {item.total_available} Units
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {searchPerformed && searchResults.length === 0 && !isSearching && (
                            <p className="text-xs text-center text-muted-foreground py-4">
                                No items found matching "{searchQuery}".
                            </p>
                        )}
                    </div>
                )}

                {/* Selected Product Card */}
                {selectedVariant && (
                    <Card className="border-primary/40 bg-primary/5">
                        <CardContent className="p-3.5 flex items-start justify-between">
                            <div className="space-y-1">
                                <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                                    {selectedVariant.category_name}
                                </Badge>
                                <h3 className="font-bold text-base text-foreground leading-snug">
                                    {selectedVariant.product_name}
                                </h3>
                                <p className="text-xs text-muted-foreground font-mono">
                                    SKU: <span className="text-foreground">{selectedVariant.sku}</span>
                                    {selectedVariant.variant_name && ` · ${selectedVariant.variant_name}`}
                                </p>
                                <div className="flex gap-2 pt-1">
                                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/50 px-2 py-0.5 rounded font-mono">
                                        In Stock: {selectedVariant.total_available} Units
                                    </span>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                                onClick={handleClearSelected}
                            >
                                Change
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Adjustment Form */}
                {selectedVariant && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Type Switcher */}
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setData('adjustment_type', 'increase')}
                                className={`flex items-center justify-center gap-2 py-3 rounded-lg border text-sm font-bold transition-all ${
                                    data.adjustment_type === 'increase'
                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow'
                                        : 'bg-card text-muted-foreground hover:bg-muted/40'
                                }`}
                            >
                                <Plus className="h-4 w-4" /> Stock In (+)
                            </button>
                            <button
                                type="button"
                                onClick={() => setData('adjustment_type', 'decrease')}
                                className={`flex items-center justify-center gap-2 py-3 rounded-lg border text-sm font-bold transition-all ${
                                    data.adjustment_type === 'decrease'
                                        ? 'bg-rose-600 text-white border-rose-600 shadow'
                                        : 'bg-card text-muted-foreground hover:bg-muted/40'
                                }`}
                            >
                                <Minus className="h-4 w-4" /> Stock Out (−)
                            </button>
                        </div>
                        {errors.adjustment_type && <p className="text-xs text-rose-600">{errors.adjustment_type}</p>}

                        {/* Batch Selector */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">
                                Select Batch <span className="text-rose-500">*</span>
                            </Label>
                            {selectedVariant.batches.length === 0 ? (
                                <p className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-2 rounded border border-rose-200">
                                    No active batches found for this product in this warehouse.
                                </p>
                            ) : (
                                <Select
                                    value={data.batch_id}
                                    onValueChange={(val) => setData('batch_id', val)}
                                    required
                                >
                                    <SelectTrigger className="h-10 text-xs">
                                        <SelectValue placeholder="Choose a batch..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {selectedVariant.batches.map((b) => (
                                            <SelectItem key={b.id} value={b.id.toString()}>
                                                {b.batch_no} ({b.available_quantity} Units available)
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                            {errors.batch_id && <p className="text-xs text-rose-600">{errors.batch_id}</p>}
                        </div>

                        {/* Quantity */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <Label className="text-xs font-semibold">Quantity to Adjust (Units)</Label>
                                {currentMax !== undefined && (
                                    <span className="text-[11px] text-muted-foreground">Max: {currentMax} Units</span>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-12 w-12 text-lg shrink-0 font-bold"
                                    onClick={() => handleQuickQty(-1)}
                                >
                                    −1
                                </Button>
                                <Input
                                    type="number"
                                    min="1"
                                    max={currentMax}
                                    value={data.quantity}
                                    onChange={(e) => setData('quantity', e.target.value)}
                                    className="h-12 text-center text-xl font-bold font-mono"
                                    required
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-12 w-12 text-lg shrink-0 font-bold"
                                    onClick={() => handleQuickQty(1)}
                                >
                                    +1
                                </Button>
                            </div>
                            <div className="flex gap-1.5 pt-1">
                                {[5, 10, 25, 50].map((step) => (
                                    <Button
                                        key={step}
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        className="flex-1 h-7 text-xs font-mono"
                                        onClick={() => setData('quantity', step.toString())}
                                    >
                                        +{step}
                                    </Button>
                                ))}
                            </div>
                            {errors.quantity && <p className="text-xs text-rose-600">{errors.quantity}</p>}
                        </div>

                        {/* Reason Presets */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Reason <span className="text-rose-500">*</span></Label>
                            <div className="flex flex-wrap gap-1.5 pb-1">
                                {PRESET_REASONS.map((preset) => (
                                    <Badge
                                        key={preset}
                                        variant={data.reason === preset ? 'default' : 'outline'}
                                        className="cursor-pointer text-xs py-1"
                                        onClick={() => setData('reason', preset)}
                                    >
                                        {preset}
                                    </Badge>
                                ))}
                            </div>
                            <Textarea
                                rows={2}
                                className="text-xs resize-none"
                                placeholder="Reason details..."
                                value={data.reason}
                                onChange={(e) => setData('reason', e.target.value)}
                                required
                            />
                            {errors.reason && <p className="text-xs text-rose-600">{errors.reason}</p>}
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            className="w-full h-12 text-sm font-bold shadow-md"
                            disabled={processing || (selectedVariant.batches.length === 0 && data.adjustment_type === 'decrease')}
                        >
                            {processing ? (
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Check className="mr-2 h-4 w-4" />
                            )}
                            Commit Stock Adjustment
                        </Button>
                    </form>
                )}
            </div>

            {/* Scanner Dialog */}
            <BarcodeScannerModal
                open={scannerOpen}
                onClose={() => setScannerOpen(false)}
                onScan={handleBarcodeScanned}
            />
        </AppLayout>
    );
}
