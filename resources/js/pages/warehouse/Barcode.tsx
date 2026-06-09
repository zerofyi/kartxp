import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Barcode as BarcodeIcon, Printer, Package, Tag, AlertCircle, Layers } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface Barcode { id: number; barcode: string; is_primary: boolean; }
interface ProductVariant { id: number; variant_name: string; sku: string; selling_price: number; mrp: number; product: { name: string; }; barcodes: Barcode[]; }
interface Props { variant: ProductVariant; stock: number; }

export default function BarcodeSetupConsolePage({ variant, stock }: Props) {
    const [selectedBarcode, setSelectedBarcode] = useState(variant.barcodes.find(b => b.is_primary)?.barcode || variant.barcodes[0]?.barcode || '');
    const [copies, setCopies] = useState(1);
    const [source, setSource] = useState<'stock' | 'manual'>('stock');
    const [manualQty, setManualQty] = useState(1);
    const [size, setSize] = useState('40x30');

    const [showName, setShowName] = useState(true);
    const [showPrice, setShowPrice] = useState(true);
    const [showSku, setShowSku] = useState(false);
    const [showMRP, setShowMRP] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const getTotalLabels = () => {
        const qty = source === 'stock' ? stock : manualQty;
        return qty * copies;
    };

    const triggerPrintWindow = () => {
        if (!selectedBarcode) return alert('Select or append target barcode values prior to labeling execution runs.');
        const qty = source === 'stock' ? stock : manualQty;
        if (qty <= 0) return alert('Label execution units count bounds invalid.');

        setIsProcessing(true);

        const params = new URLSearchParams({
            barcode: selectedBarcode,
            qty: qty.toString(),
            copies: copies.toString(),
            size: size,
            showName: showName ? '1' : '0',
            showPrice: showPrice ? '1' : '0',
            showSku: showSku ? '1' : '0',
            showMRP: showMRP ? '1' : '0',
        });

        const printWindow = window.open(`/warehouse/label/print/${variant.id}?${params.toString()}`, '_blank', 'width=900,height=700');
        if (!printWindow) alert('Allow popups within browser execution parameters contexts to prompt system thermal preview screens.');

        setTimeout(() => setIsProcessing(false), 800);
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Inventory', href: '/warehouse/inventory' }, { title: 'Label Configuration Console', href: '#' }]}>
            <Head title="Configure Sticker Label Matrices" />
            <div className="p-6 space-y-6">

                {/* Heading blocks */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Thermal Printing Command Console</h1>
                        <p className="text-muted-foreground">Adjust dimensional sticker sheets parameters, information metadata text flags, and loop scaling copies</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

                    {/* Settings Form Stack */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="p-6 space-y-4">
                            <div className="flex items-center gap-2 font-bold text-sm text-foreground/80"><Package className="h-4 w-4 text-emerald-600" /> Target Inventory Product Profile Attributes</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/30 p-4 border rounded-xl text-xs font-mono">
                                <div><span className="text-muted-foreground block">Master Title Description:</span><span className="font-sans font-bold text-sm text-foreground">{variant.product.name}</span></div>
                                <div><span className="text-muted-foreground block">Style Config Name:</span><span className="font-sans font-bold text-sm text-foreground">{variant.variant_name || 'Standard Base Configuration'}</span></div>
                                <div><span className="text-muted-foreground block">Manufacturer SKU Ref:</span><span className="text-foreground font-semibold">{variant.sku}</span></div>
                                <div><span className="text-muted-foreground block">Warehouse Available Units Count:</span><Badge variant={stock > 0 ? "default" : "destructive"}>{stock} units in-stock</Badge></div>
                            </div>

                            <Separator className="my-2" />

                            <div className="space-y-3">
                                <Label className="text-xs font-bold flex items-center gap-1.5"><BarcodeIcon className="h-3.5 w-3.5 text-primary" /> Active Target Barcode Signature Identification</Label>
                                <Select value={selectedBarcode} onValueChange={setSelectedBarcode}>
                                    <SelectTrigger className="h-10 border-2 border-emerald-100"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {variant.barcodes.map(b => (
                                            <SelectItem key={b.id} value={b.barcode} className="font-mono text-xs font-bold">{b.barcode} {b.is_primary ? '(Primary Master Code)' : ''}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </Card>

                        {/* Prints Quantity Multipliers Config Blocks */}
                        <Card className="p-6 space-y-4">
                            <div className="flex items-center gap-2 font-bold text-sm text-foreground/80"><Tag className="h-4 w-4 text-emerald-600" /> Label Allocation Volume Matrix Loops</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <label className={`flex flex-col gap-1 border-2 p-4 rounded-xl cursor-pointer transition-all ${source === 'stock' ? 'border-emerald-600 bg-emerald-50/20' : 'border-muted'}`}>
                                    <input type="radio" name="src" className="sr-only" checked={source === 'stock'} onChange={() => setSource('stock')} />
                                    <span className="font-bold text-sm text-foreground">Sync Warehouse Units Count</span>
                                    <span className="text-xs text-muted-foreground">Print exact matched available counts ({stock} labels)</span>
                                </label>
                                <label className={`flex flex-col gap-1 border-2 p-4 rounded-xl cursor-pointer transition-all ${source === 'manual' ? 'border-emerald-600 bg-emerald-50/20' : 'border-muted'}`}>
                                    <input type="radio" name="src" className="sr-only" checked={source === 'manual'} onChange={() => setSource('manual')} />
                                    <span className="font-bold text-sm text-foreground">Manual Discrete Quantity</span>
                                    <span className="text-xs text-muted-foreground">Provide standalone print run allocations</span>
                                </label>
                            </div>

                            {source === 'manual' && (
                                <div className="space-y-1.5 pt-2">
                                    <Label className="text-xs font-semibold">Custom Labels Volume Count</Label>
                                    <Input type="number" min="1" className="h-9" value={manualQty} onChange={e => setManualQty(Math.max(1, parseInt(e.target.value) || 1))} />
                                </div>
                            )}

                            <div className="space-y-1.5 pt-2">
                                <Label className="text-xs font-semibold">Sticker Duplication Multiplier Copies (Per Item)</Label>
                                <Input type="number" min="1" className="h-9 font-mono font-bold" value={copies} onChange={e => setCopies(Math.max(1, parseInt(e.target.value) || 1))} />
                            </div>
                        </Card>
                    </div>

                    {/* Right Parameters Sidebar Context Flags Column */}
                    <div className="space-y-6">
                        <Card className="p-6 space-y-4">
                            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Thermal Dimensional Sticker Sheets Size</div>
                            <Select value={size} onValueChange={setSize}>
                                <SelectTrigger className="h-10 border-2 border-emerald-100"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="40x30">40mm x 30mm (Standard Layout Size)</SelectItem>
                                    <SelectItem value="50x30">50mm x 30mm (Medium Layout Size)</SelectItem>
                                    <SelectItem value="60x40">60mm x 40mm (Large Asset Sticker)</SelectItem>
                                    <SelectItem value="30x20">30mm x 20mm (Small Component Size)</SelectItem>
                                </SelectContent>
                            </Select>
                        </Card>

                        <Card className="p-6 space-y-4">
                            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Render Metadata Flags</div>
                            <div className="space-y-3 font-medium text-xs text-foreground/80">
                                <div className="flex items-center justify-between"><span>Display Product Title String Description</span><Switch checked={showName} onCheckedChange={setShowName} /></div>
                                <div className="flex items-center justify-between"><span>Display Retail Selling Price Value</span><Switch checked={showPrice} onCheckedChange={setShowPrice} /></div>
                                <div className="flex items-center justify-between"><span>Display Base Catalog MRP Bounds</span><Switch checked={showMRP} onCheckedChange={setShowMRP} /></div>
                                <div className="flex items-center justify-between"><span>Display Manufacturer SKU Serial String Code</span><Switch checked={showSku} onCheckedChange={setShowSku} /></div>
                            </div>
                        </Card>

                        {/* Real-time Summary Checkouts Panel */}
                        <Card className="bg-gradient-to-br from-emerald-800 to-teal-900 border-0 p-5 text-white space-y-3 font-mono text-xs">
                            <div className="text-xs uppercase font-sans font-bold tracking-wider text-emerald-200">Execution Output Summary</div>
                            <div className="flex justify-between border-b border-white/10 pb-1.5"><span>Target Barcode Signature:</span><span className="font-bold text-sm text-emerald-100">{selectedBarcode || 'None Selected'}</span></div>
                            <div className="flex justify-between border-b border-white/10 pb-1.5"><span>Base Unique Items:</span><span>{source === 'stock' ? stock : manualQty} items</span></div>
                            <div className="flex justify-between border-b border-white/10 pb-1.5"><span>Duplication Loops Rate:</span><span>x {copies} loops</span></div>
                            <div className="flex justify-between font-sans pt-1 font-black text-white text-base"><span>Gross Labels Rendered:</span><span className="font-mono text-xl text-yellow-300">{getTotalLabels()} stickers</span></div>
                        </Card>

                        <Button className="w-full h-12 bg-linear-to-r from-emerald-600 to-teal-700 text-sm font-bold shadow-md hover:shadow-lg hover:from-emerald-700" onClick={triggerPrintWindow} disabled={isProcessing || !selectedBarcode}>
                            <Printer className="mr-2 h-4 w-4" /> {isProcessing ? 'Compiling sticker layouts...' : 'Initialize Thermal preview print run'}
                        </Button>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
