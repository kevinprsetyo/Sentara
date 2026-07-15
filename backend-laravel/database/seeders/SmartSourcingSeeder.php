<?php

namespace Database\Seeders;

use App\Models\Country;
use App\Models\Port;
use App\Models\FreightRate;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SmartSourcingSeeder extends Seeder
{
    /**
     * Port mapping dari nama kota ke nama pelabuhan nyata.
     */
    private array $portMap = [
        // Indonesia
        'Jakarta' => 'Tanjung Priok',
        'Riau' => 'Dumai',
        'Surabaya' => 'Tanjung Perak',
        
        // Tetangga
        'Singapore' => 'Port of Singapore',
        'Kuala Lumpur' => 'Port Klang',
        'Johor Bahru' => 'Tanjung Pelepas',
        'Ipoh' => 'Lumut',
        'Bangkok' => 'Laem Chabang',
        'HCMC' => 'Cat Lai',
        'Manila' => 'Manila North Harbor',
        
        // Negara Tambahan
        'Tokyo' => 'Tokyo',
        'Brunei' => 'Muara Port',
        'Myanmar' => 'Yangon Port',
        'Laos' => 'Thanaleng Dry Port',
        'Dili' => 'Dili Port',
        'Cambodia' => 'Sihanoukville',
    ];

    /**
     * Country mapping lengkap.
     */
    private array $countryMap = [
        'INA' => ['name' => 'Indonesia',   'ports' => ['Tanjung Priok', 'Tanjung Perak', 'Dumai']],
        'MY'  => ['name' => 'Malaysia',    'ports' => ['Port Klang', 'Tanjung Pelepas', 'Lumut']],
        'SG'  => ['name' => 'Singapore',   'ports' => ['Port of Singapore']],
        'TH'  => ['name' => 'Thailand',    'ports' => ['Laem Chabang']],
        'VN'  => ['name' => 'Vietnam',     'ports' => ['Cat Lai']],
        'PH'  => ['name' => 'Philippines', 'ports' => ['Manila North Harbor']],
        'JP'  => ['name' => 'Japan',       'ports' => ['Tokyo']],
        'BN'  => ['name' => 'Brunei',      'ports' => ['Muara Port']],
        'MM'  => ['name' => 'Myanmar',     'ports' => ['Yangon Port']],
        'LA'  => ['name' => 'Laos',        'ports' => ['Thanaleng Dry Port']],
        'TL'  => ['name' => 'Timor Leste', 'ports' => ['Dili Port']],
        'KH'  => ['name' => 'Cambodia',    'ports' => ['Sihanoukville']],
    ];

    public function run(): void
    {
        DB::beginTransaction();

        try {
            $this->command->info('🚀 Starting Smart Sourcing Seeder (Semi-Colon Mode)...');

            $this->seedCountries();
            $this->seedPorts();
            $this->importFreightRates();

            DB::commit();
            $this->command->info('✅ Smart Sourcing Seeder completed successfully!');
        } catch (\Exception $e) {
            DB::rollBack();
            $this->command->error('❌ Error: ' . $e->getMessage());
            throw $e;
        }
    }

    private function seedCountries(): void
    {
        $this->command->info('📍 Seeding countries...');
        foreach ($this->countryMap as $code => $data) {
            Country::updateOrCreate(['code' => $code], ['name' => $data['name']]);
        }
        $this->command->info('   ✓ Countries synced.');
    }

    private function seedPorts(): void
    {
        $this->command->info('🚢 Seeding ports...');
        $portsCreated = 0;
        foreach ($this->countryMap as $code => $data) {
            $country = Country::where('code', $code)->first();
            if (!$country) continue;

            foreach ($data['ports'] as $portName) {
                $port = Port::firstOrCreate(
                    ['name' => $portName],
                    [
                        'country_id' => $country->id,
                        'lat' => 0.0, 'lng' => 0.0, 'is_origin' => true,
                    ]
                );
                if ($port->country_id !== $country->id) {
                    $port->update(['country_id' => $country->id]);
                }
                $portsCreated++;
            }
        }
        $this->command->info("   ✓ {$portsCreated} ports synced.");
    }

    private function importFreightRates(): void
    {
        $csvPath = database_path('seeders/csv/shipping_prices.csv');

        if (!file_exists($csvPath)) {
            $this->command->warn("⚠️  CSV file not found at: {$csvPath}");
            return;
        }

        $this->command->info('💰 Importing freight rates (Delimiter: ;) ...');

        // Buka file
        $file = fopen($csvPath, 'r');
        
        // --- FIX: Gunakan delimiter ';' (Titik Koma) ---
        $headers = fgetcsv($file, 0, ';'); 

        // Fix BOM
        if ($headers && isset($headers[0])) {
            $headers[0] = preg_replace('/[\x{FEFF}]/u', '', $headers[0]);
        }
        
        $this->command->info('   🔎 Detected Headers: ' . implode(' | ', $headers));

        // Normalize headers
        $headers = array_map(fn($h) => trim(strtolower($h)), $headers);
        $headerCount = count($headers);

        $lastDeparture = null;
        $rowNumber = 1;
        $importedCount = 0;
        $skippedCount = 0;

        // --- FIX: Gunakan delimiter ';' di dalam loop ---
        while (($row = fgetcsv($file, 0, ';')) !== false) {
            $rowNumber++;

            try {
                // Fix Column Mismatch
                $rowCount = count($row);
                if ($rowCount < $headerCount) $row = array_pad($row, $headerCount, null);
                elseif ($rowCount > $headerCount) $row = array_slice($row, 0, $headerCount);
                
                $data = array_combine($headers, $row);

                // Fill Down Logic
                $departure = trim($data['departure'] ?? '');
                if (empty($departure)) $departure = $lastDeparture;
                else $lastDeparture = $departure;

                $destination = trim($data['arrival'] ?? $data['destination'] ?? '');
                
                // Flexible Price Columns
                $lclPrice = $data['1 cbm'] ?? $data['lcl'] ?? null;
                $fclPrice = $data['"20"" container"'] ?? $data['20" container'] ?? $data['20 container'] ?? $data['fcl'] ?? null;

                if (empty($departure) || empty($destination)) {
                    $skippedCount++;
                    continue;
                }

                $originPortName = $this->portMap[$departure] ?? $departure;
                $destPortName = $this->portMap[$destination] ?? $destination;

                $originPort = Port::where('name', $originPortName)->first();
                $destPort = Port::where('name', $destPortName)->first();

                if (!$originPort || !$destPort) {
                    $skippedCount++;
                    continue;
                }

                $lclData = $this->cleanPrice($lclPrice);
                $fclData = $this->cleanPrice($fclPrice);
                $currency = $lclData['currency'] ?? $fclData['currency'] ?? 'USD';

                FreightRate::updateOrInsert(
                    [
                        'origin_port_id' => $originPort->id,
                        'destination_port_id' => $destPort->id,
                        'currency' => $currency,
                    ],
                    [
                        'rate_lcl' => $lclData['amount'],
                        'rate_fcl_20ft' => $fclData['amount'],
                        'lead_time_days' => 7,
                    ]
                );

                $importedCount++;
            } catch (\Exception $e) {
                $this->command->error("   ❌ Error Row {$rowNumber}: " . $e->getMessage());
                $skippedCount++;
            }
        }
        fclose($file);

        $this->command->info("   ✓ Imported: {$importedCount} rates.");
        $this->command->warn("   ⚠️  Skipped: {$skippedCount} rows.");
    }

    private function cleanPrice(?string $priceString): array
    {
        if (empty($priceString)) return ['amount' => null, 'currency' => 'USD'];
        
        $cleaned = trim($priceString);
        $currency = (str_contains($cleaned, 'Rp') || str_contains($cleaned, 'IDR')) ? 'IDR' : 'USD';
        
        $cleaned = str_replace(['Rp', 'IDR', 'USD', '$', ' '], '', $cleaned);
        // Hapus titik ribuan (karena format Indonesia 3.250.000) atau koma ribuan
        // Asumsi CSV pakai format ID/EU dimana ribuan bisa jadi titik atau tidak ada
        // Kita hapus semua non-numeric kecuali koma desimal atau titik desimal
        // Cara paling aman untuk format campuran: Hapus semua simbol selain angka.
        // Jika aslinya '3,250,000' (US) -> jadi 3250000
        // Jika aslinya '3.250.000' (ID) -> jadi 3250000
        
        // Hapus titik dan koma (Kita asumsikan tidak ada desimal sen untuk penyederhanaan, atau kita anggap angka bulat)
        // Kalau mau presisi desimal:
        // Cek apakah ada koma di akhir? (10,50) -> replace koma jadi titik
        // Tapi untuk freight rate biasanya bulat. Kita bersihkan agresif saja.
        $cleaned = preg_replace('/[^0-9]/', '', $cleaned);
        
        $amount = floatval($cleaned);
        if ($amount > 1000000) $currency = 'IDR';

        return ['amount' => $amount > 0 ? $amount : null, 'currency' => $currency];
    }
}