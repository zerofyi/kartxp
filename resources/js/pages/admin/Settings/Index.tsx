import { Head, useForm } from '@inertiajs/react';
import { Save, Settings } from 'lucide-react';
import { useState } from 'react';
import AdminAppLayout from '@/layouts/admin-app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Settings', href: '/admin/settings' }];

type Props = {
    settings: Record<string, string>;
    groups: string[];
};

const settingGroups: Record<string, Array<{ key: string; label: string; type?: string; description?: string }>> = {
    general: [
        { key: 'app_name', label: 'Application Name', description: 'Displayed in emails and notifications' },
        { key: 'app_tagline', label: 'Tagline', description: 'Short slogan for your store' },
        { key: 'support_email', label: 'Support Email', type: 'email' },
        { key: 'support_phone', label: 'Support Phone' },
        { key: 'currency', label: 'Currency Code', description: 'e.g. INR, USD' },
        { key: 'timezone', label: 'Timezone', description: 'e.g. Asia/Kolkata' },
        { key: 'receipt_footer', label: 'Receipt Footer', type: 'textarea' },
    ],
    payment: [
        { key: 'phonepe_merchant_id', label: 'PhonePe Merchant ID' },
        { key: 'phonepe_salt_key', label: 'PhonePe Salt Key', type: 'password' },
        { key: 'phonepe_salt_index', label: 'PhonePe Salt Index' },
        { key: 'phonepe_mode', label: 'PhonePe Mode', description: 'UAT or PRODUCTION' },
        { key: 'cod_enabled', label: 'Enable Cash on Delivery', type: 'boolean' },
        { key: 'min_order_amount', label: 'Minimum Order Amount (₹)', type: 'number' },
    ],
    notification: [
        { key: 'fcm_server_key', label: 'FCM Server Key' },
        { key: 'order_notification_email', label: 'Order Alert Email', type: 'email' },
        { key: 'low_stock_notification_email', label: 'Low Stock Alert Email', type: 'email' },
    ],
    sms: [
        { key: 'sms_provider', label: 'SMS Provider', description: 'e.g. textlocal, msg91, twilio' },
        { key: 'sms_api_key', label: 'SMS API Key', type: 'password' },
        { key: 'sms_sender_id', label: 'SMS Sender ID' },
        { key: 'otp_expiry_minutes', label: 'OTP Expiry (minutes)', type: 'number' },
    ],
};

export default function SettingsIndex({ settings, groups }: Props) {
    const [activeTab, setActiveTab] = useState('general');
    const form = useForm<Record<string, string>>(settings);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/admin/settings');
    };

    const renderField = (field: { key: string; label: string; type?: string; description?: string }) => {
        if (field.type === 'boolean') {
            return (
                <div key={field.key} className="flex items-center justify-between">
                    <div>
                        <Label>{field.label}</Label>
                        {field.description && <p className="text-xs text-muted-foreground mt-0.5">{field.description}</p>}
                    </div>
                    <Switch
                        checked={form.data[field.key] === '1' || form.data[field.key] === 'true'}
                        onCheckedChange={(v) => form.setData(field.key, v ? '1' : '0')}
                    />
                </div>
            );
        }
        if (field.type === 'textarea') {
            return (
                <div key={field.key}>
                    <Label htmlFor={field.key}>{field.label}</Label>
                    {field.description && <p className="text-xs text-muted-foreground mt-0.5">{field.description}</p>}
                    <Textarea
                        id={field.key}
                        className="mt-1"
                        rows={3}
                        value={form.data[field.key] ?? ''}
                        onChange={(e) => form.setData(field.key, e.target.value)}
                    />
                </div>
            );
        }
        return (
            <div key={field.key}>
                <Label htmlFor={field.key}>{field.label}</Label>
                {field.description && <p className="text-xs text-muted-foreground mt-0.5">{field.description}</p>}
                <Input
                    id={field.key}
                    type={field.type ?? 'text'}
                    className="mt-1"
                    value={form.data[field.key] ?? ''}
                    onChange={(e) => form.setData(field.key, e.target.value)}
                />
                {form.errors[field.key] && <p className="text-xs text-destructive mt-1">{form.errors[field.key]}</p>}
            </div>
        );
    };

    return (
        <AdminAppLayout breadcrumbs={breadcrumbs}>
            <Head title="Settings — Admin" />
            <div className="p-6 space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Settings className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
                        <p className="text-muted-foreground">Configure global platform settings</p>
                    </div>
                </div>

                <form onSubmit={submit}>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid grid-cols-4 w-full max-w-lg">
                            <TabsTrigger value="general">General</TabsTrigger>
                            <TabsTrigger value="payment">Payment</TabsTrigger>
                            <TabsTrigger value="notification">Alerts</TabsTrigger>
                            <TabsTrigger value="sms">SMS</TabsTrigger>
                        </TabsList>

                        {Object.entries(settingGroups).map(([group, fields]) => (
                            <TabsContent key={group} value={group} className="mt-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="capitalize">{group} Settings</CardTitle>
                                        <CardDescription>Configure {group} related options</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-5">
                                        {fields.map(renderField)}
                                        <div className="pt-2 border-t">
                                            <Button type="submit" disabled={form.processing}>
                                                <Save className="h-4 w-4 mr-2" />
                                                {form.processing ? 'Saving...' : 'Save Settings'}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        ))}
                    </Tabs>
                </form>
            </div>
        </AdminAppLayout>
    );
}
