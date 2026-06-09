import { Head, router } from '@inertiajs/react';
import { Layers, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Accounting', href: '#' },
    { title: 'Chart of Accounts', href: '/warehouse/accounting/chart-of-accounts' },
];

type Account = {
    id: number;
    name: string;
    type: string;
    is_active: boolean;
};

type Props = {
    accountsGrouped: Record<string, Account[]>;
};

export default function ChartOfAccountsPage({ accountsGrouped }: Props) {
    const getTypeBadgeVariant = (type: string) => {
        switch (type.toLowerCase()) {
            case 'asset': return 'default';
            case 'liability': return 'destructive';
            case 'equity': return 'outline';
            case 'income': return 'secondary';
            case 'expense': return 'outline';
            default: return 'outline';
        }
    };

    const types = Object.keys(accountsGrouped);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Chart of Accounts — Warehouse" />
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Chart of Accounts</h1>
                        <p className="text-muted-foreground">General ledger operational accounts indexed by type classification</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => router.visit('/warehouse/accounting/journal-entries')}>
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Journals
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Layers className="h-5 w-5 text-muted-foreground" />
                            Account Registry
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[100px]">Account ID</TableHead>
                                    <TableHead>Account Name</TableHead>
                                    <TableHead>Type Classification</TableHead>
                                    <TableHead className="w-[100px] text-center">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {types.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                            No accounts configured inside the database.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    types.map((type) => (
                                        <>
                                            <TableRow key={type} className="bg-muted/40 font-bold hover:bg-muted/40">
                                                <TableCell colSpan={4} className="original-case tracking-wide text-xs text-muted-foreground">
                                                    {type.toUpperCase()} ACCOUNTS
                                                </TableCell>
                                            </TableRow>
                                            {accountsGrouped[type].map((account) => (
                                                <TableRow key={account.id} className="hover:bg-muted/10">
                                                    <TableCell className="font-mono text-xs text-muted-foreground">#{account.id}</TableCell>
                                                    <TableCell className="font-medium text-sm">{account.name}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={getTypeBadgeVariant(account.type)} className="capitalize text-[10px] px-2 py-0">
                                                            {account.type}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {account.is_active ? (
                                                            <CheckCircle2 className="h-4 w-4 mx-auto text-green-500" />
                                                        ) : (
                                                            <XCircle className="h-4 w-4 mx-auto text-muted-foreground" />
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
