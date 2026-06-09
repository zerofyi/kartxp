<?php

namespace App\Http\Controllers\Warehouse;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Services\LoyaltyService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class CustomerController extends Controller
{
    public function __construct(private readonly LoyaltyService $loyaltyService) {}

    /**
     * GET /warehouse/customers
     */
    public function index(Request $request): Response
    {
        $customers = Customer::query()
            ->withCount('orders')
            ->when($request->input('search'), fn ($q, $s) =>
                $q->where(fn ($inner) =>
                    $inner->where('name', 'like', "%{$s}%")
                        ->orWhere('phone', 'like', "%{$s}%")
                        ->orWhere('email', 'like', "%{$s}%")
                )
            )
            ->when($request->input('verified') !== null && $request->input('verified') !== 'all', fn ($q) =>
                $q->where('is_verified', $request->input('verified') === '1')
            )
            ->orderByDesc('total_spent')
            ->paginate(25)
            ->withQueryString();

        // Optimized execution aggregation loop running inside a single query block
        $stats = DB::table('customers')
            ->selectRaw('COUNT(*) as total, COUNT(CASE WHEN is_verified = 1 THEN 1 END) as verified, COALESCE(SUM(loyalty_points), 0) as total_loyalty')
            ->first();

        return Inertia::render('Warehouse/Customers/Index', [
            'customers' => $customers,
            'stats'     => [
                'total'         => (int) $stats->total,
                'verified'      => (int) $stats->verified,
                'total_loyalty' => (int) $stats->total_loyalty,
            ],
            'filters'   => $request->only(['search', 'verified']),
        ]);
    }

    /**
     * GET /warehouse/customers/{customer}
     */
    public function show(Customer $customer): Response
    {
        $customer->loadCount('orders');

        $orders = $customer->orders()
            ->select(['id', 'customer_id', 'order_number', 'status', 'payment_status', 'total_amount', 'created_at'])
            ->latest()
            ->get();

        $loyaltyTransactions = $customer->loyaltyTransactions()
            ->select(['id', 'customer_id', 'type', 'points', 'balance_after', 'note', 'created_at'])
            ->latest()
            ->get();

        $returns = $customer->returns()
            ->with('order:id,order_number')
            ->select(['id', 'customer_id', 'order_id', 'status', 'reason', 'refund_amount', 'created_at'])
            ->latest()
            ->get();

        return Inertia::render('Warehouse/Customers/Show', [
            'customer'             => $customer,
            'orders'               => $orders,
            'loyalty_transactions' => $loyaltyTransactions,
            'returns'              => $returns,
        ]);
    }

    /**
     * POST /warehouse/customers
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name'         => 'required|string|max:255',
            'phone'        => 'required|string|unique:customers,phone',
            'email'        => 'nullable|email|max:255',
            'credit_limit' => 'nullable|numeric|min:0',
        ]);

        Customer::create(array_merge($validated, [
            'total_spent'    => 0,
            'loyalty_points' => 0,
            'is_verified'    => true,
        ]));

        return back()->with('success', 'Customer account profile appended into master registries successfully.');
    }

    /**
     * PUT /warehouse/customers/{customer}
     */
    public function update(Request $request, Customer $customer): RedirectResponse
    {
        $validated = $request->validate([
            'name'  => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
        ]);

        $customer->update($validated);

        return back()->with('success', 'Customer profile record properties modified.');
    }

    /**
     * POST /warehouse/customers/{customer}/loyalty
     */
    public function addLoyaltyPoints(Request $request, Customer $customer): RedirectResponse
    {
        $validated = $request->validate([
            'points' => 'required|integer',
            'note'   => 'nullable|string|max:255',
        ]);

        $this->loyaltyService->adjust($customer, $validated['points'], $validated['note'] ?? 'Manual adjustment profile audit execution');

        return back()->with('success', 'Loyalty balance parameters modified.');
    }

    /**
     * POST /warehouse/customers/{customer}/credit
     */
    public function adjustCredit(Request $request, Customer $customer): RedirectResponse
    {
        $validated = $request->validate([
            'credit_limit' => 'required|numeric|min:0',
        ]);

        $customer->update(['credit_limit' => $validated['credit_limit']]);

        return back()->with('success', 'Credit assignment thresholds updated.');
    }
}
