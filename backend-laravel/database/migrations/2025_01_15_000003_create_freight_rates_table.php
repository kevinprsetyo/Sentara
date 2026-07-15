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
        Schema::create('freight_rates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('origin_port_id')
                ->constrained('ports')
                ->cascadeOnDelete()
                ->comment('Origin port');
            $table->foreignId('destination_port_id')
                ->constrained('ports')
                ->cascadeOnDelete()
                ->comment('Destination port');
            $table->decimal('rate_lcl', 15, 2)
                ->nullable()
                ->comment('Price per CBM for LCL shipment');
            $table->decimal('rate_fcl_20ft', 15, 2)
                ->nullable()
                ->comment('Price per 20ft Container for FCL shipment');
            $table->string('currency', 3)
                ->default('USD')
                ->comment('Currency: USD or IDR');
            $table->integer('lead_time_days')
                ->default(7)
                ->comment('Estimated delivery time in days');
            $table->timestamps();
            
            // Composite index untuk query performance
            $table->index(['origin_port_id', 'destination_port_id']);
            $table->index('currency');
            
            // Unique constraint untuk mencegah duplikasi route
            $table->unique(['origin_port_id', 'destination_port_id', 'currency'], 'unique_freight_route');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('freight_rates');
    }
};
