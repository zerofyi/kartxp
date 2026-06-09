import { Head, useForm } from '@inertiajs/react';
import { Settings, Save, MapPin } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import SettingsNav from './SettingsNav';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Warehouse Settings', href: '/warehouse/settings' }];

type Warehouse = {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    address: string;
    gstin: string | null;
    lat: number | null;
    lng: number | null;
    logo_path: string | null;
};

type Props = {
    warehouse: Warehouse;
};

export default function BusinessProfilePage({ warehouse }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        name: warehouse.name,
        phone: warehouse.phone ?? '',
        email: warehouse.email ?? '',
        address: warehouse.address ?? '',
        gstin: warehouse.gstin ?? '',
        lat: warehouse.lat ? String(warehouse.lat) : '',
        lng: warehouse.lng ? String(warehouse.lng) : '',
        logo: null as File | null,
    });

    const saveProfile = (e: React.FormEvent) => {
        e.preventDefault();

        // Use a standard POST form to safely handle multipart file data uploads
        post(`/warehouse/settings/profile/${warehouse.id}`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Business Profile Settings — Warehouse" />
            <div className="p-6 space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Settings className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Warehouse Settings</h1>
                        <p className="text-muted-foreground">Configure profile properties and local geographical bounds</p>
                    </div>
                </div>

                <SettingsNav activeTab="profile" />

                <Card>
                    <CardHeader>
                        <CardTitle>Business Profile Identity</CardTitle>
                        <CardDescription>Update corporate identification tokens shown on invoicing and delivery documentation layouts</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={saveProfile} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label htmlFor="name">Warehouse Name</Label>
                                    <Input id="name" value={data.name} onChange={(e) => setData('name', e.target.value)} required />
                                    {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="phone">Contact Phone</Label>
                                    <Input id="phone" value={data.phone} onChange={(e) => setData('phone', e.target.value)} />
                                    {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="email">Public Email Address</Label>
                                    <Input id="email" type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} />
                                    {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="gstin">GSTIN / Tax Registry Identification Token</Label>
                                    <Input id="gstin" className="font-mono uppercase" value={data.gstin} onChange={(e) => setData('gstin', e.target.value)} placeholder="E.g. 15AAAAA0000A1Z5" />
                                    {errors.gstin && <p className="text-xs text-destructive">{errors.gstin}</p>}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="address">Physical Street Address Map Description</Label>
                                <Textarea id="address" rows={2} value={data.address} onChange={(e) => setData('address', e.target.value)} required />
                                {errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label htmlFor="lat" className="flex items-center gap-1"><MapPin className="h-3 w-3 text-muted-foreground" /> Latitude Coordinate Mapping</Label>
                                    <Input id="lat" type="number" step="any" value={data.lat} onChange={(e) => setData('lat', e.target.value)} />
                                    {errors.lat && <p className="text-xs text-destructive">{errors.lat}</p>}
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="lng" className="flex items-center gap-1"><MapPin className="h-3 w-3 text-muted-foreground" /> Longitude Coordinate Mapping</Label>
                                    <Input id="lng" type="number" step="any" value={data.lng} onChange={(e) => setData('lng', e.target.value)} />
                                    {errors.lng && <p className="text-xs text-destructive">{errors.lng}</p>}
                                </div>
                            </div>

                            <div className="space-y-1 pt-2">
                                <Label htmlFor="logo">Upload Brand Invoicing Logo Graphic</Label>
                                <Input id="logo" type="file" accept="image/*" onChange={(e) => setData('logo', e.target.files ? e.target.files[0] : null)} className="max-w-xs mt-1" />
                                <p className="text-xs text-muted-foreground mt-1">Image requirements: Max dimensions up to 2MB as clean PNG or JPEG arrays.</p>
                                {errors.logo && <p className="text-xs text-destructive font-semibold">{errors.logo}</p>}
                                {warehouse.logo_path && (
                                    <div className="mt-2 p-2 border rounded-lg bg-muted/30 w-fit">
                                        <img src={`/storage/${warehouse.logo_path}`} alt="Warehouse Logo View" className="h-12 w-auto object-contain rounded" />
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end pt-4 border-t mt-4">
                                <Button type="submit" disabled={processing}>
                                    <Save className="h-4 w-4 mr-2" />
                                    {processing ? 'Saving changes...' : 'Save Profile Details'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
