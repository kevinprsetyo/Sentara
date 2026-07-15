<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RateSeeder extends Seeder
{
    public function run(): void
    {
        $today = now()->toDateString();

        $rates = [
            ['mode' => 'SEA', 'rate_type' => 'CBM', 'rate_per_km' => '0.5', 'valid_from' => $today],
            ['mode' => 'SEA', 'rate_type' => 'CONTAINER_20FT', 'rate_per_km' => '1.2', 'valid_from' => $today],
            ['mode' => 'LAND', 'rate_type' => 'CBM', 'rate_per_km' => '1.5', 'valid_from' => $today],
            ['mode' => 'LAND', 'rate_type' => 'CONTAINER_20FT', 'rate_per_km' => '3.0', 'valid_from' => $today],
        ];

        foreach ($rates as $r) {
            DB::table('transport_mode_rates')->insert([
                'mode' => $r['mode'],
                'rate_type' => $r['rate_type'],
                'rate_per_km' => $r['rate_per_km'],
                'valid_from' => $r['valid_from'],
                'valid_to' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}
