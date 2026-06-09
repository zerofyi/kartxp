<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Adds avatar and phone_verified_at columns to users table.
     * Extends the role enum to include manager, staff, delivery_agent.
     * Adds an index on the mobile column if not already present.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('avatar')->nullable()->after('name');
            $table->timestamp('phone_verified_at')->nullable()->after('email_verified_at');
        });

        // Extend enum — safe add-only operation on live MySQL.
        // Existing values (customer, warehouse, admin) are preserved.
        DB::statement(
            "ALTER TABLE users MODIFY COLUMN role ENUM('customer','warehouse','admin','manager','staff','delivery_agent') DEFAULT 'customer'"
        );

        // Add index on mobile only if it does not already exist.
        $existingIndex = collect(DB::select("SHOW INDEX FROM users WHERE Key_name = 'users_mobile_index'"));
        if ($existingIndex->isEmpty()) {
            Schema::table('users', function (Blueprint $table) {
                $table->index('mobile', 'users_mobile_index');
            });
        }
    }

    /**
     * Reverse the migrations.
     *
     * Drops avatar and phone_verified_at, reverts role enum to original values.
     * Note: dropping the mobile index is best-effort — if it never existed, this is a no-op.
     */
    public function down(): void
    {
        // Revert role enum first (before column drops, to keep statement isolation clean)
        DB::statement(
            "ALTER TABLE users MODIFY COLUMN role ENUM('customer','warehouse','admin') DEFAULT 'customer'"
        );

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['avatar', 'phone_verified_at']);
        });

        // Drop the mobile index if it exists
        $existingIndex = collect(DB::select("SHOW INDEX FROM users WHERE Key_name = 'users_mobile_index'"));
        if ($existingIndex->isNotEmpty()) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropIndex('users_mobile_index');
            });
        }
    }
};
