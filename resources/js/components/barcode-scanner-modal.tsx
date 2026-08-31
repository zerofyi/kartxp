import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, AlertCircle } from 'lucide-react';

type Props = {
    open: boolean;
    onClose: () => void;
    onScan: (decodedText: string) => void;
};

const CONTAINER_ID = 'interactive-barcode-reader';

export default function BarcodeScannerModal({ open, onClose, onScan }: Props) {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);

    // Concurrency lock refs to prevent overlapping transitions
    const isStartingRef = useRef(false);
    const isStoppingRef = useRef(false);

    useEffect(() => {
        let isMounted = true;

        const stopScanner = async () => {
            if (isStoppingRef.current) return;
            isStoppingRef.current = true;

            // Wait if the scanner is currently in the middle of starting up
            while (isStartingRef.current) {
                await new Promise((resolve) => setTimeout(resolve, 50));
            }

            if (scannerRef.current) {
                try {
                    const scanner = scannerRef.current;
                    if (scanner.isScanning) {
                        await scanner.stop();
                    }
                    scanner.clear();
                } catch (err: any) {
                    // Suppress harmless concurrent cleanup noise
                    if (!String(err).includes('already under transition')) {
                        console.warn('Scanner cleanup warning:', err);
                    }
                } finally {
                    scannerRef.current = null;
                }
            }
            isStoppingRef.current = false;
        };

        const startScanner = async () => {
            setCameraError(null);

            if (
                window.location.protocol !== 'https:' &&
                window.location.hostname !== 'localhost' &&
                window.location.hostname !== '127.0.0.1'
            ) {
                setCameraError('Camera requires a secure HTTPS connection or localhost.');
                return;
            }

            // Ensure previous instances are completely stopped before reinitializing
            await stopScanner();

            // Wait for dialog rendering animation in DOM
            await new Promise((resolve) => setTimeout(resolve, 200));

            const container = document.getElementById(CONTAINER_ID);
            if (!container || !isMounted || !open) return;

            isStartingRef.current = true;

            try {
                const scanner = new Html5Qrcode(CONTAINER_ID, {
                    formatsToSupport: [
                        Html5QrcodeSupportedFormats.EAN_13,
                        Html5QrcodeSupportedFormats.EAN_8,
                        Html5QrcodeSupportedFormats.CODE_128,
                        Html5QrcodeSupportedFormats.CODE_39,
                        Html5QrcodeSupportedFormats.UPC_A,
                        Html5QrcodeSupportedFormats.UPC_E,
                        Html5QrcodeSupportedFormats.QR_CODE,
                    ],
                    verbose: false,
                });

                scannerRef.current = scanner;

                await scanner.start(
                    { facingMode: 'environment' },
                    { fps: 15, qrbox: { width: 260, height: 160 } },
                    (decodedText) => {
                        if (navigator.vibrate) navigator.vibrate(80);
                        onScan(decodedText);
                    },
                    () => {}
                );
            } catch (err: any) {
                if (isMounted) {
                    console.error('Camera startup error:', err);
                    if (String(err).includes('NotAllowedError') || String(err).includes('Permission denied')) {
                        setCameraError('Camera access blocked. Please check browser settings.');
                    } else if (String(err).includes('NotReadableError') || String(err).includes('TrackStartError')) {
                        setCameraError('Camera hardware is currently in use by another tab or app.');
                    } else {
                        setCameraError('Unable to access device camera.');
                    }
                }
            } finally {
                isStartingRef.current = false;
            }
        };

        if (open) {
            startScanner();
        } else {
            stopScanner();
        }

        return () => {
            isMounted = false;
            stopScanner();
        };
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="max-w-sm p-4">
                <DialogHeader className="flex flex-row items-center justify-between pb-2">
                    <DialogTitle className="text-base flex items-center gap-2">
                        <Camera className="h-4 w-4" /> Scan Product Barcode
                    </DialogTitle>
                </DialogHeader>

                {cameraError ? (
                    <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-center space-y-2">
                        <AlertCircle className="h-6 w-6 text-rose-600 mx-auto" />
                        <p className="text-xs text-rose-700 font-medium">{cameraError}</p>
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-lg border bg-black relative min-h-[260px] flex items-center justify-center">
                        <div id={CONTAINER_ID} className="w-full" />
                    </div>
                )}

                <Button variant="outline" size="sm" className="w-full mt-2" onClick={onClose}>
                    Close
                </Button>
            </DialogContent>
        </Dialog>
    );
}
