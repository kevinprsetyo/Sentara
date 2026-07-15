<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('charge_configs', function (Blueprint $table) {
            $table->id();
            $table->string('charge_type');
            $table->unsignedBigInteger('port_id')->nullable();
            $table->decimal('amount_usd_per_shipment', 18, 4)->nullable();
            $table->decimal('amount_usd_per_cbm', 18, 4)->nullable();
            $table->decimal('amount_usd_per_container20', 18, 4)->nullable();
            $table->timestamps();

            $table->foreign('port_id')->references('id')->on('ports')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('charge_configs');
    }
};
