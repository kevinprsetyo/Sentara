<?php

namespace App\Services;

use App\Models\FxRateMonthly;
use App\Models\TransportModeRate;
use Carbon\Carbon;

class CostService
{
    /**
     * Get FX Rate dengan Logika Hybrid (Manual Priority > API > Fallback)
     * Rate di DB adalah Inverse: 1 Unit Lokal = x USD
     */
    public function getFxRate(string $currencyCode, ?string $yearMonth = null): float
    {
        // Jika currency sama dengan USD, ratenya 1:1
        if ($currencyCode === 'USD') return 1.0;

        $targetDate = $yearMonth ? Carbon::parse($yearMonth) : Carbon::now();
        $firstDayOfMonth = $targetDate->startOfMonth()->format('Y-m-d');

        // 1. PRIORITAS UTAMA: Cari data yang diinput MANUAL oleh Admin pada bulan ini [cite: 44, 681]
        $rate = FxRateMonthly::where('currency_code', $currencyCode)
            ->where('year_month', $firstDayOfMonth)
            ->where('source', 'MANUAL')
            ->first();

        // 2. PRIORITAS KEDUA: Jika tidak ada manual, ambil hasil sinkronisasi API bulan berjalan 
        if (!$rate) {
            $rate = FxRateMonthly::where('currency_code', $currencyCode)
                ->where('year_month', $firstDayOfMonth)
                ->where('source', 'API')
                ->first();
        }

        // 3. FALLBACK: Jika bulan ini kosong total, ambil data terbaru dari bulan sebelumnya 
        if (!$rate) {
            $rate = FxRateMonthly::where('currency_code', $currencyCode)
                ->where('year_month', '<=', $firstDayOfMonth)
                ->orderByDesc('year_month')
                ->first();
        }

        return $rate ? (float) $rate->rate_to_usd : 0.0; // Return 0 jika benar-benar tidak ada data [cite: 45]
    }

    /**
     * KONVERSI HARGA USD KE LOKAL
     * Rumus: Amount USD / Rate (Inverse)
     */
    public function convertUsdToCurrency(float $amountUsd, string $targetCurrency): array
    {
        if ($targetCurrency === 'USD') {
            return [
                'currency' => 'USD',
                'amount' => $amountUsd,
                'rate_used' => 1.0
            ];
        }

        $rateToUsd = $this->getFxRate($targetCurrency);

        // Validasi rate tidak ditemukan atau 0
        if ($rateToUsd <= 0) {
            return [
                'currency' => $targetCurrency,
                'amount' => 0,
                'rate_used' => 0,
                'error' => 'Exchange rate not found for ' . $targetCurrency
            ];
        }

        // Rumus Konversi [cite: 51]
        $localAmount = $amountUsd / $rateToUsd;

        return [
            'currency' => $targetCurrency,
            'amount' => round($localAmount, 2),
            'rate_used' => $rateToUsd
        ];
    }

    /**
     * Hitung Landed Price per Unit
     */
    public function calculateUnitLandedCost(float $totalGoodsValueUsd, float $totalFreightCostUsd, float $totalQty): array
    {
        // Prevent Division by Zero [cite: 53]
        if ($totalQty <= 0) {
            return [
                'total_landed_cost' => 0,
                'unit_final_price_usd' => 0,
                'components' => [
                    'total_goods_value' => 0,
                    'total_freight_cost' => 0
                ]
            ];
        }

        $totalCost = $totalGoodsValueUsd + $totalFreightCostUsd;
        $unitPrice = $totalCost / $totalQty; // [cite: 56]

        return [
            'components' => [
                'total_goods_value' => round($totalGoodsValueUsd, 2),
                'total_freight_cost' => round($totalFreightCostUsd, 2),
            ],
            'total_landed_cost' => round($totalCost, 2),
            'unit_final_price_usd' => round($unitPrice, 4) 
        ];
    }

    public function getTransportRate(string $mode, string $rateType = 'CBM'): float
    {
        $now = Carbon::now();
        $rate = TransportModeRate::where('mode', $mode)
            ->where('rate_type', $rateType)
            ->where('valid_from', '<=', $now)
            ->where(function ($query) use ($now) {
                $query->whereNull('valid_to')->orWhere('valid_to', '>=', $now);
            })
            ->orderByDesc('valid_from')
            ->first(); // [cite: 59, 60]

        return $rate ? $rate->rate_per_km : 0.0;
    }

    public function calculateFreightByCbm(float $distanceKm, string $mode, float $totalCbm): float
    {
        $ratePerKm = $this->getTransportRate($mode, 'CBM');
        if ($ratePerKm <= 0) return 0.0; // [cite: 61]
        return round($distanceKm * $ratePerKm * $totalCbm, 4);
    }
}