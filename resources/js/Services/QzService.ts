import qz from 'qz-tray';

class QzService {
    private initialized: boolean = false;
    private connectionPromise: Promise<void> | null = null;

    /**
     * Initializes security protocols and sets up connections with the QZ Tray local client.
     */
    public async init(): Promise<void> {
        if (!this.initialized) {
            // 1. Configure production certificate retrieval
            qz.security.setCertificatePromise((resolve, reject) => {
                fetch('/api/qz/certificate')
                    .then(async (res: Response) => {
                        if (res.ok) {
                            const cert = await res.text();
                            resolve(cert);
                        } else {
                            const errText = await res.text();
                            reject(errText);
                        }
                    })
                    .catch((err: any) => reject(err));
            });

            // 2. Configure production server-side signing backend
            qz.security.setSignatureAlgorithm("SHA512");
            qz.security.setSignaturePromise((toSign: string) => {
                return (resolve, reject) => {
                    const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
                    fetch('/api/qz/sign', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': token || ''
                        },
                        body: JSON.stringify({ request: toSign })
                    })
                    .then(async (res: Response) => {
                        if (res.ok) {
                            const signature = await res.text();
                            resolve(signature);
                        } else {
                            const errText = await res.text();
                            reject(errText);
                        }
                    })
                    .catch((err: any) => reject(err));
                };
            });

            this.initialized = true;
        }

        if (qz.websocket.isActive()) return;

        // Deduplicate ongoing network connection requests to prevent thread blocking
        if (!this.connectionPromise) {
            this.connectionPromise = qz.websocket.connect({ retries: 3, delay: 1 })
                .then(async () => {
                    // Grace window to let secure handshakes stabilize completely
                    await new Promise(r => setTimeout(r, 150));
                })
                .finally(() => {
                    this.connectionPromise = null;
                });
        }
        return this.connectionPromise;
    }

    /**
     * Attempts to force launch the local desktop app client if protocol handshakes drop.
     */
    public launchLocalApp(): void {
        window.location.assign("qz:launch");
    }

    /**
     * Queries operating system hardware print drivers.
     */
    public async getAvailablePrinters(): Promise<string[]> {
        await this.init();
        return qz.printers.find();
    }

    /**
     * Disconnects the active socket connection pool cleanly.
     */
    public async disconnect(): Promise<void> {
        if (qz.websocket.isActive()) {
            await qz.websocket.disconnect();
        }
    }

    /**
     * Hardware validation utility used to test silent system connections.
     */
    public async testPrint(printerName: string, layoutType: string): Promise<void> {
        await this.init();
        const config = qz.configs.create(printerName);

        let samplePayload: any[] = [];
        if (layoutType.startsWith('thermal')) {
            samplePayload = [
                '^XA\n',
                '^FO50,50^ADN,36,20^FDKartXP Test Print^FS\n',
                '^FO50,100^ADN,18,10^FDHardware Routing Verified^FS\n',
                '^XZ\n'
            ];
        } else {
            samplePayload = [{
                type: 'pixel',
                format: 'html',
                flavor: 'plain',
                data: '<html><body style="font-family:sans-serif;padding:40px;"><h1>KartXP Print Engine Verified</h1><p>A4 Standard Hardware Mapping Check Successful.</p></body></html>'
            }];
        }
        return qz.print(config, samplePayload);
    }
}

export const qzService = new QzService();
