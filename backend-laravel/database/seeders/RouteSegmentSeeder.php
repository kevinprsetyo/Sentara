<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RouteSegmentSeeder extends Seeder
{
    public function run(): void
    {
        $ports = DB::table('ports')->get()->keyBy('name');

        $segments = [];

        // SEA connections (rough distance estimates)
        if ($ports->has('Tanjung Priok') && $ports->has('Port of Singapore')) {
            $segments[] = ['from' => 'Tanjung Priok', 'to' => 'Port of Singapore', 'mode' => 'SEA', 'distance_km' => 920];
        }
        if ($ports->has('Port of Singapore') && $ports->has('Manila North Harbor')) {
            $segments[] = ['from' => 'Port of Singapore', 'to' => 'Manila North Harbor', 'mode' => 'SEA', 'distance_km' => 2400];
        }
        if ($ports->has('Port of Singapore') && $ports->has('Port Klang')) {
            $segments[] = ['from' => 'Port of Singapore', 'to' => 'Port Klang', 'mode' => 'SEA', 'distance_km' => 370];
        }
        if ($ports->has('Port of Singapore') && $ports->has('Cat Lai')) {
            $segments[] = ['from' => 'Port of Singapore', 'to' => 'Cat Lai', 'mode' => 'SEA', 'distance_km' => 900];
        }
        if ($ports->has('Port Klang') && $ports->has('Laem Chabang')) {
            $segments[] = ['from' => 'Port Klang', 'to' => 'Laem Chabang', 'mode' => 'SEA', 'distance_km' => 1480];
        }

        // LAND connections (intra-country examples)
        if ($ports->has('Tanjung Priok') && $ports->has('Tanjung Perak')) {
            $segments[] = ['from' => 'Tanjung Priok', 'to' => 'Tanjung Perak', 'mode' => 'LAND', 'distance_km' => 780];
        }
        if ($ports->has('Tanjung Priok') && $ports->has('Tanjung Perak')) {
            // also add reverse to make graph more connected
            $segments[] = ['from' => 'Tanjung Perak', 'to' => 'Tanjung Priok', 'mode' => 'LAND', 'distance_km' => 780];
        }

        // Insert segments
        foreach ($segments as $s) {
            $from = $ports->get($s['from']);
            $to = $ports->get($s['to']);
            if (! $from || ! $to) continue;

            DB::table('route_segments')->insert([
                'from_port_id' => $from->id,
                'to_port_id' => $to->id,
                'mode' => $s['mode'],
                'distance_km' => $s['distance_km'],
                'base_lead_time_days' => $s['mode'] === 'SEA' ? 5 : 2,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}
