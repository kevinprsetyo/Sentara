<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FxRateMonthly extends Model
{
    use HasFactory;

    // ===> TAMBAHKAN BARIS INI (Sangat Penting) <===
    protected $table = 'fx_rates_monthly';

    // Guarded kosong berarti semua kolom boleh diisi (aman untuk development)
    protected $guarded = [];

    protected $casts = [
        'year_month' => 'date',
        'rate_to_usd' => 'float',
      	'last_synced_at' => 'datetime',
    ];
}