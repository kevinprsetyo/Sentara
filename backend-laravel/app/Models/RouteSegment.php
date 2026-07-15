<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RouteSegment extends Model
{
    use HasFactory;

    // Pastikan nama tabel benar sesuai SQL
    protected $table = 'route_segments';

    // Gunakan fillable agar aman saat update massal dari Controller
    protected $fillable = [
        'from_port_id',
        'to_port_id',
        'mode',                 // Penting: SEA / LAND
        'distance_km',
        'base_lead_time_days',  // Penting: Lead time default jalur
        'is_active',
    ];

    protected $casts = [
        'distance_km' => 'float',
        'base_lead_time_days' => 'integer',
        'is_active' => 'boolean',
        'from_port_id' => 'integer',
        'to_port_id' => 'integer',
    ];

    /**
     * Relasi ke Port (FROM)
     */
    public function fromPort(): BelongsTo
    {
        return $this->belongsTo(Port::class, 'from_port_id');
    }

    /**
     * Relasi ke Port (TO)
     */
    public function toPort(): BelongsTo
    {
        return $this->belongsTo(Port::class, 'to_port_id');
    }

    /**
     * LEGACY METHODS (Untuk backward compatibility kode lama)
     */
    public function origin() { return $this->fromPort(); }
    public function destination() { return $this->toPort(); }
}