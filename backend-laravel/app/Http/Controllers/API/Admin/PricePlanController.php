<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use App\Models\PricePlanHeader;
use App\Models\PricePlanDetail;

class PricePlanController extends Controller
{
    /**
     * GET ALL PLANS
     */
    public function index(Request $request)
    {
        $query = PricePlanHeader::with(['port', 'city', 'country'])
            ->orderBy('id', 'desc');

        // Filter sederhana
        if ($request->has('level')) {
            $query->where('level', $request->level);
        }
        if ($request->has('is_active')) {
            $query->where('is_active', $request->is_active);
        }

        // Pagination Support (Standard Laravel)
        // Frontend bisa kirim ?page=1
        $plans = $query->paginate(10); 

        return response()->json([
            'success' => true,
            'data' => $plans
        ]);
    }

    /**
     * GET SINGLE PLAN
     */
    public function show($id)
    {
        $plan = PricePlanHeader::with(['details.sku', 'port', 'city', 'country'])
            ->find($id);

        if (!$plan) {
            return response()->json(['success' => false, 'message' => 'Price Plan not found'], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $plan
        ]);
    }

    /**
     * CREATE NEW PLAN (ATOMIC TRANSACTION)
     * UPDATE: Mencegah Backdate (Tanggal Masa Lalu)
     */
    public function store(Request $request)
    {
        // 1. Validasi Input
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'level' => 'required|in:PORT,CITY,COUNTRY',
            'port_id' => 'required_if:level,PORT|nullable|exists:ports,id',
            'city_id' => 'required_if:level,CITY|nullable|exists:cities,id',
            'country_id' => 'required_if:level,COUNTRY|nullable|exists:countries,id',
            
            'currency' => 'required|string|size:3',
            // --- UPDATE VALIDASI: STRICT NO BACKDATE ---
            'start_date' => 'required|date|after_or_equal:today', // Harus Hari Ini atau Masa Depan
            'end_date' => 'nullable|date|after_or_equal:start_date',
            // -------------------------------------------
            'priority' => 'integer|min:0',
            'is_active' => 'boolean',
            
            'details' => 'required|array|min:1',
            'details.*.sku_id' => 'required|exists:skus,id',
            'details.*.price' => 'required|numeric|min:0',
        ], [
            // Custom Message agar admin paham
            'start_date.after_or_equal' => 'Start Date cannot be in the past (Backdating is disabled).',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation Error', 'errors' => $validator->errors()], 422);
        }

        // 2. Mulai Transaksi Database
        DB::beginTransaction();
        try {
            // A. Simpan Header
            $header = PricePlanHeader::create([
                'name' => $request->name,
                'level' => $request->level,
                'port_id' => $request->level === 'PORT' ? $request->port_id : null,
                'city_id' => $request->level === 'CITY' ? $request->city_id : null,
                'country_id' => $request->level === 'COUNTRY' ? $request->country_id : null,
                'currency' => strtoupper($request->currency),
                'start_date' => $request->start_date,
                'end_date' => $request->end_date,
                'priority' => $request->priority ?? 0,
                'is_active' => $request->is_active ?? true,
            ]);

            // B. Simpan Details (Looping)
            foreach ($request->details as $item) {
                PricePlanDetail::create([
                    'price_plan_header_id' => $header->id,
                    'sku_id' => $item['sku_id'],
                    'price' => $item['price'],
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true, 
                'message' => 'Price Plan created successfully', 
                'data' => $header
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false, 
                'message' => 'Failed to create Price Plan', 
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * UPDATE PLAN
     * UPDATE: Mencegah Backdate saat Edit juga
     */
    public function update(Request $request, $id)
    {
        $header = PricePlanHeader::find($id);
        if (!$header) return response()->json(['success' => false, 'message' => 'Price Plan not found'], 404);

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'level' => 'required|in:PORT,CITY,COUNTRY',
            'port_id' => 'required_if:level,PORT|nullable|exists:ports,id',
            'city_id' => 'required_if:level,CITY|nullable|exists:cities,id',
            'country_id' => 'required_if:level,COUNTRY|nullable|exists:countries,id',
            'currency' => 'required|string|size:3',
            
            // --- UPDATE VALIDASI: STRICT NO BACKDATE ---
            // Kita gunakan 'sometimes' agar validasi hanya jalan jika user mengubah tanggal
            'start_date' => 'sometimes|required|date|after_or_equal:today', 
            'end_date' => 'nullable|date|after_or_equal:start_date',
            // -------------------------------------------
            
            'details' => 'required|array|min:1',
            'details.*.sku_id' => 'required|exists:skus,id',
            'details.*.price' => 'required|numeric|min:0',
        ], [
            'start_date.after_or_equal' => 'Start Date cannot be moved to the past.',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation Error', 'errors' => $validator->errors()], 422);
        }

        DB::beginTransaction();
        try {
            // A. Update Header
            $header->update([
                'name' => $request->name,
                'level' => $request->level,
                'port_id' => $request->level === 'PORT' ? $request->port_id : null,
                'city_id' => $request->level === 'CITY' ? $request->city_id : null,
                'country_id' => $request->level === 'COUNTRY' ? $request->country_id : null,
                'currency' => strtoupper($request->currency),
                'start_date' => $request->start_date, // Jika tidak dikirim, pake lama (handled by frontend usually)
                'end_date' => $request->end_date,
                'priority' => $request->priority ?? 0,
                'is_active' => $request->is_active ?? true,
            ]);

            // B. WIPE: Hapus semua detail lama
            $header->details()->delete();

            // C. REPLACE: Insert detail baru
            foreach ($request->details as $item) {
                PricePlanDetail::create([
                    'price_plan_header_id' => $header->id,
                    'sku_id' => $item['sku_id'],
                    'price' => $item['price'],
                ]);
            }

            DB::commit();

            return response()->json(['success' => true, 'message' => 'Price Plan updated successfully']);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'Failed to update Price Plan', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * DELETE PLAN
     */
    public function destroy($id)
    {
        $header = PricePlanHeader::find($id);
        if (!$header) return response()->json(['success' => false, 'message' => 'Price Plan not found'], 404);

        try {
            $header->details()->delete();
            $header->delete();

            return response()->json(['success' => true, 'message' => 'Price Plan deleted successfully']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Failed to delete Price Plan', 'error' => $e->getMessage()], 500);
        }
    }
}