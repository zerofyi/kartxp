import { Head, Link } from '@inertiajs/react';
import React from 'react';
import { ArrowLeft, Printer } from 'lucide-react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type StockRow = {
    id: number;
    name: string;
    variant_name: string;
    total_batches: number;
    available_batches: number;
    last_purchase_date: string | null;
    available_quantity: number;
    purchase_rate: number;
    wholesale_rate: number;
    retail_rate: number;
};

type Props = {
    rows: StockRow[];
    warehouseName: string;
    filter: 'all' | 'in_stock' | 'out_of_stock';
    counts: { all: number; in_stock: number; out_of_stock: number };
    printedAt: string;
};

const FILTER_LABELS: Record<Props['filter'], string> = {
    all: 'All Items',
    in_stock: 'In Stock',
    out_of_stock: 'Out of Stock',
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function formatMoney(value: number): string {
    return `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string | null): string {
    if (!iso) {
        return '—';
    }
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─────────────────────────────────────────────
// Page — standalone print sheet (no AppLayout, like the other print pages).
// On screen: filter tabs + print button. On paper: header + the 6-column
// table only — everything else carries print:hidden.
// ─────────────────────────────────────────────
export default function StockPrint({ rows, warehouseName, filter, counts, printedAt }: Props) {
    const tabs: { key: Props['filter']; label: string }[] = [
        { key: 'all', label: `All (${counts.all})` },
        { key: 'in_stock', label: `In Stock (${counts.in_stock})` },
        { key: 'out_of_stock', label: `Out of Stock (${counts.out_of_stock})` },
    ];

    return (
        <>
            <Head title="Stock Print" />

            {/* ── On-screen toolbar — never printed ── */}
            <div className="print:hidden bg-white border-b px-6 py-4 flex flex-wrap items-center gap-3 sticky top-0 z-10">
                <Link href="/warehouse/inventory" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" /> Back to Inventory
                </Link>
                <div className="flex-1" />
                <div className="flex rounded-lg border overflow-hidden">
                    {tabs.map((tab) => (
                        <Link
                            key={tab.key}
                            href={`/warehouse/inventory/print?stock=${tab.key}`}
                            className={`px-4 py-2 text-sm font-medium ${
                                filter === tab.key ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                            {tab.label}
                        </Link>
                    ))}
                </div>
                <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                    <Printer className="h-4 w-4" /> Print
                </button>
            </div>

            {/* ── Print sheet ── */}
            <div className="bg-white text-black mx-auto px-6 py-6 max-w-none print:px-0 print:py-0">
                <div className="mb-4">
                    <h1 className="text-xl font-bold">{warehouseName}</h1>
                    <p className="text-sm text-slate-600">
                        Stock Report — {FILTER_LABELS[filter]} · Printed {printedAt}
                    </p>
                </div>

                <table className="w-full border-collapse text-sm">
                    <thead>
                        <tr className="border-b-2 border-black">
                            <th className="text-left py-2 pr-2 w-10">#</th>
                            <th className="text-left py-2 pr-2">Details</th>
                            <th className="text-right py-2 pr-2 w-20">Qty</th>
                            <th className="text-right py-2 pr-2 w-32">Purchase Rate</th>
                            <th className="text-right py-2 pr-2 w-32">Wholesale Rate</th>
                            <th className="text-right py-2 w-32">Retail Rate</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, index) => (
                            <tr key={row.id} className="border-b border-slate-300">
                                <td className="py-2 pr-2 align-top">{index + 1}</td>
                                <td className="py-2 pr-2 align-top">
                                    <div className="font-semibold">{row.name}</div>
                                    <div className="text-xs text-slate-600">{row.variant_name}</div>
                                    <div className="text-xs text-slate-600">
                                        Total batches: {row.total_batches} · Available batches: {row.available_batches}
                                    </div>
                                    <div className="text-xs text-slate-600">Last purchase: {formatDate(row.last_purchase_date)}</div>
                                </td>
                                <td className="py-2 pr-2 align-top text-right font-medium">{row.available_quantity}</td>
                                <td className="py-2 pr-2 align-top text-right">{formatMoney(row.purchase_rate)}</td>
                                <td className="py-2 pr-2 align-top text-right">{formatMoney(row.wholesale_rate)}</td>
                                <td className="py-2 align-top text-right">{formatMoney(row.retail_rate)}</td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={6} className="py-8 text-center text-slate-500">
                                    No items match this filter.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                <p className="mt-4 text-xs text-slate-500">Total items: {rows.length}</p>
            </div>

            {/* ── A4 print rules ── */}
            <style>{`
                @page {
                    size: A4;
                    margin: 12mm;
                }
                @media print {
                    html, body {
                        background: #fff !important;
                    }
                    thead {
                        display: table-header-group;
                    }
                    tr {
                        break-inside: avoid;
                    }
                    * {
                        print-color-adjust: exact;
                        -webkit-print-color-adjust: exact;
                    }
                }
            `}</style>
        </>
    );
}
