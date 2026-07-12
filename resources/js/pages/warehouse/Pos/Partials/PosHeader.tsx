import React, { useCallback, useState } from 'react';
import { router } from '@inertiajs/react';
import { Maximize, Minimize, Monitor, RefreshCw, Cpu, Printer, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppLogoIcon from '@/components/app-logo-icon';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface Warehouse {
    id: number;
    name: string;
    logo_path?: string;
    location?: string;
}

interface PosHeaderProps {
    isBustingCache: boolean;
    handleResetCache: () => void;
    warehouse: Warehouse;
    isQZReady: boolean;
    qzStatus: 'active' | 'connecting' | 'missing' | 'inactive';
    settings: any;
    onOpenDisplay: () => void;
}

const PosHeader = ({
    isBustingCache,
    handleResetCache,
    warehouse,
    isQZReady,
    qzStatus,
    settings,
    onOpenDisplay
}: PosHeaderProps) => {

    const [isFullscreen, setIsFullscreen] = React.useState(false);
    const [isConfigOpen, setIsConfigOpen] = useState(false);

    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
            setIsFullscreen(true);
        } else {
            document.exitFullscreen().catch(() => {});
            setIsFullscreen(false);
        }
    }, []);

    React.useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    const [hasImageError, setHasImageError] = useState<boolean>(false);
    const showFallbackLogo = !warehouse?.logo_path || hasImageError;

    return (
        <div className="flex w-full items-center justify-between bg-primary p-2 px-4 text-primary-foreground shadow-md select-none shrink-0 z-10">
            <div
                className="flex items-center gap-2 text-3xl font-bold cursor-pointer hover:opacity-90 active:scale-[0.99] transition-all"
                onClick={() => router.visit('/warehouse/sales')}
            >
                {warehouse?.logo_path && !hasImageError && (
                    <img
                        src={warehouse.logo_path.startsWith('data:') ? warehouse.logo_path : `/storage/${warehouse.logo_path}`}
                        className="size-9 aspect-square p-1 object-contain rounded-md bg-sidebar-primary text-sidebar-primary-foreground border border-white/10"
                        alt={`${warehouse?.name || 'Warehouse'} Logo`}
                        decoding="async"
                        onError={() => setHasImageError(true)}
                    />
                )}
                {showFallbackLogo && (
                    <div className="flex aspect-square size-9 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground p-1 border border-white/10 shadow-inner">
                        <AppLogoIcon className="size-full fill-current text-white" />
                    </div>
                )}
                <span className="tracking-tight capitalize font-bold select-text">
                    {(warehouse?.name || 'KartXP').toLowerCase()}
                </span>
            </div>

            <div className="flex items-center gap-2">
                <Button
                    size="sm"
                    variant="secondary"
                    className="bg-primary-foreground/10 text-primary-foreground border border-primary-foreground/20 hover:bg-primary-foreground/20 transition-all flex items-center gap-2 shadow"
                    onClick={onOpenDisplay}
                >
                    <Monitor className="h-4 w-4" />
                    Customer Display
                </Button>

                <Button
                    size="sm"
                    variant="secondary"
                    className="bg-primary-foreground/10 text-primary-foreground border border-primary-foreground/20 hover:bg-primary-foreground/20 transition-all flex items-center gap-2 shadow"
                    onClick={toggleFullscreen}
                >
                    {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                    {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                </Button>

                <Button
                    size="sm"
                    variant="secondary"
                    className="bg-primary-foreground/10 text-primary-foreground border border-primary-foreground/20 hover:bg-primary-foreground/20 transition-all flex items-center gap-2 shadow"
                    onClick={handleResetCache}
                    disabled={isBustingCache}
                >
                    <RefreshCw className={`h-4 w-4 ${isBustingCache ? 'animate-spin' : ''}`} />
                    {isBustingCache ? 'Resetting...' : 'Reset Cache'}
                </Button>

                {/* Interactive Status Indicator Button */}
                <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setIsConfigOpen(true)}
                    className="bg-primary-foreground/10 text-primary-foreground border border-primary-foreground/20 hover:bg-primary-foreground/20 transition-all flex items-center gap-2 shadow"
                >
                    <div className={`h-2 w-2 rounded-full transition-all duration-300 ${
                        qzStatus === 'active' ? 'bg-emerald-300 animate-pulse' :
                        qzStatus === 'connecting' ? 'bg-amber-300 animate-spin' :
                        qzStatus === 'missing' ? 'bg-rose-400' : 'bg-primary-foreground/30'
                    }`} />
                    <span className="font-semibold text-[11px] tracking-wide text-primary-foreground">
                        {qzStatus === 'active' && 'Link Active'}
                        {qzStatus === 'connecting' && 'Binding Sockets...'}
                        {qzStatus === 'missing' && 'Daemon Offline'}
                        {qzStatus === 'inactive' && 'QZ Protocol Disabled'}
                    </span>
                </Button>
            </div>

            {/* Config Viewport Drawer Modal */}
            <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
                <DialogContent className="max-w-md p-5 bg-card text-card-foreground rounded-xl shadow-2xl border border-border">
                    <DialogHeader className="pb-3 border-b border-border flex flex-row items-center gap-2.5">
                        <div className="p-1.5 bg-muted rounded-lg border border-border mt-1">
                            <Cpu className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                            <DialogTitle className="font-bold text-base text-foreground">Print Router Management</DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">Monitor device endpoints and routing structures in real-time.</DialogDescription>
                        </div>
                    </DialogHeader>

                    <div className="space-y-4 pt-3">
                        <div className={`p-3 rounded-xl border flex items-center gap-3 transition-colors duration-200 ${
                            qzStatus === 'active' ? 'bg-hardware-active-bg border-hardware-active-border text-hardware-active-text' :
                            qzStatus === 'connecting' ? 'bg-hardware-connecting-bg border-hardware-connecting-border text-hardware-connecting-text' :
                            'bg-hardware-missing-bg border-hardware-missing-border text-hardware-missing-text'
                        }`}>
                            {qzStatus === 'active' && <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />}
                            {qzStatus === 'connecting' && <RefreshCw className="h-5 w-5 text-amber-600 animate-spin shrink-0" />}
                            {(qzStatus === 'missing' || qzStatus === 'inactive') && <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0" />}

                            <div className="text-xs flex-1">
                                <div className="font-bold">
                                    {qzStatus === 'active' && 'QZ Tray Socket Layer Connected'}
                                    {qzStatus === 'connecting' && 'Establishing Secure Protocols...'}
                                    {qzStatus === 'missing' && 'Local Print Daemon Not Found'}
                                    {qzStatus === 'inactive' && 'QZ Matrix Disabled'}
                                </div>
                                <div className="text-[11px] opacity-90 mt-0.5">
                                    {qzStatus === 'active' && 'Hardware pathways verified. Printing payload commands will route silently.'}
                                    {qzStatus === 'connecting' && 'Handshaking operating system devices interface vectors.'}
                                    {qzStatus === 'missing' && 'Ensure your QZ Tray desktop app application window is running locally.'}
                                    {qzStatus === 'inactive' && 'Enable localized protocol settings under general settings config logs.'}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2.5 bg-muted/50 p-3 rounded-xl border border-border text-xs">
                            <div className="font-bold text-muted-foreground text-[10px] tracking-wider uppercase mb-1">Active Hardware Blueprint Targets</div>

                            <div className="flex items-center justify-between border-b border-border pb-1.5">
                                <span className="text-muted-foreground flex items-center gap-1.5"><Printer className="h-3.5 w-3.5" /> Thermal Pipeline</span>
                                <code className="bg-background border border-border px-1.5 py-0.5 rounded font-mono text-[11px] max-w-[180px] truncate text-foreground">
                                    {settings?.thermal_printer_name || 'Not Configured'}
                                </code>
                            </div>

                            <div className="flex items-center justify-between border-b border-border pb-1.5 pt-0.5">
                                <span className="text-muted-foreground flex items-center gap-1.5"><Printer className="h-3.5 w-3.5" /> A4 Document Stream</span>
                                <code className="bg-background border border-border px-1.5 py-0.5 rounded font-mono text-[11px] max-w-[180px] truncate text-foreground">
                                    {settings?.a4_printer_name || 'Not Configured'}
                                </code>
                            </div>

                            <div className="flex items-center justify-between pt-0.5">
                                <span className="text-muted-foreground flex items-center gap-1.5"><Monitor className="h-3.5 w-3.5" /> Selected Layout Blueprint</span>
                                <span className="font-semibold text-foreground capitalize">
                                    {(settings?.invoice_layout || 'thermal_classic').replace('_', ' ')}
                                </span>
                            </div>
                        </div>

                        <div className="text-[10px] text-muted-foreground leading-relaxed text-center px-4">
                            To fine-tune or reconfigure default hardware pathways, navigate directly to the <span className="font-semibold text-foreground">Warehouse Settings Panel</span> block canvas configuration engine.
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default React.memo(PosHeader);
