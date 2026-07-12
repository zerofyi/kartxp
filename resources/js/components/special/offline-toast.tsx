import { WifiOff, Wifi, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/**
 * Bottom-left connectivity toast.
 * - Offline: shows immediately, stays visible until back online or manually closed.
 * - Online (after having been offline): shows a green "restored" toast for a
 *   few seconds, then auto-hides. Can also be closed manually at any time.
 */
export default function OfflineToast() {
    const [isOffline, setIsOffline] = useState(
        typeof navigator !== 'undefined' ? !navigator.onLine : false,
    );
    const [visible, setVisible] = useState(isOffline);
    const [justRestored, setJustRestored] = useState(false);
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const wasOfflineRef = useRef(isOffline);

    useEffect(() => {
        function handleOffline() {
            if (hideTimer.current) clearTimeout(hideTimer.current);
            wasOfflineRef.current = true;
            setIsOffline(true);
            setJustRestored(false);
            setVisible(true);
        }

        function handleOnline() {
            setIsOffline(false);

            // Only show the "restored" toast if we were actually offline before —
            // avoids flashing it on initial page load.
            if (wasOfflineRef.current) {
                setJustRestored(true);
                setVisible(true);

                hideTimer.current = setTimeout(() => {
                    setVisible(false);
                    setJustRestored(false);
                }, 4000);
            }

            wasOfflineRef.current = false;
        }

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
            if (hideTimer.current) clearTimeout(hideTimer.current);
        };
    }, []);

    if (!visible) return null;

    return (
        <div
            role="status"
            aria-live="polite"
            className="fixed bottom-4 left-4 z-9999 flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg animate-in fade-in slide-in-from-bottom-2"
            style={{
                backgroundColor: isOffline ? '#1f2937' : '#065f46',
                color: '#ffffff',
                minWidth: '280px',
                maxWidth: '360px',
            }}
        >
            {isOffline ? (
                <WifiOff size={20} className="shrink-0 text-red-400" />
            ) : (
                <Wifi size={20} className="shrink-0 text-green-300" />
            )}

            <div className="flex-1 text-sm leading-snug">
                {isOffline
                    ? 'You are currently offline.'
                    : 'Your internet connection was restored.'}

                {isOffline && (
                    <button
                        onClick={() => window.location.reload()}
                        className="ml-2 underline underline-offset-2 hover:text-gray-300"
                    >
                        Refresh
                    </button>
                )}
            </div>

            <button
                onClick={() => setVisible(false)}
                aria-label="Dismiss"
                className="shrink-0 rounded p-0.5 hover:bg-white/10"
            >
                <X size={16} />
            </button>
        </div>
    );
}
