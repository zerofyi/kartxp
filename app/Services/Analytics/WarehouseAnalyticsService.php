<?php

namespace App\Services\Analytics;

use Illuminate\Support\Facades\DB;
use Illuminate\Pagination\LengthAwarePaginator;

class WarehouseAnalyticsService
{
    private const PER_PAGE = 15;

    // =========================================================================
    // MODULE 1: INVENTORY & STOCK INTELLIGENCE
    // =========================================================================

    public function getReorderVelocityReport(int $warehouseId, string $search): LengthAwarePaginator
    {
        return DB::table('product_variants as pv')
            ->join('stock_snapshots as ss', 'ss.product_variant_id', '=', 'pv.id')
            ->join('products as p', 'p.id', '=', 'pv.product_id')
            ->leftJoin('units as u', 'u.id', '=', 'pv.unit_id')
            ->where('ss.warehouse_id', $warehouseId)
            ->whereNull('pv.deleted_at')
            ->whereRaw('CAST(ss.available_quantity AS SIGNED) <= CAST(pv.stock_alert_qty AS SIGNED)')
            ->when($search, function($q) use ($search) {
                $q->where(fn($inner) => $inner->where('p.name', 'like', "%{$search}%")->orWhere('pv.sku', 'like', "%{$search}%"));
            })
            ->selectRaw("
                pv.id, pv.sku, pv.variant_name, p.name as product_name, u.symbol as unit_symbol,
                ss.available_quantity as current_stock, pv.stock_alert_qty as alert_threshold,
                (pv.stock_alert_qty - ss.available_quantity) as recommended_reorder_qty
            ")
            ->orderBy('ss.available_quantity', 'asc')
            ->paginate(self::PER_PAGE);
    }

    public function getBatchLifecycleReport(int $warehouseId, int $daysHorizon): array
    {
        return DB::table('stock_batches as sb')
            ->join('product_variants as pv', 'pv.id', '=', 'sb.product_variant_id')
            ->join('products as p', 'p.id', '=', 'pv.product_id')
            ->where('sb.warehouse_id', $warehouseId)
            ->where('sb.available_quantity', '>', 0)
            ->selectRaw("
                sb.id, sb.batch_no, sb.expiry_date, sb.available_quantity,
                p.name as product_name, pv.variant_name, pv.sku,
                DATEDIFF(sb.expiry_date, NOW()) as days_until_expiry,
                CASE
                    WHEN sb.expiry_date <= NOW() THEN 'EXPIRED'
                    WHEN sb.expiry_date <= DATE_ADD(NOW(), INTERVAL ? DAY) THEN 'CRITICAL'
                    ELSE 'HEALTHY'
                END as lifecycle_status
            ", [$daysHorizon])
            ->orderBy('sb.expiry_date', 'asc')
            ->get()
            ->groupBy('lifecycle_status')
            ->toArray();
    }

    public function getValuationAuditSummary(int $warehouseId): array
    {
        return (array) DB::table('stock_snapshots as ss')
            ->join('product_variants as pv', 'pv.id', '=', 'ss.product_variant_id')
            ->where('ss.warehouse_id', $warehouseId)
            ->whereNull('pv.deleted_at')
            ->selectRaw("
                COUNT(pv.id) as total_monitored_skus,
                SUM(ss.available_quantity) as total_on_hand_volume,
                SUM(ss.available_quantity * pv.cost_price) as total_asset_value_cost,
                SUM(ss.available_quantity * pv.selling_price) as total_asset_value_retail,
                SUM(ss.available_quantity * (pv.selling_price - pv.cost_price)) as potential_holding_margin
            ")
            ->first();
    }

    // =========================================================================
    // MODULE 2: SALES & CHANNEL PERFORMANCE
    // =========================================================================

    public function getOmnichannelPerformance(int $warehouseId, string $startDate, string $endDate): array
    {
        return DB::table('orders')
            ->where('warehouse_id', $warehouseId)
            ->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
            ->whereIn('status', ['delivered', 'completed', 'processing'])
            ->selectRaw("
                order_channel,
                COUNT(id) as total_orders,
                SUM(total_amount) as gross_revenue,
                SUM(discount_amount) as total_markdowns,
                AVG(total_amount) as average_order_value
            ")
            ->groupBy('order_channel')
            ->get()
            ->toArray();
    }

    public function getProductMarginAnalysis(int $warehouseId, int $limit = 20): array
    {
        return DB::table('order_items as oi')
            ->join('orders as o', 'o.id', '=', 'oi.order_id')
            ->join('product_variants as pv', 'pv.id', '=', 'oi.product_variant_id')
            ->join('products as p', 'p.id', '=', 'pv.product_id')
            ->where('o.warehouse_id', $warehouseId)
            ->whereIn('o.status', ['delivered', 'completed'])
            ->selectRaw("
                pv.id as variant_id, pv.sku, p.name as product_name, pv.variant_name,
                SUM(oi.quantity) as total_units_sold,
                SUM(oi.total) as generated_revenue,
                SUM(oi.total - (oi.quantity * pv.cost_price)) as net_margin_profit,
                (SUM(oi.total - (oi.quantity * pv.cost_price)) / SUM(oi.total)) * 100 as profit_margin_percentage
            ")
            ->groupBy('pv.id', 'pv.sku', 'p.name', 'pv.variant_name')
            ->orderByDesc('net_margin_profit')
            ->limit($limit)
            ->get()
            ->toArray();
    }

    // =========================================================================
    // MODULE 3: WAREHOUSE OPERATIONS & FULFILLMENT METRICS
    // =========================================================================

    public function getFulfillmentVelocity(int $warehouseId): array
    {
        return (array) DB::table('deliveries as d')
            ->join('orders as o', 'o.id', '=', 'd.order_id')
            ->where('o.warehouse_id', $warehouseId)
            ->whereNotNull('d.delivered_at')
            ->selectRaw("
                COUNT(d.id) as total_fulfilled_deliveries,
                AVG(TIMESTAMPDIFF(MINUTE, o.created_at, d.assigned_at)) as avg_packaging_time_mins,
                AVG(TIMESTAMPDIFF(MINUTE, d.assigned_at, d.delivered_at)) as avg_transit_time_mins,
                AVG(TIMESTAMPDIFF(MINUTE, o.created_at, d.delivered_at)) as total_turnaround_time_mins
            ")
            ->first();
    }

    public function getReturnsAnalysisMetrics(int $warehouseId): array
    {
        return DB::table('return_items as ri')
            ->join('returns as r', 'r.id', '=', 'ri.return_id')
            ->join('order_items as oi', 'oi.id', '=', 'ri.order_item_id')
            ->join('product_variants as pv', 'pv.id', '=', 'oi.product_variant_id')
            ->join('products as p', 'p.id', '=', 'pv.product_id')
            ->where('r.status', 'approved')
            ->selectRaw("
                ri.condition,
                COUNT(ri.id) as total_returned_items,
                SUM(ri.quantity) as return_volume,
                SUM(ri.quantity * oi.price) as financial_loss_value
            ")
            ->groupBy('ri.condition')
            ->get()
            ->toArray();
    }

    // =========================================================================
    // MODULE 4: LOCALIZED WAREHOUSE FINANCIALS
    // =========================================================================

    public function getProfitLossStatement(int $warehouseId, string $startDate, string $endDate): array
    {
        $revenue = DB::table('orders')
            ->where('warehouse_id', $warehouseId)
            ->whereIn('status', ['delivered', 'completed'])
            ->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
            ->sum('total_amount');

        $cogs = DB::table('order_items as oi')
            ->join('orders as o', 'o.id', '=', 'oi.order_id')
            ->join('product_variants as pv', 'pv.id', '=', 'oi.product_variant_id')
            ->where('o.warehouse_id', $warehouseId)
            ->whereIn('o.status', ['delivered', 'completed'])
            ->whereBetween('o.created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
            ->sum(DB::raw('oi.quantity * pv.cost_price'));

        $operatingExpenses = DB::table('expenses')
            ->where('warehouse_id', $warehouseId)
            ->whereBetween('expense_date', [$startDate, $endDate])
            ->sum('amount');

        $grossProfit = $revenue - $cogs;
        $netProfit = $grossProfit - $operatingExpenses;

        return [
            'gross_revenue'      => (float) $revenue,
            'cost_of_goods_sold' => (float) $cogs,
            'gross_profit'       => (float) $grossProfit,
            'operating_expenses' => (float) $operatingExpenses,
            'net_profit'         => (float) $netProfit,
        ];
    }

    public function getTaxLedgerSummary(int $warehouseId, string $startDate, string $endDate): array
    {
        return DB::table('order_items as oi')
            ->join('orders as o', 'o.id', '=', 'oi.order_id')
            ->join('product_variants as pv', 'pv.id', '=', 'oi.product_variant_id')
            ->join('products as p', 'p.id', '=', 'pv.product_id')
            ->join('tax_categories as tc', 'tc.id', '=', 'p.tax_category_id')
            ->where('o.warehouse_id', $warehouseId)
            ->whereIn('o.status', ['delivered', 'completed'])
            ->whereBetween('o.created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
            ->selectRaw("
                tc.name as tax_tier_name,
                tc.tax_percent,
                SUM(oi.total) as gross_sales_with_tax,
                SUM(oi.total - (oi.total / (1 + (tc.tax_percent / 100)))) as tax_collected_portion
            ")
            ->groupBy('tc.id', 'tc.name', 'tc.tax_percent')
            ->get()
            ->toArray();
    }
}
