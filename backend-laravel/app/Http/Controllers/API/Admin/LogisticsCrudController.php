<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use App\Models\FreightRate;
use App\Models\TradeRule;
use App\Models\RouteSegment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class LogisticsCrudController extends Controller
{
    // =======================================================================
    // 1. FREIGHT RATES CRUD
    // =======================================================================

    public function getRates(Request $request)
    {
        $query = FreightRate::with(['originPort', 'destinationPort'])->orderBy('id', 'desc');

        $transform = function($rate) {
            return [
                'id' => $rate->id,
                'origin_port_id' => $rate->origin_port_id,
                'origin_port_name' => $rate->originPort ? $rate->originPort->name : 'Unknown',
                'destination_port_id' => $rate->destination_port_id,
                'destination_port_name' => $rate->destinationPort ? $rate->destinationPort->name : 'Unknown',
                'rate_lcl' => (float) $rate->rate_lcl,
                'rate_fcl_20ft' => (float) $rate->rate_fcl_20ft,
                'currency' => $rate->currency,
                'lead_time_days' => $rate->lead_time_days,
            ];
        };

        if ($request->has('limit')) {
            $data = $query->paginate((int)$request->limit);
            $data->getCollection()->transform($transform);
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

        return response()->json(['success' => true, 'data' => $query->get()->map($transform)]);
    }

    public function showRate($id)
    {
        $rate = FreightRate::with(['originPort', 'destinationPort'])->find($id);
        if (!$rate) return response()->json(['success' => false, 'message' => 'Rate not found'], 404);
        
        $data = [
            'id' => $rate->id,
            'origin_port_id' => $rate->origin_port_id,
            'origin_port_name' => $rate->originPort ? $rate->originPort->name : '-',
            'destination_port_id' => $rate->destination_port_id,
            'destination_port_name' => $rate->destinationPort ? $rate->destinationPort->name : '-',
            'rate_lcl' => (float) $rate->rate_lcl,
            'rate_fcl_20ft' => (float) $rate->rate_fcl_20ft,
            'currency' => $rate->currency,
            'lead_time_days' => $rate->lead_time_days,
        ];

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function storeRate(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'origin_port_id' => 'required|exists:ports,id',
                'destination_port_id' => 'required|exists:ports,id|different:origin_port_id',
                'rate_lcl' => 'required|numeric|min:0',
                'rate_fcl_20ft' => 'required|numeric|min:0',
                'currency' => 'required|string|max:3|in:USD,EUR,GBP,CNY,JPY,IDR', 
                'lead_time_days' => 'required|integer|min:0',
            ]);

            if ($validator->fails()) return response()->json(['success' => false, 'message' => 'Validation failed', 'errors' => $validator->errors()], 422);

            // Cek Duplikasi (Origin + Dest + Currency)
            $existingRate = FreightRate::where('origin_port_id', $request->origin_port_id)
                ->where('destination_port_id', $request->destination_port_id)
                ->where('currency', $request->currency)
                ->first();

            if ($existingRate) return response()->json(['success' => false, 'message' => 'Rate already exists for this route and currency', 'data' => ['existing_rate_id' => $existingRate->id]], 409);

            $rate = FreightRate::create($request->all());
            return response()->json(['success' => true, 'message' => 'Freight rate created', 'data' => $rate], 201);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Failed to create rate', 'error' => $e->getMessage()], 500);
        }
    }

    public function updateRate(Request $request, $id)
    {
        try {
            $rate = FreightRate::find($id);
            if (!$rate) return response()->json(['success' => false, 'message' => 'Rate not found'], 404);

            // 1. VALIDASI
            $validator = Validator::make($request->all(), [
                'origin_port_id' => 'sometimes|exists:ports,id',
                'destination_port_id' => 'sometimes|exists:ports,id',
                'rate_lcl' => 'sometimes|numeric|min:0',
                'rate_fcl_20ft' => 'sometimes|numeric|min:0',
                'currency' => 'sometimes|string|in:USD,EUR,GBP,CNY,JPY,IDR', 
                'lead_time_days' => 'sometimes|integer|min:0',
            ]);

            if ($validator->fails()) {
                return response()->json(['success' => false, 'message' => 'Validation failed', 'errors' => $validator->errors()], 422);
            }

            // 2. CEK DATA KOSONG
            if (empty($request->all())) {
                return response()->json(['success' => false, 'message' => 'No data received. Ensure you are sending JSON data.'], 400);
            }

            // 3. LOGIC CEK DUPLIKASI (NEW)
            // Prediksi data baru
            $newOrigin = $request->input('origin_port_id', $rate->origin_port_id);
            $newDest   = $request->input('destination_port_id', $rate->destination_port_id);
            $newCurr   = $request->input('currency', $rate->currency);

            // Cek apakah ada ID LAIN yang punya kombinasi sama
            $duplicateCheck = FreightRate::where('origin_port_id', $newOrigin)
                ->where('destination_port_id', $newDest)
                ->where('currency', $newCurr)
                ->where('id', '!=', $id) // Kecualikan diri sendiri
                ->first();

            if ($duplicateCheck) {
                return response()->json([
                    'success' => false, 
                    'message' => "Conflict: A rate for this route with currency '$newCurr' already exists. Please edit that record instead."
                ], 409);
            }

            $rate->update($request->all());
            return response()->json(['success' => true, 'message' => 'Rate updated successfully', 'data' => $rate]);

        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Failed to update rate', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroyRate($id)
    {
        try {
            $rate = FreightRate::find($id);
            if (!$rate) return response()->json(['success' => false, 'message' => 'Rate not found'], 404);
            $rate->delete();
            return response()->json(['success' => true, 'message' => 'Rate deleted']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Failed to delete rate', 'error' => $e->getMessage()], 500);
        }
    }

    // =======================================================================
    // 2. TRADE RULES CRUD
    // =======================================================================
    public function getRules(Request $request)
    {
        $query = TradeRule::with(['originCountry', 'destinationCountry'])->orderBy('id', 'desc');
        $transform = function($rule) {
            return [
                'id' => $rule->id,
                'origin_country_id' => $rule->origin_country_id,
                'origin_country_name' => $rule->originCountry ? $rule->originCountry->name : 'Unknown',
                'destination_country_id' => $rule->destination_country_id,
                'destination_country_name' => $rule->destinationCountry ? $rule->destinationCountry->name : 'Unknown',
                'origin_code' => $rule->originCountry ? $rule->originCountry->code : '-',
                'destination_code' => $rule->destinationCountry ? $rule->destinationCountry->code : '-',
                'is_allowed' => (bool) $rule->is_allowed,
                'export_tax_percent' => (float) $rule->export_tax_percent,
                // 'reason' dihapus karena tidak ada di DB
            ];
        };
        if ($request->has('limit')) {
            $data = $query->paginate((int)$request->limit);
            $data->getCollection()->transform($transform);
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
        return response()->json(['success' => true, 'data' => $query->get()->map($transform)]);
    }

    public function showRule($id)
    {
        $rule = TradeRule::with(['originCountry', 'destinationCountry'])->find($id);
        if (!$rule) return response()->json(['success' => false, 'message' => 'Rule not found'], 404);
        $data = [
            'id' => $rule->id,
            'origin_country_id' => $rule->origin_country_id,
            'origin_country_name' => $rule->originCountry ? $rule->originCountry->name : '-',
            'destination_country_id' => $rule->destination_country_id,
            'destination_country_name' => $rule->destinationCountry ? $rule->destinationCountry->name : '-',
            'is_allowed' => (bool) $rule->is_allowed,
            'export_tax_percent' => (float) $rule->export_tax_percent,
            // 'reason' dihapus
        ];
        return response()->json(['success' => true, 'data' => $data]);
    }

    public function storeRule(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'origin_country_id' => 'required|exists:countries,id',
                'destination_country_id' => 'required|exists:countries,id|different:origin_country_id',
                'is_allowed' => 'required|boolean',
                'export_tax_percent' => 'nullable|numeric|min:0|max:100',
                // 'reason' dihapus dari validasi
            ]);

            if ($validator->fails()) return response()->json(['success' => false, 'message' => 'Validation failed', 'errors' => $validator->errors()], 422);

            // 1. CEK DUPLIKASI (NEW)
            // Cek apakah aturan dagang untuk negara ini sudah ada?
            $exists = TradeRule::where('origin_country_id', $request->origin_country_id)
                ->where('destination_country_id', $request->destination_country_id)
                ->exists();

            if ($exists) {
                return response()->json([
                    'success' => false, 
                    'message' => 'Conflict: A trade rule for this country pair already exists.'
                ], 409);
            }

            $rule = TradeRule::create($request->all());
            return response()->json(['success' => true, 'message' => 'Trade rule created', 'data' => $rule], 201);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Failed to create rule', 'error' => $e->getMessage()], 500);
        }
    }

    public function updateRule(Request $request, $id)
    {
        try {
            $rule = TradeRule::find($id);
            if (!$rule) return response()->json(['success' => false, 'message' => 'Rule not found'], 404);
            
            $validator = Validator::make($request->all(), [
                'origin_country_id' => 'sometimes|exists:countries,id',
                'destination_country_id' => 'sometimes|exists:countries,id',
                'is_allowed' => 'sometimes|boolean',
                'export_tax_percent' => 'nullable|numeric|min:0|max:100',
            ]);

            if ($validator->fails()) {
                return response()->json(['success' => false, 'message' => 'Validation failed', 'errors' => $validator->errors()], 422);
            }

            if (empty($request->all())) {
                return response()->json(['success' => false, 'message' => 'No data received to update.'], 400);
            }

            // 2. CEK DUPLIKASI SAAT UPDATE (NEW)
            // Jika user mengubah negara asal/tujuan, pastikan tidak bentrok dengan rule lain
            $newOrigin = $request->input('origin_country_id', $rule->origin_country_id);
            $newDest   = $request->input('destination_country_id', $rule->destination_country_id);

            // Cek rule LAIN yang punya pasangan negara sama
            $duplicateCheck = TradeRule::where('origin_country_id', $newOrigin)
                ->where('destination_country_id', $newDest)
                ->where('id', '!=', $id) // Kecualikan diri sendiri
                ->first();

            if ($duplicateCheck) {
                return response()->json([
                    'success' => false, 
                    'message' => "Conflict: A trade rule for these countries already exists. Cannot update to duplicates."
                ], 409);
            }

            $rule->update($request->all());
            return response()->json(['success' => true, 'message' => 'Rule updated successfully', 'data' => $rule]);

        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Failed to update rule', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroyRule($id)
    {
        try {
            $rule = TradeRule::find($id);
            if (!$rule) return response()->json(['success' => false, 'message' => 'Rule not found'], 404);
            $rule->delete();
            return response()->json(['success' => true, 'message' => 'Rule deleted']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Failed to delete rule', 'error' => $e->getMessage()], 500);
        }
    }

    // =======================================================================
    // 3. ROUTE SEGMENTS CRUD
    // =======================================================================
    public function getSegments(Request $request)
    {
        $query = RouteSegment::with(['fromPort', 'toPort'])->orderBy('id', 'desc');
        $transform = function($segment) {
            return [
                'id' => $segment->id,
                'from_port_id' => $segment->from_port_id,
                'from_port_name' => $segment->fromPort ? $segment->fromPort->name : '-',
                'to_port_id' => $segment->to_port_id,
                'to_port_name' => $segment->toPort ? $segment->toPort->name : '-',
                'mode' => $segment->mode,
                'distance_km' => (float) $segment->distance_km,
                'base_lead_time_days' => (int) $segment->base_lead_time_days,
                'is_active' => (bool) $segment->is_active,
                'display_label' => $segment->fromPort && $segment->toPort ? "{$segment->fromPort->name} -> {$segment->toPort->name} ({$segment->mode})" : 'Unknown Route'
            ];
        };
        if ($request->has('limit')) {
            $data = $query->paginate((int)$request->limit);
            $data->getCollection()->transform($transform);
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
        return response()->json(['success' => true, 'data' => $query->get()->map($transform)]);
    }

    public function showSegment($id)
    {
        $segment = RouteSegment::with(['fromPort', 'toPort'])->find($id);
        if (!$segment) return response()->json(['success' => false, 'message' => 'Segment not found'], 404);
        $data = [
            'id' => $segment->id,
            'from_port_id' => $segment->from_port_id,
            'from_port_name' => $segment->fromPort ? $segment->fromPort->name : '-',
            'to_port_id' => $segment->to_port_id,
            'to_port_name' => $segment->toPort ? $segment->toPort->name : '-',
            'mode' => $segment->mode,
            'distance_km' => (float) $segment->distance_km,
            'base_lead_time_days' => (int) $segment->base_lead_time_days,
            'is_active' => (bool) $segment->is_active,
        ];
        return response()->json(['success' => true, 'data' => $data]);
    }

    public function storeSegment(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'from_port_id' => 'required|exists:ports,id',
                'to_port_id' => 'required|exists:ports,id|different:from_port_id',
                'transport_mode' => 'required|string|in:SEA,LAND,AIR,RAIL', 
                'distance_km' => 'required|numeric|min:0',
                'base_lead_time_days' => 'required|integer|min:0',
                'is_active' => 'sometimes|boolean',
            ]);
            if ($validator->fails()) return response()->json(['success' => false, 'message' => 'Validation failed', 'errors' => $validator->errors()], 422);
            $segment = RouteSegment::create([
                'from_port_id' => $request->from_port_id,
                'to_port_id' => $request->to_port_id,
                'mode' => strtoupper($request->transport_mode),
                'distance_km' => $request->distance_km,
                'base_lead_time_days' => $request->base_lead_time_days,
                'is_active' => $request->is_active ?? true
            ]);
            return response()->json(['success' => true, 'message' => 'Segment created', 'data' => $segment], 201);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Failed to create segment', 'error' => $e->getMessage()], 500);
        }
    }

    public function updateSegment(Request $request, $id)
    {
        try {
            $segment = RouteSegment::find($id);
            if (!$segment) return response()->json(['success' => false, 'message' => 'Segment not found'], 404);
            $validator = Validator::make($request->all(), [
                'from_port_id' => 'sometimes|exists:ports,id',
                'to_port_id' => 'sometimes|exists:ports,id',
                'transport_mode' => 'sometimes|string|in:SEA,LAND,AIR,RAIL', 
                'distance_km' => 'sometimes|numeric|min:0',
                'base_lead_time_days' => 'sometimes|integer|min:0',
                'is_active' => 'sometimes|boolean',
            ]);
            if ($validator->fails()) {
                return response()->json(['success' => false, 'message' => 'Validation failed', 'errors' => $validator->errors()], 422);
            }
            if (empty($request->all())) {
                return response()->json(['success' => false, 'message' => 'No data received to update.'], 400);
            }
            $data = $request->all();
            if (isset($data['transport_mode'])) {
                $data['mode'] = strtoupper($data['transport_mode']);
                unset($data['transport_mode']);
            }
            $segment->update($data);
            return response()->json(['success' => true, 'message' => 'Segment updated successfully', 'data' => $segment]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Failed to update segment', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroySegment($id)
    {
        try {
            $segment = RouteSegment::find($id);
            if (!$segment) return response()->json(['success' => false, 'message' => 'Segment not found'], 404);
            $segment->delete();
            return response()->json(['success' => true, 'message' => 'Segment deleted']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Failed to delete segment', 'error' => $e->getMessage()], 500);
        }
    }
}