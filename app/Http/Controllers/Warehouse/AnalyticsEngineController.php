<?php

namespace App\Http\Controllers\Warehouse;

use App\Http\Controllers\Controller;
use App\Services\Analytics\WarehouseAnalyticsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class AnalyticsEngineController extends Controller
{
    public function __construct(
        private readonly WarehouseAnalyticsService $analyticsService
    ) {}

    private function getWarehouseId(): int
    {
        $warehouse = Auth::user()->ownedWarehouse;
        abort_if(! $warehouse, 403, 'Context missing: No active warehouse assigned.');
        return $warehouse->id;
    }

    public function dashboard(Request $request): Response
    {
        $whId = $this->getWarehouseId();
        $start = $request->input('from', now()->subDays(30)->toDateString());
        $end = $request->input('to', now()->toDateString());

        return Inertia::render('Warehouse/Analytics/DashboardCommandCenter', [
            'vitals' => [
                'valuation'   => $this->analyticsService->getValuationAuditSummary($whId),
                'fulfillment' => $this->analyticsService->getFulfillmentVelocity($whId),
                'financials'  => $this->analyticsService->getProfitLossStatement($whId, $start, $end),
            ],
            'filters' => ['from' => $start, 'to' => $end]
        ]);
    }

    public function reorderVelocity(Request $request): Response
    {
        $search = $request->string('search')->trim()->toString();
        return Inertia::render('Warehouse/Analytics/Inventory/ReorderVelocityReport', [
            'data' => $this->analyticsService->getReorderVelocityReport($this->getWarehouseId(), $search),
            'filters' => ['search' => $search]
        ]);
    }

    public function batchLifecycle(Request $request): Response
    {
        $days = $request->integer('days', 30);
        return Inertia::render('Warehouse/Analytics/Inventory/BatchLifecycleReport', [
            'segments' => $this->analyticsService->getBatchLifecycleReport($this->getWarehouseId(), $days),
            'days' => $days
        ]);
    }

    public function valuationAudit(): Response
    {
        return Inertia::render('Warehouse/Analytics/Inventory/ValuationAuditReport', [
            'summary' => $this->analyticsService->getValuationAuditSummary($this->getWarehouseId())
        ]);
    }

    public function omnichannelPerformance(Request $request): Response
    {
        $start = $request->input('from', now()->subDays(30)->toDateString());
        $end = $request->input('to', now()->toDateString());

        return Inertia::render('Warehouse/Analytics/Sales/OmnichannelPerformanceReport', [
            'channels' => $this->analyticsService->getOmnichannelPerformance($this->getWarehouseId(), $start, $end),
            'filters' => ['from' => $start, 'to' => $end]
        ]);
    }

    public function productMargins(): Response
    {
        return Inertia::render('Warehouse/Analytics/Sales/ProductMarginsReport', [
            'ranking' => $this->analyticsService->getProductMarginAnalysis($this->getWarehouseId())
        ]);
    }

    public function fulfillmentKpi(): Response
    {
        return Inertia::render('Warehouse/Analytics/Operations/FulfillmentKpiReport', [
            'velocity' => $this->analyticsService->getFulfillmentVelocity($this->getWarehouseId())
        ]);
    }

    public function returnsAnalysis(): Response
    {
        return Inertia::render('Warehouse/Analytics/Operations/ReturnsAnalysisReport', [
            'conditions' => $this->analyticsService->getReturnsAnalysisMetrics($this->getWarehouseId())
        ]);
    }

    public function profitLoss(Request $request): Response
    {
        $start = $request->input('from', now()->subDays(30)->toDateString());
        $end = $request->input('to', now()->toDateString());

        return Inertia::render('Warehouse/Analytics/Financials/ProfitLossReport', [
            'statement' => $this->analyticsService->getProfitLossStatement($this->getWarehouseId(), $start, $end),
            'filters' => ['from' => $start, 'to' => $end]
        ]);
    }

    public function taxLedger(Request $request): Response
    {
        $start = $request->input('from', now()->subDays(30)->toDateString());
        $end = $request->input('to', now()->toDateString());

        return Inertia::render('Warehouse/Analytics/Financials/TaxLedgerReport', [
            'ledger' => $this->analyticsService->getTaxLedgerSummary($this->getWarehouseId(), $start, $end),
            'filters' => ['from' => $start, 'to' => $end]
        ]);
    }
}
