import { Head, useForm } from '@inertiajs/react';
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Settings, Save, Eye, CheckCircle2, Cpu, AlertTriangle, RefreshCw, Printer, QrCode } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SettingsNav from './SettingsNav';

import ThermalClassic from './InvoiceTemplates/ThermalClassic';
import ThermalModern from './InvoiceTemplates/ThermalModern';
import A4Standard from './InvoiceTemplates/A4Standard';
import A4Modern from './InvoiceTemplates/A4Modern';
import { mockOrderData } from './InvoiceTemplates/MockData';
import { qzService } from '@/Services/QzService';

// Import html5-qrcode dynamically on client-side mounting context to prevent SSR errors
let Html5QrcodeScanner: any = null;

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Warehouse Settings', href: '/warehouse/settings' }];

type WarehouseProps = {
    id: number;
    name: string;
    platform: 'ghorer_bazar' | 'food_bazar' | 'mobile_bazar' | string;
    address: string;
    location: string | null;
    phone: string | null;
    email: string | null;
    logo_path: string | null;
    is_active: number;
    gstin: string | null;
    lat: number | null;
    lng: number | null;
    timezone: string;
    currency: string;
    user_id: number;
    created_at: string;
    updated_at: string;
};

type Props = {
    settings: Record<string, string>;
    warehouse: WarehouseProps;
};

type ConnectionStatus = 'inactive' | 'connecting' | 'active' | 'missing';

const MM_TO_PX = 96 / 25.4;
const A4_WIDTH_PX = 210 * MM_TO_PX;
const A4_HEIGHT_PX = 297 * MM_TO_PX;

