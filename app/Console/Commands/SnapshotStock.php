<?php

namespace App\Console\Commands;

use App\Models\ProductVariant;
use App\Models\StockSnapshot;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SnapshotStock extends Command
{
    protected $signature   = 'app:snapshot-stock {--warehouse= : Snapshot for specific warehouse only}';
    protected $description = 'Rebuild stock snapshots from ledger totals for all variants';

    public function handle(): int
    {
        $warehouseId = $this->option('warehouse');

        $this->info('Starting stock snapshot rebuild...');

        $query = DB::table('stock_ledgers')
            ->select(
                'product_variant_id',
                'warehouse_id',
                DB::raw("SUM(CASE WHEN movement_type IN ('IN', 'RELEASED', 'ADJUSTMENT', 'RETURN_IN') THEN quantity ELSE 0 END) as total_in"),
                DB::raw("SUM(CASE WHEN movement_type IN ('OUT', 'RESERVED', 'DAMAGE', 'RETURN_OUT') THEN quantity ELSE 0 END) as total_out")
            )
            ->groupBy('product_variant_id', 'warehouse_id');

        if ($warehouseId) {
            $query->where('warehouse_id', $warehouseId);
        }

        $rows  = $query->get();
        $count = 0;

        foreach ($rows as $row) {
            $available = max(0, $row->total_in - $row->total_out);

            // Get current reserved from stock_reservations
            $reserved = DB::table('stock_reservations')
                ->where('product_variant_id', $row->product_variant_id)
                ->where('warehouse_id', $row->warehouse_id)
                ->where('status', 'active')
                ->sum('quantity');

            StockSnapshot::updateOrCreate(
                [
                    'product_variant_id' => $row->product_variant_id,
                    'warehouse_id'       => $row->warehouse_id,
                ],
                [
                    'available_quantity' => $available,
                    'reserved_quantity'  => (int) $reserved,
                ]
            );

            $count++;
        }

        $this->info("✅ Rebuilt {$count} stock snapshots.");

        return self::SUCCESS;
    }
}
