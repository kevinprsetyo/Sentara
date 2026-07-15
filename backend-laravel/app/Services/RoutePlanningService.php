<?php

namespace App\Services;

use App\Models\Sku;
use App\Models\Port;
use App\Models\PortInventory;
use App\Models\FreightRate;
use App\Models\TradeRule;
use App\Models\RouteSegment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class RoutePlanningService
{
    protected ProductService $productService;
    protected CostService $costService;

    public function __construct(ProductService $productService, CostService $costService)
    {
        $this->productService = $productService;
        $this->costService = $costService;
    }

    public function planRoute(Request $request): array
    {
        // 1. TERIMA PARAMETER & HITUNG VOLUME RIIL
        $destPortId = $request->destination_port_id;
        $requestedMode = $request->transport_mode; 
        
        $items = is_array($request->items) ? $request->items : [];
        if (empty($items)) throw new \Exception("Items list cannot be empty.");

        // Hitung Volume via ProductService
        $cargoStats = $this->productService->calculateCargoStats($items);
        $totalVolume = $cargoStats['total_volume_cbm'];
        $totalQty = $cargoStats['total_quantity'];
        
        $firstItem = $items[0];
        $skuReference = Sku::find($firstItem['sku_id']);
        if (!$skuReference) throw new \Exception("Reference SKU not found.");

        // Ambil Data Port Tujuan beserta Negaranya (untuk Currency & Rules)
        $destPort = Port::with('infoCountry')->find($destPortId);
        if (!$destPort) throw new \Exception("Destination Port not found.");

        $targetCurrency = $destPort->infoCountry->currency_code ?? 'USD';

        // 2. CARI KANDIDAT STOK
        $candidates = PortInventory::with(['port.infoCountry'])
            ->where('sku_id', $skuReference->id)
            ->where('available_qty', '>=', $totalQty) 
            ->get();

        $recommendations = [];

        foreach ($candidates as $stock) {
            $originPort = $stock->port;
            if ($originPort->id === $destPort->id) continue;

            // 3. CARI JALUR
            $querySegments = RouteSegment::where('from_port_id', $originPort->id)
                ->where('to_port_id', $destPort->id)
                ->where('is_active', true);

            if ($requestedMode) {
                $querySegments->where('mode', $requestedMode);
            }

            $availableSegments = $querySegments->get(); 
            if ($availableSegments->isEmpty()) continue; 
            
            // 4. HITUNG BIAYA
            foreach ($availableSegments as $segment) {
                try {
                    // A. Cek Izin Dagang & Ambil Info Pajak (Origin Based)
                    $tradeRule = TradeRule::where('origin_country_id', $originPort->country_id)
                        ->where('destination_country_id', $destPort->country_id)
                        ->first();

                    // Logic "Satpam": Cek Boleh/Tidak
                    if ($tradeRule && !$tradeRule->is_allowed) continue; 

                    // ===> NEW: AMBIL PERSENTASE PAJAK EKSPOR <===
                    $taxPercent = $tradeRule ? $tradeRule->export_tax_percent : 0;

                    // B. Ambil Freight Rate
                    $rate = FreightRate::where('origin_port_id', $originPort->id)
                        ->where('destination_port_id', $destPort->id)
                        ->first();

                    // C. Hitung Ongkir
                    $freightCalc = [];
                    
                    if ($segment->mode === 'LAND') {
                        $landRatePerKm = $this->costService->getTransportRate('LAND', 'CBM');
                        if ($landRatePerKm <= 0) $landRatePerKm = 0.5; 

                        $freightCost = $segment->distance_km * $landRatePerKm * $totalVolume;
                        $freightCalc = [
                            'method' => "TRUCKING ({$segment->distance_km} km)", 
                            'total_freight' => $freightCost
                        ];
                    } else {
                        $freightCalc = $this->calculateFreightByVolume($totalVolume, $rate);
                    }
                    
                    if ($freightCalc['total_freight'] <= 0) continue;

                    // D. Hitung Landed Cost (Basis USD)
                    $totalGoodsValue = $totalQty * $skuReference->base_cost_usd;
                    
                    // ===> NEW: HITUNG NOMINAL PAJAK <===
                    // Pajak dihitung dari Total Nilai Barang
                    $taxAmount = 0;
                    if ($taxPercent > 0) {
                        $taxAmount = $totalGoodsValue * ($taxPercent / 100);
                    }

                    // Total Biaya Global = Barang + Ongkir + Pajak
                    $totalCostUSD = $totalGoodsValue + $freightCalc['total_freight'] + $taxAmount;
                    $unitPriceUSD = $totalCostUSD / $totalQty;

                    // E. Konversi ke Mata Uang Lokal (Menggunakan CostService)
                    $localUnitCost = $this->costService->convertUsdToCurrency($unitPriceUSD, $targetCurrency);
                    $localTotalCost = $this->costService->convertUsdToCurrency($totalCostUSD, $targetCurrency);

                    $originCountryName = $originPort->infoCountry->name ?? 'Unknown';

                    // F. Output JSON
                    $recommendations[] = [
                        'rank' => 0,
                        'sourcing_origin' => "{$originCountryName} ({$originPort->name})",
                        'transport_mode' => $segment->mode,
                        'method' => $freightCalc['method'],

                        // ===> [UPDATE] MENAMPILKAN INPUT ASLI USER (Misal: 5 PALLET) <===
                        // Mengambil data dari breakdown perhitungan kargo
                        'original_qty' => $cargoStats['items_breakdown'][0]['qty_input'] ?? 0, 
                        'original_unit' => $cargoStats['items_breakdown'][0]['unit_type'] ?? 'PCS',

                        // USD Data (Standard System)
                        'total_qty' => $totalQty,
                        'total_qty_label' => number_format($totalQty) . " Pcs", // Label Konversi
                        'total_volume_cbm' => $totalVolume,
                        'unit_final_price_usd' => round($unitPriceUSD, 2),
                        'total_landed_cost_usd' => round($totalCostUSD, 2),
                        
                        // ===> LOCAL CURRENCY DATA (DISPLAY USER) <===
                        'display_currency' => $targetCurrency,
                        'unit_final_price_local' => $localUnitCost['amount'],
                        'total_landed_cost_local' => $localTotalCost['amount'],
                        'fx_rate_used' => $localTotalCost['rate_used'],

                        'lead_time_days' => $segment->base_lead_time_days > 0 ? $segment->base_lead_time_days : 7,
                        'breakdown' => [
                            'goods_value_usd' => round($totalGoodsValue, 2),
                            'freight_cost_usd' => round($freightCalc['total_freight'], 2),
                            'tax_duty_usd' => "$" . number_format($taxAmount, 2) . " (Export Tax: {$taxPercent}%)" // Info Transparan
                        ]
                    ];

                } catch (\Exception $e) {
                    Log::error("Calculation error: " . $e->getMessage());
                    continue;
                }
            }
        }

        // Sorting (Termurah Dulu)
        usort($recommendations, function ($a, $b) {
            return $a['total_landed_cost_usd'] <=> $b['total_landed_cost_usd'];
        });

        $top5 = array_slice($recommendations, 0, 5);
        foreach ($top5 as $i => &$rec) {
            $rec['rank'] = $i + 1;
            if ($i === 0) {
                $rec['label'] = 'BEST OPTION (Lowest Cost)';
            } elseif ($rec['lead_time_days'] < $top5[0]['lead_time_days']) {
                $rec['label'] = 'ALTERNATIVE (Faster)';
            } else {
                $rec['label'] = 'ALTERNATIVE';
            }
        }

        return [
            'status' => 'success',
            'request_mode' => $requestedMode ?? 'SMART_AUTO', 
            'destination_currency' => $targetCurrency, 
            'cargo_summary' => $cargoStats,
            'results' => $top5
        ];
    }

    private function calculateFreightByVolume(float $volume, ?FreightRate $rate): array
    {
        $rateLcl = $rate ? $rate->rate_lcl : 0;
        $rateFcl = $rate ? $rate->rate_fcl_20ft : 0;
        $containersNeeded = ceil($volume / 29);

        $costLcl = ($rateLcl > 0) ? ($volume * $rateLcl) : 999999999;
        $costFcl = ($rateFcl > 0) ? ($containersNeeded * $rateFcl) : 999999999;

        if ($costFcl < $costLcl) {
            return ['method' => "FCL ({$containersNeeded}x 20ft)", 'total_freight' => $costFcl];
        } else {
            return ['method' => "LCL ({$volume} CBM)", 'total_freight' => $costLcl];
        }
    }
}