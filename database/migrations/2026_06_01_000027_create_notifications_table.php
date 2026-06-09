<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Uses the Laravel standard notifications table schema, extended with
     * FCM (Firebase Cloud Messaging) tracking columns.
     */
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            // UUID primary key (char 36) — matches Laravel's standard notifications table
            $table->uuid('id')->primary();

            $table->string('type');
            $table->string('notifiable_type');
            $table->unsignedBigInteger('notifiable_id');
            $table->text('data');
            $table->timestamp('read_at')->nullable();

            // FCM push tracking columns
            $table->boolean('fcm_sent')->default(false);
            $table->timestamp('fcm_sent_at')->nullable();

            $table->timestamp('created_at')->nullable();
            $table->timestamp('updated_at')->nullable();

            // Morph index for notifiable polymorphic relation
            $table->index(['notifiable_type', 'notifiable_id'], 'notifications_notifiable_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
