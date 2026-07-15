<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use App\Models\FreightRate;
use App\Models\RouteSegment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class LogisticsController extends Controller
{
    /**
     * Get a list of freight rates with pagination and filtering.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function getRates(Request $request): JsonResponse
    {
        try {
            $query = FreightRate::with(['originPort', 'destinationPort']);

            // Apply filters
            if ($request->has('origin_port_id')) {
                $query->where('origin_port_id', $request->input('origin_port_id'));
            }

            if ($request->has('destination_port_id')) {
                $query->where('destination_port_id', $request->input('destination_port_id'));
            }

            $rates = $query->paginate(15);

            return response()->json([
                'success' => true,
                'data' => $rates,
                'message' => 'Freight rates retrieved successfully'
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve freight rates',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update a freight rate.
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function updateRate(Request $request, $id): JsonResponse
    {
        try {
            // Find freight rate
            $freightRate = FreightRate::find($id);

            if (!$freightRate) {
                return response()->json([
                    'success' => false,
                    'message' => 'Freight rate not found'
                ], 404);
            }

            // Validate input
            $validator = Validator::make($request->all(), [
                'rate_lcl' => 'nullable|numeric|min:0',
                'rate_fcl_20ft' => 'nullable|numeric|min:0',
                'currency' => 'nullable|string|max:3',
                'lead_time_days' => 'nullable|integer|min:0'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $validated = $validator->validated();

            // Update the freight rate
            $freightRate->update($validated);

            // Load relationships
            $freightRate->load(['originPort', 'destinationPort']);

            return response()->json([
                'success' => true,
                'data' => $freightRate,
                'message' => 'Freight rate updated successfully'
            ], 200);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update freight rate',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Toggle route segment status.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function toggleRouteStatus(Request $request): JsonResponse
    {
        try {
            // Validate input
            $validator = Validator::make($request->all(), [
                'from_port_id' => 'required|integer|exists:ports,id',
                'to_port_id' => 'required|integer|exists:ports,id',
                'is_active' => 'required|boolean'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $validated = $validator->validated();

            // Find the route segment
            $routeSegment = RouteSegment::where('from_port_id', $validated['from_port_id'])
                ->where('to_port_id', $validated['to_port_id'])
                ->first();

            if (!$routeSegment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Route segment not found'
                ], 404);
            }

            // Update the is_active column
            $routeSegment->update([
                'is_active' => $validated['is_active']
            ]);

            return response()->json([
                'success' => true,
                'data' => $routeSegment,
                'message' => 'Route status updated'
            ], 200);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update route status',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
