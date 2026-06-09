import { Head, useForm } from '@inertiajs/react';
import {
    ChevronLeft,
    Loader2,
    Lock,
    Mail,
    MapPin,
    Phone,
    Save,
    User,
    Warehouse as WarehouseIcon,
} from 'lucide-react';
import { useEffect } from 'react';

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
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea'; // Use shadcn Textarea component
import { Switch } from '@/components/ui/switch'; // Use shadcn Switch component
import AppLayout from '@/layouts/admin-app-layout';
import admin from '@/routes/admin';
import type { BreadcrumbItem } from '@/types';
import { router } from '@inertiajs/react';

// Constants
const PLATFORMS = [
    { value: 'ghorerbazar', label: 'GhorerBazar' },
    { value: 'foodbazar', label: 'FoodBazar' },
    { value: 'mobilebazar', label: 'MobileBazar' },
] as const;

const PASSWORD_MIN_LENGTH = 8;

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: admin.dashboard().url },
    { title: 'Warehouses', href: '/admin/warehouses' },
    { title: 'Create', href: '' },
];

// Validation helper
const validateForm = (data: typeof initialFormData) => {
    const errors: Record<string, string> = {};

    if (!data.platform) {
        errors.platform = 'Platform is required';
    }
    if (!data.name?.trim()) {
        errors.name = 'Warehouse name is required';
    } else if (data.name.length < 2) {
        errors.name = 'Warehouse name must be at least 2 characters';
    } else if (data.name.length > 100) {
        errors.name = 'Warehouse name must be less than 100 characters';
    }
    if (data.location && !isValidUrl(data.location)) {
        errors.location = 'Please enter a valid URL';
    }
    if (data.address && data.address.length > 500) {
        errors.address = 'Address must be less than 500 characters';
    }
    if (!data.user_name?.trim()) {
        errors.user_name = 'Owner name is required';
    } else if (data.user_name.length < 2) {
        errors.user_name = 'Name must be at least 2 characters';
    }
    if (!data.user_email?.trim()) {
        errors.user_email = 'Email is required';
    } else if (!isValidEmail(data.user_email)) {
        errors.user_email = 'Please enter a valid email address';
    }
    if (!data.user_mobile?.trim()) {
        errors.user_mobile = 'Mobile number is required';
    } else if (!isValidMobile(data.user_mobile)) {
        errors.user_mobile = 'Please enter a valid mobile number';
    }
    if (!data.user_password) {
        errors.user_password = 'Password is required';
    } else if (data.user_password.length < PASSWORD_MIN_LENGTH) {
        errors.user_password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
    }

    return errors;
};

const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
    return emailRegex.test(email);
};

const isValidMobile = (mobile: string): boolean => {
    const mobileRegex = /^[0-9]{10}$/;
    return mobileRegex.test(mobile.replace(/\D/g, ''));
};

const isValidUrl = (url: string): boolean => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

const initialFormData = {
    platform: '',
    name: '',
    location: '',
    address: '',
    is_active: true,
    user_name: '',
    user_email: '',
    user_mobile: '',
    user_password: '',
};

