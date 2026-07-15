<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\API\RouteController;
use App\Http\Controllers\API\MasterDataController;
use App\Http\Controllers\API\Admin\InventoryController;
use App\Http\Controllers\API\Admin\LogisticsController;
use App\Http\Controllers\API\Admin\MasterCrudController;
use App\Http\Controllers\API\Admin\LogisticsCrudController;
use App\Http\Controllers\API\Admin\PricePlanController;
use App\Http\Controllers\API\FxRateController; // <--- JANGAN LUPA IMPORT INI

// 1. PUBLIC ROUTES (Bebas Akses)
Route::get('/ping', function () {
    return response()->json(['status' => 'ok', 'message' => 'INI SITE BARU (SENTARA PROD)']);
});

// Login harus public agar user bisa masuk
Route::post('/login', [AuthController::class, 'login'])->name('login');


// 2. PROTECTED ROUTES (Wajib Punya Token)
Route::middleware('auth:sanctum')->group(function () {

    // Logout
    Route::post('/logout', [AuthController::class, 'logout']);

    // Route User Info
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    // ===> ROUTE PLAN WITH RBAC MIDDLEWARE <===
    Route::prefix('v1')->group(function () {
        // Route planning dengan RBAC protection
        Route::post('/route/plan', [RouteController::class, 'plan'])
            ->middleware('role.access:ROUTE_PLAN_VIEW');

        // Master Data endpoints (Public Read-Only / Dropdowns)
        // INI MENGGUNAKAN MasterDataController YANG ANDA BERIKAN (Simple Data)
        Route::prefix('master')->group(function () {
            Route::get('/ports', [MasterDataController::class, 'getPorts']);
            Route::get('/skus', [MasterDataController::class, 'getSkus']);
            Route::get('/modes', [MasterDataController::class, 'getTransportModes']);
            Route::get('/cities', [MasterDataController::class, 'getCities']);
            Route::get('/countries', [MasterDataController::class, 'getCountries']);
        });
    });

    // ===> ADMIN DASHBOARD ROUTES <===
    Route::prefix('v1/admin')->middleware('role.access:ADMIN_DASHBOARD')->group(function () {
        
        // Inventory Management (Complete CRUD)
        Route::get('/inventory', [InventoryController::class, 'index']);
        Route::get('/inventory/{id}', [InventoryController::class, 'show']);
        Route::post('/inventory', [InventoryController::class, 'store']);       
        Route::put('/inventory/{id}', [InventoryController::class, 'update']);  
        Route::delete('/inventory/{id}', [InventoryController::class, 'destroy']);

        // Logistics Utility (Status Toggle)
        Route::post('/routes/status', [LogisticsController::class, 'toggleRouteStatus']);

        // ===> MASTER DATA CRUD (MasterCrudController) <===
        // INI MENGGUNAKAN MasterCrudController (Full Data + Search)
        
        // Countries CRUD
        Route::get('/countries', [MasterCrudController::class, 'indexCountry']); 
        Route::get('/countries/{id}', [MasterCrudController::class, 'showCountry']); 
        Route::post('/countries', [MasterCrudController::class, 'storeCountry']);
        Route::put('/countries/{id}', [MasterCrudController::class, 'updateCountry']);
        Route::delete('/countries/{id}', [MasterCrudController::class, 'destroyCountry']);

        // Cities CRUD
        Route::get('/cities', [MasterCrudController::class, 'indexCity']); 
        Route::get('/cities/{id}', [MasterCrudController::class, 'showCity']); 
        Route::post('/cities', [MasterCrudController::class, 'storeCity']);
        Route::put('/cities/{id}', [MasterCrudController::class, 'updateCity']);
        Route::delete('/cities/{id}', [MasterCrudController::class, 'destroyCity']);

        // Ports CRUD
        Route::get('/ports', [MasterCrudController::class, 'indexPort']); 
        Route::get('/ports/{id}', [MasterCrudController::class, 'showPort']); 
        Route::post('/ports', [MasterCrudController::class, 'storePort']);
        Route::put('/ports/{id}', [MasterCrudController::class, 'updatePort']);
        Route::delete('/ports/{id}', [MasterCrudController::class, 'destroyPort']);

        // SKUs CRUD
        Route::get('/skus', [MasterCrudController::class, 'indexSku']); 
        Route::get('/skus/{id}', [MasterCrudController::class, 'showSku']); 
        Route::post('/skus', [MasterCrudController::class, 'storeSku']);
        Route::put('/skus/{id}', [MasterCrudController::class, 'updateSku']);
        Route::delete('/skus/{id}', [MasterCrudController::class, 'destroySku']);

        // SKU Packing Mappings CRUD
        Route::get('/packings', [MasterCrudController::class, 'indexPacking']); 
        Route::get('/packings/{id}', [MasterCrudController::class, 'showPacking']); 
        Route::post('/packings', [MasterCrudController::class, 'storePacking']);
        Route::put('/packings/{id}', [MasterCrudController::class, 'updatePacking']);
        Route::delete('/packings/{id}', [MasterCrudController::class, 'destroyPacking']);
        Route::get('/packing/sku/{id}', [MasterCrudController::class, 'getPackingBySku']); 

        // ===> LOGISTICS CRUD (LogisticsCrudController) <===
        
        // Freight Rates CRUD
        Route::get('/rates', [LogisticsCrudController::class, 'getRates']); 
        Route::get('/rates/{id}', [LogisticsCrudController::class, 'showRate']); 
        Route::post('/rates', [LogisticsCrudController::class, 'storeRate']);
        Route::put('/rates/{id}', [LogisticsCrudController::class, 'updateRate']); 
        Route::delete('/rates/{id}', [LogisticsCrudController::class, 'destroyRate']);

        // Trade Rules CRUD
        Route::get('/rules', [LogisticsCrudController::class, 'getRules']);
        Route::get('/rules/{id}', [LogisticsCrudController::class, 'showRule']); 
        Route::post('/rules', [LogisticsCrudController::class, 'storeRule']);
        Route::put('/rules/{id}', [LogisticsCrudController::class, 'updateRule']);
        Route::delete('/rules/{id}', [LogisticsCrudController::class, 'destroyRule']);

        // Route Segments CRUD
        Route::get('/segments', [LogisticsCrudController::class, 'getSegments']);
        Route::get('/segments/{id}', [LogisticsCrudController::class, 'showSegment']); 
        Route::post('/segments', [LogisticsCrudController::class, 'storeSegment']);
        Route::put('/segments/{id}', [LogisticsCrudController::class, 'updateSegment']);
        Route::delete('/segments/{id}', [LogisticsCrudController::class, 'destroySegment']);

        // ===> FX RATES CRUD (Baru Ditambahkan) <===
        Route::get('/fx-rates', [FxRateController::class, 'index']);
        Route::get('/fx-rates/{id}', [FxRateController::class, 'show']);
        Route::post('/fx-rates', [FxRateController::class, 'store']);
        Route::put('/fx-rates/{id}', [FxRateController::class, 'update']);
        Route::delete('/fx-rates/{id}', [FxRateController::class, 'destroy']);
        
        // ===> PRICE PLANS CRUD (PricePlanController) <===
        Route::apiResource('price-plans', PricePlanController::class);
      
    });
});