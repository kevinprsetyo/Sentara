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
        Schema::create('port_inventories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('port_id')
                ->constrained('ports')
                ->cascadeOnDelete()
                ->comment('Port location');
            $table->foreignId('sku_id')
                ->constrained('skus')
                ->cascadeOnDelete()
                ->comment('SKU product');
            $table->decimal('available_qty', 15, 2)
                ->default(0)
                ->comment('Available quantity in stock');
            $table->timestamps();
            
            // Index untuk query performance
            $table->index(['port_id', 'sku_id']);
            $table->index('available_qty');
            
            // Unique constraint untuk mencegah duplikasi inventory
            $table->unique(['port_id', 'sku_id'], 'unique_port_sku');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('port_inventories');
    }
};
