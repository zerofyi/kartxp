import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
    Barcode as BarcodeIcon,
    Printer,
    Package,
    Tag,
    AlertCircle
} from 'lucide-react';

interface Barcode {
    id: number;
    barcode: string;
    is_primary: boolean;
}

interface ProductVariant {
    id: number;
    variant_name: string;
    sku: string;
    selling_price: number;
    mrp: number;
    product: {
        name: string;
    };
    barcodes: Barcode[];
}

interface Props {
    variant: ProductVariant;
    stock: number;
}

export default function BarcodePrint({ variant, stock }: Props) {
    const [selectedBarcode, setSelectedBarcode] = useState(
        variant.barcodes.find((b) => b.is_primary)?.barcode || variant.barcodes[0]?.barcode
    );

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

    const printLabel = () => {
        if (!selectedBarcode) {
            alert('Please select a barcode');
            return;
        }

        const qty = source === 'stock' ? stock : manualQty;

        if (qty <= 0) {
            alert('Quantity must be greater than 0');
            return;
        }

        setIsProcessing(true);

        // Open print page in new window
        const params = new URLSearchParams({
            barcode: selectedBarcode,
            qty: qty.toString(),
            copies: copies.toString(),
            size: size,
            showName: showName ? '1' : '0',
            showPrice: showPrice ? '1' : '0',
            showSku: showSku ? '1' : '0',
            showMRP: showMRP ? '1' : '0',
            variant_id: variant.id.toString(),
        });

        const printUrl = `/warehouse/label/print/${variant.id}?${params.toString()}`;
        const printWindow = window.open(printUrl, '_blank', 'width=800,height=600');

        if (!printWindow) {
            alert('Please allow popups to print labels');
        }

        setTimeout(() => setIsProcessing(false), 1000);
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'Inventory', href: '/warehouse/inventory' },
            { title: 'Print Barcode', href: '#' }
        ]}>
            <Head title="Print Barcode Labels" />

            <div className="p-6">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="rounded-lg bg-emerald-100 p-3">
                            <BarcodeIcon className="h-8 w-8 text-emerald-700" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">Print Barcode Labels</h1>
                            <p className="text-sm text-gray-600">Generate and print barcode labels for products</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Left Column - Settings */}
                    <div className="space-y-6 lg:col-span-2">
                        {/* Product Info Card */}
                        <Card className="border-2 border-emerald-200 p-6">
                            <div className="mb-4 flex items-center gap-2">
                                <Package className="h-5 w-5 text-emerald-600" />
                                <h2 className="text-lg font-bold text-gray-800">Product Information</h2>
                            </div>

                            <div className="space-y-3">
                                <div className="rounded-lg bg-gray-50 p-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-xs text-gray-600">Product Name</Label>
                                            <p className="font-semibold text-gray-800">{variant.product.name}</p>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-gray-600">Variant</Label>
                                            <p className="font-semibold text-gray-800">{variant.variant_name}</p>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-gray-600">SKU</Label>
                                            <p className="font-mono text-sm text-gray-800">{variant.sku}</p>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-gray-600">Available Stock</Label>
                                            <Badge variant={stock > 0 ? 'default' : 'destructive'} className={stock > 0 ? 'bg-emerald-100 text-emerald-700' : ''}>
                                                {stock} units
                                            </Badge>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-gray-600">Selling Price</Label>
                                            <p className="font-semibold text-emerald-700">₹{variant.selling_price}</p>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-gray-600">MRP</Label>
                                            <p className="font-semibold text-gray-600">₹{variant.mrp}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Barcode Selection Card */}
                        <Card className="border-2 border-emerald-200 p-6">
                            <div className="mb-4 flex items-center gap-2">
                                <BarcodeIcon className="h-5 w-5 text-emerald-600" />
                                <h2 className="text-lg font-bold text-gray-800">Select Barcode</h2>
                            </div>

                            <div className="space-y-3">
                                <Select value={selectedBarcode} onValueChange={setSelectedBarcode}>
                                    <SelectTrigger className="border-2 border-emerald-200">
                                        <SelectValue placeholder="Select a barcode" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {variant.barcodes.map((b) => (
                                            <SelectItem key={b.id} value={b.barcode}>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono">{b.barcode}</span>
                                                    {b.is_primary && (
                                                        <Badge className="bg-emerald-100 text-emerald-700">Primary</Badge>
                                                    )}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {selectedBarcode && (
                                    <div className="rounded-lg border-2 border-dashed border-emerald-200 bg-emerald-50 p-4 text-center">
                                        <p className="mb-2 text-xs font-semibold text-emerald-700">Selected Barcode</p>
                                        <p className="font-mono text-2xl font-bold text-gray-800">{selectedBarcode}</p>
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Quantity Card */}
                        <Card className="border-2 border-emerald-200 p-6">
                            <div className="mb-4 flex items-center gap-2">
                                <Tag className="h-5 w-5 text-emerald-600" />
                                <h2 className="text-lg font-bold text-gray-800">Print Quantity</h2>
                            </div>

                            <div className="space-y-4">
                                {/* Source Selection */}
                                <div className="space-y-3">
                                    <div className="flex gap-4">
                                        <label className="flex flex-1 cursor-pointer items-center gap-3 rounded-lg border-2 border-gray-300 p-4 transition-all hover:border-emerald-500">
                                            <input
                                                type="radio"
                                                checked={source === 'stock'}
                                                onChange={() => setSource('stock')}
                                                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                                            />
                                            <div className="flex-1">
                                                <p className="font-semibold text-gray-800">Current Stock</p>
                                                <p className="text-sm text-gray-600">Print {stock} labels</p>
                                            </div>
                                        </label>

                                        <label className="flex flex-1 cursor-pointer items-center gap-3 rounded-lg border-2 border-gray-300 p-4 transition-all hover:border-emerald-500">
                                            <input
                                                type="radio"
                                                checked={source === 'manual'}
                                                onChange={() => setSource('manual')}
                                                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                                            />
                                            <div className="flex-1">
                                                <p className="font-semibold text-gray-800">Manual Quantity</p>
                                                <p className="text-sm text-gray-600">Enter custom amount</p>
                                            </div>
                                        </label>
                                    </div>

                                    {source === 'manual' && (
                                        <div>
                                            <Label className="mb-2 block text-sm font-medium">Enter Quantity</Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                className="border-2 border-emerald-200 focus:border-emerald-500"
                                                value={manualQty}
                                                onChange={(e) => setManualQty(Math.max(1, parseInt(e.target.value) || 1))}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Copies */}
                                <div>
                                    <Label className="mb-2 block text-sm font-medium">Copies per Label</Label>
                                    <div className="flex items-center gap-3">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            className="border-2 border-emerald-200"
                                            onClick={() => setCopies(Math.max(1, copies - 1))}
                                        >
                                            -
                                        </Button>
                                        <Input
                                            type="number"
                                            min="1"
                                            className="border-2 border-emerald-200 text-center focus:border-emerald-500"
                                            value={copies}
                                            onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            className="border-2 border-emerald-200"
                                            onClick={() => setCopies(copies + 1)}
                                        >
                                            +
                                        </Button>
                                    </div>
                                    <p className="mt-2 text-xs text-gray-600">
                                        Total labels: <span className="font-bold text-emerald-700">{getTotalLabels()}</span>
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Right Column - Configuration */}
                    <div className="space-y-6">
                        {/* Label Size Card */}
                        <Card className="border-2 border-emerald-200 p-6">
                            <h2 className="mb-4 text-lg font-bold text-gray-800">Label Size</h2>
                            <Select value={size} onValueChange={setSize}>
                                <SelectTrigger className="border-2 border-emerald-200">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="40x30">40 x 30 mm (Standard)</SelectItem>
                                    <SelectItem value="50x30">50 x 30 mm (Medium)</SelectItem>
                                    <SelectItem value="60x40">60 x 40 mm (Large)</SelectItem>
                                    <SelectItem value="30x20">30 x 20 mm (Small)</SelectItem>
                                </SelectContent>
                            </Select>
                        </Card>

                        {/* Print Options Card */}
                        <Card className="border-2 border-emerald-200 p-6">
                            <h2 className="mb-4 text-lg font-bold text-gray-800">Print Information</h2>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium">Product Name</Label>
                                    <Switch
                                        checked={showName}
                                        onCheckedChange={setShowName}
                                        className="data-[state=checked]:bg-emerald-600"
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium">Selling Price</Label>
                                    <Switch
                                        checked={showPrice}
                                        onCheckedChange={setShowPrice}
                                        className="data-[state=checked]:bg-emerald-600"
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium">MRP</Label>
                                    <Switch
                                        checked={showMRP}
                                        onCheckedChange={setShowMRP}
                                        className="data-[state=checked]:bg-emerald-600"
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium">SKU Code</Label>
                                    <Switch
                                        checked={showSku}
                                        onCheckedChange={setShowSku}
                                        className="data-[state=checked]:bg-emerald-600"
                                    />
                                </div>
                            </div>
                        </Card>

                        {/* Summary Card */}
                        <Card className="border-2 border-emerald-300 bg-emerald-50 p-6">
                            <h2 className="mb-4 text-lg font-bold text-emerald-900">Print Summary</h2>

                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-emerald-700">Barcode:</span>
                                    <span className="font-mono font-semibold text-emerald-900">{selectedBarcode}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-emerald-700">Quantity:</span>
                                    <span className="font-semibold text-emerald-900">
                                        {source === 'stock' ? stock : manualQty}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-emerald-700">Copies:</span>
                                    <span className="font-semibold text-emerald-900">{copies}</span>
                                </div>
                                <div className="flex justify-between border-t-2 border-emerald-300 pt-2">
                                    <span className="font-bold text-emerald-700">Total Labels:</span>
                                    <span className="text-xl font-bold text-emerald-900">{getTotalLabels()}</span>
                                </div>
                            </div>
                        </Card>

                        {/* Print Button */}
                        <Button
                            className="h-14 w-full bg-linear-to-r from-emerald-600 to-emerald-700 text-lg font-bold shadow-lg transition-all hover:from-emerald-700 hover:to-emerald-800 hover:shadow-xl"
                            onClick={printLabel}
                            disabled={isProcessing || !selectedBarcode}
                        >
                            <Printer className="mr-2 h-5 w-5" />
                            {isProcessing ? 'Opening Print Preview...' : 'Print Labels'}
                        </Button>

                        {/* Info Alert */}
                        <div className="flex gap-3 rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
                            <AlertCircle className="h-5 w-5 shrink-0 text-blue-600" />
                            <div className="text-xs text-blue-800">
                                <p className="font-semibold">Printing Tips:</p>
                                <ul className="mt-1 list-inside list-disc space-y-1">
                                    <li>Ensure thermal printer is connected</li>
                                    <li>Use correct label size paper</li>
                                    <li>Check printer settings before printing</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
