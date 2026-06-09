<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('otp_verifications', function (Blueprint $table) {
            $table->id();
            $table->string('identifier'); // phone or email
            $table->string('otp');    // stored as hash (bcrypt/hash)
            $table->enum('type', ['register', 'login', 'reset', 'phone_change']);
            $table->timestamp('expires_at');
            $table->timestamp('verified_at')->nullable();
            $table->tinyInteger('attempts')->default(0);
            $table->timestamp('sent_at')->nullable();
            $table->string('ip_address')->nullable();
            $table->timestamps();

            // Composite index for fast lookup
            $table->index(['identifier', 'type'], 'otp_identifier_type_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('otp_verifications');
    }
};
