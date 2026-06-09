import { Head, router } from '@inertiajs/react';
import { Activity, Download, Filter, Search } from 'lucide-react';
import { useState } from 'react';
import AdminAppLayout from '@/layouts/admin-app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Activity Log', href: '/admin/activity-log' }];

type LogRow = {
    id: number;
    log_name: string | null;
    event: string | null;
    description: string;
    subject_type: string | null;
    subject_id: number | null;
    causer_type: string | null;
    causer_id: number | null;
    causer_name?: string | null;
    created_at: string;
};

type Props = {
    logs: {
        data: LogRow[];
        current_page: number;
        last_page: number;
        total: number;
    };
    filters: { search?: string; log_name?: string; event?: string; from?: string; to?: string };
    log_names: string[];
    events: string[];
};

const eventColors: Record<string, string> = {
    created: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
    updated: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    deleted: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    login: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    logout: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

export default function ActivityLogIndex({ logs, filters, log_names, events }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [logName, setLogName] = useState(filters.log_name ?? '');
    const [event, setEvent] = useState(filters.event ?? '');
    const [from, setFrom] = useState(filters.from ?? '');
    const [to, setTo] = useState(filters.to ?? '');

    const applyFilters = () => {
        router.visit('/admin/activity-log', {
            data: { search, log_name: logName, event, from, to },
            preserveState: true,
        });
    };

    const gotoPage = (page: number) => {
        router.visit('/admin/activity-log', {
            data: { ...filters, page },
            preserveState: true,
        });
    };

    return (
        <AdminAppLayout breadcrumbs={breadcrumbs}>
            <Head title="Activity Log — Admin" />
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Activity Log</h1>
                        <p className="text-muted-foreground mt-1">{logs.total.toLocaleString()} total activities recorded</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => window.open('/admin/activity-log/export')}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                </div>

                {/* Filters */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-wrap gap-3 items-end">
                            <div className="flex-1 min-w-[200px]">
                                <Input
                                    placeholder="Search description..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                                />
                            </div>
                            <Select value={logName || 'all'} onValueChange={(v) => setLogName(v === 'all' ? '' : v)}>
                                <SelectTrigger className="w-36">
                                    <SelectValue placeholder="Log Name" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Logs</SelectItem>
                                    {log_names.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select value={event || 'all'} onValueChange={(v) => setEvent(v === 'all' ? '' : v)}>
                                <SelectTrigger className="w-32">
                                    <SelectValue placeholder="Event" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Events</SelectItem>
                                    {events.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-36" placeholder="From" />
                            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-36" placeholder="To" />
                            <Button onClick={applyFilters}>
                                <Filter className="h-4 w-4 mr-2" />
                                Filter
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Table */}
                <Card>
                    <CardContent className="p-0">
                        {logs.data.length === 0 ? (
                            <div className="flex flex-col items-center py-12 text-muted-foreground">
                                <Activity className="h-10 w-10 mb-3 opacity-40" />
                                <p>No activity log entries found</p>
                            </div>
                        ) : (
                            <>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Time</TableHead>
                                            <TableHead>Log</TableHead>
                                            <TableHead>Event</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead>Subject</TableHead>
                                            <TableHead>By</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {logs.data.map((log) => (
                                            <TableRow key={log.id}>
                                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                                    {new Date(log.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                                                </TableCell>
                                                <TableCell>
                                                    {log.log_name && <Badge variant="outline" className="text-xs">{log.log_name}</Badge>}
                                                </TableCell>
                                                <TableCell>
                                                    {log.event && (
                                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${eventColors[log.event] ?? 'bg-gray-100 text-gray-600'}`}>
                                                            {log.event}
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="max-w-xs">
                                                    <p className="text-sm truncate" title={log.description}>{log.description}</p>
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {log.subject_type ? (
                                                        <span>{log.subject_type.split('\\').pop()} #{log.subject_id}</span>
                                                    ) : '—'}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {log.causer_name ?? (log.causer_id ? `User #${log.causer_id}` : '—')}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {logs.last_page > 1 && (
                                    <div className="flex items-center justify-between px-4 py-3 border-t">
                                        <p className="text-sm text-muted-foreground">
                                            Page {logs.current_page} of {logs.last_page}
                                        </p>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" disabled={logs.current_page === 1} onClick={() => gotoPage(logs.current_page - 1)}>Previous</Button>
                                            <Button variant="outline" size="sm" disabled={logs.current_page === logs.last_page} onClick={() => gotoPage(logs.current_page + 1)}>Next</Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AdminAppLayout>
    );
}
