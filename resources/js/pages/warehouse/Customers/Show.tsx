import { Head, router, useForm } from '@inertiajs/react';
import React, { useState } from 'react';
import { Award, CreditCard, Eye, Mail, Phone, ShoppingBag, Star, User, ArrowLeft, Plus, Settings } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

type Customer = {
    id: number; name: string; phone: string; email: string | null; loyalty_points: number; total_spent: number; credit_limit: number; is_verified: boolean; created_at: string; orders_count: number;
};

type OrderRow = { id: number; order_number: string; status: string; payment_status: string; total_amount: number; created_at: string; };
type LoyaltyTx = { id: number; type: string; points: number; balance_after: number; note: string | null; created_at: string; };
type ReturnRow = { id: number; status: string; reason: string; refund_amount: number | null; created_at: string; order: { order_number: string }; };

type Props = { customer: Customer; orders: OrderRow[]; loyalty_transactions: LoyaltyTx[]; returns: ReturnRow[]; };

const statusColors: Record<string, string> = {
    pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
    processing: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    packed: 'bg-purple-50 text-purple-700 border-purple-200',
    dispatched: 'bg-orange-50 text-orange-700 border-orange-200',
    delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
    completed: 'bg-teal-50 text-teal-700 border-teal-200',
};

export default function CustomerShowPage({ customer, orders, loyalty_transactions, returns }: Props) {
    const [loyaltyOpen, setLoyaltyOpen] = useState(false);
    const [creditOpen, setCreditOpen] = useState(false);

    const loyaltyForm = useForm({ points: '', note: '' });
    const creditForm = useForm({ credit_limit: String(customer.credit_limit) });

    const handleLoyaltyAdjustment = (e: React.FormEvent) => {
        e.preventDefault();
        loyaltyForm.post(`/warehouse/customers/${customer.id}/loyalty`, {
            onSuccess: () => { setLoyaltyOpen(false); loyaltyForm.reset(); }
        });
    };

    const handleCreditAdjustment = (e: React.FormEvent) => {
        e.preventDefault();
        creditForm.post(`/warehouse/customers/${customer.id}/credit`, {
            onSuccess: () => setCreditOpen(false)
        });
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Customers', href: '/warehouse/customers' }, { title: customer.name, href: '#' }]}>
            <Head title={`${customer.name} — Profile Summary`} />
            <div className="p-6 space-y-6">

                {/* Heading Banner segment */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                    <div className="flex items-start gap-4">
                        <div className="h-14 w-14 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl font-black text-white shadow-md shrink-0">
                            {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-xl font-bold tracking-tight text-foreground">{customer.name}</h1>
                                {customer.is_verified && <Badge className="bg-emerald-600 text-white border-0 text-[10px] tracking-wide font-mono">✓ VERIFIED</Badge>}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs font-mono text-muted-foreground">
                                <span className="flex items-center gap-1 text-foreground"><Phone className="h-3 w-3 text-muted-foreground" /> {customer.phone}</span>
                                {customer.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {customer.email}</span>}
                                <span className="flex items-center gap-1"><ShoppingBag className="h-3 w-3" /> {customer.orders_count} Bookings</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center">
                        <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setLoyaltyOpen(true)}>
                            <Star className="h-3.5 w-3.5 mr-1 text-amber-500" /> Adjust Points
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setCreditOpen(true)}>
                            <CreditCard className="h-3.5 w-3.5 mr-1 text-blue-500" /> Modify Credit
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => router.visit('/warehouse/customers')}>
                            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Core Directory
                        </Button>
                    </div>
                </div>

                {/* Summary Matrix Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border-l-4 border-l-purple-600 bg-gradient-to-br from-card to-purple-50/20">
                        <CardContent className="pt-4">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Gross Revenue Value</p>
                            <p className="text-2xl font-black font-mono mt-1 text-purple-700 dark:text-purple-400">
                                ₹{Number(customer.total_spent).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-amber-500 bg-gradient-to-br from-card to-amber-50/20">
                        <CardContent className="pt-4">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Loyalty Balance</p>
                            <p className="text-2xl font-black font-mono mt-1 text-amber-600">
                                {Number(customer.loyalty_points).toLocaleString('en-IN')} Pts
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-blue-600 bg-gradient-to-br from-card to-blue-50/20">
                        <CardContent className="pt-4">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Assigned Credit Limit</p>
                            <p className="text-2xl font-black font-mono mt-1 text-blue-700 dark:text-blue-400">
                                ₹{Number(customer.credit_limit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-slate-700 bg-gradient-to-br from-card to-slate-50/50 dark:to-zinc-900/20">
                        <CardContent className="pt-4">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Gross Manifest Invoices</p>
                            <p className="text-2xl font-black font-mono mt-1 text-slate-800 dark:text-zinc-200">{customer.orders_count} entries</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Sub-Tab Context Systems Panels */}
                <Tabs defaultValue="orders" className="w-full">
                    <TabsList className="grid grid-cols-3 max-w-[440px] mb-4">
                        <TabsTrigger value="orders">Orders History ({orders.length})</TabsTrigger>
                        <TabsTrigger value="loyalty">Loyalty Ledger ({loyalty_transactions.length})</TabsTrigger>
                        <TabsTrigger value="returns">Claims Returns ({returns.length})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="orders">
                        <Card>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Invoice Reference #</TableHead>
                                        <TableHead>Tracking state</TableHead>
                                        <TableHead>Financial Clearings</TableHead>
                                        <TableHead className="text-right">Net Value</TableHead>
                                        <TableHead>Booked Timestamp</TableHead>
                                        <TableHead className="w-24 text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {orders.length === 0 ? (
                                        <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No historical transaction maps linked to this client entry profile yet.</TableCell></TableRow>
                                    ) : (
                                        orders.map(order => (
                                            <TableRow key={order.id} className="hover:bg-muted/30">
                                                <TableCell className="font-mono font-bold text-xs text-primary">{order.order_number}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={`capitalize font-mono text-[10px] ${statusColors[order.status] ?? 'bg-slate-100'}`}>
                                                        {order.status.replace('_', ' ')}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell><Badge variant={order.payment_status === 'paid' ? 'default' : 'secondary'} className="capitalize text-[10px]">{order.payment_status}</Badge></TableCell>
                                                <TableCell className="text-right font-mono font-bold text-sm">₹{Number(order.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground font-medium">{new Date(order.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => router.visit(`/warehouse/online-orders/${order.id}`)}>View Split</Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </Card>
                    </TabsContent>

                    <TabsContent value="loyalty">
                        <Card>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Transaction Date</TableHead>
                                        <TableHead>Action Entry Type</TableHead>
                                        <TableHead className="text-right">Points Variance</TableHead>
                                        <TableHead className="text-right">Resulting Balance Balance</TableHead>
                                        <TableHead>Audit Narrative Note</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loyalty_transactions.length === 0 ? (
                                        <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No loyalty transaction point transformations indexed under this profile wrapper.</TableCell></TableRow>
                                    ) : (
                                        loyalty_transactions.map(tx => {
                                            const isNegative = tx.type === 'redeemed' || tx.type === 'expired';
                                            return (
                                                <TableRow key={tx.id} className="hover:bg-muted/30">
                                                    <TableCell className="text-xs font-medium text-muted-foreground font-mono">{new Date(tx.created_at).toLocaleString('en-IN')}</TableCell>
                                                    <TableCell><Badge variant="outline" className="capitalize text-[10px] font-mono">{tx.type}</Badge></TableCell>
                                                    <TableCell className={`text-right font-mono font-bold text-xs ${isNegative ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                        {isNegative ? '-' : '+'}{tx.points}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono font-bold text-xs text-foreground/80">{tx.balance_after} Pts</TableCell>
                                                    <TableCell className="text-xs text-muted-foreground font-medium">{tx.note ?? '—'}</TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </Card>
                    </TabsContent>

                    <TabsContent value="returns">
                        <Card>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Claim ID</TableHead>
                                        <TableHead>Linked Parent Order</TableHead>
                                        <TableHead>Current Review Status</TableHead>
                                        <TableHead>Claim Narrative Reason</TableHead>
                                        <TableHead className="text-right font-semibold">Refund Volume</TableHead>
                                        <TableHead>Logged Time</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {returns.length === 0 ? (
                                        <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No return claims registered against this consumer identity node asset context.</TableCell></TableRow>
                                    ) : (
                                        returns.map(r => (
                                            <TableRow key={r.id} className="hover:bg-muted/30">
                                                <TableCell className="font-mono text-xs font-bold">#{r.id}</TableCell>
                                                <TableCell className="font-mono font-bold text-xs text-primary">{r.order?.order_number}</TableCell>
                                                <TableCell><Badge variant="outline" className="text-[10px] font-mono capitalize">{r.status}</Badge></TableCell>
                                                <TableCell className="max-w-xs text-xs truncate font-medium text-muted-foreground" title={r.reason}>{r.reason}</TableCell>
                                                <TableCell className="text-right font-mono font-bold text-xs text-rose-600">
                                                    {r.refund_amount ? `₹${Number(r.refund_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground font-medium">{new Date(r.created_at).toLocaleDateString('en-IN')}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* Loyalty Adjust Dialog */}
                <Dialog open={loyaltyOpen} onOpenChange={setLoyaltyOpen}>
                    <DialogContent className="max-w-sm">
                        <DialogHeader><DialogTitle className="text-base font-bold">Adjust Loyalty Balances</DialogTitle></DialogHeader>
                        <form onSubmit={handleLoyaltyAdjustment} className="space-y-4 pt-2">
                            <div className="space-y-1">
                                <Label htmlFor="points" className="text-xs font-semibold">Points Delta Variance Weight</Label>
                                <Input id="points" type="number" placeholder="E.g. 500 or -200" value={loyaltyForm.data.points} onChange={e => loyaltyForm.setData('points', e.target.value)} required />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="note" className="text-xs font-semibold">Audit Statement Narrative Reason</Label>
                                <Input id="note" placeholder="Promotion bonus / correction run..." value={loyaltyForm.data.note} onChange={e => loyaltyForm.setData('note', e.target.value)} />
                            </div>
                            <div className="flex gap-2 pt-2 border-t justify-end">
                                <Button type="button" variant="ghost" size="sm" onClick={() => setLoyaltyOpen(false)}>Cancel</Button>
                                <Button size="sm" type="submit" disabled={loyaltyForm.processing}>Commit Matrix Shift</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Credit Limit Adjust Dialog */}
                <Dialog open={creditOpen} onOpenChange={setCreditOpen}>
                    <DialogContent className="max-w-sm">
                        <DialogHeader><DialogTitle className="text-base font-bold">Modify Account Credit Ceilings</DialogTitle></DialogHeader>
                        <form onSubmit={handleCreditAdjustment} className="space-y-4 pt-2">
                            <div className="space-y-1">
                                <Label htmlFor="credit_limit" className="text-xs font-semibold">Credit Limit Cap Value (₹)</Label>
                                <Input id="credit_limit" type="number" min="0" value={creditForm.data.credit_limit} onChange={e => creditForm.setData('credit_limit', e.target.value)} required />
                            </div>
                            <div className="flex gap-2 pt-2 border-t justify-end">
                                <Button type="button" variant="ghost" size="sm" onClick={() => setCreditOpen(false)}>Cancel</Button>
                                <Button size="sm" type="submit" disabled={creditForm.processing}>Update Ceiling Parameter</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
