<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Port extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'is_origin' => 'boolean',
        'lat' => 'float',
        'lng' => 'float',
    ];

    // --- RELASI ---

    public function infoCountry()
    {
        return $this->belongsTo(Country::class, 'country_id');
    }

    // TAMBAHAN PENTING: Relasi ke City
    public function city()
    {
        return $this->belongsTo(City::class, 'city_id');
    }

    public function freightRatesFrom()
    {
        return $this->hasMany(FreightRate::class, 'origin_port_id');
    }

    public function freightRatesTo()
    {
        return $this->hasMany(FreightRate::class, 'destination_port_id');
    }
}