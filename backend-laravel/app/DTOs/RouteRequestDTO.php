<?php

namespace App\DTOs;

use Illuminate\Http\Request;

class RouteRequestDTO
{
    public function __construct(
        public ?int $origin_port_id, // Tambahkan tanda tanya (?) agar boleh null
        public int $destination_port_id,
        public int $sku_id,
        public float $quantity,
        public string $transport_mode = 'SEA',
    ) {}

    public static function fromRequest(Request $request): self
    {
        // Validasi di sini harus dilonggarkan
        $validated = $request->validate([
            'origin_port_id' => 'nullable|integer|exists:ports,id', // Ubah 'required' jadi 'nullable'
            'destination_port_id' => 'required|integer|exists:ports,id',
            'sku_id' => 'required|integer|exists:skus,id',
            'quantity' => 'required|numeric|min:0.1',
            'transport_mode' => 'nullable|string|in:SEA,LAND,AIR',
        ]);

        return new self(
            origin_port_id: $validated['origin_port_id'] ?? null, // Handle null
            destination_port_id: $validated['destination_port_id'],
            sku_id: $validated['sku_id'],
            quantity: $validated['quantity'],
            transport_mode: $validated['transport_mode'] ?? 'SEA',
        );
    }
}