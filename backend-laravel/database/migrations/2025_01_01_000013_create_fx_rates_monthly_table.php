<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('fx_rates_monthly', function (Blueprint $table) {
            $table->id();
            $table->string('currency_code');
            $table->date('year_month');
            $table->decimal('rate_to_usd', 18, 8)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fx_rates_monthly');
    }
};
