<?php

namespace App\Interfaces;

use App\DTOs\RouteRequestDTO;
use App\DTOs\CalculatedRouteDTO;

interface RoutingProviderInterface
{
    public function calculate(RouteRequestDTO $data): CalculatedRouteDTO;
}
