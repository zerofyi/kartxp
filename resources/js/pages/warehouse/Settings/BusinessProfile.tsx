import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import {
    Check,
    Crosshair,
    Globe,
    Link,
    MapPin,
    Maximize2,
    Minimize2,
    RotateCcw,
    Save,
    Settings,
    Upload,
    X,
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import SettingsNav from './SettingsNav';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Warehouse Settings', href: '/warehouse/settings' },
];

type Warehouse = {
    id: number;
    name: string;
    platform: 'ghorerbazar' | 'foodbazar' | 'mobilebazar';
    address: string;
    location: string | null;
    phone: string | null;
    email: string | null;
    logo_path: string | null;
    gstin: string | null;
    lat: number | null;
    lng: number | null;
    timezone: string;
    currency: string;
};

type Props = {
    warehouse: Warehouse;
};

const DEFAULT_LAT = 24.1833;
const DEFAULT_LNG = 88.4333;

function resolveThemeColor(cssVar: string, fallbackHex: string): string {
    if (typeof window === 'undefined') return fallbackHex;
    const raw = getComputedStyle(document.documentElement)
        .getPropertyValue(cssVar)
        .trim();
    if (!raw) return fallbackHex;
    if (/^\d/.test(raw)) return `hsl(${raw})`;
    return raw;
}

