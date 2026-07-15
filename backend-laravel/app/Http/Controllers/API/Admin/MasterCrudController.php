<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Models\Port;
use App\Models\Sku;
use App\Models\SkuPackingMapping;
use App\Models\City;
use App\Models\Country;
use App\Models\PricePlanHeader;

class MasterCrudController extends Controller
{
    // =========================================================================
    // 1. PORTS CRUD
    // =========================================================================

    public function indexPort(Request $request)
    {
        $query = Port::with(['infoCountry', 'city'])->orderBy('id', 'desc');

        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->whereRaw("name ILIKE ?", ["%{$search}%"])
                  ->orWhereHas('infoCountry', function($subQ) use ($search) {
                      $subQ->whereRaw("name ILIKE ?", ["%{$search}%"]);
                  });
            });
        }
        
        if ($request->has('country_id')) {
            $query->where('country_id', $request->country_id);
        }

        $data = $query->paginate(10);

        return response()->json([
            'success' => true,
            'message' => 'Ports list retrieved successfully',
            'data' => $data
        ]);
    }

    public function showPort($id)
    {
        $port = Port::with(['infoCountry', 'city'])->find($id);
        if (!$port) return response()->json(['success' => false, 'message' => 'Port not found'], 404);

        return response()->json(['success' => true, 'data' => $port]);
    }

    public function storePort(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'country_id' => 'required|exists:countries,id',
            'city_id' => 'nullable|exists:cities,id',
            'lat' => 'nullable|numeric',
            'lng' => 'nullable|numeric',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation Error', 'errors' => $validator->errors()], 422);
        }

        try {
            $port = Port::create([
                'name' => $request->name,
                'country_id' => $request->country_id,
                'city_id' => $request->city_id,
                'lat' => $request->lat,
                'lng' => $request->lng,
                'is_origin' => false,
            ]);

            return response()->json(['success' => true, 'message' => 'Port created successfully', 'data' => $port], 201);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Failed to create port', 'error' => $e->getMessage()], 500);
        }
    }

    public function updatePort(Request $request, $id)
    {
        $port = Port::find($id);
        if (!$port) return response()->json(['success' => false, 'message' => 'Port not found'], 404);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'country_id' => 'sometimes|exists:countries,id',
            'city_id' => 'nullable|exists:cities,id',
            'lat' => 'nullable|numeric',
            'lng' => 'nullable|numeric',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation Error', 'errors' => $validator->errors()], 422);
        }

        try {
            $port->update($request->only(['name', 'country_id', 'city_id', 'lat', 'lng']));
            return response()->json(['success' => true, 'message' => 'Port updated successfully', 'data' => $port]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Failed to update port', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroyPort($id)
    {
        $port = Port::find($id);
        if (!$port) return response()->json(['success' => false, 'message' => 'Port not found'], 404);

        try {
            $port->delete();
            return response()->json(['success' => true, 'message' => 'Port deleted successfully']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Failed to delete port', 'error' => $e->getMessage()], 500);
        }
    }

    // =========================================================================
    // 2. SKUS CRUD (Product)
    // =========================================================================

    public function indexSku(Request $request)
    {
        $query = Sku::orderBy('id', 'desc');

        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->whereRaw("name ILIKE ?", ["%{$search}%"])
                  ->orWhereRaw("sku_code ILIKE ?", ["%{$search}%"]);
            });
        }

        $data = $query->paginate(10);

        return response()->json([
            'success' => true,
            'message' => 'SKUs list retrieved successfully',
            'data' => $data
        ]);
    }

    public function showSku($id)
    {
        $sku = Sku::find($id);
        if (!$sku) return response()->json(['success' => false, 'message' => 'SKU not found'], 404);

        return response()->json(['success' => true, 'data' => $sku]);
    }

    public function storeSku(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'code' => 'required|string|unique:skus,sku_code',
            'base_cost' => 'required|numeric|min:0',
            'length_cm' => 'nullable|numeric|min:0.1',
            'width_cm' => 'nullable|numeric|min:0.1',
            'height_cm' => 'nullable|numeric|min:0.1',
            'weight_kg' => 'nullable|numeric|min:0.01',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation Error', 'errors' => $validator->errors()], 422);
        }

        try {
            $sku = Sku::create([
                'name' => $request->name,
                'sku_code' => $request->code,
                'base_cost_usd' => $request->base_cost,
                'length_cm' => $request->length_cm ?? 10,
                'width_cm' => $request->width_cm ?? 10,
                'height_cm' => $request->height_cm ?? 10,
                'weight_kg' => $request->weight_kg ?? 1,
            ]);

            return response()->json(['success' => true, 'message' => 'SKU created successfully', 'data' => $sku], 201);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Failed to create SKU', 'error' => $e->getMessage()], 500);
        }
    }

    public function updateSku(Request $request, $id)
    {
        $sku = Sku::find($id);
        if (!$sku) return response()->json(['success' => false, 'message' => 'SKU not found'], 404);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'code' => 'sometimes|string|unique:skus,sku_code,' . $id,
            'base_cost' => 'sometimes|numeric|min:0',
            'length_cm' => 'nullable|numeric|min:0.1',
            'width_cm' => 'nullable|numeric|min:0.1',
            'height_cm' => 'nullable|numeric|min:0.1',
            'weight_kg' => 'nullable|numeric|min:0.01',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation Error', 'errors' => $validator->errors()], 422);
        }

        try {
            $dataToUpdate = $request->only(['name', 'length_cm', 'width_cm', 'height_cm', 'weight_kg']);
            if ($request->has('code')) $dataToUpdate['sku_code'] = $request->code;
            if ($request->has('base_cost')) $dataToUpdate['base_cost_usd'] = $request->base_cost;

            $sku->update($dataToUpdate);
            return response()->json(['success' => true, 'message' => 'SKU updated successfully', 'data' => $sku]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Failed to update SKU', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroySku($id)
    {
        $sku = Sku::find($id);
        if (!$sku) return response()->json(['success' => false, 'message' => 'SKU not found'], 404);

        try {
            $sku->delete();
            return response()->json(['success' => true, 'message' => 'SKU deleted successfully']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Failed to delete SKU', 'error' => $e->getMessage()], 500);
        }
    }

    // =========================================================================
    // 3. PACKING MAPPINGS
    // =========================================================================

    public function indexPacking(Request $request)
    {
        $query = SkuPackingMapping::with('sku')->orderBy('id', 'desc');

        if ($request->has('sku_id')) {
            $query->where('sku_id', $request->sku_id);
        }

        $packings = $query->paginate(10);

        return response()->json([
            'success' => true,
            'message' => 'Packing list retrieved successfully',
            'data' => $packings
        ]);
    }

    public function showPacking($id)
    {
        $packing = SkuPackingMapping::with('sku')->find($id);
        if (!$packing) return response()->json(['success' => false, 'message' => 'Packing info not found'], 404);

        return response()->json(['success' => true, 'data' => $packing]);
    }

    public function storePacking(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'sku_id' => 'required|exists:skus,id',
            'packing_type' => 'required|string',
            'quantity_per_packing' => 'required|integer|min:1', 
            'cbm_per_unit' => 'nullable|numeric',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation Error', 'errors' => $validator->errors()], 422);
        }

        try {
            $packing = SkuPackingMapping::create([
                'sku_id' => $request->sku_id,
                'packing_type' => strtoupper($request->packing_type),
                'quantity_per_packing' => $request->quantity_per_packing, 
                'cbm_per_unit' => $request->cbm_per_unit ?? 0,
            ]);

            return response()->json(['success' => true, 'message' => 'Packing info created successfully', 'data' => $packing], 201);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Failed to create packing info', 'error' => $e->getMessage()], 500);
        }
    }

    public function updatePacking(Request $request, $id)
    {
        $packing = SkuPackingMapping::find($id);
        if (!$packing) return response()->json(['success' => false, 'message' => 'Packing info not found'], 404);

        $validator = Validator::make($request->all(), [
            'packing_type' => 'sometimes|string',
            'quantity_per_packing' => 'sometimes|integer|min:1', 
            'cbm_per_unit' => 'nullable|numeric',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation Error', 'errors' => $validator->errors()], 422);
        }

        try {
            $data = $request->all();
            
            if(isset($data['packing_type'])) {
                $data['packing_type'] = strtoupper($data['packing_type']);
            }

            if(isset($data['units_per_20ft'])) {
                unset($data['units_per_20ft']);
            }

            $packing->update($data);
            return response()->json(['success' => true, 'message' => 'Packing info updated successfully', 'data' => $packing]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Failed to update packing info', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroyPacking($id)
    {
        $packing = SkuPackingMapping::find($id);
        if (!$packing) return response()->json(['success' => false, 'message' => 'Packing info not found'], 404);

        try {
            $packing->delete();
            return response()->json(['success' => true, 'message' => 'Packing info deleted successfully']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Failed to delete packing info', 'error' => $e->getMessage()], 500);
        }
    }

    public function getPackingBySku($skuId)
    {
        $sku = Sku::find($skuId);
        if (!$sku) {
            return response()->json(['success' => false, 'message' => 'SKU not found'], 404);
        }
        $packings = SkuPackingMapping::where('sku_id', $skuId)->get();
        return response()->json(['success' => true, 'message' => 'Packing data retrieved successfully', 'data' => $packings]);
    }

    // =========================================================================
    // 5. COUNTRIES CRUD (UPDATE: currency_code)
    // =========================================================================

    public function indexCountry(Request $request)
    {
        $query = Country::orderBy('name', 'asc');

        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->whereRaw("name ILIKE ?", ["%{$search}%"])
                  ->orWhereRaw("code ILIKE ?", ["%{$search}%"]);
            });
        }

        $data = $query->paginate(15);

        return response()->json([
            'success' => true,
            'message' => 'Countries list retrieved successfully',
            'data' => $data
        ]);
    }

    public function showCountry($id)
    {
        $country = Country::find($id);
        if (!$country) return response()->json(['success' => false, 'message' => 'Country not found'], 404);

        return response()->json(['success' => true, 'data' => $country]);
    }

    public function storeCountry(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'code' => 'required|string|size:2|unique:countries,code',
            'name' => 'required|string|max:255',
            'currency_code' => 'required|string|size:3', // Wajib untuk sistem Hybrid FX
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation Error', 'errors' => $validator->errors()], 422);
        }

        try {
            // REVISI: Pastikan currency_code ikut tersimpan
            $country = Country::create([
                'code' => strtoupper($request->code),
                'name' => $request->name,
                'currency_code' => strtoupper($request->currency_code)
            ]);
            return response()->json(['success' => true, 'message' => 'Country created successfully', 'data' => $country], 201);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Failed to create country', 'error' => $e->getMessage()], 500);
        }
    }

    public function updateCountry(Request $request, $id)
    {
        $country = Country::find($id);
        if (!$country) return response()->json(['success' => false, 'message' => 'Country not found'], 404);

        $validator = Validator::make($request->all(), [
            'code' => 'required|string|size:2|unique:countries,code,' . $id,
            'name' => 'required|string|max:255',
            'currency_code' => 'sometimes|string|size:3',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation Error', 'errors' => $validator->errors()], 422);
        }

        try {
            // REVISI: Pastikan currency_code bisa diupdate secara dinamis
            $country->update([
                'code' => strtoupper($request->code),
                'name' => $request->name,
                'currency_code' => $request->currency_code ? strtoupper($request->currency_code) : $country->currency_code
            ]);
            return response()->json(['success' => true, 'message' => 'Country updated successfully', 'data' => $country]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Failed to update country', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroyCountry($id)
    {
        $country = Country::find($id);
        if (!$country) return response()->json(['success' => false, 'message' => 'Country not found'], 404);

        if ($country->cities()->exists()) {
            return response()->json(['success' => false, 'message' => 'Cannot delete country. It has registered Cities. Delete cities first.'], 400);
        }
        if ($country->ports()->exists()) {
            return response()->json(['success' => false, 'message' => 'Cannot delete country. It has registered Ports.'], 400);
        }

        try {
            $country->delete();
            return response()->json(['success' => true, 'message' => 'Country deleted successfully']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Failed to delete country', 'error' => $e->getMessage()], 500);
        }
    }

    // =========================================================================
    // 6. CITIES CRUD
    // =========================================================================

    public function indexCity(Request $request)
    {
        $query = City::with('country')->orderBy('id', 'desc');

        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->whereRaw("name ILIKE ?", ["%{$search}%"]);
        }
        if ($request->has('country_id')) {
            $query->where('country_id', $request->country_id);
        }

        $data = $query->paginate(10);

        return response()->json([
            'success' => true,
            'message' => 'Cities list retrieved successfully',
            'data' => $data
        ]);
    }

    public function showCity($id)
    {
        $city = City::with('country')->find($id);
        if (!$city) return response()->json(['success' => false, 'message' => 'City not found'], 404);

        return response()->json(['success' => true, 'data' => $city]);
    }

    public function storeCity(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'country_id' => 'required|exists:countries,id',
            'code' => 'nullable|string|max:10'
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation Error', 'errors' => $validator->errors()], 422);
        }

        $exists = City::where('name', $request->name)
            ->where('country_id', $request->country_id)
            ->exists();

        if ($exists) {
            return response()->json(['success' => false, 'message' => 'City name already exists in this country'], 422);
        }

        try {
            $city = City::create($request->all());
            return response()->json(['success' => true, 'message' => 'City created successfully', 'data' => $city], 201);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Failed to create city', 'error' => $e->getMessage()], 500);
        }
    }

    public function updateCity(Request $request, $id)
    {
        $city = City::find($id);
        if (!$city) return response()->json(['success' => false, 'message' => 'City not found'], 404);

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'country_id' => 'required|exists:countries,id',
            'code' => 'nullable|string|max:10'
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation Error', 'errors' => $validator->errors()], 422);
        }

        if ($city->name !== $request->name || $city->country_id != $request->country_id) {
            $exists = City::where('name', $request->name)
                ->where('country_id', $request->country_id)
                ->where('id', '!=', $id)
                ->exists();

            if ($exists) {
                return response()->json(['success' => false, 'message' => 'City name already exists in this country'], 422);
            }
        }

        try {
            $city->update($request->all());
            return response()->json(['success' => true, 'message' => 'City updated successfully', 'data' => $city]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Failed to update city', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroyCity($id)
    {
        $city = City::find($id);
        if (!$city) return response()->json(['success' => false, 'message' => 'City not found'], 404);

        if ($city->ports()->exists()) {
            return response()->json(['success' => false, 'message' => 'Cannot delete city. It is used by Ports.'], 400);
        }

        if (PricePlanHeader::where('city_id', $id)->exists()) {
            return response()->json(['success' => false, 'message' => 'Cannot delete city. It is used in Active Price Plans.'], 400);
        }

        try {
            $city->delete();
            return response()->json(['success' => true, 'message' => 'City deleted successfully']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Failed to delete city', 'error' => $e->getMessage()], 500);
        }
    }
}