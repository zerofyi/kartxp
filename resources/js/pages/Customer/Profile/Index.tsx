import { Head, useForm, router } from '@inertiajs/react';
import { Home, MapPin, Plus, Save, Star, User } from 'lucide-react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Profile & Addresses', href: '/customer/profile' }];

type Address = {
    id: number;
    label: string;
    name: string;
    phone: string;
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    pincode: string;
    is_default: boolean;
};

type Props = {
    user: { name: string; mobile: string; avatar?: string };
    customer: { email: string | null; loyalty_points: number } | null;
    addresses: Address[];
};

export default function CustomerProfile({ user, customer, addresses }: Props) {
    const [showAddDialog, setShowAddDialog] = useState(false);

    const form = useForm({
        label: 'Home',
        name: user.name,
        phone: user.mobile,
        line1: '',
        line2: '',
        city: '',
        state: '',
        pincode: '',
        is_default: addresses.length === 0,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/customer/profile/address', {
            onSuccess: () => {
                setShowAddDialog(false);
                form.reset('line1', 'line2', 'city', 'state', 'pincode');
            }
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Profile" />
            <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Profile & Addresses</h1>
                        <p className="text-muted-foreground">Manage your personal information and delivery locations</p>
                    </div>
                </div>

                <Tabs defaultValue="profile">
                    <TabsList className="grid grid-cols-2 w-full max-w-sm">
                        <TabsTrigger value="profile">Profile Details</TabsTrigger>
                        <TabsTrigger value="addresses">Saved Addresses</TabsTrigger>
                    </TabsList>

                    <TabsContent value="profile" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Personal Information</CardTitle>
                                <CardDescription>Your registered account details</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary">
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg">{user.name}</h3>
                                        <p className="text-muted-foreground">{user.mobile}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label>Full Name</Label>
                                        <Input value={user.name} disabled className="mt-1 bg-muted" />
                                    </div>
                                    <div>
                                        <Label>Mobile Number</Label>
                                        <Input value={user.mobile} disabled className="mt-1 bg-muted" />
                                    </div>
                                    <div>
                                        <Label>Email Address</Label>
                                        <Input value={customer?.email ?? ''} disabled placeholder="Not provided" className="mt-1 bg-muted" />
                                    </div>
                                    <div>
                                        <Label>Loyalty Points</Label>
                                        <div className="flex items-center gap-2 mt-1 px-3 py-2 border rounded-md bg-amber-50 border-amber-100 text-amber-700 font-semibold">
                                            <Star className="h-4 w-4" /> {customer?.loyalty_points ?? 0} points
                                        </div>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground pt-4 border-t">To update your phone number or email, please contact customer support.</p>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="addresses" className="mt-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Delivery Addresses</CardTitle>
                                    <CardDescription>Manage where you want your orders delivered</CardDescription>
                                </div>
                                <Button size="sm" onClick={() => setShowAddDialog(true)}>
                                    <Plus className="h-4 w-4 mr-2" /> Add New
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {addresses.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                                        <MapPin className="h-10 w-10 mb-3 opacity-40" />
                                        <p>No saved addresses</p>
                                        <Button variant="outline" className="mt-4" onClick={() => setShowAddDialog(true)}>Add your first address</Button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {addresses.map((addr) => (
                                            <div key={addr.id} className={`border rounded-lg p-4 relative ${addr.is_default ? 'border-primary ring-1 ring-primary shadow-sm' : ''}`}>
                                                {addr.is_default && (
                                                    <span className="absolute top-3 right-3 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                                                        <Star className="h-3 w-3 fill-primary" /> Default
                                                    </span>
                                                )}
                                                <div className="flex items-center gap-2 mb-2 text-muted-foreground font-medium text-sm">
                                                    {addr.label.toLowerCase() === 'home' ? <Home className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                                                    {addr.label}
                                                </div>
                                                <p className="font-semibold">{addr.name}</p>
                                                <p className="text-sm mt-1">{addr.phone}</p>
                                                <div className="mt-2 text-sm text-muted-foreground">
                                                    <p>{addr.line1}</p>
                                                    {addr.line2 && <p>{addr.line2}</p>}
                                                    <p>{addr.city}, {addr.state} {addr.pincode}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Add New Address</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={submit} className="space-y-4 mt-2">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Label (Home, Work)</Label>
                                    <Input value={form.data.label} onChange={(e) => form.setData('label', e.target.value)} required />
                                </div>
                                <div>
                                    <Label>Pincode</Label>
                                    <Input value={form.data.pincode} onChange={(e) => form.setData('pincode', e.target.value)} required />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Recipient Name</Label>
                                    <Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} required />
                                </div>
                                <div>
                                    <Label>Contact Phone</Label>
                                    <Input value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value)} required />
                                </div>
                            </div>
                            <div>
                                <Label>Address Line 1</Label>
                                <Input value={form.data.line1} onChange={(e) => form.setData('line1', e.target.value)} placeholder="House/Flat No., Building Name" required />
                            </div>
                            <div>
                                <Label>Address Line 2 (Optional)</Label>
                                <Input value={form.data.line2} onChange={(e) => form.setData('line2', e.target.value)} placeholder="Street, Area, Landmark" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>City</Label>
                                    <Input value={form.data.city} onChange={(e) => form.setData('city', e.target.value)} required />
                                </div>
                                <div>
                                    <Label>State</Label>
                                    <Input value={form.data.state} onChange={(e) => form.setData('state', e.target.value)} required />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                                <Switch checked={form.data.is_default} onCheckedChange={(v) => form.setData('is_default', v)} />
                                <Label>Make this my default address</Label>
                            </div>
                            <Button type="submit" disabled={form.processing} className="w-full mt-4">
                                {form.processing ? 'Saving...' : 'Save Address'}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
