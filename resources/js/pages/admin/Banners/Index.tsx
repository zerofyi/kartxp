import { Head, useForm } from '@inertiajs/react';
import { Image, Plus, Trash2, ToggleLeft, ToggleRight, ChevronUp, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import AdminAppLayout from '@/layouts/admin-app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Banners', href: '/admin/banners' }];

type Banner = {
    id: number;
    title: string;
    image_path: string;
    position: string;
    sort_order: number;
    is_active: boolean;
    link_type: string;
    link_value: string | null;
    starts_at: string | null;
    ends_at: string | null;
};

type Props = { banners: Banner[] };

const positionColors: Record<string, string> = {
    home_hero: 'bg-blue-100 text-blue-700',
    home_mid: 'bg-green-100 text-green-700',
    category: 'bg-orange-100 text-orange-700',
};

export default function BannersIndex({ banners }: Props) {
    const [showDialog, setShowDialog] = useState(false);
    const [editBanner, setEditBanner] = useState<Banner | null>(null);

    const form = useForm({
        title: '',
        image_path: '',
        position: 'home_hero',
        link_type: 'none',
        link_value: '',
        sort_order: '0',
        is_active: true,
        starts_at: '',
        ends_at: '',
    });

    const openCreate = () => {
        form.reset();
        setEditBanner(null);
        setShowDialog(true);
    };

    const openEdit = (b: Banner) => {
        setEditBanner(b);
        form.setData({
            title: b.title,
            image_path: b.image_path,
            position: b.position,
            link_type: b.link_type,
            link_value: b.link_value ?? '',
            sort_order: String(b.sort_order),
            is_active: b.is_active,
            starts_at: b.starts_at ?? '',
            ends_at: b.ends_at ?? '',
        });
        setShowDialog(true);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editBanner) {
            form.put(`/admin/banners/${editBanner.id}`, { onSuccess: () => setShowDialog(false) });
        } else {
            form.post('/admin/banners', { onSuccess: () => setShowDialog(false) });
        }
    };

    const toggleActive = (b: Banner) => {
        useForm({ is_active: !b.is_active }).put(`/admin/banners/${b.id}`);
    };

    const deleteBanner = (id: number) => {
        if (confirm('Delete this banner?')) {
            useForm({}).delete(`/admin/banners/${id}`);
        }
    };

    return (
        <AdminAppLayout breadcrumbs={breadcrumbs}>
            <Head title="Banners — Admin" />
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Banners</h1>
                        <p className="text-muted-foreground">{banners.length} banners configured</p>
                    </div>
                    <Button onClick={openCreate}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Banner
                    </Button>
                </div>

                {banners.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center py-16">
                            <Image className="h-12 w-12 text-muted-foreground opacity-40 mb-4" />
                            <p className="text-muted-foreground">No banners yet. Add your first banner!</p>
                            <Button className="mt-4" onClick={openCreate}>
                                <Plus className="h-4 w-4 mr-2" />Add Banner
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {banners.map((banner) => (
                            <Card key={banner.id} className={`overflow-hidden ${!banner.is_active ? 'opacity-60' : ''}`}>
                                <div className="relative h-40 bg-muted">
                                    {banner.image_path ? (
                                        <img
                                            src={banner.image_path.startsWith('http') ? banner.image_path : `/storage/${banner.image_path}`}
                                            alt={banner.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full">
                                            <Image className="h-10 w-10 text-muted-foreground opacity-40" />
                                        </div>
                                    )}
                                    <div className="absolute top-2 left-2">
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${positionColors[banner.position] ?? 'bg-gray-100 text-gray-700'}`}>
                                            {banner.position.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <div className="absolute top-2 right-2">
                                        <Badge variant={banner.is_active ? 'default' : 'secondary'} className="text-xs">
                                            {banner.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </div>
                                </div>
                                <CardContent className="pt-3 pb-4">
                                    <p className="font-semibold truncate">{banner.title}</p>
                                    {banner.link_type !== 'none' && (
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            Links to: {banner.link_type} {banner.link_value ? `— ${banner.link_value}` : ''}
                                        </p>
                                    )}
                                    <p className="text-xs text-muted-foreground mt-1">Sort: #{banner.sort_order}</p>
                                    <div className="flex gap-2 mt-3">
                                        <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(banner)}>Edit</Button>
                                        <Button size="sm" variant="ghost" onClick={() => deleteBanner(banner.id)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Create/Edit Dialog */}
                <Dialog open={showDialog} onOpenChange={setShowDialog}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>{editBanner ? 'Edit Banner' : 'Add Banner'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={submit} className="space-y-4 mt-2">
                            <div>
                                <Label>Title</Label>
                                <Input className="mt-1" value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} required />
                            </div>
                            <div>
                                <Label>Image Path / URL</Label>
                                <Input className="mt-1" value={form.data.image_path} onChange={(e) => form.setData('image_path', e.target.value)} placeholder="/storage/banners/hero.jpg" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label>Position</Label>
                                    <Select value={form.data.position} onValueChange={(v) => form.setData('position', v)}>
                                        <SelectTrigger className="mt-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="home_hero">Home Hero</SelectItem>
                                            <SelectItem value="home_mid">Home Mid</SelectItem>
                                            <SelectItem value="category">Category</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Sort Order</Label>
                                    <Input type="number" className="mt-1" value={form.data.sort_order} onChange={(e) => form.setData('sort_order', e.target.value)} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label>Link Type</Label>
                                    <Select value={form.data.link_type} onValueChange={(v) => form.setData('link_type', v)}>
                                        <SelectTrigger className="mt-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            <SelectItem value="category">Category</SelectItem>
                                            <SelectItem value="product">Product</SelectItem>
                                            <SelectItem value="brand">Brand</SelectItem>
                                            <SelectItem value="url">Custom URL</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Link Value (ID or URL)</Label>
                                    <Input className="mt-1" value={form.data.link_value} onChange={(e) => form.setData('link_value', e.target.value)} disabled={form.data.link_type === 'none'} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label>Starts At</Label>
                                    <Input type="datetime-local" className="mt-1" value={form.data.starts_at} onChange={(e) => form.setData('starts_at', e.target.value)} />
                                </div>
                                <div>
                                    <Label>Ends At</Label>
                                    <Input type="datetime-local" className="mt-1" value={form.data.ends_at} onChange={(e) => form.setData('ends_at', e.target.value)} />
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Switch checked={form.data.is_active} onCheckedChange={(v) => form.setData('is_active', v)} />
                                <Label>Active</Label>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button type="submit" disabled={form.processing} className="flex-1">
                                    {form.processing ? 'Saving...' : (editBanner ? 'Update Banner' : 'Create Banner')}
                                </Button>
                                <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminAppLayout>
    );
}
