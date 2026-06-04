import { Head, router } from '@inertiajs/react';
import {
    Edit2,
    Loader2,
    Save,
    Search,
    X,
    Users,
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

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import type { BreadcrumbItem } from '@/types';

// ─────────────────────────────────────────────
// Breadcrumbs
// ─────────────────────────────────────────────
const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
    {
        title: 'Vendors',
        href: '',
    },
];

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type Vendor = {
    id: number;
    name: string;
    phone: string;
    email: string | null;
    gstin: string | null;
    address: string | null;
    created_at: string;
    updated_at: string;
};

type Props = {
    vendors: Vendor[];
};

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────
export default function Vendors({ vendors = [] }: Props) {
    // ── state ──
    const [searchQuery, setSearchQuery] = useState('');
    const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        gstin: '',
        address: '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    // ── derived ──
    const isSearching = searchQuery.trim().length > 0;
    const filtered = vendors.filter(
        (v) =>
            v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.phone.includes(searchQuery) ||
            (v.email && v.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (v.gstin && v.gstin.toLowerCase().includes(searchQuery.toLowerCase())),
    );
    const displayList = isSearching ? filtered : vendors;

    // ── handlers ──
    const handleEdit = (vendor: Vendor) => {
        setEditingVendor(vendor);
        setFormData({
            name: vendor.name,
            phone: vendor.phone,
            email: vendor.email ?? '',
            gstin: vendor.gstin ?? '',
            address: vendor.address ?? '',
        });
        setErrors({});
    };

    const handleClear = () => {
        setEditingVendor(null);
        setFormData({ name: '', phone: '', email: '', gstin: '', address: '' });
        setErrors({});
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const data = {
            name: formData.name,
            phone: formData.phone,
            email: formData.email.trim() || null,
            gstin: formData.gstin.trim() || null,
            address: formData.address.trim() || null,
        };

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

        if (editingVendor) {
            router.put(`/warehouse/vendors/${editingVendor.id}`, data, options);
        } else {
            router.post('/warehouse/vendors', data, options);
        }
    };

    // ─────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Vendors" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6 lg:flex-row">
                {/* ════════════ LEFT ════════════ */}
                <div className="flex flex-1 flex-col gap-6">
                    {/* Header + Search — single card, same as Category */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl">Vendors</CardTitle>
                            <CardDescription>
                                Manage your vendor contacts and details
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="relative">
                                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name, phone, email or GSTIN…"
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
                                        <TableHead className="w-[30%]">Name</TableHead>
                                        <TableHead className="w-[20%]">Phone</TableHead>
                                        <TableHead className="w-[22%]">Email</TableHead>
                                        <TableHead className="w-[18%]">GSTIN</TableHead>
                                        <TableHead className="w-[10%] text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {displayList.length > 0 ? (
                                        displayList.map((vendor) => (
                                            <TableRow key={vendor.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                        <span className="font-medium">{vendor.name}</span>
                                                    </div>
                                                </TableCell>

                                                <TableCell className="font-mono text-sm text-muted-foreground">
                                                    {vendor.phone}
                                                </TableCell>

                                                <TableCell className="text-sm text-muted-foreground">
                                                    {vendor.email ?? '—'}
                                                </TableCell>

                                                <TableCell className="font-mono text-sm text-muted-foreground">
                                                    {vendor.gstin ?? '—'}
                                                </TableCell>

                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleEdit(vendor)}
                                                        disabled={isSubmitting}
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        /* empty states — mirrors Category pattern */
                                        <TableRow>
                                            <TableCell
                                                colSpan={5}
                                                className="h-32 text-center text-muted-foreground"
                                            >
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <Users className="h-8 w-8" />
                                                    <p>
                                                        {isSearching
                                                            ? `No vendors match "${searchQuery}"`
                                                            : 'No vendors yet. Create your first one!'}
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
                <div className="w-full lg:w-100">
                    <Card className="lg:sticky lg:top-6">
                        <CardHeader className="space-y-1">
                            <CardTitle>
                                {editingVendor ? 'Edit Vendor' : 'Add Vendor'}
                            </CardTitle>
                            <CardDescription>
                                {editingVendor
                                    ? 'Update vendor details'
                                    : 'Create a new vendor'}
                            </CardDescription>
                        </CardHeader>

                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Name */}
                                <div className="space-y-2">
                                    <Label htmlFor="vendor_name">
                                        Vendor Name <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="vendor_name"
                                        value={formData.name}
                                        onChange={(e) =>
                                            setFormData({ ...formData, name: e.target.value })
                                        }
                                        placeholder="e.g. Reliance Retail"
                                        disabled={isSubmitting}
                                        className={errors.name ? 'border-destructive' : ''}
                                    />
                                    {errors.name && (
                                        <p className="text-sm text-destructive">{errors.name}</p>
                                    )}
                                </div>

                                {/* Phone */}
                                <div className="space-y-2">
                                    <Label htmlFor="vendor_phone">
                                        Phone <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="vendor_phone"
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) =>
                                            setFormData({ ...formData, phone: e.target.value })
                                        }
                                        placeholder="e.g. 9876543210"
                                        disabled={isSubmitting}
                                        className={errors.phone ? 'border-destructive' : ''}
                                    />
                                    {errors.phone && (
                                        <p className="text-sm text-destructive">{errors.phone}</p>
                                    )}
                                </div>

                                {/* Email */}
                                <div className="space-y-2">
                                    <Label htmlFor="vendor_email">Email</Label>
                                    <Input
                                        id="vendor_email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) =>
                                            setFormData({ ...formData, email: e.target.value })
                                        }
                                        placeholder="vendor@example.com"
                                        disabled={isSubmitting}
                                        className={errors.email ? 'border-destructive' : ''}
                                    />
                                    {errors.email && (
                                        <p className="text-sm text-destructive">{errors.email}</p>
                                    )}
                                </div>

                                {/* GSTIN */}
                                <div className="space-y-2">
                                    <Label htmlFor="vendor_gstin">GSTIN</Label>
                                    <Input
                                        id="vendor_gstin"
                                        value={formData.gstin}
                                        onChange={(e) =>
                                            setFormData({ ...formData, gstin: e.target.value })
                                        }
                                        placeholder="e.g. 22AAAAA0000A1Z5"
                                        disabled={isSubmitting}
                                        className={`font-mono ${errors.gstin ? 'border-destructive' : ''}`}
                                    />
                                    {errors.gstin && (
                                        <p className="text-sm text-destructive">{errors.gstin}</p>
                                    )}
                                </div>

                                {/* Address */}
                                <div className="space-y-2">
                                    <Label htmlFor="vendor_address">Address</Label>
                                    <textarea
                                        id="vendor_address"
                                        rows={3}
                                        value={formData.address}
                                        onChange={(e) =>
                                            setFormData({ ...formData, address: e.target.value })
                                        }
                                        placeholder="Street address, city, state…"
                                        disabled={isSubmitting}
                                        className={`flex w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
                                            errors.address ? 'border-destructive' : 'border-input'
                                        }`}
                                    />
                                    {errors.address && (
                                        <p className="text-sm text-destructive">{errors.address}</p>
                                    )}
                                </div>

                                {/* Buttons — identical pattern to Category */}
                                <div className="flex gap-3 pt-2">
                                    <Button
                                        type="submit"
                                        className="flex-1"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                {editingVendor ? 'Updating…' : 'Creating…'}
                                            </>
                                        ) : (
                                            <>
                                                <Save className="mr-2 h-4 w-4" />
                                                {editingVendor ? 'Update' : 'Create'}
                                            </>
                                        )}
                                    </Button>

                                    {editingVendor && (
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
