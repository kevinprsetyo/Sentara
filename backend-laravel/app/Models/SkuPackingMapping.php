<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SkuPackingMapping extends Model
{
    use HasFactory;

    // Guarded kosong = Semua kolom (termasuk quantity_per_packing) bisa diisi massal
    protected $guarded = [];

    protected $casts = [
        'cbm_per_unit' => 'float',
        'quantity_per_packing' => 'integer', // <--- TAMBAHAN PENTING
    ];

    public function sku()
    {
        return $this->belongsTo(Sku::class, 'sku_id');
    }
}