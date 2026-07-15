<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. BUAT TABEL CITIES
        Schema::create('cities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('country_id')->constrained('countries')->onDelete('cascade');
            $table->string('name');
            $table->string('code')->nullable()->index(); // JKT, SBY
            $table->timestamps();
        });

        // 2. UPDATE TABEL PORTS (Tambah city_id)
        Schema::table('ports', function (Blueprint $table) {
            // Nullable dulu karena data lama belum punya city
            $table->foreignId('city_id')->nullable()->constrained('cities')->onDelete('set null');
        });

        // 3. BUAT TABEL PRICE PLAN HEADERS (SK HARGA)
        Schema::create('price_plan_headers', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // "Harga Q1 Surabaya"
            
            // Level Penentuan Harga (Waterfall Logic)
            $table->enum('level', ['PORT', 'CITY', 'COUNTRY']);
            
            // Pointer ke Entity (Hanya satu yang terisi sesuai level)
            $table->foreignId('port_id')->nullable()->constrained('ports')->onDelete('cascade');
            $table->foreignId('city_id')->nullable()->constrained('cities')->onDelete('cascade');
            $table->foreignId('country_id')->nullable()->constrained('countries')->onDelete('cascade');
            
            $table->string('currency', 3)->default('USD'); // USD, IDR
            $table->date('start_date');
            $table->date('end_date')->nullable(); // Null = Berlaku selamanya
            $table->integer('priority')->default(0); // Jika tabrakan, prioritas tinggi menang
            $table->boolean('is_active')->default(true);
            
            $table->timestamps();
        });

        // 4. BUAT TABEL PRICE PLAN DETAILS (DAFTAR HARGA BARANG)
        Schema::create('price_plan_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('price_plan_header_id')->constrained('price_plan_headers')->onDelete('cascade');
            $table->foreignId('sku_id')->constrained('skus')->onDelete('cascade');
            
            // Harga dalam mata uang header (Bisa IDR/USD)
            $table->decimal('price', 18, 4);
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('price_plan_details');
        Schema::dropIfExists('price_plan_headers');
        
        Schema::table('ports', function (Blueprint $table) {
            $table->dropForeign(['city_id']);
            $table->dropColumn('city_id');
        });
        
        Schema::dropIfExists('cities');
    }
};