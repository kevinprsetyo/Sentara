<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('transport_mode_rates', function (Blueprint $table) {
            $table->id();
            $table->string('mode');
            $table->string('rate_type')->nullable();
            $table->decimal('rate_per_km', 18, 4)->default(0);
            $table->date('valid_from')->nullable();
            $table->date('valid_to')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transport_mode_rates');
    }
};