export default function WarehouseCreate() {
    const form = useForm(initialFormData);

    // Auto-validation on field changes (optional, for better UX)
    const handleFieldChange = (field: keyof typeof initialFormData, value: any) => {
        form.setData(field, value);
        // Clear field-specific error when user starts typing
        if (form.errors[field]) {
            form.clearErrors(field);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Client-side validation before submission
        const errors = validateForm(form.data);
        if (Object.keys(errors).length > 0) {
            form.setError(errors);
            // Scroll to first error
            const firstErrorField = Object.keys(errors)[0];
            document.getElementById(firstErrorField)?.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
            return;
        }

        form.post('/admin/warehouses', {
            onSuccess: () => {
                // Optional: Show success toast/notification
                console.log('Warehouse created successfully');
            },
            onError: (errors) => {
                // Handle server-side validation errors
                console.error('Creation failed:', errors);
                // Scroll to first error from server
                const firstErrorField = Object.keys(errors)[0];
                if (firstErrorField) {
                    document.getElementById(firstErrorField)?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                }
            },
        });
    };

    // Warn user about unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (form.isDirty && !form.processing) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [form.isDirty, form.processing]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Warehouse" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                {/* Header */}
                <Card>
                    <CardHeader>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle className="text-2xl font-bold">
                                    Create Warehouse
                                </CardTitle>
                                <CardDescription>
                                    Set up a new warehouse and its owner account
                                </CardDescription>
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => router.visit('/admin/warehouses')}
                                disabled={form.processing}
                            >
                                <ChevronLeft className="mr-2 size-4" />
                                Back
                            </Button>
                        </div>
                    </CardHeader>
                </Card>

                <form onSubmit={handleSubmit} noValidate>
                    <div className="grid gap-4 lg:grid-cols-2">
                        {/* Warehouse Details */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <div className="rounded-md bg-primary/10 p-2">
                                        <WarehouseIcon className="size-5 text-primary" aria-hidden="true" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base">
                                            Warehouse Details
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            Location and basic information
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <Separator />
                            <CardContent className="space-y-4 pt-4">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    {/* Platform */}
                                    <div className="rounded-lg border p-4">
                                        <div className="mb-3">
                                            <Label htmlFor="platform" className="text-sm font-medium">
                                                Platform <span className="text-destructive">*</span>
                                            </Label>
                                            <p className="text-xs text-muted-foreground">
                                                Select the warehouse platform
                                            </p>
                                        </div>

                                        <Select
                                            required
                                            value={form.data.platform}
                                            onValueChange={(value) => handleFieldChange('platform', value)}
                                        >
                                            <SelectTrigger
                                                id="platform"
                                                className={`w-full ${form.errors.platform ? 'border-destructive' : ''}`}
                                                aria-invalid={!!form.errors.platform}
                                            >
                                                <SelectValue placeholder="Select a platform" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {PLATFORMS.map((platform) => (
                                                    <SelectItem key={platform.value} value={platform.value}>
                                                        {platform.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {form.errors.platform && (
                                            <p className="mt-1 text-xs text-destructive" role="alert">
                                                {form.errors.platform}
                                            </p>
                                        )}
                                    </div>

                                    {/* Active Status */}
                                    <div className="rounded-lg border p-4">
                                        <div className="flex h-full items-center justify-between">
                                            <div>
                                                <Label htmlFor="is_active" className="text-sm font-medium">
                                                    Warehouse Status
                                                </Label>
                                                <p className="text-xs text-muted-foreground">
                                                    Enable or disable operations
                                                </p>
                                            </div>
                                            <Switch
                                                id="is_active"
                                                checked={form.data.is_active}
                                                onCheckedChange={(checked) => handleFieldChange('is_active', checked)}
                                                aria-label="Toggle warehouse status"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="name">
                                        Warehouse Name <span className="text-destructive">*</span>
                                    </Label>
                                    <div className="relative">
                                        <WarehouseIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                                        <Input
                                            id="name"
                                            name="name"
                                            type="text"
                                            autoComplete="off"
                                            value={form.data.name}
                                            onChange={(e) => handleFieldChange('name', e.target.value)}
                                            placeholder="e.g., Main Warehouse"
                                            className={`pl-9 ${form.errors.name ? 'border-destructive' : ''}`}
                                            aria-invalid={!!form.errors.name}
                                            aria-describedby={form.errors.name ? 'name-error' : undefined}
                                            disabled={form.processing}
                                            required
                                        />
                                    </div>
                                    {form.errors.name && (
                                        <p id="name-error" className="text-xs text-destructive" role="alert">
                                            {form.errors.name}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="location">
                                        Location URL <span className="text-muted-foreground text-xs">(Optional)</span>
                                    </Label>
                                    <div className="relative">
                                        <MapPin className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                                        <Input
                                            id="location"
                                            name="location"
                                            type="url"
                                            autoComplete="off"
                                            value={form.data.location}
                                            onChange={(e) => handleFieldChange('location', e.target.value)}
                                            placeholder="https://maps.google.com/..."
                                            className={`pl-9 ${form.errors.location ? 'border-destructive' : ''}`}
                                            aria-invalid={!!form.errors.location}
                                            disabled={form.processing}
                                        />
                                    </div>
                                    {form.errors.location && (
                                        <p className="text-xs text-destructive" role="alert">
                                            {form.errors.location}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="address">
                                        Full Address <span className="text-muted-foreground text-xs">(Optional)</span>
                                    </Label>
                                    <Textarea
                                        id="address"
                                        name="address"
                                        value={form.data.address}
                                        onChange={(e) => handleFieldChange('address', e.target.value)}
                                        placeholder="Street, city, state, PIN code..."
                                        rows={3}
                                        className={form.errors.address ? 'border-destructive' : ''}
                                        aria-invalid={!!form.errors.address}
                                        disabled={form.processing}
                                    />
                                    {form.errors.address && (
                                        <p className="text-xs text-destructive" role="alert">
                                            {form.errors.address}
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* owner Account */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <div className="rounded-md bg-blue-500/10 p-2">
                                        <User className="size-5 text-blue-600" aria-hidden="true" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base">
                                            Owner Account
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            Will be created automatically
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <Separator />
                            <CardContent className="space-y-4 pt-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="user_name">
                                        Full Name <span className="text-destructive">*</span>
                                    </Label>
                                    <div className="relative">
                                        <User className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                                        <Input
                                            id="user_name"
                                            name="user_name"
                                            type="text"
                                            autoComplete="name"
                                            value={form.data.user_name}
                                            onChange={(e) => handleFieldChange('user_name', e.target.value)}
                                            placeholder="Owner's full name"
                                            className={`pl-9 ${form.errors.user_name ? 'border-destructive' : ''}`}
                                            aria-invalid={!!form.errors.user_name}
                                            disabled={form.processing}
                                            required
                                        />
                                    </div>
                                    {form.errors.user_name && (
                                        <p className="text-xs text-destructive" role="alert">
                                            {form.errors.user_name}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="user_email">
                                        Email <span className="text-destructive">*</span>
                                    </Label>
                                    <div className="relative">
                                        <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                                        <Input
                                            id="user_email"
                                            name="user_email"
                                            type="email"
                                            autoComplete="email"
                                            value={form.data.user_email}
                                            onChange={(e) => handleFieldChange('user_email', e.target.value)}
                                            placeholder="owner@example.com"
                                            className={`pl-9 ${form.errors.user_email ? 'border-destructive' : ''}`}
                                            aria-invalid={!!form.errors.user_email}
                                            disabled={form.processing}
                                            required
                                        />
                                    </div>
                                    {form.errors.user_email && (
                                        <p className="text-xs text-destructive" role="alert">
                                            {form.errors.user_email}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="user_mobile">
                                        Mobile <span className="text-destructive">*</span>
                                    </Label>
                                    <div className="relative">
                                        <Phone className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                                        <Input
                                            id="user_mobile"
                                            name="user_mobile"
                                            type="tel"
                                            autoComplete="tel"
                                            value={form.data.user_mobile}
                                            onChange={(e) => handleFieldChange('user_mobile', e.target.value)}
                                            placeholder="9876543210"
                                            className={`pl-9 ${form.errors.user_mobile ? 'border-destructive' : ''}`}
                                            aria-invalid={!!form.errors.user_mobile}
                                            disabled={form.processing}
                                            required
                                        />
                                    </div>
                                    {form.errors.user_mobile && (
                                        <p className="text-xs text-destructive" role="alert">
                                            {form.errors.user_mobile}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="user_password">
                                        Password <span className="text-destructive">*</span>
                                    </Label>
                                    <div className="relative">
                                        <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                                        <Input
                                            id="user_password"
                                            name="user_password"
                                            type="password"
                                            autoComplete="new-password"
                                            value={form.data.user_password}
                                            onChange={(e) => handleFieldChange('user_password', e.target.value)}
                                            placeholder={`Minimum ${PASSWORD_MIN_LENGTH} characters`}
                                            className={`pl-9 ${form.errors.user_password ? 'border-destructive' : ''}`}
                                            aria-invalid={!!form.errors.user_password}
                                            disabled={form.processing}
                                            required
                                        />
                                    </div>
                                    {form.errors.user_password && (
                                        <p className="text-xs text-destructive" role="alert">
                                            {form.errors.user_password}
                                        </p>
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                        Password must be at least {PASSWORD_MIN_LENGTH} characters long
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Submit Actions */}
                    <div className="sticky bottom-4 mt-4 flex justify-end gap-3 rounded-lg border bg-background/95 p-4 backdrop-blur-sm">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.visit('/admin/warehouses')}
                            disabled={form.processing}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing ? (
                                <>
                                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                                    Creating Warehouse...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 size-4" aria-hidden="true" />
                                    Create Warehouse
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
