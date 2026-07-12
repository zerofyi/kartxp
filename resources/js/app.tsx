import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { initializeTheme } from './hooks/use-appearance';
import OfflineToast from '@/components/special/offline-toast';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    resolve: (name) =>
        resolvePageComponent(
            `./pages/${name}.tsx`,
            import.meta.glob('./pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <StrictMode>
                <App {...props} />
                <OfflineToast />
            </StrictMode>,
        );
    },
    progress: {
        color: '#4B5563',
    },
});

initializeTheme();

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('/sw.js', { scope: '/' })
            .then((registration) => {
                console.info('[PWA] Service worker registered:', registration.scope);
                setInterval(() => {
                    registration.update();
                }, 60 * 60 * 1000);

                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (!newWorker) return;

                    newWorker.addEventListener('statechange', () => {
                        if (
                            newWorker.state === 'installed' &&
                            navigator.serviceWorker.controller
                        ) {
                            console.info('[PWA] New content available — will update on next load.');
                        }
                    });
                });
            })
            .catch((error) => {
                console.error('[PWA] Service worker registration failed:', error);
            });
    });
}
