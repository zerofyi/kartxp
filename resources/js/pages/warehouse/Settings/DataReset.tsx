import { Head, useForm, usePage } from '@inertiajs/react';
import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SettingsNav from './SettingsNav';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Warehouse Settings', href: '/warehouse/settings' }];

type SharedProps = {
    flash?: { success?: string; error?: string };
};

type PreviewItem = { key: string; label: string; count: number };
type PreviewGroup = { key: string; label: string; items: PreviewItem[] };
type Preview = { groups: PreviewGroup[]; total: number; customers_reset: number };

type Props = {
    preview: Preview;
};

const KEEPS = [
    'Products, variants and their prices, images and barcodes',
    'Categories, brands, attributes, units, tax categories',
    'Customers and their addresses',
    'Vendors, coupons, shipping zones, banners',
    'Warehouses, users, roles, settings, chart of accounts',
    'Wishlists, reviews, price history, activity log',
];

// ─────────────────────────────────────────────
// Fresh Start / Data Reset — irreversible wipe of every record that
// exists because money, purchases, stock or sales happened, across the
// whole application. Requires a database backup confirmation plus the
// exact typed phrase FRESH START; the server validates both again.
// ─────────────────────────────────────────────
export default function DataReset({ preview }: Props) {
    const { flash } = usePage<SharedProps>().props;

    const { data, setData, post, processing, errors, reset } = useForm({
        confirmation: '',
        backup_confirmed: false as boolean,
    });

    const canSubmit = data.backup_confirmed && data.confirmation === 'FRESH START' && !processing;

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post('/warehouse/settings/data-reset', {
            onSuccess: () => reset(),
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Fresh Start / Data Reset" />
            <div className="p-6 space-y-5">
                <SettingsNav activeTab="data-reset" />

                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-destructive">Fresh Start / Data Reset</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Permanently delete all money, purchase, stock and sale records across the whole application, and start the business fresh. Catalog and customer data stay untouched.
                    </p>
                </div>

                {flash?.success && (
                    <Alert className="border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
                        <AlertTitle>Done</AlertTitle>
                        <AlertDescription>{flash.success}</AlertDescription>
                    </Alert>
                )}

                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>This cannot be undone</AlertTitle>
                    <AlertDescription>
                        There is no restore inside the app. Take a full database backup before you continue — the confirmation below asks you to confirm you have one.
                    </AlertDescription>
                </Alert>

                {/* ── What will be deleted ── */}
                <Card>
                    <CardHeader>
                        <CardTitle>What will be deleted</CardTitle>
                        <CardDescription>
                            {preview.total} transaction records in total
                            {preview.customers_reset > 0 && ` · ${preview.customers_reset} customer totals (loyalty points, total spent) reset to zero`}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                        {preview.groups.map((group) => (
                            <div key={group.key} className="rounded-lg border p-4">
                                <h3 className="font-semibold text-sm mb-2">{group.label}</h3>
                                <ul className="space-y-1">
                                    {group.items.map((item) => (
                                        <li key={item.key} className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">{item.label}</span>
                                            <span className="font-mono font-semibold">{item.count}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* ── What stays ── */}
                <Card>
                    <CardHeader>
                        <CardTitle>What stays</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="grid gap-1 sm:grid-cols-2 text-sm text-muted-foreground list-disc pl-5">
                            {KEEPS.map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                        <p className="text-xs text-muted-foreground mt-3">
                            Customer loyalty points and total spent reset to zero; credit limits stay as they are. Purchase bill images are deleted from disk along with the purchase bills.
                        </p>
                    </CardContent>
                </Card>

                {/* ── Confirmation ── */}
                <Card className="border-destructive/50">
                    <CardHeader>
                        <CardTitle>Confirm the reset</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="space-y-4">
                            <label className="flex items-start gap-2 text-sm cursor-pointer">
                                <Checkbox
                                    checked={data.backup_confirmed}
                                    onCheckedChange={(checked) => setData('backup_confirmed', checked === true)}
                                />
                                <span>I have taken a full database backup and understand this delete cannot be undone.</span>
                            </label>
                            {errors.backup_confirmed && <p className="text-xs text-destructive">{errors.backup_confirmed}</p>}

                            <div className="space-y-1 max-w-sm">
                                <Label htmlFor="confirmation">Type FRESH START to confirm</Label>
                                <Input
                                    id="confirmation"
                                    value={data.confirmation}
                                    onChange={(e) => setData('confirmation', e.target.value)}
                                    placeholder="FRESH START"
                                    autoComplete="off"
                                />
                                {errors.confirmation && <p className="text-xs text-destructive">{errors.confirmation}</p>}
                            </div>

                            <Button type="submit" variant="destructive" disabled={!canSubmit}>
                                <Trash2 className="mr-1.5 h-4 w-4" />
                                {processing ? 'Deleting…' : 'Delete everything listed above'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
