<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('route_segments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('from_port_id');
            $table->unsignedBigInteger('to_port_id');
            $table->enum('mode', ['SEA','LAND']);
            $table->decimal('distance_km', 10, 2)->default(0);
            $table->integer('base_lead_time_days')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('from_port_id')->references('id')->on('ports')->onDelete('cascade');
            $table->foreign('to_port_id')->references('id')->on('ports')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('route_segments');
    }
};
