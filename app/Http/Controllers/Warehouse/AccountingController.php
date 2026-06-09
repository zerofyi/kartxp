<?php

namespace App\Http\Controllers\Warehouse;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\JournalEntry;
use App\Models\JournalLine;
use App\Models\Account;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class AccountingController extends Controller
{
    private function getCurrentWarehouseId(): ?int
    {
        return Auth::user()->currentWarehouse()->value('warehouses.id');
    }

    public function chartOfAccounts(): Response
    {
        // Group accounts by type natively since hierarchical structures aren't in your schema
        $accounts = Account::orderBy('type')
            ->orderBy('name')
            ->get()
            ->groupBy('type');

        return Inertia::render('Warehouse/Accounting/ChartOfAccounts', [
            'accountsGrouped' => $accounts
        ]);
    }

    public function journalEntries(Request $request): Response
    {
        $entries = JournalEntry::with(['lines.account:id,name,type', 'user:id,name'])
            ->orderByDesc('date')
            ->orderByDesc('id')
            ->paginate(25)
            ->withQueryString();

        $accounts = Account::where('is_active', true)->orderBy('name')->get(['id', 'name', 'type']);

        return Inertia::render('Warehouse/Accounting/JournalEntries', [
            'entries'  => $entries,
            'accounts' => $accounts
        ]);
    }

    public function createJournalEntry(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'date'               => 'required|date',
            'description'        => 'nullable|string|max:500',
            'lines'              => 'required|array|min:2',
            'lines.*.account_id' => 'required|exists:accounts,id',
            'lines.*.debit'      => 'nullable|numeric|min:0',
            'lines.*.credit'     => 'nullable|numeric|min:0',
        ]);

        $totalDebit  = 0;
        $totalCredit = 0;

        foreach ($validated['lines'] as $line) {
            $totalDebit  += (float)($line['debit'] ?? 0);
            $totalCredit += (float)($line['credit'] ?? 0);
        }

        // Floating point safe comparison delta check
        if (abs($totalDebit - $totalCredit) > 0.001) {
            return back()->withErrors(['lines' => "Debits must equal credits. Total Debits: {$totalDebit}, Total Credits: {$totalCredit}"]);
        }

        DB::transaction(function () use ($validated) {
            $entry = JournalEntry::create([
                'user_id'        => Auth::id(),
                'date'           => $validated['date'],
                'reference_type' => 'manual', // Safe fallback because columns are not nullable
                'reference_id'   => 0,        // Safe fallback
                'description'    => $validated['description'] ?? null,
            ]);

            foreach ($validated['lines'] as $line) {
                JournalLine::create([
                    'journal_entry_id' => $entry->id,
                    'account_id'       => $line['account_id'],
                    'debit'            => $line['debit'] ?? 0,
                    'credit'           => $line['credit'] ?? 0,
                ]);
            }
        });

        return back()->with('success', 'Journal entry created successfully.');
    }

    public function expenses(Request $request): Response
    {
        $warehouseId = Auth::user()->currentWarehouse()->value('warehouses.id');

        $expenses = Expense::where('warehouse_id', $warehouseId)
            ->with('createdBy:id,name')               // component renders created_by.name
            ->when($request->input('category'), fn ($q, $c) => $q->where('category', $c))
            ->when($request->input('from'),     fn ($q, $d) => $q->where('expense_date', '>=', $d))
            ->when($request->input('to'),       fn ($q, $d) => $q->where('expense_date', '<=', $d))
            ->orderByDesc('expense_date')
            ->paginate(25)
            ->withQueryString();

        $stats = [
            'this_month' => Expense::where('warehouse_id', $warehouseId)
                                ->whereMonth('expense_date', now()->month)
                                ->whereYear('expense_date', now()->year)
                                ->sum('amount'),
            'today'      => Expense::where('warehouse_id', $warehouseId)
                                ->whereDate('expense_date', today())
                                ->sum('amount'),
        ];

        $categories = Expense::where('warehouse_id', $warehouseId)
                        ->distinct()
                        ->orderBy('category')
                        ->pluck('category');

        return Inertia::render('Warehouse/Accounting/Expenses', [
            'expenses'   => $expenses,
            'stats'      => $stats,
            'categories' => $categories,
            'filters'    => $request->only(['category', 'from', 'to']),
        ]);
    }

    public function storeExpense(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'category'        => 'required|string|max:100',
            'amount'          => 'required|numeric|min:0',
            'note'            => 'nullable|string|max:500',
            'expense_date'    => 'required|date',
            'attachment'      => 'nullable|file|max:5120',
        ]);

        $warehouseId = Auth::user()->currentWarehouse()->value('warehouses.id');
        $attachPath  = null;

        if ($request->hasFile('attachment')) {
            $attachPath = $request->file('attachment')->store('expenses/attachments', 'public');
        }

        Expense::create([
            'warehouse_id'    => $warehouseId,
            'category'        => $validated['category'],
            'amount'          => $validated['amount'],
            'note'            => $validated['note'] ?? null,
            'expense_date'    => $validated['expense_date'],
            'attachment_path' => $attachPath,
            'created_by'      => Auth::id(),
        ]);

        return back()->with('success', 'Expense recorded.');
    }

    public function updateExpense(Request $request, Expense $expense): RedirectResponse
    {
        $validated = $request->validate([
            'category'     => 'required|string|max:100',
            'amount'       => 'required|numeric|min:0',
            'note'         => 'nullable|string|max:500',
            'expense_date' => 'required|date',
        ]);

        $expense->update($validated);

        return back()->with('success', 'Expense updated.');
    }

    public function deleteExpense(Expense $expense): RedirectResponse
    {
        $expense->delete();

        return back()->with('success', 'Expense deleted.');
    }

    public function plStatement(Request $request): Response
    {
        // 1. Establish strict date windows with fallback options to prevent leaks
        $from = $request->query('from', now()->startOfMonth()->toDateString());
        $to   = $request->query('to', now()->toDateString());

        $warehouseId = $this->getCurrentWarehouseId();

        // Format localized strict timestamp strings to isolate active order rows safely
        $startDateTime = $from . ' 00:00:00';
        $endDateTime   = $to . ' 23:59:59';

        // 2. REVENUE: Sum the final absolute gross income from paid orders
        $revenue = (float) DB::table('orders')
            ->where('payment_status', 'paid')
            ->when($warehouseId, fn ($q) => $q->where('warehouse_id', $warehouseId))
            ->whereBetween('created_at', [$startDateTime, $endDateTime])
            ->sum('total_amount');

        // 3. TRUE COGS (Cost of Goods Sold):
        // We aggregate over items belonging to paid orders within the window,
        // multiplying the actual items sold by their historical unit cost price.
        $cogs = (float) DB::table('order_items as oi')
            ->join('orders as o', 'o.id', '=', 'oi.order_id')
            ->join('product_variants as pv', 'pv.id', '=', 'oi.product_variant_id')
            ->where('o.payment_status', 'paid')
            ->when($warehouseId, fn ($q) => $q->where('o.warehouse_id', $warehouseId))
            ->whereBetween('o.created_at', [$startDateTime, $endDateTime])
            ->sum(DB::raw('oi.quantity * pv.cost_price')); // Calculates real usage cost instead of invoice totals

        // 4. OPEX (Operating Expenses): Overhead costs recorded during this period
        $expenses = (float) Expense::query()
            ->when($warehouseId, fn ($q) => $q->where('warehouse_id', $warehouseId))
            ->whereBetween('expense_date', [$from, $to])
            ->sum('amount');

        // 5. Final accurate computing operations
        $grossProfit = $revenue - $cogs;
        $netProfit   = $grossProfit - $expenses;

        // 6. Return down clean property objects to your front-end
        return Inertia::render('Warehouse/Accounting/PlStatement', [
            'revenue'     => $revenue,
            'expenses'    => $expenses,
            'cogs'        => $cogs,
            'grossProfit' => $grossProfit,
            'netProfit'   => $netProfit,
            'filters'     => [
                'from' => $from,
                'to'   => $to
            ]
        ]);
    }

    public function taxCollected(Request $request): Response
    {
        $from        = $request->query('from', now()->startOfMonth()->toDateString());
        $to          = $request->query('to', now()->toDateString());
        $warehouseId = $this->getCurrentWarehouseId();

        $taxData = DB::table('order_items as oi')
            ->join('orders as o', 'o.id', '=', 'oi.order_id')
            ->join('product_variants as pv', 'pv.id', '=', 'oi.product_variant_id')
            ->join('products as p', 'p.id', '=', 'pv.product_id')
            ->leftJoin('tax_categories as tc', 'tc.id', '=', 'p.tax_category_id')
            ->where('o.payment_status', 'paid')
            ->when($warehouseId, fn ($q) => $q->where('o.warehouse_id', $warehouseId))
            ->whereBetween('o.created_at', [$from . ' 00:00:00', $to . ' 23:59:59'])
            ->select(
                DB::raw('COALESCE(tc.name, "Uncategorized") as tax_category'),
                DB::raw('COALESCE(tc.tax_percent, 0) as tax_rate'),
                DB::raw('SUM(oi.total) as taxable_amount'),
                DB::raw('SUM(oi.total * COALESCE(tc.tax_percent, 0) / (100 + COALESCE(tc.tax_percent, 0))) as tax_collected')
            )
            ->groupBy('tc.id', 'tc.name', 'tc.tax_percent')
            ->get()
            ->map(function ($item) {
                return [
                    'tax_category'   => $item->tax_category,
                    'tax_rate'       => (float) $item->tax_rate,
                    'taxable_amount' => (float) $item->taxable_amount,
                    'tax_collected'  => (float) $item->tax_collected,
                ];
            });

        return Inertia::render('Warehouse/Accounting/TaxCollected', [
            'taxData' => $taxData,
            'filters' => ['from' => $from, 'to' => $to]
        ]);
    }
}
