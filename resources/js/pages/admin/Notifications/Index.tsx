import { Head, useForm } from '@inertiajs/react';
import { Bell, Send, Users } from 'lucide-react';
import AdminAppLayout from '@/layouts/admin-app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Notifications', href: '/admin/notifications' }];

type NotificationRow = {
    type: string;
    data: string;
    created_at: string;
    notifiable_count?: number;
};

type Props = {
    recent: NotificationRow[];
};

export default function NotificationsIndex({ recent }: Props) {
    const form = useForm({
        title: '',
        body: '',
        target_role: 'all',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/admin/notifications/broadcast', {
            onSuccess: () => form.reset(),
        });
    };

    return (
        <AdminAppLayout breadcrumbs={breadcrumbs}>
            <Head title="Notifications — Admin" />
            <div className="p-6 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Push Notifications</h1>
                    <p className="text-muted-foreground mt-1">Broadcast notifications to users by role</p>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Broadcast Form */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Send className="h-5 w-5" />
                                Broadcast Notification
                            </CardTitle>
                            <CardDescription>Send push notification to all users matching the selected role</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={submit} className="space-y-4">
                                <div>
                                    <Label htmlFor="target_role">Target Role</Label>
                                    <Select value={form.data.target_role} onValueChange={(v) => form.setData('target_role', v)}>
                                        <SelectTrigger className="mt-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Users</SelectItem>
                                            <SelectItem value="customer">Customers Only</SelectItem>
                                            <SelectItem value="staff">Staff</SelectItem>
                                            <SelectItem value="manager">Managers</SelectItem>
                                            <SelectItem value="delivery_agent">Delivery Agents</SelectItem>
                                            <SelectItem value="warehouse">Warehouse Admins</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="title">Notification Title</Label>
                                    <Input
                                        id="title"
                                        className="mt-1"
                                        value={form.data.title}
                                        onChange={(e) => form.setData('title', e.target.value)}
                                        placeholder="e.g. Flash Sale Today!"
                                        required
                                    />
                                    {form.errors.title && <p className="text-xs text-destructive mt-1">{form.errors.title}</p>}
                                </div>
                                <div>
                                    <Label htmlFor="body">Message Body</Label>
                                    <Textarea
                                        id="body"
                                        className="mt-1"
                                        rows={4}
                                        value={form.data.body}
                                        onChange={(e) => form.setData('body', e.target.value)}
                                        placeholder="Enter notification message..."
                                        required
                                    />
                                    {form.errors.body && <p className="text-xs text-destructive mt-1">{form.errors.body}</p>}
                                </div>
                                <Button type="submit" disabled={form.processing} className="w-full">
                                    <Send className="h-4 w-4 mr-2" />
                                    {form.processing ? 'Sending...' : 'Send Notification'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Info Card */}
                    <div className="space-y-4">
                        <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-0">
                            <CardContent className="pt-6">
                                <Bell className="h-8 w-8 mb-3 opacity-80" />
                                <h3 className="font-semibold text-lg">FCM Push Notifications</h3>
                                <p className="text-blue-100 text-sm mt-1">
                                    Notifications are sent via Firebase Cloud Messaging to all devices registered for the selected role.
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-2 mb-3">
                                    <Users className="h-5 w-5 text-primary" />
                                    <h3 className="font-semibold">Audience Breakdown</h3>
                                </div>
                                <div className="space-y-2 text-sm">
                                    {['all', 'customer', 'staff', 'manager', 'delivery_agent', 'warehouse'].map((role) => (
                                        <div key={role} className="flex items-center justify-between">
                                            <Badge variant="outline" className="capitalize">{role.replace('_', ' ')}</Badge>
                                            <span className="text-muted-foreground text-xs">FCM registered users</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Recent Notifications */}
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Broadcasts</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {recent.length === 0 ? (
                            <div className="flex flex-col items-center py-12 text-muted-foreground">
                                <Bell className="h-10 w-10 mb-3 opacity-40" />
                                <p>No notifications sent yet</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Sent At</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recent?.map((n, i) => (
                                        <TableRow key={i}>
                                            <TableCell>
                                                <Badge variant="secondary" className="font-mono text-xs">
                                                    {n.type.split('\\').pop()}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{n.data}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{new Date(n.created_at).toLocaleString('en-IN')}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AdminAppLayout>
    );
}
