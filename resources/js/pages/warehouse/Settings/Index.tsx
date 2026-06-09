import { Head, useForm } from '@inertiajs/react';
import { Settings, Save } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import SettingsNav from './SettingsNav';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Warehouse Settings', href: '/warehouse/settings' }];

type Props = {
    settings: Record<string, string>;
};

export default function GeneralSettingsPage({ settings }: Props) {
    const { data, setData, post, processing, errors } = useForm(settings);

    const saveSettings = (e: React.FormEvent) => {
        e.preventDefault();
        post('/warehouse/settings');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="General Settings — Warehouse" />
            <div className="p-6 space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Settings className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Warehouse Settings</h1>
                        <p className="text-muted-foreground">Configure system processing logic preferences and parameter boundaries</p>
                    </div>
                </div>

                <SettingsNav activeTab="general" />

                <Card>
                    <CardHeader>
                        <CardTitle>System Preference Registers</CardTitle>
                        <CardDescription>Manage defaults used for calculations, thresholds, and printable assets</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={saveSettings} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="receipt_footer">Invoice Receipt Footer Text</Label>
                                <Textarea
                                    id="receipt_footer"
                                    rows={3}
                                    value={data.receipt_footer ?? ''}
                                    onChange={(e) => setData('receipt_footer', e.target.value)}
                                    placeholder="Thank you for shopping with Ghorer Bazar!"
                                />
                                {errors.receipt_footer && <p className="text-xs text-destructive">{errors.receipt_footer}</p>}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="default_tax_rate">Default State Tax Rate (%)</Label>
                                    <Input
                                        id="default_tax_rate"
                                        type="number"
                                        step="0.01"
                                        value={data.default_tax_rate ?? ''}
                                        onChange={(e) => setData('default_tax_rate', e.target.value)}
                                    />
                                    {errors.default_tax_rate && <p className="text-xs text-destructive">{errors.default_tax_rate}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="low_stock_threshold">Default Low Stock Alert Threshold</Label>
                                    <Input
                                        id="low_stock_threshold"
                                        type="number"
                                        value={data.low_stock_threshold ?? ''}
                                        onChange={(e) => setData('low_stock_threshold', e.target.value)}
                                    />
                                    {errors.low_stock_threshold && <p className="text-xs text-destructive">{errors.low_stock_threshold}</p>}
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-muted/40 rounded-xl border">
                                <div className="space-y-0.5">
                                    <Label htmlFor="auto_confirm_orders" className="text-sm font-semibold">Auto-Confirm Online Orders</Label>
                                    <p className="text-xs text-muted-foreground">Instantly route incoming checkout transactions to processing manifest pools without manual approval checks.</p>
                                </div>
                                <Switch
                                    id="auto_confirm_orders"
                                    checked={data.auto_confirm_orders === '1'}
                                    onCheckedChange={(checked) => setData('auto_confirm_orders', checked ? '1' : '0')}
                                />
                            </div>

                            <div className="flex justify-end pt-4 border-t">
                                <Button type="submit" disabled={processing}>
                                    <Save className="h-4 w-4 mr-2" />
                                    {processing ? 'Saving parameters...' : 'Save Settings'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
