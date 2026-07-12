declare module 'qz-tray' {
    namespace security {
        function setCertificatePromise(callback: (resolve: (cert: string) => void, reject: (err: any) => void) => void): void;
        function setSignatureAlgorithm(algo: string): void;
        function setSignaturePromise(callback: (toSign: string) => (resolve: (signature: string) => void, reject: (err: any) => void) => void): void;
    }
    namespace websocket {
        function connect(options?: { retries?: number; delay?: number }): Promise<void>;
        function disconnect(): Promise<void>;
        function isActive(): boolean;
    }
    namespace printers {
        function find(name?: string): Promise<string[]>;
    }
    namespace configs {
        function create(printerName: string, options?: any): any;
    }
    function print(config: any, data: any[]): Promise<void>;
}
