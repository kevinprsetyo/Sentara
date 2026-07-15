<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\FxRateMonthly;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class FxRateController extends Controller
{
    /**
     * 1. INDEX: Menampilkan daftar semua rate (History)
     * Method: GET /api/fx-rates
     */
    public function index()
    {
        // Diurutkan dari bulan terbaru, lalu memprioritaskan input MANUAL
        $rates = FxRateMonthly::orderBy('year_month', 'desc')
            ->orderBy('source', 'asc') 
            ->get();
        
        return response()->json([
            'success' => true,
            'count' => $rates->count(),
            'data' => $rates
        ]);
    }

    /**
     * 2. STORE: Membuat atau memperbarui rate manual
     * Method: POST /api/fx-rates
     */
    public function store(Request $request)
    {
        // Validasi Input
        $validator = Validator::make($request->all(), [
            'currency_code' => 'required|string|size:3',
            'year_month'    => 'required|date_format:Y-m-d',
            'rate_to_usd'   => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        // UPDATE: Setiap input via Controller (Admin) dipaksa menjadi source 'MANUAL'
        $rate = FxRateMonthly::updateOrCreate(
            [
                'currency_code' => strtoupper($request->currency_code),
                'year_month'    => $request->year_month
            ],
            [
                'rate_to_usd'    => $request->rate_to_usd,
                'source'         => 'MANUAL', // <--- Penanda input manual
                'last_synced_at' => null      // Reset timestamp sync karena di-override manual
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'FX Rate saved successfully as MANUAL entry',
            'data' => $rate
        ], 201);
    }

    /**
     * 3. SHOW: Menampilkan detail 1 rate berdasarkan ID
     */
    public function show($id)
    {
        $rate = FxRateMonthly::find($id);

        if (!$rate) {
            return response()->json(['success' => false, 'message' => 'Data not found'], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $rate
        ]);
    }

    /**
     * 4. UPDATE: Mengupdate data rate tertentu
     * Method: PUT /api/fx-rates/{id}
     */
    public function update(Request $request, $id)
    {
        $rate = FxRateMonthly::find($id);

        if (!$rate) {
            return response()->json(['success' => false, 'message' => 'Data not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'currency_code' => 'sometimes|string|size:3',
            'year_month'    => 'sometimes|date_format:Y-m-d',
            'rate_to_usd'   => 'sometimes|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        // UPDATE: Jika admin mengedit, source otomatis berubah jadi MANUAL
        $rate->update([
            'currency_code'  => $request->currency_code ? strtoupper($request->currency_code) : $rate->currency_code,
            'year_month'     => $request->year_month ?? $rate->year_month,
            'rate_to_usd'    => $request->rate_to_usd ?? $rate->rate_to_usd,
            'source'         => 'MANUAL', // Berubah jadi manual jika diedit admin
            'last_synced_at' => null
        ]);

        return response()->json([
            'success' => true,
            'message' => 'FX Rate updated and locked as MANUAL',
            'data' => $rate
        ]);
    }

    /**
     * 5. DESTROY: Menghapus data rate
     */
    public function destroy($id)
    {
        $rate = FxRateMonthly::find($id);

        if (!$rate) {
            return response()->json(['success' => false, 'message' => 'Data not found'], 404);
        }

        $rate->delete();

        return response()->json([
            'success' => true,
            'message' => 'FX Rate deleted successfully'
        ]);
    }
}