import { Head, useForm, router } from '@inertiajs/react';
import { Settings, Plus, Truck, Trash2 } from 'lucide-react';
import { useState } from 'react';
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
import SettingsNav from './SettingsNav';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Warehouse Settings', href: '/warehouse/settings' }];

type ShippingZone = {
    id: number;
    name: string;
    pincodes: string[] | null;
    charge: number;
    free_above: number | null;
    is_active: boolean;
};

type Props = {
    zones: ShippingZone[];
};

export default function ShippingZonesPage({ zones }: Props) {
    const [showZoneDialog, setShowZoneDialog] = useState(false);
    const [editZone, setEditZone] = useState<ShippingZone | null>(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: '',
        pincodes: '',
        charge: '0',
        free_above: '',
        is_active: true,
    });

    const openCreateZone = () => {
        clearErrors();
        setEditZone(null);
        reset();
        setShowZoneDialog(true);
    };

    const openEditZone = (zone: ShippingZone) => {
        clearErrors();
        setEditZone(zone);
        setData({
            name: zone.name,
            pincodes: zone.pincodes ? zone.pincodes.join(', ') : '',
            charge: String(zone.charge),
            free_above: zone.free_above ? String(zone.free_above) : '',
            is_active: zone.is_active,
        });
        setShowZoneDialog(true);
    };

    const submitZone = (e: React.FormEvent) => {
        e.preventDefault();

        // Safe normalization parsing text area line inputs to array string collections
        const codesParsed = data.pincodes
            ? data.pincodes.split(',').map(p => p.trim()).filter(p => p.length > 0)
            : [];

        const payload = {
            ...data,
            pincodes: codesParsed.length > 0 ? codesParsed : null,
            charge: Number(data.charge),
            free_above: data.free_above ? Number(data.free_above) : null,
        };

        if (editZone) {
            router.put(`/warehouse/settings/shipping-zones/${editZone.id}`, payload, {
                onSuccess: () => setShowZoneDialog(false)
            });
        } else {
            router.post('/warehouse/settings/shipping-zones', payload, {
                onSuccess: () => setShowZoneDialog(false)
            });
        }
    };

    const deleteZone = (id: number) => {
        if (confirm('Are you absolutely sure you want to remove this logistics dispatch region?')) {
            router.delete(`/warehouse/settings/shipping-zones/${id}`);
        }
    };

    const fmt = (n: number) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Logistics Zone Preferences — Warehouse" />
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
                                            <TableCell className="text-xs text-muted-foreground max-w-xs truncate" title={zone.pincodes ? zone.pincodes.join(', ') : 'Global'}>
                                                {zone.pincodes ? `${zone.pincodes.length} postcodes mapped` : 'Global Catch-All (All Areas)'}
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-bold text-xs">{fmt(zone.charge)}</TableCell>
                                            <TableCell className="text-right font-mono text-xs">{zone.free_above ? fmt(zone.free_above) : '—'}</TableCell>
                                            <TableCell>
                                                <Badge variant={zone.is_active ? 'default' : 'secondary'} className="text-[10px]">
                                                    {zone.is_active ? 'Active Line' : 'Offline / Interrupted'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex gap-1 justify-center">
                                                    <Button size="sm" variant="outline" className="h-7 text-xs px-2.5" onClick={() => openEditZone(zone)}>Edit</Button>
                                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => deleteZone(zone.id)}>
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

                {/* Dialog Form Modal */}
                <Dialog open={showZoneDialog} onOpenChange={setShowZoneDialog}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-base font-bold">
                                {editZone ? 'Edit Shipping Adjustment Metrics' : 'Append Logistic Service Zone'}
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={submitZone} className="space-y-4 mt-2">
                            <div className="space-y-1">
                                <Label htmlFor="zone_name" className="text-xs font-semibold">Zone Identifier Name</Label>
                                <Input id="zone_name" value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="E.g. Berhampore Corporate Area" required />
                                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="pincodes" className="text-xs font-semibold">Postcodes Coverage Mapping (Comma-Separated)</Label>
                                <Input id="pincodes" className="font-mono text-xs" value={data.pincodes} onChange={(e) => setData('pincodes', e.target.value)} placeholder="1207, 1209, 1212..." />
                                <p className="text-[10px] text-muted-foreground">Keep this blank to apply this zone configuration to all addresses.</p>
                                {errors.pincodes && <p className="text-xs text-destructive">{errors.pincodes}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label htmlFor="charge" className="text-xs font-semibold">Fulfillment Base Charge (₹)</Label>
                                    <Input id="charge" type="number" step="0.01" value={data.charge} onChange={(e) => setData('charge', e.target.value)} required />
                                    {errors.charge && <p className="text-xs text-destructive">{errors.charge}</p>}
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="free_above" className="text-xs font-semibold">Free Shipping Tier (₹)</Label>
                                    <Input id="free_above" type="number" step="0.01" value={data.free_above} onChange={(e) => setData('free_above', e.target.value)} placeholder="Optional Limit..." />
                                    {errors.free_above && <p className="text-xs text-destructive">{errors.free_above}</p>}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl border">
                                <Switch id="is_active" checked={data.is_active} onCheckedChange={(checked) => setData('is_active', checked)} />
                                <div className="space-y-0.5">
                                    <Label htmlFor="is_active" className="text-xs font-semibold">Line Route Operations Status</Label>
                                    <p className="text-[10px] text-muted-foreground">Turn off to temporarily stop routing or processing checkout options for this zone.</p>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2 border-t justify-end">
                                <Button type="button" variant="ghost" size="sm" onClick={() => setShowZoneDialog(false)}>Cancel</Button>
                                <Button type="submit" size="sm" disabled={processing}>
                                    {editZone ? 'Commit System Profile adjustments' : 'Write Freight Zone'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
