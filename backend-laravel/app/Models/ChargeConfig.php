<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ChargeConfig extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'amount_usd_per_shipment' => 'float',
        'amount_usd_per_cbm' => 'float',
        'amount_usd_per_container20' => 'float',
    ];

    public function port()
    {
        return $this->belongsTo(Port::class, 'port_id');
    }
}
