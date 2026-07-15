<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\FxApiService;

class SyncFxRates extends Command
{
    /**
     * Nama perintah yang akan diketik di terminal
     */
    protected $signature = 'fx:sync-daily';

    /**
     * Deskripsi perintah
     */
    protected $description = 'Sinkronisasi kurs mata uang harian dari CurrencyAPI';

    /**
     * Eksekusi logika
     */
    public function handle(FxApiService $fxService)
    {
        $this->info('Memulai sinkronisasi kurs...');
        
        $result = $fxService->syncRates();

        if ($result['success']) {
            $this->info($result['message']);
        } else {
            $this->error('Gagal: ' . $result['message']);
        }
    }
}