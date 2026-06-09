<?php

namespace App\Services;

use App\Models\StockBatch;
use App\Models\StockLedger;
use App\Models\StockReservation;
use App\Models\StockSnapshot;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class StockService
{
    /**
     * Reserve stock for an order.
     * Decrements available_quantity, increments reserved_quantity, writes RESERVED ledger.
     */
    public function reserve(int $variantId, int $warehouseId, int $orderId, int $qty): bool
    {
        return DB::transaction(function () use ($variantId, $warehouseId, $orderId, $qty) {
            $snapshot = $this->getSnapshot($variantId, $warehouseId);

            if (! $snapshot || $snapshot->available_quantity < $qty) {
                return false;
            }

            StockReservation::updateOrCreate(
                ['product_variant_id' => $variantId, 'warehouse_id' => $warehouseId, 'order_id' => $orderId],
                ['quantity' => $qty, 'status' => 'active']
            );

            $snapshot->decrement('available_quantity', $qty);
            $snapshot->increment('reserved_quantity', $qty);

            $this->writeLedger($variantId, $warehouseId, null, 'RESERVED', $qty, 'order', $orderId, "Reserved for order #{$orderId}");

            return true;
        });
    }

    /**
     * Release a stock reservation (order cancelled / payment failed).
     */
    public function release(int $variantId, int $warehouseId, int $orderId): bool
    {
        return DB::transaction(function () use ($variantId, $warehouseId, $orderId) {
            $reservation = StockReservation::where([
                'product_variant_id' => $variantId,
                'warehouse_id'       => $warehouseId,
                'order_id'           => $orderId,
                'status'             => 'active',
            ])->first();

            if (! $reservation) {
                return true; // Already released
            }

            $qty      = $reservation->quantity;
            $snapshot = $this->getSnapshot($variantId, $warehouseId);

            if ($snapshot) {
                $snapshot->increment('available_quantity', $qty);
                $snapshot->decrement('reserved_quantity', $qty);
            }

            $reservation->update(['status' => 'released']);

            $this->writeLedger($variantId, $warehouseId, null, 'RELEASED', $qty, 'order', $orderId, "Released reservation for order #{$orderId}");

            return true;
        });
    }

    /**
     * Deduct stock from available (after payment confirmed). FIFO batch deduction.
     */
    public function deduct(int $variantId, int $warehouseId, int $qty, string $sourceType, int $sourceId): bool
    {
        return DB::transaction(function () use ($variantId, $warehouseId, $qty, $sourceType, $sourceId) {
            $snapshot = $this->getSnapshot($variantId, $warehouseId);

            if (! $snapshot) {
                return false;
            }

            // FIFO: deduct from oldest batches first
            $remaining = $qty;
            $batches   = StockBatch::where('product_variant_id', $variantId)
                ->where('warehouse_id', $warehouseId)
                ->where('available_quantity', '>', 0)
                ->orderBy('created_at')
                ->get();

            foreach ($batches as $batch) {
                if ($remaining <= 0) {
                    break;
                }
                $deductFromBatch = min($remaining, $batch->available_quantity);
                $batch->decrement('available_quantity', $deductFromBatch);
                $remaining -= $deductFromBatch;

                $this->writeLedger($variantId, $warehouseId, $batch->id, 'OUT', $deductFromBatch, $sourceType, $sourceId, "Deducted for {$sourceType} #{$sourceId}");
            }

            $snapshot->decrement('available_quantity', $qty);

            return true;
        });
    }

    /**
     * Add stock (from purchase confirmation or return restocking).
     */
    public function addStock(int $variantId, int $warehouseId, int $batchId, int $qty, string $sourceType, int $sourceId): bool
    {
        return DB::transaction(function () use ($variantId, $warehouseId, $batchId, $qty, $sourceType, $sourceId) {
            $batch = StockBatch::find($batchId);
            if ($batch) {
                $batch->increment('available_quantity', $qty);
            }

            $snapshot = $this->getSnapshot($variantId, $warehouseId);
            if ($snapshot) {
                $snapshot->increment('available_quantity', $qty);
            } else {
                StockSnapshot::create([
                    'product_variant_id' => $variantId,
                    'warehouse_id'       => $warehouseId,
                    'available_quantity' => $qty,
                    'reserved_quantity'  => 0,
                ]);
            }

            $this->writeLedger($variantId, $warehouseId, $batchId, 'IN', $qty, $sourceType, $sourceId, "Added stock from {$sourceType} #{$sourceId}");

            return true;
        });
    }

    /**
     * Stock adjustment (increase or decrease with reason).
     */
    public function adjust(int $variantId, int $warehouseId, ?int $batchId, int $qty, string $type, string $reason, int $userId): bool
    {
        return DB::transaction(function () use ($variantId, $warehouseId, $batchId, $qty, $type, $reason, $userId) {
            $movementType = match ($type) {
                'increase'   => 'ADJUSTMENT',
                'decrease'   => 'ADJUSTMENT',
                'damage'     => 'DAMAGE',
                'return_in'  => 'RETURN_IN',
                'return_out' => 'RETURN_OUT',
                default      => 'ADJUSTMENT',
            };

            $snapshot = $this->getSnapshot($variantId, $warehouseId);

            if ($type === 'increase' || $type === 'return_in') {
                if ($snapshot) {
                    $snapshot->increment('available_quantity', $qty);
                }
                if ($batchId) {
                    StockBatch::find($batchId)?->increment('available_quantity', $qty);
                }
            } else {
                if ($snapshot) {
                    $snapshot->decrement('available_quantity', $qty);
                }
                if ($batchId) {
                    StockBatch::find($batchId)?->decrement('available_quantity', $qty);
                }
            }

            $this->writeLedger($variantId, $warehouseId, $batchId, $movementType, $qty, 'adjustment', $userId, $reason);

            return true;
        });
    }

    /**
     * Apply physical stock count — overrides the ledger balance to match physical count.
     * Creates an ADJUSTMENT ledger entry for the difference.
     */
    public function applyPhysicalCount(int $variantId, int $warehouseId, int $physicalCount, int $userId): bool
    {
        return DB::transaction(function () use ($variantId, $warehouseId, $physicalCount, $userId) {
            $snapshot = $this->getSnapshot($variantId, $warehouseId);
            $current  = $snapshot?->available_quantity ?? 0;
            $diff     = $physicalCount - $current;

            if ($diff === 0) {
                return true; // No change needed
            }

            if ($snapshot) {
                $snapshot->update(['available_quantity' => $physicalCount]);
            } else {
                StockSnapshot::create([
                    'product_variant_id' => $variantId,
                    'warehouse_id'       => $warehouseId,
                    'available_quantity' => $physicalCount,
                    'reserved_quantity'  => 0,
                ]);
            }

            $movementType = $diff > 0 ? 'ADJUSTMENT' : 'ADJUSTMENT';
            $this->writeLedger(
                $variantId,
                $warehouseId,
                null,
                $movementType,
                abs($diff),
                'physical_count',
                $userId,
                "Physical count: was {$current}, counted {$physicalCount} (diff " . ($diff > 0 ? "+{$diff}" : "{$diff}") . ") by user #{$userId}"
            );

            return true;
        });
    }

    /**
     * Convert stock reservations to actual deductions after payment confirmed.
     */
    public function convertReservationToDeduction(int $orderId): bool
    {
        return DB::transaction(function () use ($orderId) {
            $reservations = StockReservation::where('order_id', $orderId)
                ->where('status', 'active')
                ->get();

            foreach ($reservations as $reservation) {
                $snapshot = $this->getSnapshot($reservation->product_variant_id, $reservation->warehouse_id);
                if ($snapshot) {
                    $snapshot->decrement('reserved_quantity', $reservation->quantity);
                    // available_quantity was already decremented during reserve()
                }

                // FIFO batch deduction
                $remaining = $reservation->quantity;
                $batches   = StockBatch::where('product_variant_id', $reservation->product_variant_id)
                    ->where('warehouse_id', $reservation->warehouse_id)
                    ->where('available_quantity', '>', 0)
                    ->orderBy('created_at')
                    ->get();

                foreach ($batches as $batch) {
                    if ($remaining <= 0) {
                        break;
                    }
                    $deduct = min($remaining, $batch->available_quantity);
                    $batch->decrement('available_quantity', $deduct);
                    $remaining -= $deduct;
                    $this->writeLedger($reservation->product_variant_id, $reservation->warehouse_id, $batch->id, 'OUT', $deduct, 'order', $orderId, "Sold via order #{$orderId}");
                }

                $reservation->update(['status' => 'converted']);
            }

            return true;
        });
    }

    /**
     * Get current available quantity from snapshot.
     */
    public function getAvailable(int $variantId, int $warehouseId): int
    {
        return $this->getSnapshot($variantId, $warehouseId)?->available_quantity ?? 0;
    }

    /**
     * Check if a variant is at or below stock alert threshold.
     */
    public function isLowStock(int $variantId, int $warehouseId): bool
    {
        $snapshot = $this->getSnapshot($variantId, $warehouseId);
        if (! $snapshot) {
            return true;
        }

        $alertQty = DB::table('product_variants')
            ->where('id', $variantId)
            ->value('stock_alert_qty') ?? 5;

        return $snapshot->available_quantity <= $alertQty;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────────

    private function getSnapshot(int $variantId, int $warehouseId): ?StockSnapshot
    {
        return StockSnapshot::where('product_variant_id', $variantId)
            ->where('warehouse_id', $warehouseId)
            ->lockForUpdate()
            ->first();
    }

    private function writeLedger(int $variantId, int $warehouseId, ?int $batchId, string $movementType, int $qty, string $sourceType, int $sourceId, string $remarks): void
    {
        StockLedger::create([
            'product_variant_id' => $variantId,
            'warehouse_id'       => $warehouseId,
            'batch_id'           => $batchId,
            'movement_type'      => $movementType,
            'quantity'           => $qty,
            'source_type'        => $sourceType,
            'source_id'          => $sourceId,
            'remarks'            => $remarks,
        ]);
    }
}
