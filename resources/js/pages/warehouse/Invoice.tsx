import { Head } from '@inertiajs/react';
import React, { useState } from 'react';
import { Printer, Share2, Check, Monitor, ToggleLeft, ToggleRight } from 'lucide-react';
import A4Modern from './Settings/InvoiceTemplates/A4Modern';
import A4Standard from './Settings/InvoiceTemplates/A4Standard';
import ThermalClassic from './Settings/InvoiceTemplates/ThermalClassic';
import ThermalModern from './Settings/InvoiceTemplates/ThermalModern';
import { qzService } from '@/Services/QzService';
import qz from 'qz-tray';
import { Switch } from '@/components/ui/switch';

type Props = {
    order: any;
    warehouse: {
        name?: string;
        address?: string;
        gstin?: string;
        email?: string;
        phone?: string;
        logo_path?: string;
    };
    settings: Record<string, string>;
};

type SpoolStatus = 'idle' | 'connecting' | 'transmitting' | 'completed' | 'error';

export default function Invoice({ order, warehouse, settings }: Props) {
    const layout = settings.invoice_layout || 'thermal_classic';
    const globalQzEnabled = settings.is_qz_enabled === '1';

    // Local runtime routing toggle (defaults to global setting value)
    const [useQzRouting, setUseQzRouting] = useState<boolean>(globalQzEnabled);
    const [spoolStatus, setSpoolStatus] = useState<SpoolStatus>('idle');
    const [copied, setCopied] = useState(false);

    const targetPrinter = layout.startsWith('thermal')
        ? (settings.thermal_printer_name || '')
        : (settings.a4_printer_name || '');

    const handlePrintTrigger = async () => {
        // Evaluate local user runtime selection toggle instead of hard-locked global config properties
        if (useQzRouting && targetPrinter) {
            setSpoolStatus('connecting');
            try {
                await qzService.init();
                setSpoolStatus('transmitting');

                const rawHtmlContent = document.getElementById('kartxp-print-viewport')?.innerHTML || '';
                const config = qz.configs.create(targetPrinter, { scaleContent: false });
                const renderWidthInches = layout.startsWith('thermal') ? 3.15 : 8.27;

                const payload = [{
                    type: 'pixel',
                    format: 'html',
                    flavor: 'plain',
                    data: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:0;background:#fff;width:100%;}</style></head><body>${rawHtmlContent}</body></html>`,
                    options: {
                        pageWidth: renderWidthInches,
                        density: 300,
                        fallbackDensity: 203
                    }
                }];

                await qz.print(config, payload);
                setSpoolStatus('completed');

                setTimeout(() => setSpoolStatus('idle'), 1500);
            } catch (err: any) {
                console.error("QZ print pipeline failed, routing browser printing fallback:", err);
                triggerBrowserFallback();
            }
        } else {
            triggerBrowserFallback();
        }
    };

    const triggerBrowserFallback = () => {
        setSpoolStatus('error');
        window.print();
        setSpoolStatus('idle');
    };

    const handleShareTrigger = async () => {
        const shareData = {
            title: `Invoice ${order.order_number}`,
            text: `Invoice details for Order #${order.order_number} at ${warehouse.name || 'KartXP'}.`,
            url: window.location.href,
        };

        if (navigator.share && navigator.canShare?.(shareData)) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.warn('Share dropped, copying text:', err);
                copyToClipboard();
            }
        } else {
            copyToClipboard();
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const renderLayout = () => {
        switch (layout) {
            case 'thermal_classic': return <ThermalClassic order={order} warehouse={warehouse} settings={settings} />;
            case 'thermal_modern':  return <ThermalModern  order={order} warehouse={warehouse} settings={settings} />;
            case 'a4_standard':     return <A4Standard     order={order} warehouse={warehouse} settings={settings} />;
            case 'a4_modern':       return <A4Modern       order={order} warehouse={warehouse} settings={settings} />;
            default:                return <ThermalClassic order={order} warehouse={warehouse} settings={settings} />;
        }
    };

    return (
        <>
            <Head title={`Print Invoice — ${order.order_number}`} />

            {spoolStatus !== 'idle' && spoolStatus !== 'error' && (
                <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center font-sans print:hidden">
                    <div className="p-6 max-w-sm w-full bg-card border rounded-xl shadow-xl flex flex-col items-center space-y-4">
                        <div className="w-full h-1 bg-muted rounded-full overflow-hidden relative">
                            {(spoolStatus === 'connecting' || spoolStatus === 'transmitting') && (
                                <div className="h-full bg-primary w-1/3 rounded animate-inline-loading" />
                            )}
                            {spoolStatus === 'completed' && <div className="h-full bg-emerald-500 w-full" />}
                        </div>
                        <div className="text-center space-y-1">
                            <h3 className="text-sm font-bold text-foreground">Hardware Print Routing Engine</h3>
                            <p className="text-xs text-muted-foreground">
                                {spoolStatus === 'connecting' && 'Opening secure web sockets connection...'}
                                {spoolStatus === 'transmitting' && `Streaming matrix payloads to [${targetPrinter}]...`}
                                {spoolStatus === 'completed' && 'Print jobs committed successfully!'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div id="kartxp-print-viewport" className="invoice-print-wrapper bg-white text-black min-h-screen">
                {renderLayout()}
            </div>

            {/* FLOATING CONTROL COMPONENT BAR LAYER CONTROLS */}
            <div className="fixed bottom-6 right-6 flex items-center gap-3 z-50 print:hidden font-sans bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md border border-white/20 dark:border-zinc-800/50 p-1.5 pl-3 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.08)]">

    {/* Shadcn Switch Router Integration */}
    <div className="flex items-center gap-2 select-none">
        <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
            QZ Silent
        </span>
        <Switch
            id="qz-routing-mode"
            checked={useQzRouting}
            onCheckedChange={setUseQzRouting}
            className="data-[state=checked]:bg-emerald-500 scale-90"
        />
    </div>

    <div className="h-4 w-[1px] bg-zinc-200 dark:bg-zinc-800" />

    {/* Share Trigger */}
    <button
        type="button"
        onClick={handleShareTrigger}
        className="flex items-center justify-center p-2 h-8 rounded-lg border border-zinc-200/60 dark:border-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-800 bg-transparent text-zinc-700 dark:text-zinc-300 transition-all active:scale-95"
        title="Share Link"
    >
        {copied ? (
            <Check className="h-4 w-4 text-emerald-500" />
        ) : (
            <Share2 className="h-4 w-4" />
        )}
    </button>

    {/* Primary Print Trigger */}
    <button
        type="button"
        onClick={handlePrintTrigger}
        className={`flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold text-white shadow-sm transition-all active:scale-95 ${
            useQzRouting
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/10'
                : 'bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white'
        }`}
    >
        <Printer className="h-3.5 w-3.5" />
        <span>Print</span>
    </button>
</div>
        </>
    );
}
