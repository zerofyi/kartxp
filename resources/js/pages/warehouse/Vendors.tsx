import { Head, router, usePage } from '@inertiajs/react';
import {
    Edit2,
    Loader2,
    Save,
    Search,
    Trash2,
    Users,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Textarea } from '@/components/ui/textarea';
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
    { title: 'Dashboard', href: dashboard().url },
    { title: 'Vendors', href: '' },
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

type FormData = {
    name: string;
    phone: string;
    email: string;
    gstin: string;
    address: string;
};

type SharedProps = {
    flash?: { success?: string; error?: string };
    errors?: Record<string, string>;
    auth?: unknown;
    [key: string]: unknown;
};

type Props = SharedProps & {
    vendors: Vendor[];
};

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const EMPTY_FORM: FormData = { name: '', phone: '', email: '', gstin: '', address: '' };

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────
export default function Vendors({ vendors = [] }: Props) {
    const { flash, errors: pageErrors } = usePage<SharedProps>().props;

    // ── state ──
    const [searchQuery, setSearchQuery]     = useState('');
    const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
    const [isSubmitting, setIsSubmitting]   = useState(false);
    const [formData, setFormData]           = useState<FormData>(EMPTY_FORM);
    const [errors, setErrors]               = useState<Record<string, string>>({});
    const [deletingId, setDeletingId]       = useState<number | null>(null);

    const nameInputRef = useRef<HTMLInputElement>(null);

    // ── flash & server-side errors ──
    useEffect(() => {
        if (pageErrors?.form) {
            setErrors((prev) => ({ ...prev, form: pageErrors.form }));
        }
    }, [pageErrors]);

    // ── derived ──
    const trimmed     = searchQuery.trim().toLowerCase();
    const displayList = trimmed
        ? vendors.filter(
              (v) =>
                  v.name.toLowerCase().includes(trimmed) ||
                  v.phone.includes(trimmed) ||
                  v.email?.toLowerCase().includes(trimmed) ||
                  v.gstin?.toLowerCase().includes(trimmed),
          )
        : vendors;

    // ── field change helper ──
    const handleChange = useCallback(
        (field: keyof FormData) =>
            (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                setFormData((prev) => ({ ...prev, [field]: e.target.value }));
                if (errors[field]) setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
            },
        [errors],
    );

    // ── edit ──
    const handleEdit = (vendor: Vendor) => {
        setEditingVendor(vendor);
        setFormData({
            name:    vendor.name,
            phone:   vendor.phone,
            email:   vendor.email ?? '',
            gstin:   vendor.gstin ?? '',
            address: vendor.address ?? '',
        });
        setErrors({});
        setTimeout(() => nameInputRef.current?.focus(), 0);
    };

    // ── clear / cancel ──
    const handleClear = () => {
        setEditingVendor(null);
        setFormData(EMPTY_FORM);
        setErrors({});
    };

    // ── submit ──
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        const payload = {
            name:    formData.name.trim(),
            phone:   formData.phone.trim(),
            email:   formData.email.trim()   || null,
            gstin:   formData.gstin.trim()   || null,
            address: formData.address.trim() || null,
        };

        const options = {
            preserveScroll: true,
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
            router.put(`/warehouse/vendors/${editingVendor.id}`, payload, options);
        } else {
            router.post('/warehouse/vendors', payload, options);
        }
    };

    // ── delete ──
    const handleDelete = (vendor: Vendor) => {
        if (!window.confirm(`Delete "${vendor.name}"? This cannot be undone.`)) return;
        setDeletingId(vendor.id);
        router.delete(`/warehouse/vendors/${vendor.id}`, {
            preserveScroll: true,
            onFinish: () => setDeletingId(null),
        });
    };

    // ─────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Vendors" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6 lg:flex-row">

                {/* ════════════ LEFT ════════════ */}
                <div className="flex flex-1 flex-col gap-6 min-w-0">

                    {/* Flash message */}
                    {flash?.success && (
                        <Alert>
                            <AlertDescription>{flash.success}</AlertDescription>
                        </Alert>
                    )}

                    {/* General form error */}
                    {errors.form && (
                        <Alert variant="destructive">
                            <AlertDescription>{errors.form}</AlertDescription>
                        </Alert>
                    )}

                    {/* Header + Search */}
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
                                    className="pl-9 pr-9"
                                    aria-label="Search vendors"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        aria-label="Clear search"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Table */}
                    <Card className="flex-1 overflow-hidden">
                        <CardContent className="h-full overflow-auto p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[28%]">Name</TableHead>
                                        <TableHead className="w-[18%]">Phone</TableHead>
                                        <TableHead className="w-[22%]">Email</TableHead>
                                        <TableHead className="w-[18%]">GSTIN</TableHead>
                                        <TableHead className="w-[14%] text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {displayList.length > 0 ? (
                                        displayList.map((vendor) => (
                                            <TableRow
                                                key={vendor.id}
                                                data-state={editingVendor?.id === vendor.id ? 'selected' : undefined}
                                            >
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Users className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                                                        <span className="font-medium truncate">{vendor.name}</span>
                                                    </div>
                                                </TableCell>

                                                <TableCell className="font-mono text-sm text-muted-foreground">
                                                    {vendor.phone}
                                                </TableCell>

                                                <TableCell className="text-sm text-muted-foreground truncate max-w-0">
                                                    <span className="block truncate">{vendor.email ?? '—'}</span>
                                                </TableCell>

                                                <TableCell className="font-mono text-sm text-muted-foreground">
                                                    {vendor.gstin ?? '—'}
                                                </TableCell>

                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleEdit(vendor)}
                                                            disabled={isSubmitting || deletingId === vendor.id}
                                                            aria-label={`Edit ${vendor.name}`}
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDelete(vendor)}
                                                            disabled={isSubmitting || deletingId !== null}
                                                            aria-label={`Delete ${vendor.name}`}
                                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        >
                                                            {deletingId === vendor.id
                                                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                                                : <Trash2 className="h-4 w-4" />}
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell
                                                colSpan={5}
                                                className="h-32 text-center text-muted-foreground"
                                            >
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <Users className="h-8 w-8" aria-hidden />
                                                    <p>
                                                        {trimmed
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
                <div className="w-full lg:w-96 shrink-0">
                    <Card className="lg:sticky lg:top-6">
                        <CardHeader className="space-y-1">
                            <CardTitle>
                                {editingVendor ? 'Edit Vendor' : 'Add Vendor'}
                            </CardTitle>
                            <CardDescription>
                                {editingVendor ? 'Update vendor details' : 'Create a new vendor'}
                            </CardDescription>
                        </CardHeader>

                        <CardContent>
                            <form onSubmit={handleSubmit} noValidate className="space-y-5">

                                {/* Name */}
                                <div className="space-y-2">
                                    <Label htmlFor="vendor_name">
                                        Vendor Name <span className="text-destructive" aria-hidden>*</span>
                                    </Label>
                                    <Input
                                        ref={nameInputRef}
                                        id="vendor_name"
                                        value={formData.name}
                                        onChange={handleChange('name')}
                                        placeholder="e.g. Reliance Retail"
                                        disabled={isSubmitting}
                                        aria-required
                                        aria-invalid={!!errors.name}
                                        aria-describedby={errors.name ? 'vendor_name_error' : undefined}
                                        className={errors.name ? 'border-destructive' : ''}
                                        autoComplete="organization"
                                    />
                                    {errors.name && (
                                        <p id="vendor_name_error" className="text-sm text-destructive">{errors.name}</p>
                                    )}
                                </div>

                                {/* Phone */}
                                <div className="space-y-2">
                                    <Label htmlFor="vendor_phone">
                                        Phone <span className="text-destructive" aria-hidden>*</span>
                                    </Label>
                                    <Input
                                        id="vendor_phone"
                                        type="tel"
                                        value={formData.phone}
                                        onChange={handleChange('phone')}
                                        placeholder="e.g. 9876543210"
                                        disabled={isSubmitting}
                                        aria-required
                                        aria-invalid={!!errors.phone}
                                        aria-describedby={errors.phone ? 'vendor_phone_error' : undefined}
                                        className={errors.phone ? 'border-destructive' : ''}
                                        autoComplete="tel"
                                        inputMode="tel"
                                    />
                                    {errors.phone && (
                                        <p id="vendor_phone_error" className="text-sm text-destructive">{errors.phone}</p>
                                    )}
                                </div>

                                {/* Email */}
                                <div className="space-y-2">
                                    <Label htmlFor="vendor_email">Email</Label>
                                    <Input
                                        id="vendor_email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleChange('email')}
                                        placeholder="vendor@example.com"
                                        disabled={isSubmitting}
                                        aria-invalid={!!errors.email}
                                        aria-describedby={errors.email ? 'vendor_email_error' : undefined}
                                        className={errors.email ? 'border-destructive' : ''}
                                        autoComplete="email"
                                        inputMode="email"
                                    />
                                    {errors.email && (
                                        <p id="vendor_email_error" className="text-sm text-destructive">{errors.email}</p>
                                    )}
                                </div>

                                {/* GSTIN */}
                                <div className="space-y-2">
                                    <Label htmlFor="vendor_gstin">GSTIN</Label>
                                    <Input
                                        id="vendor_gstin"
                                        value={formData.gstin}
                                        onChange={handleChange('gstin')}
                                        placeholder="e.g. 22AAAAA0000A1Z5"
                                        disabled={isSubmitting}
                                        aria-invalid={!!errors.gstin}
                                        aria-describedby={errors.gstin ? 'vendor_gstin_error' : undefined}
                                        className={`font-mono uppercase ${errors.gstin ? 'border-destructive' : ''}`}
                                        maxLength={15}
                                        spellCheck={false}
                                    />
                                    {errors.gstin && (
                                        <p id="vendor_gstin_error" className="text-sm text-destructive">{errors.gstin}</p>
                                    )}
                                </div>

                                {/* Address */}
                                <div className="space-y-2">
                                    <Label htmlFor="vendor_address">Address</Label>
                                    <Textarea
                                        id="vendor_address"
                                        rows={3}
                                        value={formData.address}
                                        onChange={handleChange('address')}
                                        placeholder="Street address, city, state…"
                                        disabled={isSubmitting}
                                        aria-invalid={!!errors.address}
                                        aria-describedby={errors.address ? 'vendor_address_error' : undefined}
                                        className={errors.address ? 'border-destructive' : ''}
                                        autoComplete="street-address"
                                    />
                                    {errors.address && (
                                        <p id="vendor_address_error" className="text-sm text-destructive">{errors.address}</p>
                                    )}
                                </div>

                                {/* Buttons */}
                                <div className="flex gap-3 pt-1">
                                    <Button
                                        type="submit"
                                        className="flex-1"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                                                {editingVendor ? 'Updating…' : 'Creating…'}
                                            </>
                                        ) : (
                                            <>
                                                <Save className="mr-2 h-4 w-4" aria-hidden />
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
                                            aria-label="Cancel editing"
                                        >
                                            <X className="h-4 w-4" aria-hidden />
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
