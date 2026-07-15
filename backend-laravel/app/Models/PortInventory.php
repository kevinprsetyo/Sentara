<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PortInventory extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'port_id',
        'sku_id',
        'available_qty',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'available_qty' => 'decimal:2',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the port.
     */
    public function port(): BelongsTo
    {
        return $this->belongsTo(Port::class);
    }

    /**
     * Get the SKU.
     */
    public function sku(): BelongsTo
    {
        return $this->belongsTo(Sku::class);
    }

    /**
     * Scope to filter by port.
     */
    public function scopeAtPort($query, int $portId)
    {
        return $query->where('port_id', $portId);
    }

    /**
     * Scope to filter by SKU.
     */
    public function scopeForSku($query, int $skuId)
    {
        return $query->where('sku_id', $skuId);
    }

    /**
     * Scope to filter available stock only (qty > 0).
     */
    public function scopeAvailable($query)
    {
        return $query->where('available_qty', '>', 0);
    }

    /**
     * Check if there is sufficient stock.
     */
    public function hasSufficientStock(float $requiredQty): bool
    {
        return $this->available_qty >= $requiredQty;
    }

    /**
     * Reduce inventory quantity.
     */
    public function reduceStock(float $quantity): bool
    {
        if (!$this->hasSufficientStock($quantity)) {
            return false;
        }

        $this->available_qty -= $quantity;
        return $this->save();
    }

    /**
     * Increase inventory quantity.
     */
    public function addStock(float $quantity): bool
    {
        $this->available_qty += $quantity;
        return $this->save();
    }
}
