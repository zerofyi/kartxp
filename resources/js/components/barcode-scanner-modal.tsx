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
    const isStartingRef = useRef(false);
    const isStoppingRef = useRef(false);

    useEffect(() => {
        let isMounted = true;

        const stopScanner = async () => {
            if (isStoppingRef.current) return;
            isStoppingRef.current = true;

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
                    if (!String(err).includes('already under transition')) {
                        console.warn('Scanner stop warning:', err);
                    }
                } finally {
                    scannerRef.current = null;
                }
            }
            isStoppingRef.current = false;
        };

        const startScanner = async () => {
            setCameraError(null);

            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setCameraError('Camera API is not supported on this browser or connection is not secure (HTTPS required).');
                return;
            }

            await stopScanner();
            await new Promise((resolve) => setTimeout(resolve, 200));

            const container = document.getElementById(CONTAINER_ID);
            if (!container || !isMounted || !open) return;

            isStartingRef.current = true;

            try {
                // 1. Explicitly request camera permission to trigger system prompt
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' },
                });
                // Release temporary stream tracks so Html5Qrcode can mount cleanly
                stream.getTracks().forEach((track) => track.stop());

                if (!isMounted) return;

                // 2. Initialize and start scanner
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
                    if (String(err).includes('Permissions policy violation') || err?.name === 'SecurityError') {
                        setCameraError('Camera disabled by server Permissions-Policy. Add camera=(self) to your server headers.');
                    } else if (err?.name === 'NotAllowedError' || String(err).includes('Permission denied')) {
                        setCameraError('Camera permission denied. Allow camera in your browser site settings and reload.');
                    } else if (err?.name === 'NotReadableError' || String(err).includes('TrackStartError')) {
                        setCameraError('Camera is in use by another app or tab.');
                    } else {
                        setCameraError('Unable to start camera.');
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
                        <p className="text-xs text-rose-700 font-medium leading-relaxed">{cameraError}</p>
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
