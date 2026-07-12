import { Head, useForm, router } from '@inertiajs/react';
import { Settings, Plus, Truck, Trash2, MapPin, Radio, Maximize2, Minimize2, Navigation, Crosshair, X } from 'lucide-react';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import SettingsNav from './SettingsNav';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Warehouse Settings', href: '/warehouse/settings' }];

type ShippingZone = {
    id: number;
    name: string;
    pincodes: string[] | string | null;
    radius_km: number | null;
    charge: number;
    free_above: number | null;
    is_active: boolean;
};

type WarehouseCoords = {
    id: number;
    lat: number | null;
    lng: number | null;
};

type Props = {
    zones: ShippingZone[];
    warehouse: WarehouseCoords;
};

const DEFAULT_LAT = 24.1833;
const DEFAULT_LNG = 88.4333;

// Theme color used for map drawing (Leaflet renders to a <canvas>/SVG layer, so it
// cannot read CSS variables directly — we resolve the app's `--primary` token to an
// actual color once, instead of hardcoding a hex value).
function resolveThemeColor(cssVar: string, fallbackHex: string): string {
    if (typeof window === 'undefined') return fallbackHex;
    const raw = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
    if (!raw) return fallbackHex;
    // Tailwind v4 / shadcn themes usually store this as an `oklch(...)` or raw value already
    // usable in CSS. Wrap bare "h s% l%" triples (legacy HSL convention) in hsl() for Leaflet/Canvas.
    if (/^\d/.test(raw)) return `hsl(${raw})`;
    return raw;
}

