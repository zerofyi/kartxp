import { Head, useForm, router } from '@inertiajs/react';
import { DollarSign, Filter, Paperclip, Plus, TrendingDown } from 'lucide-react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Accounting', href: '#' },
    { title: 'Expenses', href: '/warehouse/accounting/expenses' },
];

type ExpenseRow = {
    id: number;
    category: string;
    amount: number;
    note: string | null;
    expense_date: string;
    created_by: { name: string } | null;
    attachment_path: string | null;
};

type Props = {
    expenses: {
        data: ExpenseRow[];
        current_page: number;
        last_page: number;
        total: number;
    };
    stats: { this_month: number; today: number };
    categories: string[];
    filters: Record<string, string>;
};

export default function ExpensesPage({ expenses, stats, categories, filters }: Props) {
    const [showDialog, setShowDialog] = useState(false);
    const [fromDate, setFromDate] = useState(filters.from ?? '');
    const [toDate, setToDate] = useState(filters.to ?? '');
    const [catFilter, setCatFilter] = useState(filters.category ?? '');

    const form = useForm({
        category: '',
        amount: '',
        note: '',
        expense_date: new Date().toISOString().slice(0, 10),
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/warehouse/accounting/expenses', { onSuccess: () => { setShowDialog(false); form.reset(); } });
    };

    const applyFilters = () => {
        router.visit('/warehouse/accounting/expenses', {
            data: { from: fromDate, to: toDate, category: catFilter },
            preserveState: true,
        });
    };

    const fmt = (n: number) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

    const commonCategories = ['Rent', 'Electricity', 'Salary', 'Transport', 'Packaging', 'Marketing', 'Maintenance', 'Miscellaneous'];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Expenses — Warehouse" />
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
                        <p className="text-muted-foreground">Track warehouse operating costs</p>
                    </div>
                    <Button onClick={() => setShowDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Expense
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-gradient-to-br from-red-500 to-rose-600 text-white border-0">
                        <CardContent className="pt-5">
                            <TrendingDown className="h-6 w-6 mb-2 opacity-80" />
                            <p className="text-red-100 text-xs">This Month</p>
                            <p className="text-2xl font-bold">{fmt(stats.this_month)}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-orange-500 to-amber-600 text-white border-0">
                        <CardContent className="pt-5">
                            <DollarSign className="h-6 w-6 mb-2 opacity-80" />
                            <p className="text-orange-100 text-xs">Today</p>
                            <p className="text-2xl font-bold">{fmt(stats.today)}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card>
                    <CardContent className="pt-5">
                        <div className="flex flex-wrap gap-3 items-end">
                            <div>
                                <Label className="text-xs">From</Label>
                                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-36 mt-1" />
                            </div>
                            <div>
                                <Label className="text-xs">To</Label>
                                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-36 mt-1" />
                            </div>
                            <div>
                                <Label className="text-xs">Category</Label>
                                <Select value={catFilter || 'all'} onValueChange={(v) => setCatFilter(v === 'all' ? '' : v)}>
                                    <SelectTrigger className="w-40 mt-1">
                                        <SelectValue placeholder="All Categories" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Categories</SelectItem>
                                        {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={applyFilters} variant="outline">
                                <Filter className="h-4 w-4 mr-2" />Filter
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Expense Records ({expenses.total})</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {expenses.data.length === 0 ? (
                            <div className="flex flex-col items-center py-12 text-muted-foreground">
                                <DollarSign className="h-10 w-10 mb-3 opacity-40" />
                                <p>No expenses recorded for this period</p>
                                <Button className="mt-4" onClick={() => setShowDialog(true)}>
                                    <Plus className="h-4 w-4 mr-2" />Add First Expense
                                </Button>
                            </div>
                        ) : (
                            <>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                            <TableHead>Note</TableHead>
                                            <TableHead>Added By</TableHead>
                                            <TableHead>Attachment</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {expenses.data.map((expense) => (
                                            <TableRow key={expense.id}>
                                                <TableCell className="text-sm font-medium">
                                                    {new Date(expense.expense_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className="text-xs">{expense.category}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-semibold text-red-600">{fmt(expense.amount)}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground max-w-[200px]">
                                                    <p className="truncate" title={expense.note ?? ''}>{expense.note ?? '—'}</p>
                                                </TableCell>
                                                <TableCell className="text-sm">{expense.created_by?.name ?? '—'}</TableCell>
                                                <TableCell>
                                                    {expense.attachment_path ? (
                                                        <a href={`/storage/${expense.attachment_path}`} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1 text-xs">
                                                            <Paperclip className="h-3 w-3" />View
                                                        </a>
                                                    ) : '—'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {expenses.last_page > 1 && (
                                    <div className="flex items-center justify-between px-4 py-3 border-t">
                                        <p className="text-sm text-muted-foreground">Page {expenses.current_page} of {expenses.last_page}</p>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" disabled={expenses.current_page === 1} onClick={() => router.visit('/warehouse/accounting/expenses', { data: { ...filters, page: expenses.current_page - 1 }, preserveState: true })}>Previous</Button>
                                            <Button variant="outline" size="sm" disabled={expenses.current_page === expenses.last_page} onClick={() => router.visit('/warehouse/accounting/expenses', { data: { ...filters, page: expenses.current_page + 1 }, preserveState: true })}>Next</Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Add Expense Dialog */}
                <Dialog open={showDialog} onOpenChange={setShowDialog}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Add Expense</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={submit} className="space-y-4 mt-2">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label>Category</Label>
                                    <Select value={form.data.category} onValueChange={(v) => form.setData('category', v)}>
                                        <SelectTrigger className="mt-1">
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {[...new Set([...categories, ...commonCategories])].map((c) => (
                                                <SelectItem key={c} value={c}>{c}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {form.errors.category && <p className="text-xs text-destructive mt-1">{form.errors.category}</p>}
                                </div>
                                <div>
                                    <Label>Amount (₹)</Label>
                                    <Input type="number" step="0.01" className="mt-1" value={form.data.amount} onChange={(e) => form.setData('amount', e.target.value)} placeholder="0.00" required />
                                    {form.errors.amount && <p className="text-xs text-destructive mt-1">{form.errors.amount}</p>}
                                </div>
                            </div>
                            <div>
                                <Label>Expense Date</Label>
                                <Input type="date" className="mt-1" value={form.data.expense_date} onChange={(e) => form.setData('expense_date', e.target.value)} required />
                            </div>
                            <div>
                                <Label>Note</Label>
                                <Textarea className="mt-1" rows={2} value={form.data.note} onChange={(e) => form.setData('note', e.target.value)} placeholder="Optional notes..." />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button type="submit" disabled={form.processing} className="flex-1">
                                    {form.processing ? 'Saving...' : 'Add Expense'}
                                </Button>
                                <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
