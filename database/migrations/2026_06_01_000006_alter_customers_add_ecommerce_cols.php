<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Adds e-commerce customer profile columns to the customers table:
     *  - email          : Customer email address for online orders (nullable — not all walk-in customers have one)
     *  - address        : Default free-text delivery address (nullable)
     *  - loyalty_points : Accumulated reward points (default 0)
     *  - total_spent    : Lifetime spend amount for tier calculations (default 0.00)
     *  - is_verified    : KYC / OTP verification flag (default false)
     *
     * All columns are safe for existing rows:
     *  - Nullable columns leave existing rows with NULL.
     *  - Columns with defaults apply the default to all existing rows immediately.
     */
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            // Email contact — nullable because POS walk-in customers may not provide one
            $table->string('email')->nullable()->after('phone');

            // Default delivery address as free text (structured addresses live in addresses table)
            $table->text('address')->nullable()->after('email');

            // Loyalty / reward points balance
            $table->integer('loyalty_points')->default(0)->after('address');

            // Lifetime total spend — updated by order completion events
            $table->decimal('total_spent', 12, 2)->default(0)->after('loyalty_points');

            // Whether the customer has completed OTP / email verification
            $table->boolean('is_verified')->default(false)->after('total_spent');
        });
    }

    /**
     * Reverse the migrations.
     *
     * Drops all columns added by this migration.
     */
    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn([
                'email',
                'address',
                'loyalty_points',
                'total_spent',
                'is_verified',
            ]);
        });
    }
};
