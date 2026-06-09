import { Head, useForm, router } from '@inertiajs/react';
import { Plus, Trash2, Users, Truck, UserCheck, Eye, Layers } from 'lucide-react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Staff', href: '/warehouse/staff' }];

type StaffMember = {
    id: number;
    user: { id: number; name: string; mobile: string; status: string; email: string | null };
    role: string;
    is_active: boolean;
    joined_at: string;
};

type AgentRow = {
    id: number;
    user_id: number;
    name: string;
    mobile: string;
    assigned_count: number;
    delivered_count: number;
    pending_count: number;
};

type Props = {
    staff: StaffMember[];
    agents: AgentRow[];
    stats: { total: number; active: number; agents: number };
};

const roleColors: Record<string, string> = {
    manager: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300',
    staff: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300',
    delivery_agent: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300',
};

export default function StaffIndex({ staff, agents, stats }: Props) {
    const [showAddDialog, setShowAddDialog] = useState(false);

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        name: '',
        mobile: '',
        email: '',
        role: 'staff',
        password: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/warehouse/staff', {
            onSuccess: () => {
                setShowAddDialog(false);
                reset();
            }
        });
    };

    const removeStaff = (id: number) => {
        if (confirm('Are you absolutely sure you want to decouple this staff relationship from the current active warehouse branch?')) {
            router.delete(`/warehouse/staff/${id}`);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Staff Directory — Warehouse" />
            <div className="p-6 space-y-6">

                {/* Module Heading */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Staff Management</h1>
                        <p className="text-muted-foreground">Manage and track permissions for warehouse team configurations</p>
                    </div>
                    <Button onClick={() => { clearErrors(); reset(); setShowAddDialog(true); }}>
                        <Plus className="h-4 w-4 mr-2" /> Add Team Member
                    </Button>
                </div>

                {/* Navigation Row */}
                <div className="flex flex-wrap gap-2 p-1.5 bg-muted/60 rounded-xl border">
                    <Button variant="ghost" size="sm" onClick={() => router.visit('/warehouse/staff')} className="text-xs bg-background shadow-sm">
                        <Layers className="h-3.5 w-3.5 mr-1.5" /> Staff Core Directory
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => router.visit('/warehouse/staff/agents')} className="text-xs">
                        <Truck className="h-3.5 w-3.5 mr-1.5" /> Logistics Alternative View
                    </Button>
                </div>

                {/* Stats Performance Layout Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-l-4 border-l-slate-800 bg-gradient-to-br from-card to-slate-50/50 dark:to-zinc-900/20">
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Headcount</p>
                                <Users className="h-4 w-4 text-slate-800 opacity-80" />
                            </div>
                            <p className="text-2xl font-black font-mono mt-1 text-slate-900 dark:text-zinc-100">{stats.total}</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-emerald-600 bg-gradient-to-br from-card to-emerald-50/20">
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Staff Connections</p>
                                <UserCheck className="h-4 w-4 text-emerald-600 opacity-80" />
                            </div>
                            <p className="text-2xl font-black font-mono mt-1 text-emerald-700 dark:text-emerald-400">{stats.active}</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-orange-500 bg-gradient-to-br from-card to-orange-50/20">
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Fulfillment Fleet Size</p>
                                <Truck className="h-4 w-4 text-orange-500 opacity-80" />
                            </div>
                            <p className="text-2xl font-black font-mono mt-1 text-orange-600 dark:text-orange-400">{stats.agents}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Centralized Grid Sheet Display */}
                <Tabs defaultValue="staff" className="w-full">
                    <TabsList className="grid grid-cols-2 max-w-[400px] mb-2">
                        <TabsTrigger value="staff" className="text-xs">Staff Directory ({staff.length})</TabsTrigger>
                        <TabsTrigger value="agents" className="text-xs">Delivery Force ({agents.length})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="staff">
                        <Card>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Staff Name</TableHead>
                                        <TableHead>Mobile Identifier</TableHead>
                                        <TableHead>System Authority</TableHead>
                                        <TableHead>Node State</TableHead>
                                        <TableHead>Assigned On</TableHead>
                                        <TableHead className="w-[80px] text-center">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {staff.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                                No internal staff profiles registered to this node asset context.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        staff.map((member) => (
                                            <TableRow key={member.id} className="hover:bg-muted/30">
                                                <TableCell className="font-semibold text-sm">{member.user?.name ?? 'Broken Identity Context'}</TableCell>
                                                <TableCell className="font-mono text-xs text-muted-foreground">{member.user?.mobile ?? '—'}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={`capitalize font-mono text-[10px] tracking-wide ${roleColors[member.role] ?? 'bg-slate-100'}`}>
                                                        {member.role.replace('_', ' ')}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={member.is_active ? 'default' : 'secondary'} className="text-[10px] px-2 py-0">
                                                        {member.is_active ? 'Active Connection' : 'Detached / Closed'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground font-medium">
                                                    {new Date(member.joined_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-red-50 text-destructive" onClick={() => removeStaff(member.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </Card>
                    </TabsContent>

                    <TabsContent value="agents">
                        <Card>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Fleet Agent Name</TableHead>
                                        <TableHead>Mobile Link</TableHead>
                                        <TableHead className="text-center">Assigned Cargo</TableHead>
                                        <TableHead className="text-center text-emerald-600">Delivered (Paid/Closed)</TableHead>
                                        <TableHead className="text-center text-amber-600">Pending Dispatches</TableHead>
                                        <TableHead>Performance Spread</TableHead>
                                        <TableHead className="w-[100px] text-center">Fulfillment Logs</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {agents.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                                No logistics fleet drivers associated to this active dispatch facility yet.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        agents.map((agent) => {
                                            const rate = agent.assigned_count > 0 ? Math.round((agent.delivered_count / agent.assigned_count) * 100) : 0;
                                            return (
                                                <TableRow key={agent.id} className="hover:bg-muted/30">
                                                    <TableCell className="font-semibold text-sm">{agent.name}</TableCell>
                                                    <TableCell className="font-mono text-xs text-muted-foreground">{agent.mobile}</TableCell>
                                                    <TableCell className="text-center font-mono font-bold text-xs">{agent.assigned_count}</TableCell>
                                                    <TableCell className="text-center font-mono text-xs text-emerald-600 font-bold">{agent.delivered_count}</TableCell>
                                                    <TableCell className="text-center font-mono text-xs text-amber-600 font-bold">{agent.pending_count}</TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-16 h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${rate}%` }} />
                                                            </div>
                                                            <span className="text-xs font-mono font-semibold text-muted-foreground">{rate}%</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Button size="sm" variant="outline" className="h-7 text-xs px-2.5" onClick={() => router.visit(`/warehouse/staff/agents/${agent.user_id}`)}>
                                                            <Eye className="h-3.5 w-3.5 mr-1" /> Profile
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* Provision Account Workspace Dialog Modal */}
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-base font-bold">Provision Warehouse Account</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={submit} className="space-y-4 mt-2">
                            <div>
                                <Label className="text-xs">Full Legal Name</Label>
                                <Input className="mt-1" value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="E.g. Tanvir Rahman" required />
                                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs">Primary Mobile (Username)</Label>
                                    <Input className="mt-1 font-mono" value={data.mobile} onChange={(e) => setData('mobile', e.target.value)} placeholder="01XXXXXXXXX" required />
                                    {errors.mobile && <p className="text-xs text-destructive mt-1">{errors.mobile}</p>}
                                </div>
                                <div>
                                    <Label className="text-xs">Email Address (Optional)</Label>
                                    <Input type="email" className="mt-1" value={data.email} onChange={(e) => setData('email', e.target.value)} placeholder="name@domain.com" />
                                    {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs">Account Functional Role Mapping</Label>
                                <Select value={data.role} onValueChange={(v) => setData('role', v)}>
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Assign access hierarchy" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="staff">Standard Warehouse Staff</SelectItem>
                                        <SelectItem value="manager">Branch Line Manager</SelectItem>
                                        <SelectItem value="delivery_agent">Logistics Dispatch Driver (Agent)</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.role && <p className="text-xs text-destructive mt-1">{errors.role}</p>}
                            </div>

                            <div>
                                <Label className="text-xs">System Passkey Authentication Password</Label>
                                <Input type="password" className="mt-1" value={data.password} onChange={(e) => setData('password', e.target.value)} placeholder="Min 8 secure char strings..." required />
                                {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
                            </div>

                            <div className="flex gap-2 pt-2 border-t justify-end">
                                <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                                <Button type="submit" size="sm" disabled={processing}>
                                    {processing ? 'Provisioning Record...' : 'Write Profile Entry'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