export default function GeneralSettingsPage({ settings, warehouse }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        upi_id: '',
        low_stock_threshold: '5',
        default_tax_rate: 'GST 5% (Inclusive)',
        invoice_layout: 'thermal_classic',
        receipt_footer: '',
        auto_confirm_orders: '0',
        gst_enabled: '0',
        is_qz_enabled: '0',
        thermal_printer_name: '',
        a4_printer_name: '',
        ...settings,
    });

    const [osPrinters, setOsPrinters] = useState<string[]>([]);
    const [qzStatus, setQzStatus] = useState<ConnectionStatus>('inactive');
    const [testingPrinter, setTestingPrinter] = useState<'thermal' | 'a4' | null>(null);
    const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);

    const connectionInProgress = useRef<boolean>(false);
    const scannerRef = useRef<any>(null);

    const connectHardwareLayer = async () => {
        if (connectionInProgress.current) return;
        connectionInProgress.current = true;

        setQzStatus('connecting');
        try {
            const list = await qzService.getAvailablePrinters();
            setOsPrinters(list);
            setQzStatus('active');
        } catch (err) {
            console.error(err);
            setQzStatus('missing');
        } finally {
            connectionInProgress.current = false;
        }
    };

    const handleQzProtocolToggle = (enabled: boolean) => {
        setData('is_qz_enabled', enabled ? '1' : '0');
        if (enabled) {
            connectHardwareLayer();
        } else {
            setQzStatus('inactive');
            setOsPrinters([]);
        }
    };

    useEffect(() => {
        if (data.is_qz_enabled === '1') {
            connectHardwareLayer();
        }

        // Dynamically request client scanner script logic safely
        import('html5-qrcode').then((module) => {
            Html5QrcodeScanner = module.Html5QrcodeScanner;
        });
    }, []);

    // Monitor scanner canvas engine mount cycles
    useEffect(() => {
        if (isScannerOpen && Html5QrcodeScanner) {
            setTimeout(() => {
                scannerRef.current = new Html5QrcodeScanner(
                    "qr-reader-canvas",
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    false
                );

                scannerRef.current.render(
                    (decodedText: string) => {
                        // Extract upi string parameters safely if full URI link is parsed
                        let finalUpi = decodedText;
                        if (decodedText.startsWith('upi://pay')) {
                            const urlParams = new URLSearchParams(decodedText.replace('upi://pay?', ''));
                            finalUpi = urlParams.get('pa') || decodedText;
                        }
                        setData('upi_id', finalUpi);
                        closeQrScanner();
                    },
                    (error: any) => {
                        // Silent fail for real-time continuous frames search drops
                    }
                );
            }, 100);
        }

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch((err: any) => console.error(err));
            }
        };
    }, [isScannerOpen]);

    const closeQrScanner = () => {
        if (scannerRef.current) {
            scannerRef.current.clear().then(() => {
                setIsScannerOpen(false);
            }).catch(() => {
                setIsScannerOpen(false);
            });
        } else {
            setIsScannerOpen(false);
        }
    };

    const triggerTestPrint = async (targetType: 'thermal' | 'a4') => {
        const printerName = targetType === 'thermal' ? data.thermal_printer_name : data.a4_printer_name;
        if (!printerName) return;

        setTestingPrinter(targetType);
        try {
            await qzService.testPrint(printerName, targetType === 'thermal' ? 'thermal_classic' : 'a4_standard');
        } catch (err: any) {
            console.error(err);
        } finally {
            setTestingPrinter(null);
        }
    };

    const [previewLayout, setPreviewLayout] = useState<string | null>(null);
    const A4_PREVIEW_SCALE = 0.62;

    const invoiceWarehouse = useMemo(
        () => ({
            name: warehouse?.name ?? undefined,
            address: warehouse?.address ?? undefined,
            gstin: warehouse?.gstin ?? undefined,
            email: warehouse?.email ?? undefined,
            phone: warehouse?.phone ?? undefined,
            logo_path: warehouse?.logo_path ?? undefined,
        }),
        [warehouse],
    );

    const saveSettings = (e: React.FormEvent) => {
        e.preventDefault();
        post('/warehouse/settings');
    };

    const layouts = [
        { id: 'thermal_classic', name: 'Thermal Classic', desc: '80mm Standard Compact Roll format' },
        { id: 'thermal_modern', name: 'Thermal Modern', desc: '80mm Contemporary layout matrix' },
        { id: 'a4_standard', name: 'A4 Page Standard', desc: 'Full Tabular structural sheet' },
        { id: 'a4_modern', name: 'A4 Page Modern', desc: 'Premium minimal corporate style' },
    ];

    const taxSlabs = [0, 5, 12, 18, 28];

    const renderTemplate = (id: string) => {
        switch (id) {
            case 'thermal_classic':
                return <ThermalClassic order={mockOrderData} warehouse={invoiceWarehouse} />;
            case 'thermal_modern':
                return <ThermalModern order={mockOrderData} warehouse={invoiceWarehouse} />;
            case 'a4_standard':
                return <A4Standard order={mockOrderData} warehouse={invoiceWarehouse} />;
            case 'a4_modern':
                return <A4Modern order={mockOrderData} warehouse={invoiceWarehouse} />;
            default:
                return null;
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="General Settings — Warehouse" />
            <div className="p-6 space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Settings className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Warehouse Settings</h1>
                        <p className="text-muted-foreground">Configure system processing logic preferences and parameter boundaries</p>
                    </div>
                </div>

                <SettingsNav activeTab="general" />

                <form onSubmit={saveSettings} className="space-y-6">
                    {/* Hardware Printing Router Engine */}
                    <Card className={`overflow-hidden border-2 transition-all relative ${
                        qzStatus === 'active' ? 'border-emerald-500/30' :
                        qzStatus === 'connecting' ? 'border-amber-500/30' : 'border-muted'
                    }`}>
                        <CardHeader className="bg-muted/20 relative pb-4">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="flex items-start gap-3">
                                    <div className={`p-2 rounded-lg border mt-0.5 shadow-sm transition-colors duration-300 ${
                                        qzStatus === 'active' ? 'bg-emerald-500 text-white border-emerald-600' :
                                        qzStatus === 'connecting' ? 'bg-amber-500 text-white border-amber-600' :
                                        'bg-background text-zinc-700'
                                    }`}>
                                        <Cpu className={`h-4 w-4 ${qzStatus === 'connecting' ? 'animate-pulse' : ''}`} />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base font-bold">Hardware Printing Router Engine</CardTitle>
                                        <CardDescription className="text-xs mt-0.5">
                                            Manage network print payloads routing via localized QZ Tray secure sockets.
                                        </CardDescription>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 bg-background px-4 py-2 rounded-xl border self-start sm:self-auto shadow-sm z-10">
                                    <Label htmlFor="is_qz_enabled" className="text-xs font-bold text-foreground cursor-pointer select-none">
                                        Enable Local QZ Protocol
                                    </Label>
                                    <Switch
                                        id="is_qz_enabled"
                                        disabled={qzStatus === 'connecting'}
                                        checked={data.is_qz_enabled === '1'}
                                        onCheckedChange={handleQzProtocolToggle}
                                    />
                                </div>
                            </div>

                            {/* Premium Line Loader Infrastructure */}
                            {data.is_qz_enabled === '1' && qzStatus === 'connecting' && (
                                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-amber-100 overflow-hidden">
                                    <div className="h-full bg-amber-500 w-1/3 rounded animate-[inline-loading_1.2s_infinite_linear]"
                                         style={{ transformOrigin: 'left' }} />
                                </div>
                            )}
                            {data.is_qz_enabled === '1' && qzStatus === 'active' && (
                                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-emerald-500" />
                            )}
                        </CardHeader>

                        {data.is_qz_enabled === '1' && (
                            <CardContent className="space-y-4 pt-4 bg-card animate-fade-in">
                                {qzStatus === 'missing' && (
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3.5 bg-rose-50/60 border border-rose-100 rounded-xl text-xs text-rose-900 transition-all">
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                                            <span><strong>QZ Tray Desktop Software is not running.</strong> Please launch the local desktop print helper or download the client layer.</span>
                                        </div>
                                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                                            <Button type="button" variant="outline" size="sm" className="bg-background text-rose-700 border-rose-200 text-[11px] h-7 font-bold" onClick={() => qzService.launchLocalApp()}>Launch Client</Button>
                                            <Button type="button" size="sm" className="bg-rose-600 hover:bg-rose-700 text-white text-[11px] h-7 font-bold" onClick={connectHardwareLayer}>Retry Link</Button>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between gap-2 h-5">
                                            <Label htmlFor="thermal_printer_name" className="text-xs font-bold">Default 80mm Thermal Printer</Label>
                                            {data.thermal_printer_name && qzStatus === 'active' && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 text-[10px] font-bold text-zinc-600 px-2 border hover:bg-zinc-50 shadow-sm"
                                                    disabled={testingPrinter !== null}
                                                    onClick={() => triggerTestPrint('thermal')}
                                                >
                                                    {testingPrinter === 'thermal' ? (
                                                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                                    ) : (
                                                        <Printer className="h-3 w-3 mr-1" />
                                                    )}
                                                    {testingPrinter === 'thermal' ? 'Printing...' : 'Test Receipt'}
                                                </Button>
                                            )}
                                        </div>
                                        <Select
                                            disabled={qzStatus !== 'active' || osPrinters.length === 0}
                                            value={data.thermal_printer_name}
                                            onValueChange={(val) => setData('thermal_printer_name', val)}
                                        >
                                            <SelectTrigger id="thermal_printer_name" className="w-full h-9 shadow-sm bg-background">
                                                <SelectValue placeholder={qzStatus === 'connecting' ? "Scanning device paths..." : "Select local thermal path"} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {osPrinters.map((printer) => (
                                                    <SelectItem key={printer} value={printer}>{printer}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.thermal_printer_name && <p className="text-xs text-destructive">{errors.thermal_printer_name}</p>}
                                        <p className="text-[10px] text-muted-foreground">Used for printing receipts immediately using compact roll profiles.</p>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between gap-2 h-5">
                                            <Label htmlFor="a4_printer_name" className="text-xs font-bold">Default A4 Document Printer</Label>
                                            {data.a4_printer_name && qzStatus === 'active' && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 text-[10px] font-bold text-zinc-600 px-2 border hover:bg-zinc-50 shadow-sm"
                                                    disabled={testingPrinter !== null}
                                                    onClick={() => triggerTestPrint('a4')}
                                                >
                                                    {testingPrinter === 'a4' ? (
                                                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                                    ) : (
                                                        <Printer className="h-3 w-3 mr-1" />
                                                    )}
                                                    {testingPrinter === 'a4' ? 'Printing...' : 'Test Document'}
                                                </Button>
                                            )}
                                        </div>
                                        <Select
                                            disabled={qzStatus !== 'active' || osPrinters.length === 0}
                                            value={data.a4_printer_name}
                                            onValueChange={(val) => setData('a4_printer_name', val)}
                                        >
                                            <SelectTrigger id="a4_printer_name" className="w-full h-9 shadow-sm bg-background">
                                                <SelectValue placeholder={qzStatus === 'connecting' ? "Scanning device paths..." : "Select local document path"} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {osPrinters.map((printer) => (
                                                    <SelectItem key={printer} value={printer}>{printer}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.a4_printer_name && <p className="text-xs text-destructive">{errors.a4_printer_name}</p>}
                                        <p className="text-[10px] text-muted-foreground">Used for printing corporate statements using wide layout matrix definitions.</p>
                                    </div>
                                </div>
                            </CardContent>
                        )}
                    </Card>

                    {/* Template Selection Engine */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Invoice Template Blueprint Engine</CardTitle>
                            <CardDescription>Select your active billing layout style. Click anywhere on a card to select it, or view the preview canvas.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {layouts.map((layout) => {
                                    const isSelected = data.invoice_layout === layout.id;
                                    return (
                                        <div
                                            key={layout.id}
                                            onClick={() => setData('invoice_layout', layout.id)}
                                            className={`group relative flex flex-col justify-between p-2 rounded-xl border-2 transition-all cursor-pointer bg-card h-44 ${
                                                isSelected ? 'border-primary shadow-md' : 'border-muted hover:border-muted-foreground/20'
                                            }`}
                                        >
                                            <div className="w-full h-28 bg-zinc-50 border rounded-lg overflow-hidden relative flex justify-center items-start p-1 select-none">
                                                <div className="origin-top scale-[0.22] pointer-events-none transition-transform duration-200">
                                                    {renderTemplate(layout.id)}
                                                </div>

                                                {isSelected && (
                                                    <div className="absolute top-1.5 right-1.5 text-primary bg-background rounded-full p-0.5 z-10 shadow-sm">
                                                        <CheckCircle2 className="h-4 w-4 fill-current text-primary" />
                                                    </div>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setPreviewLayout(layout.id);
                                                    }}
                                                    className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 backdrop-blur-[1px] flex items-center justify-center transition-all z-20 rounded-lg"
                                                >
                                                    <div className="flex items-center gap-1 bg-background border px-2 py-1 rounded-md text-[11px] font-bold text-foreground shadow-sm">
                                                        <Eye className="h-3 w-3" /> Preview
                                                    </div>
                                                </button>
                                            </div>

                                            <div className="px-1 py-0.5">
                                                <h3 className="font-bold text-xs truncate text-foreground">{layout.name}</h3>
                                                <p className="text-[10px] text-muted-foreground truncate">{layout.desc}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>System Preference Registers</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* UPI Input Field With Integrated Camera Scanner Action Button */}
                                <div className="space-y-2">
                                    <Label htmlFor="upi_id">Store Merchant UPI ID</Label>
                                    <div className="flex rounded-md shadow-sm relative border focus-within:ring-1 focus-within:ring-ring focus-within:border-ring">
                                        <Input
                                            id="upi_id"
                                            type="text"
                                            placeholder="merchant@upi"
                                            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none flex-1 pr-10"
                                            value={data.upi_id ?? ''}
                                            onChange={(e) => setData('upi_id', e.target.value)}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 absolute right-0 top-0 text-zinc-500 hover:text-primary rounded-r-md"
                                            onClick={() => setIsScannerOpen(true)}
                                            title="Scan Merchant QR Code"
                                        >
                                            <QrCode className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    {errors.upi_id && <p className="text-xs text-destructive">{errors.upi_id}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="low_stock_threshold">Low Stock Alert Threshold</Label>
                                    <Input
                                        id="low_stock_threshold"
                                        type="number"
                                        value={data.low_stock_threshold ?? ''}
                                        onChange={(e) => setData('low_stock_threshold', e.target.value)}
                                    />
                                    {errors.low_stock_threshold && <p className="text-xs text-destructive">{errors.low_stock_threshold}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="default_tax_rate">Default State Tax Rate</Label>
                                    <Select value={data.default_tax_rate} onValueChange={(value) => setData('default_tax_rate', value)}>
                                        <SelectTrigger id="default_tax_rate" className="w-full">
                                            <SelectValue placeholder="Select active category slab" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {taxSlabs.map((slab) => (
                                                <React.Fragment key={slab}>
                                                    <SelectItem value={`GST ${slab}% (Inclusive)`}>GST {slab}% (Inclusive)</SelectItem>
                                                    <SelectItem value={`GST ${slab}% (Exclusive)`}>GST {slab}% (Exclusive)</SelectItem>
                                                </React.Fragment>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.default_tax_rate && <p className="text-xs text-destructive">{errors.default_tax_rate}</p>}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="receipt_footer">Invoice Receipt Footer Text</Label>
                                <Textarea
                                    id="receipt_footer"
                                    rows={3}
                                    value={data.receipt_footer ?? ''}
                                    onChange={(e) => setData('receipt_footer', e.target.value)}
                                    placeholder="Thank you for shopping with us!"
                                />
                                {errors.receipt_footer && <p className="text-xs text-destructive">{errors.receipt_footer}</p>}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex items-center justify-between p-4 bg-muted/40 rounded-xl border">
                                    <div className="space-y-0.5 pr-2">
                                        <Label htmlFor="auto_confirm_orders" className="text-sm font-semibold">Auto-Confirm Online Orders</Label>
                                        <p className="text-xs text-muted-foreground">Instantly route incoming transactions without manual confirmation approvals.</p>
                                    </div>
                                    <Switch
                                        id="auto_confirm_orders"
                                        checked={data.auto_confirm_orders === '1'}
                                        onCheckedChange={(checked) => setData('auto_confirm_orders', checked ? '1' : '0')}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-muted/40 rounded-xl border">
                                    <div className="space-y-0.5 pr-2">
                                        <Label htmlFor="gst_enabled" className="text-sm font-semibold">Enable GST Accounting Ledger Logs</Label>
                                        <p className="text-xs text-muted-foreground">Calculate transactional CGST/SGST breakdowns directly on all point-of-sale printed receipts.</p>
                                    </div>
                                    <Switch
                                        id="gst_enabled"
                                        checked={data.gst_enabled === '1'}
                                        onCheckedChange={(checked) => setData('gst_enabled', checked ? '1' : '0')}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 border-t">
                                <Button type="submit" disabled={processing}>
                                    <Save className="h-4 w-4 mr-2" />
                                    {processing ? 'Saving parameters...' : 'Save Settings'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </form>
            </div>

            {/* QR Scanner Modal Canvas Container */}
            <Dialog open={isScannerOpen} onOpenChange={(open) => !open && closeQrScanner()}>
                <DialogContent className="max-w-md p-6 bg-background rounded-xl shadow-2xl overflow-hidden">
                    <DialogHeader className="pb-4 border-b">
                        <DialogTitle className="font-bold text-base text-foreground flex items-center gap-2">
                            <QrCode className="h-5 w-5 text-primary" /> Scan Merchant QR Code
                        </DialogTitle>
                    </DialogHeader>
                    <div className="mt-4 overflow-hidden rounded-lg bg-zinc-50 border relative flex flex-col items-center justify-center p-2 min-h-[300px]">
                        <div id="qr-reader-canvas" className="w-full max-w-[320px] overflow-hidden rounded-lg font-sans" />
                        <p className="text-[11px] text-muted-foreground text-center mt-3 max-w-[260px]">
                            Align the merchant barcode display completely within the viewfinder frame parameters.
                        </p>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Layout preview dialog */}
            <Dialog open={previewLayout !== null} onOpenChange={(open) => !open && setPreviewLayout(null)}>
                <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 bg-neutral-200 border-none overflow-hidden shadow-2xl">
                    <DialogHeader className="p-4 border-b bg-background z-10 flex flex-row items-center justify-between shadow-sm">
                        <DialogTitle className="font-bold text-sm text-foreground">Layout Canvas Preview</DialogTitle>
                        <Button variant="ghost" size="sm" onClick={() => setPreviewLayout(null)} className="mr-6 text-xs font-semibold">
                            Close
                        </Button>
                    </DialogHeader>

                    <div className="flex-1 overflow-auto bg-neutral-200 p-6">
                        <div className="flex min-h-full w-full items-center justify-center">
                            {previewLayout?.startsWith('a4') ? (
                                <div style={{ width: A4_WIDTH_PX * A4_PREVIEW_SCALE, height: A4_HEIGHT_PX * A4_PREVIEW_SCALE }} className="shrink-0">
                                    <div style={{ width: A4_WIDTH_PX, height: A4_HEIGHT_PX, transform: `scale(${A4_PREVIEW_SCALE})`, transformOrigin: 'top left' }} className="bg-white shadow-2xl border overflow-hidden">
                                        {previewLayout === 'a4_standard' && <A4Standard order={mockOrderData} warehouse={invoiceWarehouse} settings={settings} />}
                                        {previewLayout === 'a4_modern' && <A4Modern order={mockOrderData} warehouse={invoiceWarehouse} settings={settings} />}
                                    </div>
                                </div>
                            ) : (
                                <div className="w-[80mm] bg-white shadow-2xl border my-4 overflow-hidden shrink-0">
                                    {previewLayout === 'thermal_classic' && <ThermalClassic order={mockOrderData} warehouse={invoiceWarehouse} settings={settings} />}
                                    {previewLayout === 'thermal_modern' && <ThermalModern order={mockOrderData} warehouse={invoiceWarehouse} settings={settings} />}
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
