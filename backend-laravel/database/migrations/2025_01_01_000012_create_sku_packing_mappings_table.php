<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('sku_packing_mappings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sku_id')->constrained('skus')->onDelete('cascade');
            $table->string('packing_type');
            $table->decimal('cbm_per_unit', 12, 6)->default(0);
            $table->integer('units_per_20ft')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sku_packing_mappings');
    }
};
