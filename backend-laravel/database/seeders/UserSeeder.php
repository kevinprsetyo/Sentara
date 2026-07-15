<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $roles = DB::table('roles')->get()->keyBy('name');

        $users = [
            ['name' => 'Admin User', 'email' => 'admin@logistics.com', 'role' => 'admin'],
            ['name' => 'Ops User', 'email' => 'ops@logistics.com', 'role' => 'ops'],
            ['name' => 'Sales User', 'email' => 'sales@logistics.com', 'role' => 'sales'],
            ['name' => 'Management User', 'email' => 'management@logistics.com', 'role' => 'management'],
        ];

        foreach ($users as $u) {
            $role = $roles->get($u['role']);

            DB::table('users')->insert([
                'name' => $u['name'],
                'email' => $u['email'],
                'password' => Hash::make('password'),
                'role_id' => $role ? $role->id : null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}
