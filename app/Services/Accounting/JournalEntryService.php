<?php

namespace App\Services\Accounting;

use App\Models\Order;
use App\Models\JournalEntry;
use App\Models\JournalLine;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class JournalEntryService
{
    // Exact Account Registry Map IDs
    private const ACC_CASH = 1;
    private const ACC_BANK = 2;
    private const ACC_INVENTORY = 4;
    private const ACC_PAYABLE = 5;
    private const ACC_CGST = 6;
    private const ACC_SGST = 7;
    private const ACC_IGST = 8;
    private const ACC_SALES_REVENUE = 9;
    private const ACC_OTHER_INCOME = 10;
    private const ACC_PURCHASE_COST = 11;
    private const ACC_SALARY_EXP = 12;
    private const ACC_RENT_EXP = 13;
    private const ACC_UTILITY_EXP = 14;
    private const ACC_SHIPPING_EXP = 15;
    private const ACC_DISCOUNT_EXP = 16;
    private const ACC_REFUND_EXP = 17;
    private const ACC_CAPITAL = 18;

    /**
     * Core Double-Entry Committer
     * Enforces the gold standard: Total Debits MUST match Total Credits down to the paisa.
     */
    private function commitEntry(int $warehouseId, string $date, string $description, array $lines, ?int $userId = null): JournalEntry
    {
        $totalDebit = 0.0;
        $totalCredit = 0.0;

        foreach ($lines as $line) {
            $totalDebit += (float) ($line['debit'] ?? 0);
            $totalCredit += (float) ($line['credit'] ?? 0);
        }

        // Safeguard to prevent breaking the general ledger balance
        if (abs($totalDebit - $totalCredit) > 0.001) {
            throw new RuntimeException("Accounting out-of-balance panic. Total Debits ({$totalDebit}) must equal Total Credits ({$totalCredit}).");
        }

        return DB::transaction(function () use ($warehouseId, $date, $description, $lines, $userId) {
            $entry = JournalEntry::create([
                'warehouse_id' => $warehouseId,
                'date'         => $date,
                'description'  => $description,
                'created_by'   => $userId,
            ]);

            foreach ($lines as $line) {
                JournalLine::create([
                    'journal_entry_id' => $entry->id,
                    'account_id'       => $line['account_id'],
                    'debit'            => $line['debit'] ?? 0,
                    'credit'           => $line['credit'] ?? 0,
                ]);
            }

            return $entry;
        });
    }

    // =========================================================================
    // 1. SALES ACTIONS
    // =========================================================================

    /**
     * Scenario 1A & 1B: Record POS Cash Sales or Online Order Deliveries
     * Factors in Subtotals, Tax Brackets, and Automatic COGS Cost Movements.
     */
    public function recordSale(Order $order, array $itemsMetaData, bool $isOutOfState = false): JournalEntry
    {
        $lines = [];
        $paymentAccountId = $order->order_channel === 'pos' ? self::ACC_CASH : self::ACC_BANK;

        // Debit cash/bank for what the customer paid
        $lines[] = ['account_id' => $paymentAccountId, 'debit' => $order->total_amount, 'credit' => 0];

        // If a coupon discount was applied, log it as an explicit operational cost row
        if ($order->discount_amount > 0) {
            $lines[] = ['account_id' => self::ACC_DISCOUNT_EXP, 'debit' => $order->discount_amount, 'credit' => 0];
        }

        // Credit store sales earnings
        $lines[] = ['account_id' => self::ACC_SALES_REVENUE, 'debit' => 0, 'credit' => $order->subtotal];

        // Credit tax tracking scorecards
        if ($order->tax_amount > 0) {
            if ($isOutOfState) {
                $lines[] = ['account_id' => self::ACC_IGST, 'debit' => 0, 'credit' => $order->tax_amount];
            } else {
                $halfTax = $order->tax_amount / 2;
                $lines[] = ['account_id' => self::ACC_CGST, 'debit' => 0, 'credit' => $halfTax];
                $lines[] = ['account_id' => self::ACC_SGST, 'debit' => 0, 'credit' => $halfTax];
            }
        }

        // Process the entry
        $saleEntry = $this->commitEntry(
            $order->warehouse_id,
            $order->created_at->toDateString(),
            "Automated entry for Order #{$order->order_number} via channel: " . strtoupper($order->order_channel),
            $lines,
            $order->created_by
        );

        // ── Inventory COGS Hook ──
        // Calculate total cost price dynamically from the batch items data payload
        $totalCostPrice = 0.0;
        foreach ($itemsMetaData as $item) {
            $totalCostPrice += ((float) $item['cost_price'] * (int) $item['quantity']);
        }

        if ($totalCostPrice > 0) {
            $cogsLines = [
                ['account_id' => self::ACC_PURCHASE_COST, 'debit' => $totalCostPrice, 'credit' => 0],
                ['account_id' => self::ACC_INVENTORY, 'debit' => 0, 'credit' => $totalCostPrice],
            ];

            $this->commitEntry(
                $order->warehouse_id,
                $order->created_at->toDateString(),
                "COGS shift deduction for Order #{$order->order_number}",
                $cogsLines,
                $order->created_by
            );
        }

        return $saleEntry;
    }

    // =========================================================================
    // 2. VENDOR PURCHASES
    // =========================================================================

    /**
     * Scenario 2A: Stock Purchase Received from a Vendor (On Credit)
     */
    public function recordStockPurchaseReceived(int $warehouseId, string $invoiceNo, float $baseCost, float $taxAmount, bool $isOutOfState = false, ?int $userId = null): JournalEntry
    {
        $totalOwed = $baseCost + $taxAmount;

        $lines = [
            ['account_id' => self::ACC_INVENTORY, 'debit' => $baseCost, 'credit' => 0],
        ];

        if ($taxAmount > 0) {
            if ($isOutOfState) {
                $lines[] = ['account_id' => self::ACC_IGST, 'debit' => $taxAmount, 'credit' => 0];
            } else {
                $halfTax = $taxAmount / 2;
                $lines[] = ['account_id' => self::ACC_CGST, 'debit' => $halfTax, 'credit' => 0];
                $lines[] = ['account_id' => self::ACC_SGST, 'debit' => $halfTax, 'credit' => 0];
            }
        }

        $lines[] = ['account_id' => self::ACC_PAYABLE, 'debit' => 0, 'credit' => $totalOwed];

        return $this->commitEntry($warehouseId, now()->toDateString(), "Inventory asset intake from Invoice #{$invoiceNo}", $lines, $userId);
    }

    /**
     * Scenario 2B: Paying Off Vendor Bill via Bank Transfer
     */
    public function recordVendorPayment(int $warehouseId, string $invoiceNo, float $amount, ?int $userId = null): JournalEntry
    {
        $lines = [
            ['account_id' => self::ACC_PAYABLE, 'debit' => $amount, 'credit' => 0],
            ['account_id' => self::ACC_BANK, 'debit' => 0, 'credit' => $amount],
        ];

        return $this->commitEntry($warehouseId, now()->toDateString(), "Settled debt payment to vendor for Invoice #{$invoiceNo}", $lines, $userId);
    }

    // =========================================================================
    // 3. RETURNS & REFUNDS
    // =========================================================================

    /**
     * Scenario 3A & 3B: Process Approved Customer Return with Restocking Value
     */
    public function recordCustomerRefund(int $warehouseId, string $orderNumber, float $refundAmount, float $itemCostValue, string $paymentMode = 'cash', ?int $userId = null): JournalEntry
    {
        $refundAccount = $paymentMode === 'cash' ? self::ACC_CASH : self::ACC_BANK;

        $lines = [
            ['account_id' => self::ACC_REFUND_EXP, 'debit' => $refundAmount, 'credit' => 0],
            ['account_id' => $refundAccount, 'debit' => 0, 'credit' => $refundAmount],
        ];

        $refundEntry = $this->commitEntry($warehouseId, now()->toDateString(), "Refund lookup issue return for Order #{$orderNumber}", $lines, $userId);

        // Put the item value back into active warehouse stock assets if healthy to resell
        if ($itemCostValue > 0) {
            $restockLines = [
                ['account_id' => self::ACC_INVENTORY, 'debit' => $itemCostValue, 'credit' => 0],
                ['account_id' => self::ACC_PURCHASE_COST, 'debit' => 0, 'credit' => $itemCostValue],
            ];

            $this->commitEntry($warehouseId, now()->toDateString(), "Restocked variant asset valuation loop for Order #{$orderNumber}", $restockLines, $userId);
        }

        return $refundEntry;
    }

    // =========================================================================
    // 4. RUNNING OPERATIONS EXPENSES
    // =========================================================================

    /**
     * Scenario 4: Record Warehouse Expenses (Rent, Salary, Utilities, Shipping)
     */
    public function recordExpense(int $warehouseId, string $type, float $amount, string $paymentMode = 'bank', ?int $userId = null): JournalEntry
    {
        $expenseAccountId = match (strtolower($type)) {
            'salary'   => self::ACC_SALARY_EXP,
            'rent'     => self::ACC_RENT_EXP,
            'utility'  => self::ACC_UTILITY_EXP,
            'shipping' => self::ACC_SHIPPING_EXP,
            default    => throw new RuntimeException("Invalid expense type category classification context input: {$type}"),
        };

        $paymentAccount = $paymentMode === 'cash' ? self::ACC_CASH : self::ACC_BANK;

        $lines = [
            ['account_id' => $expenseAccountId, 'debit' => $amount, 'credit' => 0],
            ['account_id' => $paymentAccount, 'debit' => 0, 'credit' => $amount],
        ];

        return $this->commitEntry($warehouseId, now()->toDateString(), "Paid warehouse operational " . ucfirst($type) . " bill cost.", $lines, $userId);
    }

    // =========================================================================
    // 5. OWNER CAPITAL & OTHER REVENUE
    // =========================================================================

    /**
     * Scenario 5A: Owner Injects Capital Cash Injection
     */
    public function recordCapitalInjection(int $warehouseId, float $amount, string $target = 'bank', ?int $userId = null): JournalEntry
    {
        $targetAccount = $target === 'cash' ? self::ACC_CASH : self::ACC_BANK;

        $lines = [
            ['account_id' => $targetAccount, 'debit' => $amount, 'credit' => 0],
            ['account_id' => self::ACC_CAPITAL, 'debit' => 0, 'credit' => $amount],
        ];

        return $this->commitEntry($warehouseId, now()->toDateString(), "Owner cash investment capital injection into business accounts.", $lines, $userId);
    }

    /**
     * Scenario 5B: Earned Miscellaneous Secondary Cash (Scrap, Boxes)
     */
    public function recordOtherIncome(int $warehouseId, float $amount, string $target = 'cash', string $details = 'Scrap sale', ?int $userId = null): JournalEntry
    {
        $targetAccount = $target === 'cash' ? self::ACC_CASH : self::ACC_BANK;

        $lines = [
            ['account_id' => $targetAccount, 'debit' => $amount, 'credit' => 0],
            ['account_id' => self::ACC_OTHER_INCOME, 'debit' => 0, 'credit' => $amount],
        ];

        return $this->commitEntry($warehouseId, now()->toDateString(), "Logged other income: {$details}", $lines, $userId);
    }
}
