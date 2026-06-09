<?php

namespace Database\Seeders;

use App\Models\Account;
use Illuminate\Database\Seeder;

class ChartOfAccountsSeeder extends Seeder
{
    public function run(): void
    {
        $accounts = [

            // Assets
            ['name' => 'Cash',                'type' => 'asset',     'is_active' => true],
            ['name' => 'Bank Account',        'type' => 'asset',     'is_active' => true],
            ['name' => 'Accounts Receivable', 'type' => 'asset',     'is_active' => true],
            ['name' => 'Inventory',           'type' => 'asset',     'is_active' => true],

            // Liabilities
            ['name' => 'Accounts Payable',    'type' => 'liability', 'is_active' => true],
            ['name' => 'CGST Payable',        'type' => 'liability', 'is_active' => true],
            ['name' => 'SGST Payable',        'type' => 'liability', 'is_active' => true],
            ['name' => 'IGST Payable',        'type' => 'liability', 'is_active' => true],

            // Income
            ['name' => 'Sales Revenue',       'type' => 'income',    'is_active' => true],
            ['name' => 'Other Income',        'type' => 'income',    'is_active' => true],

            // Expenses
            ['name' => 'Purchase Cost',       'type' => 'expense',   'is_active' => true],
            ['name' => 'Salary Expense',      'type' => 'expense',   'is_active' => true],
            ['name' => 'Rent Expense',        'type' => 'expense',   'is_active' => true],
            ['name' => 'Utility Expense',     'type' => 'expense',   'is_active' => true],
            ['name' => 'Shipping Expense',    'type' => 'expense',   'is_active' => true],
            ['name' => 'Discount Expense',    'type' => 'expense',   'is_active' => true],
            ['name' => 'Refund Expense',      'type' => 'expense',   'is_active' => true],

            // Equity
            ['name' => 'Capital',             'type' => 'equity',    'is_active' => true],
        ];

        foreach ($accounts as $data) {
            Account::updateOrCreate(
                ['name' => $data['name']],
                $data
            );
        }

        $this->command->info('Chart of accounts seeded.');
    }
}
