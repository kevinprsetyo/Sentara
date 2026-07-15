<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\RoutePlanningService;
use Illuminate\Http\JsonResponse;

class RouteController extends Controller
{
    protected RoutePlanningService $planner;

    public function __construct(RoutePlanningService $planner)
    {
        $this->planner = $planner;
    }

    public function plan(Request $request): JsonResponse
    {
        $result = $this->planner->planRoute($request);

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }
}
