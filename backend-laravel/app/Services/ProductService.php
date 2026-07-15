<?php

namespace App\Services;

use App\Models\Sku;
use Illuminate\Support\Collection;

class ProductService
{
    /**
     * Menghitung total Volume (CBM) dan Berat (Kg) dari daftar item.
     * Support Konversi Satuan (PCS vs Packing Type lain).
     *
     * @param array $items Input dari Request (sku_id, quantity, packing_type)
     * @return array Breakdown lengkap (total_cbm, total_weight, total_quantity_pcs, details)
     */
    public function calculateCargoStats(array $items): array
    {
        $totalCbm = 0;
        $totalWeightKg = 0;
        $totalQtyPcs = 0; // Total dalam satuan terkecil (untuk harga & stok)
        $details = [];

        // Ambil semua SKU ID & Load Relasi Packing Mappings
        $skuIds = array_column($items, 'sku_id');
        $skus = Sku::with('packingMappings')->whereIn('id', $skuIds)->get()->keyBy('id');

        foreach ($items as $item) {
            $skuId = $item['sku_id'];
            $inputQty = (float) $item['quantity'];
            
            // Default ke PCS jika frontend tidak kirim packing_type
            $reqUnit = isset($item['packing_type']) ? strtoupper($item['packing_type']) : 'PCS'; 

            if (!isset($skus[$skuId])) continue;

            $sku = $skus[$skuId];
            
            // Inisialisasi variabel hitungan
            $volumePerInputUnitCbm = 0;
            $multiplier = 1; // 1 unit input = berapa pcs?
            $dimInfo = "Unknown";

            // --- LOGIC PENENTUAN VOLUME & KONVERSI ---
            
            if ($reqUnit === 'PCS' || $reqUnit === 'UNIT') {
                // 1. BASE UNIT (Gunakan Dimensi Fisik SKU)
                $dims = [
                    'l' => $sku->length_cm ?? 10, 
                    'w' => $sku->width_cm ?? 10,
                    'h' => $sku->height_cm ?? 10
                ];
                // Rumus: (P x L x T) / 1,000,000
                $volumePerInputUnitCbm = ($dims['l'] * $dims['w'] * $dims['h']) / 1000000;
                $multiplier = 1;
                $dimInfo = "{$dims['l']}x{$dims['w']}x{$dims['h']} cm";
                
            } else {
                // 2. PACKING UNIT (Cari di Tabel Mapping)
                // Contoh: User minta "PALLET"
                $mapping = $sku->packingMappings
                    ->where('packing_type', $reqUnit)
                    ->first();

                if ($mapping) {
                    // Pakai data dari DB
                    $volumePerInputUnitCbm = (float) $mapping->cbm_per_unit;
                    $multiplier = (int) $mapping->quantity_per_packing; // Penting: Konversi ke PCS
                    $dimInfo = "Pre-calc Volume ({$reqUnit})";
                } else {
                    // Fallback: Jika minta "KARUNG" tapi di DB gak ada, balik ke PCS
                    $dims = [
                        'l' => $sku->length_cm ?? 10,
                        'w' => $sku->width_cm ?? 10,
                        'h' => $sku->height_cm ?? 10
                    ];
                    $volumePerInputUnitCbm = ($dims['l'] * $dims['w'] * $dims['h']) / 1000000;
                    $multiplier = 1;
                    $dimInfo = "Fallback to PCS (Unit not found)";
                    $reqUnit = 'PCS (Fallback)';
                }
            }

            // 3. Kalkulasi Total
            $realQtyPcs = $inputQty * $multiplier; // Total Pcs Sebenarnya
            
            $itemTotalCbm = $volumePerInputUnitCbm * $inputQty; // Volume berdasarkan unit input
            
            // Berat dihitung dari Total Pcs * Berat per Pcs (Sesuai kesepakatan tanpa gross weight)
            $itemTotalWeight = ($sku->weight_kg ?? 0) * $realQtyPcs;

            // 4. Akumulasi Global
            $totalCbm += $itemTotalCbm;
            $totalWeightKg += $itemTotalWeight;
            $totalQtyPcs += $realQtyPcs; // Penting: Yang dijumlahkan adalah PCS agar harga & stok valid

            $details[] = [
                'sku_code' => $sku->sku_code,
                'qty_input' => $inputQty,      // Qty input user (misal: 5)
                'unit_type' => $reqUnit,       // Satuan (misal: PALLET)
                'qty_converted' => $realQtyPcs,// Qty hasil konversi (misal: 5000)
                'dims_info' => $dimInfo,
                'unit_cbm' => round($volumePerInputUnitCbm, 6),
                'total_cbm' => round($itemTotalCbm, 4),
                'total_weight_kg' => round($itemTotalWeight, 2)
            ];
        }

        return [
            'total_volume_cbm' => round($totalCbm, 4),
            'total_weight_kg' => round($totalWeightKg, 2),
            'total_quantity' => $totalQtyPcs, // Int (untuk Math)
            'total_quantity_label' => number_format($totalQtyPcs) . " Pcs", // String (untuk Display UI) <--- UPDATE DISINI
            'items_breakdown' => $details
        ];
    }
}