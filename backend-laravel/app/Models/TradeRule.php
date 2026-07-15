<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TradeRule extends Model
{
    use HasFactory;

    // Pastikan nama tabel benar sesuai SQL
    protected $table = 'trade_rules';

    protected $fillable = [
        'origin_country_id',
        'destination_country_id',
        'is_allowed',
        'export_tax_percent',
        // 'reason', // DICHAPUS: Karena kolom ini TIDAK ADA di database 'terbarururu.sql' Anda
    ];

    protected $casts = [
        'is_allowed' => 'boolean',
        'export_tax_percent' => 'float',
        'origin_country_id' => 'integer',
        'destination_country_id' => 'integer',
    ];

    /**
     * Get the origin country.
     */
    public function originCountry(): BelongsTo
    {
        return $this->belongsTo(Country::class, 'origin_country_id');
    }

    /**
     * Get the destination country.
     */
    public function destinationCountry(): BelongsTo
    {
        return $this->belongsTo(Country::class, 'destination_country_id');
    }

    // Helper scopes (Opsional, bawaan kode lama Anda)
    public function scopeAllowed($query) { return $query->where('is_allowed', true); }
    public function scopeFromCountry($query, int $countryId) { return $query->where('origin_country_id', $countryId); }
    public function scopeToCountry($query, int $countryId) { return $query->where('destination_country_id', $countryId); }
}