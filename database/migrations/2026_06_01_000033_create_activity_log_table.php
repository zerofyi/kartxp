<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Creates the Spatie Activitylog standard activity_log table.
     * See: https://spatie.be/docs/laravel-activitylog
     */
    public function up(): void
    {
        Schema::create('activity_log', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('log_name')->nullable();
            $table->text('description');

            // Subject (the model that was acted upon)
            $table->string('subject_type')->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();

            // Event name (e.g. created, updated, deleted)
            $table->string('event')->nullable();

            // Causer (who performed the action)
            $table->string('causer_type')->nullable();
            $table->unsignedBigInteger('causer_id')->nullable();

            // Extra data as JSON
            $table->json('properties')->nullable();

            // UUID for grouping batch operations
            $table->uuid('batch_uuid')->nullable();

            $table->timestamp('created_at')->nullable();
            $table->timestamp('updated_at')->nullable();

            // Indexes
            $table->index('log_name', 'activity_log_log_name_index');
            $table->index(['subject_type', 'subject_id'], 'activity_log_subject_index');
            $table->index(['causer_type', 'causer_id'], 'activity_log_causer_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_log');
    }
};
