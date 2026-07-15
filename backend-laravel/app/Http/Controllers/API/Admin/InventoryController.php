<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use App\Models\PortInventory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class InventoryController extends Controller
{
    /**
     * Get a list of inventories
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = PortInventory::with(['port', 'sku'])->orderBy('id', 'desc');

            // Apply filters
            if ($request->has('port_id')) {
                $query->where('port_id', $request->input('port_id'));
            }
            if ($request->has('sku_id')) {
                $query->where('sku_id', $request->input('sku_id'));
            }

            // TRANSFORM LOGIC (Flatten Data)
            $transform = function($item) {
                return [
                    'id' => $item->id,
                    'port_id' => $item->port_id,
                    'port_name' => $item->port ? $item->port->name : '-', 
                    'sku_id' => $item->sku_id,
                    'sku_code' => $item->sku ? $item->sku->sku_code : '-',
                    'sku_name' => $item->sku ? $item->sku->name : '-',
                    'available_qty' => $item->available_qty,
                    'updated_at' => $item->updated_at,
                ];
            };

            // KONDISIONAL PAGINATION
            if ($request->has('limit')) {
                $data = $query->paginate((int)$request->limit);
                $data->getCollection()->transform($transform); // Apply transform

                return response()->json([
                    'success' => true,
                    'data' => $data->items(),
                    'pagination' => [
                        'current_page' => $data->currentPage(),
                        'per_page' => $data->perPage(),
                        'total' => $data->total(),
                        'last_page' => $data->lastPage(),
                    ],
                    'message' => 'Inventories retrieved successfully'
                ], 200);
            }

            // Default Get All
            return response()->json([
                'success' => true,
                'data' => $query->get()->map($transform),
                'message' => 'Inventories retrieved successfully'
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve inventories',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Show Single Inventory
     */
    public function show($id): JsonResponse
    {
        try {
            $inventory = PortInventory::with(['port', 'sku'])->find($id);

            if (!$inventory) {
                return response()->json(['success' => false, 'message' => 'Inventory record not found'], 404);
            }

            // Flatten Show juga
            $data = [
                'id' => $inventory->id,
                'port_id' => $inventory->port_id,
                'port_name' => $inventory->port ? $inventory->port->name : '-',
                'sku_id' => $inventory->sku_id,
                'sku_name' => $inventory->sku ? $inventory->sku->name : '-',
                'sku_code' => $inventory->sku ? $inventory->sku->sku_code : '-',
                'available_qty' => $inventory->available_qty,
            ];

            return response()->json(['success' => true, 'data' => $data]);

        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Server Error', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * STORE (CREATE NEW) - PENGGANTI ADJUST UNTUK BUAT BARU
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'port_id' => 'required|integer|exists:ports,id',
            'sku_id' => 'required|integer|exists:skus,id',
            'available_qty' => 'required|integer|min:0'
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation Error', 'errors' => $validator->errors()], 422);
        }

        // Cek Duplikasi: Port+SKU tidak boleh kembar
        $exists = PortInventory::where('port_id', $request->port_id)
            ->where('sku_id', $request->sku_id)
            ->exists();

        if ($exists) {
            return response()->json([
                'success' => false, 
                'message' => 'Inventory for this SKU in this Port already exists. Use Update instead.'
            ], 409); // Conflict
        }

        try {
            $inventory = PortInventory::create([
                'port_id' => $request->port_id,
                'sku_id' => $request->sku_id,
                'available_qty' => $request->available_qty
            ]);

            return response()->json(['success' => true, 'message' => 'Inventory created successfully', 'data' => $inventory], 201);

        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Failed to create inventory', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * UPDATE (EDIT EXISTING) - PENGGANTI ADJUST UNTUK EDIT
     */
    public function update(Request $request, $id): JsonResponse
    {
        $inventory = PortInventory::find($id);
        if (!$inventory) return response()->json(['success' => false, 'message' => 'Inventory record not found'], 404);

        $validator = Validator::make($request->all(), [
            'available_qty' => 'required|integer|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation Error', 'errors' => $validator->errors()], 422);
        }

        try {
            // Update quantity only. 
            // Jika mau ubah port/sku, sebaiknya delete & create baru karena ini menyangkut fisik barang.
            $inventory->available_qty = $request->available_qty;
            $inventory->save();

            return response()->json(['success' => true, 'message' => 'Inventory updated successfully', 'data' => $inventory]);

        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Failed to update inventory', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy($id): JsonResponse
    {
        try {
            $inventory = PortInventory::find($id);
            if (!$inventory) return response()->json(['success' => false, 'message' => 'Inventory record not found'], 404);
            $inventory->delete();
            return response()->json(['success' => true, 'message' => 'Inventory record deleted successfully']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Failed to delete inventory', 'error' => $e->getMessage()], 500);
        }
    }
}