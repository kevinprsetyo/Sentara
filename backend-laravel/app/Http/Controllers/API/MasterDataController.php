<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Port;
use App\Models\Sku;
use App\Models\City;
use App\Models\Country;

class MasterDataController extends Controller
{
    /**
     * Get all ports
     * Params: ?limit=10 (Optional)
     */
    public function getPorts(Request $request): JsonResponse
    {
        $query = Port::with(['city', 'infoCountry'])
            ->whereNotNull('country_id')
            ->orderBy('name', 'asc');

        // Logic Mapping Data
        $transform = function ($port) {
            return [
                'id' => $port->id,
                'name' => $port->name,
                'city' => $port->city ? $port->city->name : null,
                'country_code' => $port->infoCountry ? $port->infoCountry->code : $port->country,
                'country_name' => $port->infoCountry ? $port->infoCountry->name : null,
                'is_origin' => $port->is_origin
            ];
        };

        // KONDISIONAL: Pagination vs Get All
        if ($request->has('limit')) {
            $data = $query->paginate((int)$request->limit);
            $data->getCollection()->transform($transform); // Apply mapping

            return response()->json([
                'success' => true,
                'data' => $data->items(),
                'pagination' => [
                    'current_page' => $data->currentPage(),
                    'per_page' => $data->perPage(),
                    'total' => $data->total(),
                    'last_page' => $data->lastPage(),
                ]
            ]);
        }

        // Default: Get All (Untuk Dropdown)
        $ports = $query->get()->map($transform);

        return response()->json([
            'success' => true,
            'data' => $ports,
        ]);
    }

    /**
     * Get all SKUs
     * Params: ?limit=10 (Optional)
     */
    public function getSkus(Request $request): JsonResponse
    {
        $query = Sku::select('id', 'sku_code', 'name')
            ->orderBy('sku_code', 'asc');

        if ($request->has('limit')) {
            $data = $query->paginate((int)$request->limit);
            return response()->json([
                'success' => true,
                'data' => $data->items(),
                'pagination' => [
                    'current_page' => $data->currentPage(),
                    'per_page' => $data->perPage(),
                    'total' => $data->total(),
                    'last_page' => $data->lastPage(),
                ]
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => $query->get(),
        ]);
    }

    /**
     * Get available transport modes
     */
    public function getTransportModes(): JsonResponse
    {
        // Static Data (Kecil, tidak perlu pagination)
        $modes = [
            ['id' => 'SEA', 'name' => 'Sea Freight'],
            ['id' => 'LAND', 'name' => 'Land Trucking'],
        ];

        return response()->json([
            'success' => true,
            'data' => $modes,
        ]);
    }

    /**
     * Get All Countries
     * Params: ?limit=10 (Optional)
     */
    public function getCountries(Request $request): JsonResponse
    {
        $query = Country::select('id', 'code', 'name')->orderBy('name', 'asc');

        if ($request->has('limit')) {
            $data = $query->paginate((int)$request->limit);
            return response()->json([
                'success' => true,
                'data' => $data->items(),
                'pagination' => [
                    'current_page' => $data->currentPage(),
                    'per_page' => $data->perPage(),
                    'total' => $data->total(),
                    'last_page' => $data->lastPage(),
                ]
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => $query->get(),
        ]);
    }

    /**
     * Get All Cities
     * Support Filtering: ?country_id=15
     * Support Pagination: ?limit=10
     */
    public function getCities(Request $request): JsonResponse
    {
        $query = City::with('country')->orderBy('name', 'asc');

        if ($request->has('country_id') && $request->country_id != null) {
            $query->where('country_id', $request->country_id);
        }

        // Logic Mapping
        $transform = function ($city) {
            return [
                'id' => $city->id,
                'name' => $city->name,
                'code' => $city->code,
                'country_id' => $city->country_id,
                'country_name' => $city->country ? $city->country->name : null
            ];
        };

        if ($request->has('limit')) {
            $data = $query->paginate((int)$request->limit);
            $data->getCollection()->transform($transform);

            return response()->json([
                'success' => true,
                'count' => $data->total(),
                'data' => $data->items(),
                'pagination' => [
                    'current_page' => $data->currentPage(),
                    'per_page' => $data->perPage(),
                    'total' => $data->total(),
                    'last_page' => $data->lastPage(),
                ]
            ]);
        }

        $cities = $query->get()->map($transform);

        return response()->json([
            'success' => true,
            'count' => $cities->count(),
            'data' => $cities,
        ]);
    }
}