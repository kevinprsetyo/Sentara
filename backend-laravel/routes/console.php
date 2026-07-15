<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule; // Tambahkan import ini

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote')->hourly();

/**
 * Penjadwalan Sinkronisasi Kurs Otomatis (Hybrid FX System)
 * Menjalankan command fx:sync-daily setiap hari pada pukul 00:00
 */
Schedule::command('fx:sync-daily')->dailyAt('00:00');
#Schedule::command('fx:sync-daily')->everyMinute();