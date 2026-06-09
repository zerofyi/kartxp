import { Head, router } from '@inertiajs/react';
import { Truck, Eye, Layers, UserCheck } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Staff', href: '/warehouse/staff' },
    { title: 'Agents Fleet', href: '/warehouse/staff/agents' }
];

type AgentLogisticsRow = {
    id: number;
    user_id: number;
    is_active: boolean;
    active_deliveries: number;
    user: { id: number; name: string; mobile: string; status: string } | null;
};

type Props = {
    agents: AgentLogisticsRow[];
};

export default function AgentsIndexPage({ agents }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Logistics Fleet Index — Warehouse" />
            <div className="p-6 space-y-6">

                {/* Module Heading */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Fulfillment Fleet Performance</h1>
                        <p className="text-muted-foreground">Monitor and route payload volumes across active dispatch assets</p>
                    </div>
                </div>

                {/* Navigation Bar */}
                <div className="flex flex-wrap gap-2 p-1.5 bg-muted/60 rounded-xl border">
                    <Button variant="ghost" size="sm" onClick={() => router.visit('/warehouse/staff')} className="text-xs">
                        <Layers className="h-3.5 w-3.5 mr-1.5" /> Staff Core Directory
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => router.visit('/warehouse/staff/agents')} className="text-xs bg-background shadow-sm">
                        <Truck className="h-3.5 w-3.5 mr-1.5" /> Logistics Alternative View
                    </Button>
                </div>

                {/* Runtime Monitor Counters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border-l-4 border-l-orange-600 bg-gradient-to-br from-card to-orange-50/20">
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Registered Fleet Drivers</p>
                                <Truck className="h-4 w-4 text-orange-600 opacity-80" />
                            </div>
                            <p className="text-2xl font-black font-mono mt-1 text-orange-700">{agents.length}</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-blue-600 bg-gradient-to-br from-card to-blue-50/20">
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Cargo Operations</p>
                                <UserCheck className="h-4 w-4 text-blue-600 opacity-80" />
                            </div>
                            <p className="text-2xl font-black font-mono mt-1 text-blue-700">
                                {agents.reduce((acc, curr) => acc + (curr.active_deliveries || 0), 0)} Running Sheets
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Logistics Data Grid */}
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Driver Identity</TableHead>
                                <TableHead>Mobile Identifier</TableHead>
                                <TableHead>Connection Status</TableHead>
                                <TableHead className="text-center">Active Cargo Manifests</TableHead>
                                <TableHead className="w-[120px] text-center">Fulfillment Logs</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {agents.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                        <Truck className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                        No logistics drivers available for routing.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                agents.map((agent) => (
                                    <TableRow key={agent.id} className="hover:bg-muted/30">
                                        <TableCell className="font-semibold text-sm">{agent.user?.name ?? 'Broken Identity Context'}</TableCell>
                                        <TableCell className="font-mono text-xs text-muted-foreground">{agent.user?.mobile ?? '—'}</TableCell>
                                        <TableCell>
                                            <Badge variant={agent.is_active ? "default" : "secondary"} className="text-[10px]">
                                                {agent.is_active ? 'Active Line' : 'Offline / Standby'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center font-mono font-bold text-sm text-orange-600">
                                            {agent.active_deliveries} active manifests
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Button size="sm" variant="outline" className="h-7 text-xs px-2.5" onClick={() => router.visit(`/warehouse/staff/agents/${agent.user_id}`)}>
                                                <Eye className="h-3.5 w-3.5 mr-1" /> View Shipments
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </Card>
            </div>
        </AppLayout>
    );
}
