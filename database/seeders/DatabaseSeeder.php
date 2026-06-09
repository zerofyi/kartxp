<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * Order matters:
     *  1. Roles & permissions must exist before any user is assigned a role.
     *  2. Admin user needs roles to already exist.
     *  3. Settings and chart of accounts are independent but placed after user
     *     setup so ChartOfAccountsSeeder can resolve the admin user_id.
     *  4. TaxCategorySeeder and UnitsSeeder have no external dependencies.
     */
    public function run(): void
    {
        $this->call([
            RolePermissionSeeder::class,
            DefaultAdminSeeder::class,
            DefaultSettingsSeeder::class,
            ChartOfAccountsSeeder::class,
            TaxCategorySeeder::class,
            UnitsSeeder::class,
        ]);
    }
}
