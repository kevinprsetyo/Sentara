<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('trade_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('origin_country_id')
                ->constrained('countries')
                ->cascadeOnDelete()
                ->comment('Origin country');
            $table->foreignId('destination_country_id')
                ->constrained('countries')
                ->cascadeOnDelete()
                ->comment('Destination country');
            $table->boolean('is_allowed')
                ->default(true)
                ->comment('Is trade allowed between these countries');
            $table->decimal('export_tax_percent', 5, 2)
                ->default(0)
                ->comment('Export tax percentage');
            $table->timestamps();
            
            // Index untuk query performance
            $table->index(['origin_country_id', 'destination_country_id']);
            $table->index('is_allowed');
            
            // Unique constraint untuk mencegah duplikasi trade rule
            $table->unique(['origin_country_id', 'destination_country_id'], 'unique_trade_route');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('trade_rules');
    }
};
