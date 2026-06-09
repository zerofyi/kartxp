<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Extends warehouses with operational and geographic columns:
     *  - phone      : Contact phone number (nullable)
     *  - email      : Contact email (nullable)
     *  - logo_path  : Warehouse logo / brand image path (nullable)
     *  - is_active  : Toggle to enable/disable the warehouse (default true)
     *  - gstin      : GST identification number for Indian tax compliance (nullable)
     *  - lat        : Latitude for map display and delivery radius (nullable)
     *  - lng        : Longitude (nullable)
     *  - timezone   : IANA timezone string for scheduling (default Asia/Kolkata)
     *  - currency   : ISO 4217 currency code (default INR)
     *
     * is_active and currency/timezone have safe defaults so all existing warehouses
     * continue to work correctly without any data update.
     */
    public function up(): void
    {
        Schema::table('warehouses', function (Blueprint $table) {
            $table->enum('platform', ['ghorerbazar', 'foodbazar', 'mobilebazar'])->default('ghorerbazar')->after('name');
            $table->string('phone')->nullable()->after('location');
            $table->string('email')->nullable()->after('phone');
            $table->string('logo_path')->nullable()->after('email');
            $table->boolean('is_active')->default(true)->after('logo_path');
            $table->string('gstin')->nullable()->after('is_active');

            // Geographic coordinates stored with enough precision for map display
            $table->decimal('lat', 10, 7)->nullable()->after('gstin');
            $table->decimal('lng', 10, 7)->nullable()->after('lat');

            // Operational timezone defaults to IST for Indian deployments
            $table->string('timezone')->default('Asia/Kolkata')->after('lng');

            // Currency defaults to INR; length 5 accommodates most ISO codes and symbols
            $table->string('currency', 5)->default('INR')->after('timezone');
        });
    }

    /**
     * Reverse the migrations.
     *
     * Drops all columns added by this migration.
     */
    public function down(): void
    {
        Schema::table('warehouses', function (Blueprint $table) {
            $table->dropColumn([
                'phone',
                'email',
                'logo_path',
                'is_active',
                'gstin',
                'lat',
                'lng',
                'timezone',
                'currency',
            ]);
        });
    }
};
