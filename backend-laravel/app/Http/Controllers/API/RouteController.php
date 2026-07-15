<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\RoutePlanningService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class RouteController extends Controller
{
    protected RoutePlanningService $planner;

    public function __construct(RoutePlanningService $planner)
    {
        $this->planner = $planner;
    }

    public function plan(Request $request): JsonResponse
    {
        try {
            // STEP 1: VALIDASI INPUT (Tetap Dipertahankan)
            // Kita validasi format datanya saja, logika isinya urusan Service.
            $validator = Validator::make($request->all(), [
                'destination_port_id' => 'required|integer|exists:ports,id',
                'transport_mode' => 'nullable|string|in:SEA,LAND',
                'items' => 'required|array|min:1',
                'items.*.sku_id' => 'required|integer|exists:skus,id',
                'items.*.quantity' => 'required|numeric|min:0.01', 
                // packing_type opsional, logic backend sekarang prioritas dimensi fisik DB
                'items.*.packing_type' => 'nullable|string', 
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            // STEP 2: EKSEKUSI PERENCANAAN
            // Perubahan Besar: Kita tidak lagi menghitung volume di Controller.
            // Kita serahkan $request mentah ke Service. Service yang akan memanggil ProductService.
            $result = $this->planner->planRoute($request);

            // STEP 3: FORMAT RESPONSE
            // Kita pertahankan struktur JSON agar Postman tidak error,
            // tapi datanya sekarang diambil dari hasil kalkulasi Service yang akurat.
            return response()->json([
                'success' => true,
                'message' => 'Route planned successfully',
                // Ambil summary yang dihitung oleh ProductService (via RoutePlanningService)
                'cargo_summary' => $result['cargo_summary'] ?? [], 
                'data' => $result,
            ], 200);

        } catch (\Exception $e) {
            Log::error('Route error: ' . $e->getMessage());
            
            // Return error 500 jika ada masalah server logic
            return response()->json([
                'success' => false, 
                'message' => $e->getMessage()
            ], 500);
        }
    }
}