<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DefaultAdminSeeder extends Seeder
{
    public function run(): void
    {
        $env = app()->environment();

        $adminPassword = config('admin.password');

        if (! $adminPassword && $env === 'production') {
            throw new \RuntimeException(
                'ADMIN_PASSWORD must be set in .env for production.'
            );
        }

        $admin = User::updateOrCreate(
            [
                'email' => config('admin.email'),
            ],
            [
                'name' => config('admin.name'),
                'mobile' => config('admin.mobile'),
                'role' => 'admin',
                'status' => 'active',
                'email_verified_at' => now(),
                'password' => Hash::make($adminPassword),
            ]
        );

        if (class_exists(\Spatie\Permission\Models\Role::class)) {
            $admin->assignRole('admin');
        }

        $this->command->info("Admin user ready: {$admin->email}");
    }
}
