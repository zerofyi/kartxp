import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { copyFileSync, existsSync } from 'node:fs';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

function copyManifestToRoot() {
    return {
        name: 'copy-manifest-to-root',
        closeBundle() {
            const src = 'public/build/manifest.webmanifest';
            const dest = 'public/manifest.webmanifest';
            if (existsSync(src)) {
                copyFileSync(src, dest);
            }
        },
    };
}

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            ssr: 'resources/js/ssr.tsx',
            refresh: true,
        }),
        react({
            babel: {
                plugins: ['babel-plugin-react-compiler'],
            },
        }),
        tailwindcss(),
        wayfinder({
            formVariants: true,
        }),
        VitePWA({
            registerType: 'autoUpdate',
            injectRegister: false,
            outDir: 'public',
            scope: '/',
            devOptions: {
                enabled: false,
            },

            workbox: {
                globDirectory: 'public',
                globPatterns: ['build/**/*.{js,css,woff,woff2,ttf,ico,png,svg}'],
                globIgnores: ['**/*.html', '**/sw.js', '**/workbox-*.js'],
                navigateFallback: null,

                runtimeCaching: [
                    {
                        urlPattern: ({ url }) => url.pathname.startsWith('/storage/'),
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'pos-images-v1',
                            expiration: {
                                maxEntries: 1000,
                                maxAgeSeconds: 60 * 60 * 24 * 7,
                            },
                            cacheableResponse: {
                                statuses: [0, 200],
                            },
                        },
                    },
                    {
                        urlPattern: ({ request, url }) =>
                            request.headers.get('X-Inertia') === 'true' ||
                            url.searchParams.has('_inertia'),
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'pos-inertia-v1',
                            networkTimeoutSeconds: 5,
                            cacheableResponse: {
                                statuses: [0, 200],
                            },
                        },
                    },
                    {
                        urlPattern: ({ url, sameOrigin }) =>
                            sameOrigin &&
                            !url.pathname.startsWith('/storage/') &&
                            !url.pathname.startsWith('/build/'),
                        handler: 'StaleWhileRevalidate',
                        options: {
                            cacheName: 'pos-misc-v1',
                            cacheableResponse: {
                                statuses: [0, 200],
                            },
                        },
                    },
                ],
            },
            manifest: {
                name: 'KartXP POS',
                short_name: 'KartXP POS',
                description: 'Point of Sale – KartXP',
                theme_color: '#059669',
                background_color: '#ffffff',
                display: 'standalone',
                orientation: 'landscape',
                start_url: '/warehouse/pos',
                icons: [
                    { src: '/storage/icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
                    { src: '/storage/icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
                    {
                        src: '/storage/icons/pwa-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable',
                    },
                ],
            },
        }),
        copyManifestToRoot(),
    ],

    esbuild: {
        jsx: 'automatic',
    },
});
