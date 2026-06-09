import { Head, useForm, router } from '@inertiajs/react';
import {
    Plus,
    Eye,
    BookOpen,
    Wallet,
    TrendingUp,
    Building2,
    Receipt,
    Layers,
    ArrowLeftRight,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Accounting', href: '#' },
    { title: 'Journal Entries', href: '/warehouse/accounting/journal-entries' },
];

type JournalLine = {
    id: number;
    account_id: number;
    debit: string;
    credit: string;
    account: { name: string; type: string };
};

type JournalEntry = {
    id: number;
    date: string;
    description: string | null;
    user: { name: string } | null;
    lines: JournalLine[];
};

type Props = {
    entries: {
        data: JournalEntry[];
        current_page: number;
        last_page: number;
        total: number;
        prev_page_url: string | null;
        next_page_url: string | null;
    };
    accounts: { id: number; name: string; type: string }[];
};

export default function JournalEntriesPage({ entries, accounts }: Props) {
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);

    const { data, setData, post, processing, reset, errors } = useForm({
        date: new Date().toISOString().slice(0, 10),
        description: '',
        lines: [
            { account_id: '', debit: '', credit: '' },
            { account_id: '', debit: '', credit: '' },
        ],
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/warehouse/accounting/journal-entries', {
            onSuccess: () => {
                setShowCreateDialog(false);
                reset();
            },
        });
    };

    const addLine = () => {
        setData('lines', [...data.lines, { account_id: '', debit: '', credit: '' }]);
    };

    const updateLine = (index: number, field: string, value: string) => {
        const updatedLines = [...data.lines];
        updatedLines[index] = { ...updatedLines[index], [field]: value };
        setData('lines', updatedLines);
    };

    const fmt = (n: string | number) =>
        `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Calculate runtime ledger balances aggregated across current visible ledger view state
    const accountBalances = entries.data.reduce(
        (acc, entry) => {
            entry.lines.forEach((line) => {
                const type = line.account?.type?.toLowerCase();
                const debit = Number(line.debit || 0);
                const credit = Number(line.credit || 0);

                if (type === 'asset' || type === 'expense') {
                    acc.assetsAndExpenses += debit - credit;
                } else if (type === 'liability' || type === 'equity' || type === 'income') {
                    acc.liabilitiesAndEquity += credit - debit;
                }
            });
            return acc;
        },
        { assetsAndExpenses: 0, liabilitiesAndEquity: 0 }
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Journal Entries — Ledger Registry" />
            <div className="p-6 space-y-6">

                {/* Module Heading */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">General Ledger Registers</h1>
                        <p className="text-muted-foreground">Audit, verify and post manual double-entry transactions</p>
                    </div>
                    <Button onClick={() => setShowCreateDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" /> New Manual Journal Post
                    </Button>
                </div>

                {/* Unified System Navigation Bar */}
                <div className="flex flex-wrap gap-2 p-1.5 bg-muted/60 rounded-xl border">
                    <Button variant="ghost" size="sm" onClick={() => router.visit('/warehouse/accounting/chart-of-accounts')} className="text-xs">
                        <Layers className="h-3.5 w-3.5 mr-1.5" /> Chart of Accounts
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => router.visit('/warehouse/accounting/expenses')} className="text-xs">
                        <Receipt className="h-3.5 w-3.5 mr-1.5" /> Operating Expenses
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => router.visit('/warehouse/accounting/pl-statement')} className="text-xs">
                        <TrendingUp className="h-3.5 w-3.5 mr-1.5" /> P&L Statement
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => router.visit('/warehouse/accounting/tax-collected')} className="text-xs">
                        <Building2 className="h-3.5 w-3.5 mr-1.5" /> Tax Registry
                    </Button>
                </div>

                {/* Real-time Current Ledger Balances Monitor */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border-l-4 border-l-blue-600 bg-gradient-to-br from-card to-blue-50/20">
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Debit-Normal Balance Accounts (Assets/Expenses)</p>
                                <Wallet className="h-4 w-4 text-blue-600 opacity-80" />
                            </div>
                            <p className="text-2xl font-black font-mono mt-1 text-blue-700">{fmt(accountBalances.assetsAndExpenses)}</p>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-amber-600 bg-gradient-to-br from-card to-amber-50/20">
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Credit-Normal Balance Accounts (Liabilities/Equity/Income)</p>
                                <ArrowLeftRight className="h-4 w-4 text-amber-600 opacity-80" />
                            </div>
                            <p className="text-2xl font-black font-mono mt-1 text-amber-700">{fmt(accountBalances.liabilitiesAndEquity)}</p>
                        </CardContent>
                    </Card>
                </div>

                {errors.lines && (
                    <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg">
                        {errors.lines}
                    </div>
                )}

                {/* Centralized Journal Log Data Table */}
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[100px]">ID</TableHead>
                                    <TableHead className="w-[140px]">Posting Date</TableHead>
                                    <TableHead>Narration Summary</TableHead>
                                    <TableHead className="w-[180px]">Authorized By</TableHead>
                                    <TableHead className="w-[120px] text-center">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {entries.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                            <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                            No transaction entries found for this ledger period.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    entries.data.map((entry) => (
                                        <TableRow key={entry.id} className="hover:bg-muted/30">
                                            <TableCell className="font-mono text-xs font-semibold">#{entry.id}</TableCell>
                                            <TableCell className="text-sm">
                                                {new Date(entry.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </TableCell>
                                            <TableCell className="text-sm font-medium text-foreground/80 max-w-[340px] truncate" title={entry.description ?? ''}>
                                                {entry.description ?? <span className="text-muted-foreground italic text-xs">No description recorded.</span>}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{entry.user?.name ?? 'System Automated'}</TableCell>
                                            <TableCell className="text-center">
                                                <Button size="sm" variant="outline" className="h-7 text-xs px-2.5" onClick={() => setSelectedEntry(entry)}>
                                                    <Eye className="h-3.5 w-3.5 mr-1" /> View Split
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>

                        {/* Pagination Segment */}
                        {entries.last_page > 1 && (
                            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
                                <p className="text-xs text-muted-foreground">
                                    Displaying page <span className="font-semibold">{entries.current_page}</span> of <span className="font-semibold">{entries.last_page}</span> totals
                                </p>
                                <div className="flex gap-1.5">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 px-2.5"
                                        disabled={!entries.prev_page_url}
                                        onClick={() => router.visit(entries.prev_page_url!, { preserveState: true })}
                                    >
                                        <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 px-2.5"
                                        disabled={!entries.next_page_url}
                                        onClick={() => router.visit(entries.next_page_url!, { preserveState: true })}
                                    >
                                        Next <ChevronRight className="h-4 w-4 ml-1" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Modal View Component: Balanced Split Lines Inspector */}
                <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
                    <DialogContent className="max-w-xl">
                        <DialogHeader>
                            <DialogTitle className="text-base font-bold">Journal Entry Ledger Items — #{selectedEntry?.id}</DialogTitle>
                        </DialogHeader>
                        {selectedEntry && (
                            <div className="space-y-4 pt-2">
                                <div className="grid grid-cols-2 gap-4 text-xs bg-muted/50 p-3 rounded-lg border">
                                    <div>
                                        <span className="text-muted-foreground block uppercase font-bold tracking-wider">Effective Book Date</span>
                                        <span className="font-medium text-sm">
                                            {new Date(selectedEntry.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block uppercase font-bold tracking-wider">Audit Assignment Signature</span>
                                        <span className="font-medium text-sm">{selectedEntry.user?.name ?? 'System Terminal'}</span>
                                    </div>
                                    <div className="col-span-2 pt-1 border-t">
                                        <span className="text-muted-foreground block uppercase font-bold tracking-wider">Narration Record</span>
                                        <span className="text-foreground/90 font-medium">{selectedEntry.description ?? '—'}</span>
                                    </div>
                                </div>

                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead>Target Account</TableHead>
                                            <TableHead className="text-right w-[130px]">Debit</TableHead>
                                            <TableHead className="text-right w-[130px]">Credit</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {selectedEntry.lines.map((line) => (
                                            <TableRow key={line.id} className="hover:bg-transparent">
                                                <TableCell className="py-2.5">
                                                    <span className={Number(line.credit) > 0 ? "pl-5 text-muted-foreground font-mono text-xs" : "font-semibold text-sm"}>
                                                        {line.account?.name}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right py-2.5 font-mono text-sm text-foreground">
                                                    {Number(line.debit) > 0 ? fmt(line.debit) : '—'}
                                                </TableCell>
                                                <TableCell className="text-right py-2.5 font-mono text-sm text-foreground">
                                                    {Number(line.credit) > 0 ? fmt(line.credit) : '—'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Modal View Component: Create Journal Entry Post Form */}
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                    <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                        <DialogHeader>
                            <DialogTitle>Commit Manual Journal Transaction</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={submit} className="space-y-4 overflow-y-auto pr-1 flex-1">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-1">
                                    <Label>Posting Date</Label>
                                    <Input type="date" className="mt-1" value={data.date} onChange={(e) => setData('date', e.target.value)} required />
                                </div>
                                <div className="col-span-2">
                                    <Label>Narration / Description Statement</Label>
                                    <Input className="mt-1" value={data.description} onChange={(e) => setData('description', e.target.value)} placeholder="Provide accounting ledger change reasonings..." />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Adjustment Lines</Label>
                                {data.lines.map((line, idx) => (
                                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                                        <div className="col-span-6">
                                            <Select value={line.account_id} onValueChange={(v) => updateLine(idx, 'account_id', v)}>
                                                <SelectTrigger><SelectValue placeholder="Select target account Ledger" /></SelectTrigger>
                                                <SelectContent>
                                                    {accounts.map((a) => <SelectItem key={a.id} value={a.id.toString()}>{a.name} ({a.type})</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="col-span-3">
                                            <Input type="number" step="0.01" placeholder="Debit" value={line.debit} onChange={(e) => updateLine(idx, 'debit', e.target.value)} disabled={!!line.credit} />
                                        </div>
                                        <div className="col-span-3">
                                            <Input type="number" step="0.01" placeholder="Credit" value={line.credit} onChange={(e) => updateLine(idx, 'credit', e.target.value)} disabled={!!line.debit} />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-2 pt-2 border-t mt-4">
                                <Button type="button" variant="outline" size="sm" onClick={addLine}>Add Entry Row</Button>
                                <div className="ml-auto flex gap-2">
                                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                                    <Button type="submit" size="sm" disabled={processing}>{processing ? 'Processing Logs...' : 'Commit Balanced Ledger'}</Button>
                                </div>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

            </div>
        </AppLayout>
    );
}