export default function ShippingZonesPage({ zones, warehouse }: Props) {
    const [showZoneDialog, setShowZoneDialog] = useState(false);
    const [editZone, setEditZone] = useState<ShippingZone | null>(null);
    const [activeStrategy, setActiveStrategy] = useState<'pincode' | 'radius'>('pincode');
    const [isMapFullscreen, setIsMapFullscreen] = useState(false);
    const [zoneToDelete, setZoneToDelete] = useState<ShippingZone | null>(null);
    const [leafletReady, setLeafletReady] = useState(false);

    const [mapLat, setMapLat] = useState<number>(Number(warehouse?.lat ?? DEFAULT_LAT));
    const [mapLng, setMapLng] = useState<number>(Number(warehouse?.lng ?? DEFAULT_LNG));
    const [isLocating, setIsLocating] = useState(false);

    const mapRef = useRef<any>(null);
    const markerRef = useRef<any>(null);
    const circleRef = useRef<any>(null);
    const themeColorRef = useRef<string>('#4f46e5');
    const mapWrapperRef = useRef<HTMLDivElement | null>(null);
    const fullscreenWrapperRef = useRef<HTMLDivElement | null>(null);
    // The actual Leaflet mount node, created once in JS and re-parented between
    // the inline/fullscreen wrapper slots. Using a node we hold a direct
    // reference to (instead of document.getElementById) removes the race where
    // Leaflet could try to init before React had painted the wrapper div.
    const mapNodeRef = useRef<HTMLDivElement | null>(null);
    if (!mapNodeRef.current && typeof document !== 'undefined') {
        const node = document.createElement('div');
        node.style.position = 'absolute';
        node.style.inset = '0';
        node.style.cursor = 'grab';
        node.style.touchAction = 'none';
        node.style.zIndex = '0';
        mapNodeRef.current = node;
    }

    const { data, setData, processing, errors, reset, clearErrors } = useForm({
        name: '',
        pincodes: '',
        radius_km: '',
        charge: '0',
        free_above: '',
        is_active: true,
    });

    // ---------------------------------------------------------------------
    // Leaflet script/style loading (guards against the map being requested
    // before the CDN assets have finished loading, and avoids re-injecting
    // tags if this component mounts more than once).
    // ---------------------------------------------------------------------
    useEffect(() => {
        if ((window as any).L) {
            setLeafletReady(true);
            return;
        }

        const existingScript = document.getElementById('leaflet-js-cdn') as HTMLScriptElement | null;
        if (existingScript) {
            existingScript.addEventListener('load', () => setLeafletReady(true));
            return;
        }

        if (!document.getElementById('leaflet-css-cdn')) {
            const link = document.createElement('link');
            link.id = 'leaflet-css-cdn';
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
            link.crossOrigin = '';
            document.head.appendChild(link);
        }

        const script = document.createElement('script');
        script.id = 'leaflet-js-cdn';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
        script.crossOrigin = '';
        script.async = true;
        script.onload = () => setLeafletReady(true);
        document.body.appendChild(script);
    }, []);

    // ---------------------------------------------------------------------
    // Geolocation
    // ---------------------------------------------------------------------
    const requestLiveLocation = useCallback(() => {
        if (!('geolocation' in navigator)) return;
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                setMapLat(lat);
                setMapLng(lng);
                setIsLocating(false);

                if (mapRef.current) {
                    mapRef.current.setView([lat, lng], 13);
                    markerRef.current?.setLatLng([lat, lng]);
                    circleRef.current?.setLatLng([lat, lng]);
                }
            },
            (error) => {
                console.warn('Device location check blocked by browser permissions:', error);
                setIsLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000 },
        );
    }, []);

    useEffect(() => {
        if (showZoneDialog && activeStrategy === 'radius' && !warehouse?.lat && !warehouse?.lng) {
            requestLiveLocation();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showZoneDialog, activeStrategy]);

    // ---------------------------------------------------------------------
    // Map lifecycle. The Leaflet instance is created exactly once per dialog
    // session (when the radius tab is shown) and is only *resized*, never
    // destroyed/rebuilt, when toggling fullscreen. This is what preserves
    // zoom/drag/scroll behaviour identically in both states, and it avoids
    // the flicker + state loss that a full teardown/rebuild would cause.
    // ---------------------------------------------------------------------
    const teardownMapInstance = useCallback(() => {
        if (mapRef.current) {
            markerRef.current?.off();
            mapRef.current.off();
            mapRef.current.remove();
            mapRef.current = null;
            markerRef.current = null;
            circleRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (!showZoneDialog || activeStrategy !== 'radius' || !leafletReady) {
            teardownMapInstance();
            return;
        }

        // Already initialized for this dialog session — just keep it alive.
        if (mapRef.current) return;

        let cancelled = false;
        let attempts = 0;

        const tryInit = () => {
            if (cancelled) return;

            const L = (window as any).L;
            const mapNode = mapNodeRef.current;
            const targetParent = isMapFullscreen ? fullscreenWrapperRef.current : mapWrapperRef.current;

            if (!L || !mapNode || !targetParent) {
                if (attempts++ < 40) requestAnimationFrame(tryInit);
                return;
            }

            // Make sure the mount node is actually attached to the currently
            // visible wrapper before measuring/initializing.
            if (mapNode.parentElement !== targetParent) {
                targetParent.appendChild(mapNode);
            }

            // Guard against initializing while the wrapper is still 0x0 (e.g.
            // dialog open animation hasn't finished, or a parent tab panel is
            // still display:none). Retry on the next frame instead of silently
            // giving up — this is what previously caused "no map ever shows".
            const rect = targetParent.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) {
                if (attempts++ < 60) requestAnimationFrame(tryInit);
                return;
            }

            themeColorRef.current = resolveThemeColor('--primary', '#4f46e5');

            mapRef.current = L.map(mapNode, {
                zoomControl: true,
                dragging: true,
                scrollWheelZoom: true,
                doubleClickZoom: true,
                boxZoom: true,
                trackResize: true,
                touchZoom: true,
                attributionControl: false,
                tap: false,
            }).setView([mapLat, mapLng], 12);

            L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
                maxZoom: 22,
                subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            }).addTo(mapRef.current);

            const customHubIcon = L.divIcon({
                className: 'custom-delivery-hub-marker',
                html: `<div class="relative flex items-center justify-center w-8 h-8">
                    <div class="absolute w-7 h-7 rounded-full opacity-25 animate-ping" style="background-color: ${themeColorRef.current}"></div>
                    <div class="w-4 h-4 rounded-full border-2 border-white shadow-lg flex items-center justify-center" style="background-color: ${themeColorRef.current}">
                        <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
                    </div>
                </div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16],
            });

            markerRef.current = L.marker([mapLat, mapLng], { icon: customHubIcon, draggable: true })
                .addTo(mapRef.current)
                .bindPopup(
                    '<div class="text-[11px] font-sans font-bold">Fulfillment Logistics Center<br/><span class="text-muted-foreground font-normal">Drag marker or click anywhere on the map to re-adjust hub</span></div>',
                );

            const radValue = parseFloat(data.radius_km) || 0;
            circleRef.current = L.circle([mapLat, mapLng], {
                color: themeColorRef.current,
                weight: 2,
                fillColor: themeColorRef.current,
                fillOpacity: 0.15,
                radius: radValue * 1000,
            }).addTo(mapRef.current);

            markerRef.current.on('dragend', (e: any) => {
                const position = e.target.getLatLng();
                setMapLat(position.lat);
                setMapLng(position.lng);
                circleRef.current?.setLatLng(position);
            });

            mapRef.current.on('click', (e: any) => {
                const coords = e.latlng;
                setMapLat(coords.lat);
                setMapLng(coords.lng);
                markerRef.current?.setLatLng(coords);
                circleRef.current?.setLatLng(coords);
            });

            requestAnimationFrame(() => {
                mapRef.current?.invalidateSize();
                if (radValue > 0 && circleRef.current) {
                    mapRef.current.fitBounds(circleRef.current.getBounds(), { padding: [40, 40] });
                }
            });
        };

        requestAnimationFrame(tryInit);

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showZoneDialog, activeStrategy, leafletReady]);

    // Tear the map down fully whenever the dialog closes, so the next "Add/Edit
    // zone" open starts clean rather than re-using a stale instance.
    useEffect(() => {
        if (!showZoneDialog) {
            teardownMapInstance();
            setIsMapFullscreen(false);
        }
    }, [showZoneDialog, teardownMapInstance]);

    // Move the *same* map DOM node between the inline slot and the fullscreen
    // slot instead of destroying/recreating Leaflet. This is what keeps zoom,
    // drag, and scroll wheel behaviour working identically in both layouts.
    useEffect(() => {
        const node = mapNodeRef.current;
        const targetParent = isMapFullscreen ? fullscreenWrapperRef.current : mapWrapperRef.current;
        if (node && targetParent && node.parentElement !== targetParent) {
            targetParent.appendChild(node);
        }

        if (!mapRef.current) return;

        // The DialogContent has a CSS size transition (duration-200) when
        // switching between inline/fullscreen. If we call invalidateSize()
        // only once on the next frame, Leaflet measures the container
        // mid-transition, caches that smaller size, and never re-requests
        // tiles or recomputes overlay bounds for the rest of the final area
        // — which is exactly what produced the white strip and the radius
        // circle getting clipped at that stale boundary. Instead we
        // invalidate on every frame for the transition's duration, plus a
        // final call once the transition genuinely ends.
        let rafId: number;
        const start = performance.now();
        const DURATION_MS = 260; // matches duration-200 + a small safety margin

        const tick = () => {
            mapRef.current?.invalidateSize();
            if (performance.now() - start < DURATION_MS) {
                rafId = requestAnimationFrame(tick);
            }
        };
        rafId = requestAnimationFrame(tick);

        const dialogEl = (isMapFullscreen ? fullscreenWrapperRef.current : mapWrapperRef.current)?.closest(
            '[role="dialog"]',
        ) as HTMLElement | null;
        const handleTransitionEnd = () => mapRef.current?.invalidateSize();
        dialogEl?.addEventListener('transitionend', handleTransitionEnd);

        return () => {
            cancelAnimationFrame(rafId);
            dialogEl?.removeEventListener('transitionend', handleTransitionEnd);
        };
    }, [isMapFullscreen, showZoneDialog]);

    // Belt-and-suspenders: also track the wrapper's actual box size with a
    // ResizeObserver, so any resize we didn't anticipate (window resize,
    // browser zoom, font loading shifting layout, etc.) still re-syncs
    // Leaflet's internal size cache and keeps the radius circle accurate.
    useEffect(() => {
        if (!showZoneDialog || activeStrategy !== 'radius') return;
        const targetParent = isMapFullscreen ? fullscreenWrapperRef.current : mapWrapperRef.current;
        if (!targetParent || typeof ResizeObserver === 'undefined') return;

        const observer = new ResizeObserver(() => {
            mapRef.current?.invalidateSize();
        });
        observer.observe(targetParent);
        return () => observer.disconnect();
    }, [showZoneDialog, activeStrategy, isMapFullscreen]);

    // Live update circular path radius on input changes
    useEffect(() => {
        if (circleRef.current && mapRef.current) {
            // Make sure Leaflet's cached container size is current before we
            // recompute radius/bounds — otherwise the circle can be drawn (and
            // clipped) against whatever size was last cached, which is stale
            // right after a fullscreen toggle that's still mid-transition.
            mapRef.current.invalidateSize();
            const radValue = parseFloat(data.radius_km) || 0;
            circleRef.current.setRadius(radValue * 1000);

            if (radValue > 0) {
                mapRef.current.fitBounds(circleRef.current.getBounds(), { padding: [40, 40] });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.radius_km]);

    const openCreateZone = () => {
        clearErrors();
        setEditZone(null);
        reset();
        setMapLat(Number(warehouse?.lat ?? DEFAULT_LAT));
        setMapLng(Number(warehouse?.lng ?? DEFAULT_LNG));
        setActiveStrategy('pincode');
        setIsMapFullscreen(false);
        setShowZoneDialog(true);
    };

    const openEditZone = (zone: ShippingZone) => {
        clearErrors();
        setEditZone(zone);
        setIsMapFullscreen(false);

        setMapLat(Number(warehouse?.lat ?? DEFAULT_LAT));
        setMapLng(Number(warehouse?.lng ?? DEFAULT_LNG));

        const strategy = zone.radius_km ? 'radius' : 'pincode';
        setActiveStrategy(strategy);

        let pinsString = '';
        if (zone.pincodes) {
            pinsString = Array.isArray(zone.pincodes) ? zone.pincodes.join(', ') : String(zone.pincodes).replace(/[\[\]"]/g, '');
        }

        setData({
            name: zone.name,
            pincodes: pinsString,
            radius_km: zone.radius_km ? String(zone.radius_km) : '',
            charge: String(zone.charge),
            free_above: zone.free_above ? String(zone.free_above) : '',
            is_active: zone.is_active,
        });
        setShowZoneDialog(true);
    };

    const submitZone = (e: React.FormEvent) => {
        e.preventDefault();

        const codesParsed =
            activeStrategy === 'pincode' && data.pincodes
                ? data.pincodes
                      .split(',')
                      .map((p) => p.trim())
                      .filter((p) => p.length > 0)
                : [];

        const payload = {
            name: data.name,
            charge: Number(data.charge),
            free_above: data.free_above ? Number(data.free_above) : null,
            is_active: data.is_active,
            pincodes: activeStrategy === 'pincode' && codesParsed.length > 0 ? codesParsed : null,
            radius_km: activeStrategy === 'radius' && data.radius_km ? Number(data.radius_km) : null,
            // lat: activeStrategy === 'radius' ? mapLat : null,
            // lng: activeStrategy === 'radius' ? mapLng : null,
        };

        if (editZone) {
            router.put(`/warehouse/settings/shipping-zones/${editZone.id}`, payload, {
                onSuccess: () => {
                    setIsMapFullscreen(false);
                    setShowZoneDialog(false);
                },
            });
        } else {
            router.post('/warehouse/settings/shipping-zones', payload, {
                onSuccess: () => {
                    setIsMapFullscreen(false);
                    setShowZoneDialog(false);
                },
            });
        }
    };

    const confirmDeleteZone = () => {
        if (!zoneToDelete) return;
        router.delete(`/warehouse/settings/shipping-zones/${zoneToDelete.id}`, {
            onFinish: () => setZoneToDelete(null),
        });
    };

    const fmt = (n: number) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

    const renderPincodesCell = (zone: ShippingZone) => {
        if (zone.radius_km) {
            return (
                <div className="flex items-center gap-1.5 text-primary font-medium text-xs">
                    <Navigation className="h-3 w-3 transform rotate-45" /> Radial Route Map: {zone.radius_km} km
                </div>
            );
        }
        if (!zone.pincodes || (Array.isArray(zone.pincodes) && zone.pincodes.length === 0)) {
            return <span className="text-muted-foreground italic text-xs">Global Catch-All (All Areas)</span>;
        }

        const pinsArray = Array.isArray(zone.pincodes) ? zone.pincodes : String(zone.pincodes).replace(/[\[\]"]/g, '').split(',');

        return (
            <div className="flex flex-wrap gap-1 max-w-sm">
                {pinsArray.map((pin, i) => (
                    <Badge key={i} variant="outline" className="bg-muted/50 font-mono text-[10px] px-1.5 py-0.5 rounded">
                        {pin.trim()}
                    </Badge>
                ))}
            </div>
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Logistics Zone Preferences — Warehouse">
                <link
                    rel="stylesheet"
                    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
                    integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
                    crossOrigin=""
                />
            </Head>

            <div className="p-6 space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Settings className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Warehouse Settings</h1>
                        <p className="text-muted-foreground">Manage service delivery layout zones and fuel fulfillment adjustments</p>
                    </div>
                </div>

                <SettingsNav activeTab="shipping" />

                <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <CardTitle>Fulfillment Rate Metrics</CardTitle>
                                <CardDescription>Define geo-fenced operations mapped across localized postcode systems</CardDescription>
                            </div>
                            <Button size="sm" onClick={openCreateZone}>
                                <Plus className="h-4 w-4 mr-2" /> Add Freight Zone
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {zones.length === 0 ? (
                            <div className="flex flex-col items-center py-12 text-muted-foreground">
                                <Truck className="h-10 w-10 mb-3 opacity-30" />
                                <p className="text-sm">No logistics operational zones configured for this active warehouse.</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Zone Identifier Name</TableHead>
                                        <TableHead>Fenced Range Boundaries</TableHead>
                                        <TableHead className="text-right">Fulfillment Surcharge</TableHead>
                                        <TableHead className="text-right">Free Fulfillment Threshold</TableHead>
                                        <TableHead>Line Status</TableHead>
                                        <TableHead className="w-[100px] text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {zones.map((zone) => (
                                        <TableRow key={zone.id} className="hover:bg-muted/30">
                                            <TableCell className="font-semibold text-sm">{zone.name}</TableCell>
                                            <TableCell>{renderPincodesCell(zone)}</TableCell>
                                            <TableCell className="text-right font-mono font-bold text-xs">{fmt(zone.charge)}</TableCell>
                                            <TableCell className="text-right font-mono text-xs">{zone.free_above ? fmt(zone.free_above) : '—'}</TableCell>
                                            <TableCell>
                                                <Badge variant={zone.is_active ? 'default' : 'secondary'} className="text-[10px]">
                                                    {zone.is_active ? 'Active Line' : 'Offline / Interrupted'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex gap-1 justify-center">
                                                    <Button size="sm" variant="outline" className="h-7 text-xs px-2.5" onClick={() => openEditZone(zone)}>
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                                        onClick={() => setZoneToDelete(zone)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* Delete confirmation */}
                <AlertDialog open={!!zoneToDelete} onOpenChange={(open) => !open && setZoneToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Remove this freight zone?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently remove "{zoneToDelete?.name}" and stop it from being used for checkout shipping
                                calculations. This action can't be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={confirmDeleteZone} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Remove zone
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Zone create/edit dialog. Fullscreen map mode is rendered *inside*
                    this same Dialog/DialogContent so it shares Radix's portal + focus
                    scope — this is what fixes the dead buttons and disabled map
                    interactions that happened when the fullscreen view was a separate
                    document.body portal sitting outside Radix's pointer-events scope. */}
                <Dialog
                    open={showZoneDialog}
                    onOpenChange={(open) => {
                        if (!open) setIsMapFullscreen(false);
                        setShowZoneDialog(open);
                    }}
                >
                    <DialogContent
                        className={cn(
                            'overflow-y-auto transition-[max-width,max-height] duration-200',
                            isMapFullscreen ? 'max-w-4xl max-h-[92vh] sm:max-w-4xl' : 'max-w-md max-h-[90vh]',
                        )}
                        onPointerDownOutside={(e) => e.preventDefault()}
                        onInteractOutside={(e) => e.preventDefault()}
                    >
                        {isMapFullscreen ? (
                            <div className="flex flex-col h-[85vh]">
                                <DialogHeader className="shrink-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse shrink-0" />
                                            <DialogTitle className="text-sm font-bold tracking-tight truncate">
                                                Logistics Router Console — {data.radius_km || 0} km Perimeter
                                            </DialogTitle>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={isLocating}
                                                className="h-8 text-xs font-medium gap-1.5"
                                                onClick={requestLiveLocation}
                                            >
                                                <Crosshair className={cn('h-3.5 w-3.5', isLocating && 'animate-spin text-primary')} />
                                                <span className="hidden sm:inline">Refresh Auto</span> Geolocation
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="default"
                                                size="sm"
                                                className="h-8 text-xs font-semibold"
                                                onClick={() => setIsMapFullscreen(false)}
                                            >
                                                <Minimize2 className="h-3.5 w-3.5 mr-1.5" /> Minimize
                                            </Button>
                                        </div>
                                    </div>
                                </DialogHeader>

                                <div className="flex-1 min-h-0 rounded-xl border bg-muted relative overflow-hidden mt-2">
                                    <div ref={fullscreenWrapperRef} className="absolute inset-0" />
                                </div>

                                <div className="shrink-0 pt-3">
                                    <Label htmlFor="radius_km_fullscreen" className="text-[11px] font-medium text-muted-foreground">
                                        Maximum Coverage Radius (Kilometers)
                                    </Label>
                                    <Input
                                        id="radius_km_fullscreen"
                                        type="number"
                                        min="0"
                                        max="500"
                                        step="0.5"
                                        value={data.radius_km}
                                        onChange={(e) => setData('radius_km', e.target.value)}
                                        placeholder="E.g. 15"
                                        className="mt-1"
                                    />
                                    <p className="text-[10px] text-muted-foreground mt-1.5">
                                        Drag the center pin marker or tap anywhere on the map to manually position your fulfillment
                                        coordinates. Scroll or pinch to zoom.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <DialogHeader>
                                    <DialogTitle className="text-base font-bold">
                                        {editZone ? 'Edit Shipping Adjustment Metrics' : 'Append Logistic Service Zone'}
                                    </DialogTitle>
                                </DialogHeader>

                                <form onSubmit={submitZone} className="space-y-4 mt-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="zone_name" className="text-xs font-semibold">
                                            Zone Identifier Name
                                        </Label>
                                        <Input
                                            id="zone_name"
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            placeholder="E.g. Berhampore Corporate Area"
                                            required
                                        />
                                        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">Logistics Strategy Assignment</Label>
                                        <Tabs value={activeStrategy} onValueChange={(v: any) => setActiveStrategy(v)} className="w-full">
                                            <TabsList className="grid w-full grid-cols-2">
                                                <TabsTrigger value="pincode" className="text-xs gap-1.5">
                                                    <MapPin className="h-3.5 w-3.5" /> Postcodes Coverage
                                                </TabsTrigger>
                                                <TabsTrigger value="radius" className="text-xs gap-1.5">
                                                    <Radio className="h-3.5 w-3.5" /> Radius Circle
                                                </TabsTrigger>
                                            </TabsList>

                                            <TabsContent value="pincode" className="space-y-2 pt-2">
                                                <div className="space-y-2">
                                                    <Label htmlFor="pincodes" className="text-[11px] font-medium text-muted-foreground">
                                                        Postcodes Coverage Mapping (Comma-Separated)
                                                    </Label>
                                                    <Input
                                                        id="pincodes"
                                                        className="font-mono text-xs"
                                                        value={data.pincodes}
                                                        onChange={(e) => setData('pincodes', e.target.value)}
                                                        placeholder="742303, 742301, 742101..."
                                                    />
                                                    <p className="text-[10px] text-muted-foreground">
                                                        Keep this blank to apply this zone configuration to all addresses.
                                                    </p>
                                                    {errors.pincodes && <p className="text-xs text-destructive">{errors.pincodes}</p>}
                                                </div>
                                            </TabsContent>

                                            <TabsContent value="radius" className="space-y-2 pt-2">
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <Label htmlFor="radius_km" className="text-[11px] font-medium text-muted-foreground">
                                                            Maximum Coverage Radius (Kilometers)
                                                        </Label>
                                                        <div className="flex items-center gap-1">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                disabled={isLocating}
                                                                className="h-6 text-[10px] text-muted-foreground hover:text-primary font-semibold gap-1 px-1.5"
                                                                onClick={requestLiveLocation}
                                                            >
                                                                <Crosshair className={cn('h-3 w-3', isLocating && 'animate-spin text-primary')} />
                                                                Locate Hub
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-6 text-[11px] text-primary hover:text-primary hover:bg-primary/10 font-semibold gap-1"
                                                                onClick={() => setIsMapFullscreen(true)}
                                                            >
                                                                <Maximize2 className="h-3 w-3" /> Expand Map view
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <Input
                                                        id="radius_km"
                                                        type="number"
                                                        min="0"
                                                        max="500"
                                                        step="0.5"
                                                        value={data.radius_km}
                                                        onChange={(e) => setData('radius_km', e.target.value)}
                                                        placeholder="E.g. 15"
                                                        required={activeStrategy === 'radius'}
                                                    />
                                                    {errors.radius_km && <p className="text-xs text-destructive">{errors.radius_km}</p>}
                                                </div>

                                                <div className="w-full h-48 rounded-xl border bg-muted mt-2 relative overflow-hidden shadow-inner">
                                                    <div ref={mapWrapperRef} className="absolute inset-0" />
                                                    {!leafletReady && (
                                                        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                                                            Loading map…
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-muted-foreground mt-1">
                                                    💡 Drag the center pin marker or tap anywhere on the map grid to manually position your
                                                    fulfillment coordinates.
                                                </p>
                                            </TabsContent>
                                        </Tabs>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label htmlFor="charge" className="text-xs font-semibold">
                                                Fulfillment Base Charge (₹)
                                            </Label>
                                            <Input
                                                id="charge"
                                                type="number"
                                                step="0.01"
                                                value={data.charge}
                                                onChange={(e) => setData('charge', e.target.value)}
                                                required
                                            />
                                            {errors.charge && <p className="text-xs text-destructive">{errors.charge}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="free_above" className="text-xs font-semibold">
                                                Free Shipping Tier (₹)
                                            </Label>
                                            <Input
                                                id="free_above"
                                                type="number"
                                                step="0.01"
                                                value={data.free_above}
                                                onChange={(e) => setData('free_above', e.target.value)}
                                                placeholder="Optional Limit..."
                                            />
                                            {errors.free_above && <p className="text-xs text-destructive">{errors.free_above}</p>}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl border">
                                        <Switch id="is_active" checked={data.is_active} onCheckedChange={(checked) => setData('is_active', checked)} />
                                        <div className="space-y-0.5">
                                            <Label htmlFor="is_active" className="text-xs font-semibold">
                                                Line Route Operations Status
                                            </Label>
                                            <p className="text-[10px] text-muted-foreground">
                                                Turn off to temporarily stop routing or processing checkout options for this zone.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-2 border-t justify-end">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setIsMapFullscreen(false);
                                                setShowZoneDialog(false);
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                        <Button type="submit" size="sm" disabled={processing}>
                                            {editZone ? 'Commit System Profile adjustments' : 'Write Freight Zone'}
                                        </Button>
                                    </div>
                                </form>
                            </>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
