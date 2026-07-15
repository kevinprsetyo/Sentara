<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PortSeeder extends Seeder
{
    public function run(): void
    {
        $ports = [
            ['name' => 'Tanjung Priok', 'country' => 'ID', 'lat' => '-6.118611', 'lng' => '106.882778'],
            ['name' => 'Tanjung Perak', 'country' => 'ID', 'lat' => '-7.270556', 'lng' => '112.740833'],
            ['name' => 'Port of Singapore', 'country' => 'SG', 'lat' => '1.264389', 'lng' => '103.820000'],
            ['name' => 'Port Klang', 'country' => 'MY', 'lat' => '3.000556', 'lng' => '101.399167'],
            ['name' => 'Manila North Harbor', 'country' => 'PH', 'lat' => '14.586', 'lng' => '120.954'],
            ['name' => 'Laem Chabang', 'country' => 'TH', 'lat' => '13.127222', 'lng' => '101.055556'],
            ['name' => 'Cat Lai', 'country' => 'VN', 'lat' => '10.768333', 'lng' => '106.726389'],
        ];

        foreach ($ports as $p) {
            DB::table('ports')->insert([
                'name' => $p['name'],
                'country' => $p['country'],
                'lat' => $p['lat'],
                'lng' => $p['lng'],
                'is_origin' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}
