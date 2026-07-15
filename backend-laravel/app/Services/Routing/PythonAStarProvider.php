<?php

namespace App\Services\Routing;

use App\Interfaces\RoutingProviderInterface;
use App\DTOs\RouteRequestDTO;
use App\DTOs\CalculatedRouteDTO;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class PythonAStarProvider implements RoutingProviderInterface
{
    public function calculate(RouteRequestDTO $data): CalculatedRouteDTO
    {
        // 1. Ambil URL Python dari .env
        $baseUrl = env('ROUTE_ENGINE_URL');
        
        // Jaga-jaga kalau .env lupa harus diisi 
        if (!$baseUrl) {
            Log::error("ROUTE_ENGINE_URL is not set in .env");
            return $this->getMockData();
        }

        // 2. Siapkan Data untuk dikirim ke Python
        $payload = [
            'origin_id' => $data->origin_port_id,
            'destination_id' => $data->destination_port_id,
            'mode' => $data->transport_mode ?? 'SEA',
            'weight_distance' => 0.5,
            'weight_time' => 0.5
        ];

        try {
            // 3. Tembak API Python (/calculate)
            $response = Http::timeout(10)->post("{$baseUrl}/calculate", $payload);

            // 4. Jika Sukses (Status 200)
            if ($response->successful()) {
                $result = $response->json();
                
                // Konversi steps agar sesuai struktur DTO Laravel
                $segments = array_map(function ($step) {
                    return [
                        'from' => $step['from_id'],
                        'to'   => $step['to_id'],
                        'mode' => $step['mode'],
                        'distance_km' => $step['distance'],
                        'duration_days' => 0 
                    ];
                }, $result['steps']);

                return new CalculatedRouteDTO(
                    (float) $result['total_distance_km'],
                    (float) $result['total_lead_time_days'],
                    $segments,
                    'python_astar' // Provider Asli!
                );
            }
            
            Log::error("Python API Error: " . $response->body());
            return $this->getMockData();

        } catch (Exception $e) {
            Log::error("Failed to connect to Python Route Engine: " . $e->getMessage());
            return $this->getMockData();
        }
    }

    private function getMockData(): CalculatedRouteDTO
    {
        $segments = [
            [
                'from' => 1,
                'to' => 5,
                'mode' => 'SEA',
                'distance_km' => 1500.0,
                'duration_days' => 5,
            ],
        ];

        return new CalculatedRouteDTO(1500.0, 5, $segments, 'python_astar_mock');
    }
}