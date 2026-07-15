<?php

namespace App\DTOs;

class CalculatedRouteDTO
{
    public float $total_distance_km;
    public int $total_duration_days;
    public array $segments; // array of segment detail arrays
    public string $provider_name;

    public function __construct(float $total_distance_km = 0.0, int $total_duration_days = 0, array $segments = [], string $provider_name = '')
    {
        $this->total_distance_km = $total_distance_km;
        $this->total_duration_days = $total_duration_days;
        $this->segments = $segments;
        $this->provider_name = $provider_name;
    }
}
