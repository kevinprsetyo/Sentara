<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TransportModeRate extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'rate_per_km' => 'float',
        'valid_from' => 'date',
        'valid_to' => 'date',
    ];
}
