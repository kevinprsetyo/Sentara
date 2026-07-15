<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Database\Seeders\RoleSeeder;
use Database\Seeders\UserSeeder;
use Database\Seeders\PortSeeder;
use Database\Seeders\RouteSegmentSeeder;
use Database\Seeders\RateSeeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            RoleSeeder::class,
            UserSeeder::class,
            PortSeeder::class,
            RouteSegmentSeeder::class,
            RateSeeder::class,
        ]);
    }
}
