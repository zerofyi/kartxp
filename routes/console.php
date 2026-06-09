<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Schedule recurring tasks
Schedule::command('app:process-expired-coupons')->daily()->withoutOverlapping();
Schedule::command('app:snapshot-stock')->dailyAt('02:00')->withoutOverlapping();
