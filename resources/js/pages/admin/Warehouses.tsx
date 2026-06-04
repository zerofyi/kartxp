import { Head, router } from '@inertiajs/react';
import {
    Edit2,
    Loader2,
    Save,
    Search,
    X,
    Warehouse as WarehouseIcon,
    User,
    MapPin,
    Mail,
    Phone,
    Lock,
    CheckCircle,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

import AppLayout from '@/layouts/admin-app-layout';
import type { BreadcrumbItem } from '@/types';
import admin from '@/routes/admin';

// ─────────────────────────────────────────────
// Breadcrumbs
// ─────────────────────────────────────────────
const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: admin.dashboard().url,
    },
    {
        title: 'Warehouses',
        href: '',
    },
];

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type User = {
    id: number;
    name: string;
    email: string;
    mobile: string;
    status: string;
};

type Warehouse = {
    id: number;
    name: string;
    address?: string;
    location?: string;
    user_id: number;
    user?: User;
    created_at: string;
    updated_at: string;
};

type Props = {
    warehouses: Warehouse[];
};

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────
export default function Warehouses({ warehouses = [] }: Props) {
    // ── state ──
    const [searchQuery, setSearchQuery] = useState('');
    const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        address: '',
        location: '',
        user_name: '',
        user_email: '',
        user_mobile: '',
        user_password: '',
        user_status: 'active',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    // ── derived ──
    const isSearching = searchQuery.trim().length > 0;
    const filtered = warehouses.filter(
        (w) =>
            w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            w.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            w.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            w.user?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            w.user?.email.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    const displayList = isSearching ? filtered : warehouses;

    // ── handlers ──
    const handleEdit = (warehouse: Warehouse) => {
        setEditingWarehouse(warehouse);
        setFormData({
            name: warehouse.name,
            location: warehouse.location ?? '',
            address: warehouse.address ?? '',
            user_name: warehouse.user?.name ?? '',
            user_email: warehouse.user?.email ?? '',
            user_mobile: warehouse.user?.mobile ?? '',
            user_password: '',
            user_status: warehouse.user?.status ?? 'active',
        });
        setErrors({});
    };

    const handleClear = () => {
        setEditingWarehouse(null);
        setFormData({
            name: '',
            address: '',
            location: '',
            user_name: '',
            user_email: '',
            user_mobile: '',
            user_password: '',
            user_status: 'active',
        });
        setErrors({});
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const data: any = {
            name: formData.name,
            address: formData.address.trim() || null,
            location: formData.location.trim() || null,
            user_name: formData.user_name,
            user_email: formData.user_email,
            user_mobile: formData.user_mobile,
            user_status: formData.user_status,
        };

        // Only include password if it's not empty
        if (formData.user_password.trim()) {
            data.user_password = formData.user_password;
        }

        const options = {
            onSuccess: () => {
                handleClear();
                setIsSubmitting(false);
            },
            onError: (errs: Record<string, string>) => {
                setErrors(errs);
                setIsSubmitting(false);
            },
        };

        if (editingWarehouse) {
            router.put(`/admin/warehouses/${editingWarehouse.id}`, data, options);
        } else {
            // Password is required for new warehouse
            if (!formData.user_password.trim()) {
                setErrors({ user_password: 'Password is required' });
                setIsSubmitting(false);
                return;
            }
            data.user_password = formData.user_password;
            router.post('/admin/warehouses', data, options);
        }
    };

    // ─────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Warehouses" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6 lg:flex-row">
                {/* ════════════ LEFT ════════════ */}
                <div className="flex flex-1 flex-col gap-6">
                    {/* Header + Search */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl">Warehouses</CardTitle>
                            <CardDescription>
                                Manage warehouse locations and their assigned managers
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="relative">
                                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search by warehouse name, location, or manager…"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Table */}
                    <Card className="flex-1 overflow-hidden">
                        <CardContent className="h-full overflow-auto p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[25%]">Warehouse</TableHead>
                                        <TableHead className="w-[20%]">Location</TableHead>
                                        <TableHead className="w-[25%]">Manager</TableHead>
                                        <TableHead className="w-[20%]">Contact</TableHead>
                                        <TableHead className="w-[5%]">Status</TableHead>
                                        <TableHead className="w-[5%] text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {displayList.length > 0 ? (
                                        displayList.map((warehouse) => (
                                            <TableRow key={warehouse.id}>
                                                <TableCell>
                                                    <div className="flex items-start gap-2">
                                                        <WarehouseIcon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                                                        <div>
                                                            <div className="font-medium">{warehouse.name}</div>
                                                            {warehouse.address && (
                                                                <div className="text-xs text-muted-foreground line-clamp-1">
                                                                    {warehouse.address}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    {warehouse.location ? (
                                                        <div className="flex items-center gap-2">
                                                            <MapPin className="h-3 w-3 text-muted-foreground" />
                                                            <span className="text-sm">{warehouse.location}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">—</span>
                                                    )}
                                                </TableCell>

                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                        <div>
                                                            <div className="text-sm font-medium">
                                                                {warehouse.user?.name ?? '—'}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {warehouse.user?.email ?? '—'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                <TableCell className="text-sm text-muted-foreground">
                                                    {warehouse.user?.mobile ?? '—'}
                                                </TableCell>

                                                <TableCell>
                                                    {warehouse.user?.status ? (
                                                        <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100">
                                                            <CheckCircle className="mr-1 h-3 w-3" />
                                                            Active
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="destructive">
                                                            <XCircle className="mr-1 h-3 w-3" />
                                                            Inactive
                                                        </Badge>
                                                    )}
                                                </TableCell>

                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleEdit(warehouse)}
                                                        disabled={isSubmitting}
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell
                                                colSpan={6}
                                                className="h-32 text-center text-muted-foreground"
                                            >
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <WarehouseIcon className="h-8 w-8" />
                                                    <p>
                                                        {isSearching
                                                            ? `No warehouses match "${searchQuery}"`
                                                            : 'No warehouses yet. Create your first one!'}
                                                    </p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                {/* ════════════ RIGHT — Form ════════════ */}
                <div className="w-full lg:w-105">
                    <Card className="lg:sticky lg:top-6">
                        <CardHeader className="space-y-1">
                            <CardTitle>
                                {editingWarehouse ? 'Edit Warehouse' : 'Add Warehouse'}
                            </CardTitle>
                            <CardDescription>
                                {editingWarehouse
                                    ? 'Update warehouse and manager details'
                                    : 'Create a new warehouse with a manager account'}
                            </CardDescription>
                        </CardHeader>

                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* ═══ Warehouse Details ═══ */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                        Warehouse Details
                                    </h3>

                                    {/* Name */}
                                    <div className="space-y-2">
                                        <Label htmlFor="warehouse_name">
                                            Warehouse Name <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            id="warehouse_name"
                                            value={formData.name}
                                            onChange={(e) =>
                                                setFormData({ ...formData, name: e.target.value })
                                            }
                                            placeholder="e.g. Main Warehouse, Warehouse A"
                                            disabled={isSubmitting}
                                            className={errors.name ? 'border-destructive' : ''}
                                        />
                                        {errors.name && (
                                            <p className="text-sm text-destructive">{errors.name}</p>
                                        )}
                                    </div>

                                    {/* Location */}
                                    <div className="space-y-2">
                                        <Label htmlFor="warehouse_location">Location</Label>
                                        <Input
                                            id="warehouse_location"
                                            value={formData.location}
                                            onChange={(e) =>
                                                setFormData({ ...formData, location: e.target.value })
                                            }
                                            placeholder="e.g. Kolkata, Mumbai"
                                            disabled={isSubmitting}
                                            className={errors.location ? 'border-destructive' : ''}
                                        />
                                        {errors.location && (
                                            <p className="text-sm text-destructive">{errors.location}</p>
                                        )}
                                    </div>

                                    {/* Address */}
                                    <div className="space-y-2">
                                        <Label htmlFor="warehouse_address">Full Address</Label>
                                        <textarea
                                            id="warehouse_address"
                                            rows={3}
                                            value={formData.address}
                                            onChange={(e) =>
                                                setFormData({ ...formData, address: e.target.value })
                                            }
                                            placeholder="Street address, city, state, PIN code…"
                                            disabled={isSubmitting}
                                            className={`flex w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
                                                errors.address ? 'border-destructive' : 'border-input'
                                            }`}
                                        />
                                        {errors.address && (
                                            <p className="text-sm text-destructive">{errors.address}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="border-t" />

                                {/* ═══ Manager Details ═══ */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                        Manager Account
                                    </h3>

                                    {/* Manager Name */}
                                    <div className="space-y-2">
                                        <Label htmlFor="user_name">
                                            Manager Name <span className="text-destructive">*</span>
                                        </Label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                            <Input
                                                id="user_name"
                                                value={formData.user_name}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, user_name: e.target.value })
                                                }
                                                placeholder="e.g. John Doe"
                                                disabled={isSubmitting}
                                                className={`pl-9 ${errors.user_name ? 'border-destructive' : ''}`}
                                            />
                                        </div>
                                        {errors.user_name && (
                                            <p className="text-sm text-destructive">{errors.user_name}</p>
                                        )}
                                    </div>

                                    {/* Email */}
                                    <div className="space-y-2">
                                        <Label htmlFor="user_email">
                                            Email <span className="text-destructive">*</span>
                                        </Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                            <Input
                                                id="user_email"
                                                type="email"
                                                value={formData.user_email}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, user_email: e.target.value })
                                                }
                                                placeholder="manager@example.com"
                                                disabled={isSubmitting}
                                                className={`pl-9 ${errors.user_email ? 'border-destructive' : ''}`}
                                            />
                                        </div>
                                        {errors.user_email && (
                                            <p className="text-sm text-destructive">{errors.user_email}</p>
                                        )}
                                    </div>

                                    {/* Mobile */}
                                    <div className="space-y-2">
                                        <Label htmlFor="user_mobile">
                                            Mobile <span className="text-destructive">*</span>
                                        </Label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                            <Input
                                                id="user_mobile"
                                                type="tel"
                                                value={formData.user_mobile}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, user_mobile: e.target.value })
                                                }
                                                placeholder="9876543210"
                                                disabled={isSubmitting}
                                                className={`pl-9 ${errors.user_mobile ? 'border-destructive' : ''}`}
                                            />
                                        </div>
                                        {errors.user_mobile && (
                                            <p className="text-sm text-destructive">{errors.user_mobile}</p>
                                        )}
                                    </div>

                                    {/* Password */}
                                    <div className="space-y-2">
                                        <Label htmlFor="user_password">
                                            Password {!editingWarehouse && <span className="text-destructive">*</span>}
                                        </Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                            <Input
                                                id="user_password"
                                                type="password"
                                                value={formData.user_password}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, user_password: e.target.value })
                                                }
                                                placeholder={editingWarehouse ? "Leave empty to keep current" : "Minimum 8 characters"}
                                                disabled={isSubmitting}
                                                className={`pl-9 ${errors.user_password ? 'border-destructive' : ''}`}
                                            />
                                        </div>
                                        {errors.user_password && (
                                            <p className="text-sm text-destructive">{errors.user_password}</p>
                                        )}
                                    </div>

                                    {/* Status (only in edit mode) */}
                                    {editingWarehouse && (
                                        <div className="flex items-center justify-between rounded-lg border p-4">
                                            <div className="space-y-0.5">
                                                <Label htmlFor="user_status" className="text-base">
                                                    Account Status
                                                </Label>
                                                <div className="text-sm text-muted-foreground">
                                                    Enable or disable manager login access
                                                </div>
                                            </div>
                                            <Switch
                                                id="user_status"
                                                checked={formData.user_status === 'active'}
                                                onCheckedChange={(checked) =>
                                                    setFormData({ ...formData, user_status: checked ? 'active' : 'inactive' })
                                                }
                                                disabled={isSubmitting}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Buttons */}
                                <div className="flex gap-3 pt-2">
                                    <Button
                                        type="submit"
                                        className="flex-1"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                {editingWarehouse ? 'Updating…' : 'Creating…'}
                                            </>
                                        ) : (
                                            <>
                                                <Save className="mr-2 h-4 w-4" />
                                                {editingWarehouse ? 'Update' : 'Create'}
                                            </>
                                        )}
                                    </Button>

                                    {editingWarehouse && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleClear}
                                            disabled={isSubmitting}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
