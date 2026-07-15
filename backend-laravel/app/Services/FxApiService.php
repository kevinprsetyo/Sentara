<?php

namespace App\Services;

use App\Models\Country;
use App\Models\FxRateMonthly;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FxApiService
{
    protected string $apiKey;
    protected string $baseUrl = 'https://api.currencyapi.com/v3/latest';

    public function __construct()
    {
        $this->apiKey = env('CURRENCY_API_KEY');
    }

    /**
     * Sinkronisasi data kurs dari API
     */
    public function syncRates(): array
    {
        try {
            // 1. Ambil daftar mata uang unik dari tabel Countries
            $currencies = Country::whereNotNull('currency_code')
                ->distinct()
                ->pluck('currency_code')
                ->toArray();

            if (empty($currencies)) {
                return ['success' => false, 'message' => 'No currency codes found in countries table.'];
            }

            // 2. Tembak API (Base USD)
            $response = Http::get($this->baseUrl, [
                'apikey' => $this->apiKey,
                'base_currency' => 'USD',
                'currencies' => implode(',', $currencies)
            ]);

            if (!$response->successful()) {
                throw new \Exception("API Error: " . $response->body());
            }

            $data = $response->json()['data'];
            $now = Carbon::now();
            $firstDayOfMonth = $now->startOfMonth()->format('Y-m-d');
            $updatedCount = 0;

            // 3. Simpan ke Database dengan Logika Hybrid
            foreach ($data as $code => $info) {
                $rateValue = (float) $info['value'];

                // Cari data eksisting untuk bulan ini
                $existing = FxRateMonthly::where('currency_code', $code)
                    ->where('year_month', $firstDayOfMonth)
                    ->first();

                // Loncati jika data sudah diset MANUAL oleh Admin
                if ($existing && $existing->source === 'MANUAL') {
                    continue;
                }

                // Update atau Create jika source adalah API atau data baru
                FxRateMonthly::updateOrCreate(
                    [
                        'currency_code' => $code,
                        'year_month' => $firstDayOfMonth,
                    ],
                    [
                        'rate_to_usd' => 1 / $rateValue, // Simpan Inverse Rate (1 Unit Lokal = X USD)
                        'source' => 'API',
                        'last_synced_at' => now(),
                    ]
                );
                $updatedCount++;
            }

            return [
                'success' => true,
                'message' => "Successfully synced {$updatedCount} rates from API.",
                'source' => 'API'
            ];

        } catch (\Exception $e) {
            Log::error("FX Sync Error: " . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }
}