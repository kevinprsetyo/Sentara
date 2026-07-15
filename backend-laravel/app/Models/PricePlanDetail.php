<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PricePlanDetail extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'price' => 'decimal:2',
    ];

    // Relasi balik ke Header
    public function header()
    {
        return $this->belongsTo(PricePlanHeader::class, 'price_plan_header_id');
    }

    // Relasi ke Barang (SKU)
    public function sku()
    {
        return $this->belongsTo(Sku::class);
    }
}