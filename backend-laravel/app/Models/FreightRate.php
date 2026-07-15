<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FreightRate extends Model
{
    use HasFactory;

    // 1. Definisikan Nama Tabel secara Eksplisit
    protected $table = 'freight_rates';

    // 2. Izinkan kolom-kolom ini diisi (HAPUS 'carrier')
    protected $fillable = [
        'origin_port_id',
        'destination_port_id',
        // 'carrier',  <-- SUDAH DIHAPUS
        'rate_lcl',
        'rate_fcl_20ft',
        'currency',
        'lead_time_days',
    ];

    protected $casts = [
        'rate_lcl' => 'float',
        'rate_fcl_20ft' => 'float',
        'lead_time_days' => 'integer',
        'origin_port_id' => 'integer',
        'destination_port_id' => 'integer',
    ];

    public function originPort(): BelongsTo
    {
        return $this->belongsTo(Port::class, 'origin_port_id');
    }

    public function destinationPort(): BelongsTo
    {
        return $this->belongsTo(Port::class, 'destination_port_id');
    }
}