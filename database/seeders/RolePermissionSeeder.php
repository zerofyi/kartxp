<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $permissions = [
            // Products
            'products.view', 'products.create', 'products.edit', 'products.delete',
            // Inventory
            'inventory.view', 'inventory.adjust', 'inventory.transfer',
            // Purchases
            'purchases.view', 'purchases.create', 'purchases.receive', 'purchases.return',
            // Orders
            'orders.view', 'orders.process', 'orders.cancel', 'orders.assign_agent',
            'orders.online.view', 'orders.online.fulfill',
            // Customers
            'customers.view', 'customers.create', 'customers.edit',
            // Reports
            'reports.view', 'reports.export',
            // Accounting
            'accounting.view', 'accounting.manage',
            // Settings
            'settings.view', 'settings.manage',
            // Users
            'users.view', 'users.manage',
            // Deliveries
            'deliveries.view', 'deliveries.update',
            // Returns
            'returns.view', 'returns.process',
            // Barcodes
            'barcodes.print', 'barcodes.manage',
            // Warehouses
            'warehouses.view', 'warehouses.manage',
            // Dashboard
            'dashboard.view',
            // Coupons
            'coupons.view', 'coupons.manage',
            // Banners
            'banners.view', 'banners.manage',
            // Expenses
            'expenses.view', 'expenses.manage',
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'web']);
        }

        // ─── Roles ────────────────────────────────────────────────────────────

        /** @var Role $superAdmin */
        $superAdmin = Role::firstOrCreate(['name' => 'super_admin', 'guard_name' => 'web']);
        $superAdmin->syncPermissions(Permission::all());

        /** @var Role $admin */
        $admin = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $admin->syncPermissions(Permission::all());

        /** @var Role $warehouse */
        $warehouse = Role::firstOrCreate(['name' => 'warehouse', 'guard_name' => 'web']);
        $warehouse->syncPermissions(Permission::whereNotIn('name', [
            'users.manage', 'warehouses.manage',
        ])->get());

        /** @var Role $manager */
        $manager = Role::firstOrCreate(['name' => 'manager', 'guard_name' => 'web']);
        $manager->syncPermissions([
            'products.view', 'inventory.view', 'inventory.adjust',
            'orders.view', 'orders.process', 'orders.assign_agent',
            'orders.online.view', 'orders.online.fulfill',
            'customers.view', 'customers.create',
            'purchases.view', 'purchases.create',
            'reports.view',
            'deliveries.view', 'returns.view', 'returns.process',
            'barcodes.print', 'dashboard.view',
            'expenses.view',
        ]);

        /** @var Role $staff */
        $staff = Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
        $staff->syncPermissions([
            'products.view', 'inventory.view',
            'orders.view', 'orders.process',
            'barcodes.print', 'dashboard.view',
        ]);

        /** @var Role $agent */
        $agent = Role::firstOrCreate(['name' => 'delivery_agent', 'guard_name' => 'web']);
        $agent->syncPermissions([
            'deliveries.view', 'deliveries.update',
            'orders.view', 'dashboard.view',
        ]);

        /** @var Role $customer */
        $customer = Role::firstOrCreate(['name' => 'customer', 'guard_name' => 'web']);
        // Customers have no panel permissions

        $this->command->info('Roles and permissions seeded successfully.');
    }
}
