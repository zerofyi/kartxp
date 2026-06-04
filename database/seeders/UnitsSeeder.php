<?php

namespace Database\Seeders;

use App\Models\Unit;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class UnitsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Base Units
        $piece = Unit::create([
            'name' => 'Piece',
            'symbol' => 'pc',
            'multiplier' => 1
        ]);

        $kg = Unit::create([
            'name' => 'Kilogram',
            'symbol' => 'kg',
            'multiplier' => 1
        ]);

        $liter = Unit::create([
            'name' => 'Liter',
            'symbol' => 'l',
            'multiplier' => 1
        ]);

        $meter = Unit::create([
            'name' => 'Meter',
            'symbol' => 'm',
            'multiplier' => 1
        ]);

        // Derived Units

        // Weight
        Unit::create([
            'name' => 'Gram',
            'symbol' => 'g',
            'base_unit_id' => $kg->id,
            'multiplier' => 0.001
        ]);

        Unit::create([
            'name' => 'Milligram',
            'symbol' => 'mg',
            'base_unit_id' => $kg->id,
            'multiplier' => 0.000001
        ]);

        Unit::create([
            'name' => 'Quintal',
            'symbol' => 'qtl',
            'base_unit_id' => $kg->id,
            'multiplier' => 100
        ]);

        // Liquid
        Unit::create([
            'name' => 'Milliliter',
            'symbol' => 'ml',
            'base_unit_id' => $liter->id,
            'multiplier' => 0.001
        ]);

        // Quantity
        Unit::create([
            'name' => 'Dozen',
            'symbol' => 'dz',
            'base_unit_id' => $piece->id,
            'multiplier' => 12
        ]);

        Unit::create([
            'name' => 'Pack',
            'symbol' => 'pack',
            'base_unit_id' => $piece->id,
            'multiplier' => 1
        ]);

        Unit::create([
            'name' => 'Box',
            'symbol' => 'box',
            'base_unit_id' => $piece->id,
            'multiplier' => 1
        ]);

        Unit::create([
            'name' => 'Carton',
            'symbol' => 'ctn',
            'base_unit_id' => $piece->id,
            'multiplier' => 1
        ]);
    }
}