export default function BusinessProfilePage({ warehouse }: Props) {
    const [isMapFullscreen, setIsMapFullscreen] = useState(false);
    const [leafletReady, setLeafletReady] = useState(false);
    const [logoPreview, setLogoPreview] = useState<string | null>(
        warehouse.logo_path ? `/storage/${warehouse.logo_path}` : null,
    );

    // Baseline saved coordinate coordinates reference anchors
    const savedLat = Number(warehouse?.lat ?? DEFAULT_LAT);
    const savedLng = Number(warehouse?.lng ?? DEFAULT_LNG);

    // Map view track and safety checkpoint anchors
    const [mapLat, setMapLat] = useState<number>(savedLat);
    const [mapLng, setMapLng] = useState<number>(savedLng);
    const [pendingCoords, setPendingCoords] = useState<{
        lat: number;
        lng: number;
    } | null>(null);
    const [isLocating, setIsLocating] = useState(false);

    const mapRef = useRef<any>(null);
    const markerRef = useRef<any>(null);
    const themeColorRef = useRef<string>('#4f46e5');
    const mapWrapperRef = useRef<HTMLDivElement | null>(null);
    const fullscreenWrapperRef = useRef<HTMLDivElement | null>(null);

    // Mount node ref tracking matching your solid ShippingZone.tsx portfolio setup
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

    const { data, setData, post, processing, errors } = useForm({
        name: warehouse.name,
        address: warehouse.address || '',
        location: warehouse.location || '',
        phone: warehouse.phone || '',
        email: warehouse.email || '',
        gstin: warehouse.gstin || '',
        lat: warehouse.lat ? String(warehouse.lat) : String(DEFAULT_LAT),
        lng: warehouse.lng ? String(warehouse.lng) : String(DEFAULT_LNG),
        timezone: warehouse.timezone || 'Asia/Kolkata',
        currency: warehouse.currency || 'INR',
        logo: null as File | null,
    });

    useEffect(() => {
        if ((window as any).L) {
            setLeafletReady(true);
            return;
        }
        const existingScript = document.getElementById(
            'leaflet-js-cdn',
        ) as HTMLScriptElement | null;
        if (existingScript) {
            existingScript.addEventListener('load', () =>
                setLeafletReady(true),
            );
            return;
        }
        if (!document.getElementById('leaflet-css-cdn')) {
            const link = document.createElement('link');
            link.id = 'leaflet-css-cdn';
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);
        }
        const script = document.createElement('script');
        script.id = 'leaflet-js-cdn';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.async = true;
        script.onload = () => setLeafletReady(true);
        document.body.appendChild(script);
    }, []);

    // Clean Google Maps query parameters formatting link generator
    const generateMapsUrl = (lat: number, lng: number): string => {
        return `https://www.google.com/maps?q=${lat},${lng}`;
    };

    const requestLiveLocation = useCallback(() => {
        if (!('geolocation' in navigator)) return;
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                // Route directly to pending confirmation gate instead of mutating raw payload values immediately
                setPendingCoords({ lat, lng });
                setIsLocating(false);

                if (mapRef.current) {
                    mapRef.current.setView([lat, lng], 15);
                    markerRef.current?.setLatLng([lat, lng]);
                }
            },
            (error) => {
                console.warn('Location blocked:', error);
                setIsLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000 },
        );
    }, []);

    // Recenter map back onto saved or active coordinates anchors inside frame viewport
    const recenterMapOnHub = useCallback(() => {
        const targetLat = pendingCoords ? pendingCoords.lat : mapLat;
        const targetLng = pendingCoords ? pendingCoords.lng : mapLng;
        if (mapRef.current) {
            mapRef.current.setView([targetLat, targetLng], 14);
        }
    }, [pendingCoords, mapLat, mapLng]);

    // Explicit confirmation gate processing map inputs securely
    const acceptMapLocationChanges = () => {
        if (!pendingCoords) return;
        const { lat, lng } = pendingCoords;
        setMapLat(lat);
        setMapLng(lng);
        setData((prev) => ({
            ...prev,
            lat: String(lat),
            lng: String(lng),
            location: generateMapsUrl(lat, lng),
        }));
        setPendingCoords(null);
    };

    // Rollback accidental map interactions back to form payload values
    const rejectMapLocationChanges = () => {
        if (markerRef.current && mapRef.current) {
            markerRef.current.setLatLng([mapLat, mapLng]);
            mapRef.current.setView([mapLat, mapLng], 13);
        }
        setPendingCoords(null);
    };

    const teardownMapInstance = useCallback(() => {
        if (mapRef.current) {
            markerRef.current?.off();
            mapRef.current.off();
            mapRef.current.remove();
            mapRef.current = null;
            markerRef.current = null;
        }
    }, []);

    // Core Map Initialization Lifecycle
    useEffect(() => {
        if (!leafletReady) return;
        if (mapRef.current) return;

        let attempts = 0;
        const tryInit = () => {
            const L = (window as any).L;
            const mapNode = mapNodeRef.current;
            const targetParent = isMapFullscreen
                ? fullscreenWrapperRef.current
                : mapWrapperRef.current;

            if (!L || !mapNode || !targetParent) {
                if (attempts++ < 40) requestAnimationFrame(tryInit);
                return;
            }

            if (mapNode.parentElement !== targetParent) {
                targetParent.appendChild(mapNode);
            }

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
            }).setView([mapLat, mapLng], 13);

            L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
                maxZoom: 22,
            }).addTo(mapRef.current);

            const customHubIcon = L.divIcon({
                className: 'custom-warehouse-marker',
                html: `<div class="relative flex items-center justify-center w-8 h-8">
                    <div class="absolute w-7 h-7 rounded-full opacity-25 animate-ping" style="background-color: ${themeColorRef.current}"></div>
                    <div class="w-4 h-4 rounded-full border-2 border-white shadow-lg flex items-center justify-center" style="background-color: ${themeColorRef.current}">
                        <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
                    </div>
                </div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16],
            });

            markerRef.current = L.marker([mapLat, mapLng], {
                icon: customHubIcon,
                draggable: true,
            }).addTo(mapRef.current);

            markerRef.current.on('dragend', (e: any) => {
                const position = e.target.getLatLng();
                setPendingCoords({ lat: position.lat, lng: position.lng });
            });

            mapRef.current.on('click', (e: any) => {
                const coords = e.latlng;
                markerRef.current?.setLatLng(coords);
                setPendingCoords({ lat: coords.lat, lng: coords.lng });
            });

            mapRef.current.invalidateSize();
        };

        requestAnimationFrame(tryInit);
        return () => teardownMapInstance();
    }, [leafletReady, mapLat, mapLng, isMapFullscreen, teardownMapInstance]);

    // Re-parent node placement frames seamlessly between slot wrappers
    useEffect(() => {
        const node = mapNodeRef.current;
        const targetParent = isMapFullscreen
            ? fullscreenWrapperRef.current
            : mapWrapperRef.current;
        if (node && targetParent && node.parentElement !== targetParent) {
            targetParent.appendChild(node);
        }

        if (!mapRef.current) return;

        let rafId: number;
        const start = performance.now();
        const tick = () => {
            mapRef.current?.invalidateSize();
            if (performance.now() - start < 260) {
                rafId = requestAnimationFrame(tick);
            }
        };
        rafId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafId);
    }, [isMapFullscreen]);

    const handleCoordinateChange = (field: 'lat' | 'lng', val: string) => {
        setData(field, val);
        const num = parseFloat(val);
        if (isNaN(num)) return;

        setPendingCoords(null); // Manual typings wipe pending maps overlay configurations
        if (field === 'lat') {
            setMapLat(num);
            markerRef.current?.setLatLng([num, mapLng]);
            mapRef.current?.setView([num, mapLng]);
            setData('location', generateMapsUrl(num, mapLng));
        } else {
            setMapLng(num);
            markerRef.current?.setLatLng([mapLat, num]);
            mapRef.current?.setView([mapLat, num]);
            setData('location', generateMapsUrl(mapLat, num));
        }
    };

    const handleLogoChange = (file: File | null) => {
        if (!file) return;
        setData('logo', file);
        const reader = new FileReader();
        reader.onloadend = () => setLogoPreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const saveProfile = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/warehouse/settings/profile/${warehouse.id}`);
    };

    const platforms = [
        {
            id: 'ghorerbazar',
            name: 'Ghorer Bazar',
            desc: 'Lifestyle, Home Essentials & Daily Grocery Segment',
        },
        {
            id: 'foodbazar',
            name: 'Food Bazar',
            desc: 'Hot Restaurant Foods, Meals & Dine-In Delivery Segment',
        },
        {
            id: 'mobilebazar',
            name: 'Mobile Bazar',
            desc: 'New & Pre-owned Mobiles, Computers & Accessories Segment',
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Business Profile Settings — Warehouse" />
            <div className="space-y-6 p-6">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                        <Settings className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Warehouse Settings
                        </h1>
                        <p className="text-muted-foreground">
                            Configure global corporate identity and geometric
                            logistics coordinates
                        </p>
                    </div>
                </div>

                <SettingsNav activeTab="profile" />

                <form onSubmit={saveProfile} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        {/* LEFT COLUMN */}
                        <div className="space-y-6 lg:col-span-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>
                                        Corporate Identity Properties
                                    </CardTitle>
                                    <CardDescription>
                                        Configure branding tokens reflected
                                        across billing modules and receipts
                                        layouts
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">
                                                Warehouse Identity Name
                                            </Label>
                                            <Input
                                                id="name"
                                                value={data.name}
                                                onChange={(e) =>
                                                    setData(
                                                        'name',
                                                        e.target.value,
                                                    )
                                                }
                                                required
                                            />
                                            {errors.name && (
                                                <p className="text-xs text-destructive">
                                                    {errors.name}
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label
                                                htmlFor="location"
                                                className="flex items-center gap-1"
                                            >
                                                <Link className="h-3 w-3 text-muted-foreground" />{' '}
                                                Google Maps URL Location
                                            </Label>
                                            <Input
                                                id="location"
                                                value={data.location}
                                                onChange={(e) =>
                                                    setData(
                                                        'location',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Generated instantly via map interactions..."
                                            />
                                            {errors.location && (
                                                <p className="text-xs text-destructive">
                                                    {errors.location}
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="phone">
                                                Contact Phone
                                            </Label>
                                            <Input
                                                id="phone"
                                                value={data.phone}
                                                onChange={(e) =>
                                                    setData(
                                                        'phone',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                            {errors.phone && (
                                                <p className="text-xs text-destructive">
                                                    {errors.phone}
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="email">
                                                Contact Email
                                            </Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                value={data.email}
                                                onChange={(e) =>
                                                    setData(
                                                        'email',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                            {errors.email && (
                                                <p className="text-xs text-destructive">
                                                    {errors.email}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="address">
                                            Physical Billing Street Address
                                            Description
                                        </Label>
                                        <Textarea
                                            id="address"
                                            rows={2}
                                            value={data.address}
                                            onChange={(e) =>
                                                setData(
                                                    'address',
                                                    e.target.value,
                                                )
                                            }
                                            required
                                        />
                                        {errors.address && (
                                            <p className="text-xs text-destructive">
                                                {errors.address}
                                            </p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                        <div className="space-y-2">
                                            <Label htmlFor="gstin">
                                                GSTIN Number
                                            </Label>
                                            <Input
                                                id="gstin"
                                                className="font-mono uppercase"
                                                value={data.gstin}
                                                onChange={(e) =>
                                                    setData(
                                                        'gstin',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="19HBPPB98261Z0"
                                            />
                                            {errors.gstin && (
                                                <p className="text-xs text-destructive">
                                                    {errors.gstin}
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="timezone">
                                                Operational Timezone
                                            </Label>
                                            <Select
                                                value={data.timezone}
                                                onValueChange={(v) =>
                                                    setData('timezone', v)
                                                }
                                            >
                                                <SelectTrigger id="timezone" className="w-full">
                                                    <SelectValue placeholder="Select Timezone" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Asia/Kolkata">
                                                        Asia/Kolkata (IST)
                                                    </SelectItem>
                                                    <SelectItem value="UTC">
                                                        UTC / Greenwich Mean
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {errors.timezone && (
                                                <p className="text-xs text-destructive">
                                                    {errors.timezone}
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="currency">
                                                System Base Currency
                                            </Label>
                                            <Select
                                                value={data.currency}
                                                onValueChange={(v) =>
                                                    setData('currency', v)
                                                }
                                            >
                                                <SelectTrigger id="currency" className="w-full">
                                                    <SelectValue placeholder="Select Currency" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="INR">
                                                        INR (₹) Indian Rupee
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {errors.currency && (
                                                <p className="text-xs text-destructive">
                                                    {errors.currency}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Marketplace Segment Selection - Immutable Display */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>
                                        Marketplace Segment Binding
                                    </CardTitle>
                                    <CardDescription>
                                        The active product channel assignment
                                        for this warehouse node context
                                        (Immutable)
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                        {platforms.map((p) => {
                                            const isSelected =
                                                warehouse.platform === p.id;
                                            return (
                                                <div
                                                    key={p.id}
                                                    className={cn(
                                                        'relative space-y-2 overflow-hidden rounded-xl border-2 bg-card p-4 transition-all select-none',
                                                        isSelected
                                                            ? 'cursor-default border-primary bg-indigo-50/10 shadow-sm ring-1 ring-primary/20 dark:bg-indigo-950/10'
                                                            : 'cursor-not-allowed border-muted opacity-45',
                                                    )}
                                                >
                                                    <h4 className="text-sm font-bold tracking-tight text-foreground">
                                                        {p.name}
                                                    </h4>
                                                    <p className="text-[11px] leading-snug text-muted-foreground">
                                                        {p.desc}
                                                    </p>
                                                    {isSelected && (
                                                        <div className="absolute right-0 bottom-0 h-3 w-3 rounded-tl-md bg-primary" />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Logo Identity Canvas</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-col items-center justify-center">
                                        {logoPreview ? (
                                            <div className="group relative flex w-full flex-col items-center justify-center rounded-xl border bg-muted/20 p-4">
                                                <img
                                                    src={logoPreview}
                                                    alt="Dynamic Preview"
                                                    className="h-28 w-auto rounded-md object-contain"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setLogoPreview(null);
                                                        setData('logo', null);
                                                    }}
                                                    className="absolute top-2 right-2 rounded-full border bg-background p-1.5 text-muted-foreground shadow-sm transition-all hover:text-destructive"
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <Label
                                                htmlFor="logo-dropzone"
                                                className="flex h-36 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted p-4 text-center transition-all hover:bg-muted/30"
                                            >
                                                <div className="rounded-full bg-muted p-2.5 text-muted-foreground">
                                                    <Upload className="h-4 w-4" />
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="block text-xs font-semibold text-primary">
                                                        Upload Business Logo
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        Clean PNG, JPEG up to
                                                        2MB
                                                    </span>
                                                </div>
                                                <input
                                                    id="logo-dropzone"
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) =>
                                                        handleLogoChange(
                                                            e.target.files
                                                                ? e.target
                                                                      .files[0]
                                                                : null,
                                                        )
                                                    }
                                                />
                                            </Label>
                                        )}
                                    </div>
                                    {errors.logo && (
                                        <p className="mt-2 text-xs font-medium text-destructive">
                                            {errors.logo}
                                        </p>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Logistics Map Geolocation Panel */}
                            <Card
                                className={cn(
                                    'overflow-hidden border transition-all duration-300',
                                    isMapFullscreen
                                        ? 'fixed top-[10vh] left-[10vw] z-[9999] flex h-[80vh] w-[80vw] flex-col rounded-2xl border-muted shadow-2xl backdrop-blur-md'
                                        : 'relative h-fit w-full rounded-xl shadow-sm',
                                )}
                            >
                                <CardHeader className="px-4 bg-background py-4 pb-2">
                                    <div className="flex items-center justify-between gap-2 select-none">
                                        <CardTitle className="flex items-center gap-1.5 text-sm font-bold">
                                            <Globe className="h-4 w-4 animate-pulse text-primary" />
                                            {isMapFullscreen
                                                ? 'Logistics Geocoding Interface Map'
                                                : 'Live Geocoding Tracker Layer'}
                                        </CardTitle>
                                        <div className="flex items-center gap-1.5">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-7 gap-1 px-2 text-[10px] font-medium"
                                                onClick={recenterMapOnHub}
                                                title="Recenter Map Viewport"
                                            >
                                                <RotateCcw className="h-3 w-3" />
                                                {isMapFullscreen && (
                                                    <span>Center Frame</span>
                                                )}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={isLocating}
                                                className="h-7 gap-1 px-2 text-[10px] font-medium"
                                                onClick={requestLiveLocation}
                                                title="Locate Device"
                                            >
                                                <Crosshair
                                                    className={cn(
                                                        'h-3 w-3',
                                                        isLocating &&
                                                            'animate-spin text-primary',
                                                    )}
                                                />
                                                {isMapFullscreen && (
                                                    <span>Locate Device</span>
                                                )}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-7 gap-1 text-[11px] font-bold text-primary hover:bg-primary/10"
                                                onClick={() =>
                                                    setIsMapFullscreen(
                                                        !isMapFullscreen,
                                                    )
                                                }
                                                title={
                                                    isMapFullscreen
                                                        ? 'Minimize Map View'
                                                        : 'Expand Map View'
                                                }
                                            >
                                                {isMapFullscreen ? (
                                                    <>
                                                        <Minimize2 className="h-3 w-3" />
                                                        <span>
                                                            Minimize Map
                                                        </span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Maximize2 className="h-3 w-3" />
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent
                                    className={cn(
                                        'relative flex flex-col space-y-4 p-4',
                                        isMapFullscreen
                                            ? 'min-h-0 flex-1'
                                            : 'pt-4',
                                    )}
                                >
                                    {/* Confirmation Floating Safety Overlay Guard Layer */}
                                    {pendingCoords && (
                                        <div className="absolute top-6 right-6 left-6 z-[1000] flex animate-in flex-col items-center justify-between gap-3 rounded-xl border border-primary/20 bg-background/95 p-3 shadow-xl backdrop-blur-sm duration-200 fade-in slide-in-from-top-2 sm:flex-row">
                                            <div className="flex items-center gap-2">
                                                <MapPin className="h-4 w-4 shrink-0 animate-bounce text-primary" />
                                                <span className="text-xs font-semibold tracking-tight text-foreground">
                                                    Confirm location shift to:{' '}
                                                    {pendingCoords.lat.toFixed(
                                                        4,
                                                    )}
                                                    ,{' '}
                                                    {pendingCoords.lng.toFixed(
                                                        4,
                                                    )}
                                                    ?
                                                </span>
                                            </div>
                                            <div className="flex w-full shrink-0 items-center justify-end gap-1.5 sm:w-auto">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-7 px-2.5 text-xs font-medium"
                                                    onClick={
                                                        rejectMapLocationChanges
                                                    }
                                                >
                                                    Reset
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    className="h-7 gap-1 bg-primary px-3 text-xs font-bold text-primary-foreground"
                                                    onClick={
                                                        acceptMapLocationChanges
                                                    }
                                                >
                                                    <Check className="h-3 w-3" />{' '}
                                                    Confirm Location
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Re-parent slot wrappers unblocked from map crashes */}
                                    <div
                                        className={cn(
                                            'relative w-full overflow-hidden rounded-xl border bg-neutral-50 shadow-inner',
                                            isMapFullscreen
                                                ? 'min-h-0 flex-1'
                                                : 'h-40',
                                        )}
                                    >
                                        <div
                                            ref={
                                                isMapFullscreen
                                                    ? fullscreenWrapperRef
                                                    : mapWrapperRef
                                            }
                                            className="absolute inset-0"
                                        />
                                        {!leafletReady && (
                                            <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                                                Loading map configurations…
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid shrink-0 grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label
                                                htmlFor="lat"
                                                className="flex items-center gap-1 text-[10px] font-bold tracking-wide text-muted-foreground uppercase"
                                            >
                                                <MapPin className="h-3 w-3" />{' '}
                                                Latitude
                                            </Label>
                                            <Input
                                                id="lat"
                                                className="h-8 font-mono text-xs"
                                                type="number"
                                                step="any"
                                                value={data.lat}
                                                onChange={(e) =>
                                                    handleCoordinateChange(
                                                        'lat',
                                                        e.target.value,
                                                    )
                                                }
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label
                                                htmlFor="lng"
                                                className="flex items-center gap-1 text-[10px] font-bold tracking-wide text-muted-foreground uppercase"
                                            >
                                                <MapPin className="h-3 w-3" />{' '}
                                                Longitude
                                            </Label>
                                            <Input
                                                id="lng"
                                                className="h-8 font-mono text-xs"
                                                type="number"
                                                step="any"
                                                value={data.lng}
                                                onChange={(e) =>
                                                    handleCoordinateChange(
                                                        'lng',
                                                        e.target.value,
                                                    )
                                                }
                                                required
                                            />
                                        </div>
                                    </div>
                                    {errors.lat && (
                                        <p className="shrink-0 text-xs text-destructive">
                                            {errors.lat}
                                        </p>
                                    )}
                                    {errors.lng && (
                                        <p className="shrink-0 text-xs text-destructive">
                                            {errors.lng}
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    <div className="flex justify-end border-t pt-4">
                        <Button
                            type="submit"
                            size="lg"
                            disabled={processing}
                            className="bg-primary px-6 font-semibold text-primary-foreground shadow-sm"
                        >
                            <Save className="mr-2 h-4 w-4" />
                            {processing
                                ? 'Saving warehouse parameters...'
                                : 'Save Hub Profile Configuration'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
