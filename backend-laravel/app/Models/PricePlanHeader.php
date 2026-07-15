<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PricePlanHeader extends Model
{
    use HasFactory;
    protected $guarded = [];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'is_active' => 'boolean',
        'priority' => 'integer'
    ];

    // Relasi ke Detail (Anak)
    public function details() {
        return $this->hasMany(PricePlanDetail::class, 'price_plan_header_id');
    }

    // --- TAMBAHAN RELASI PENTING ---
    // Agar saat GET Plans, nama kota/negara muncul, bukan error.

    public function port()
    {
        return $this->belongsTo(Port::class);
    }

    public function city()
    {
        return $this->belongsTo(City::class);
    }

    public function country()
    {
        return $this->belongsTo(Country::class);
    }
}