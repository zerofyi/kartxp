<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class DefaultSettingsSeeder extends Seeder
{
    public function run(): void
    {
        $defaults = [
            // App
            ['key' => 'app.name',                       'value' => 'KartXp',    'group' => 'general'],
            ['key' => 'app.currency',                   'value' => 'INR',            'group' => 'general'],
            ['key' => 'app.currency_symbol',            'value' => '₹',             'group' => 'general'],
            ['key' => 'app.timezone',                   'value' => 'Asia/Kolkata',   'group' => 'general'],
            ['key' => 'app.logo',                       'value' => '',               'group' => 'general'],
            ['key' => 'app.favicon',                    'value' => '',               'group' => 'general'],
            // Returns
            ['key' => 'app.return_window_days',         'value' => '7',              'group' => 'general'],
            ['key' => 'app.auto_approve_return_below',  'value' => '500',            'group' => 'general'],
            // Orders
            ['key' => 'app.min_order_amount',           'value' => '0',              'group' => 'orders'],
            ['key' => 'app.auto_confirm_orders',        'value' => 'false',          'group' => 'orders'],
            // Loyalty
            ['key' => 'loyalty.enabled',                'value' => 'true',           'group' => 'loyalty'],
            ['key' => 'loyalty.points_per_rupee_spent', 'value' => '0.1',            'group' => 'loyalty'],
            ['key' => 'loyalty.min_redeem_points',      'value' => '100',            'group' => 'loyalty'],
            // Notifications
            ['key' => 'notify.order_updates',           'value' => 'true',           'group' => 'notifications'],
            ['key' => 'notify.promotions',              'value' => 'true',           'group' => 'notifications'],
            ['key' => 'notify.low_stock_threshold',     'value' => '5',              'group' => 'notifications'],
            // Payments
            ['key' => 'payment.phonepe_enabled',        'value' => 'true',           'group' => 'payment'],
            ['key' => 'payment.cash_enabled',           'value' => 'true',           'group' => 'payment'],
            ['key' => 'payment.upi_enabled',            'value' => 'true',           'group' => 'payment'],
            ['key' => 'payment.card_enabled',           'value' => 'false',          'group' => 'payment'],
        ];

        foreach ($defaults as $setting) {
            Setting::updateOrCreate(
                ['key' => $setting['key'], 'warehouse_id' => null],
                ['value' => $setting['value'], 'group' => $setting['group']]
            );
        }

        $this->command->info('Default settings seeded.');
    }
}
