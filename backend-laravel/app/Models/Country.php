<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Country extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'name',
        'currency_code', // <--- TAMBAHAN BARU
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get all cities in this country.
     */
    public function cities(): HasMany
    {
        return $this->hasMany(City::class);
    }

    public function ports(): HasMany
    {
        return $this->hasMany(Port::class);
    }

    public function originTradeRules(): HasMany
    {
        return $this->hasMany(TradeRule::class, 'origin_country_id');
    }

    public function destinationTradeRules(): HasMany
    {
        return $this->hasMany(TradeRule::class, 'destination_country_id');
    }

    public function scopeByCode($query, string $code)
    {
        return $query->where('code', $code);
    }
}