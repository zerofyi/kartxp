<?php

namespace Database\Seeders;

use App\Models\TaxCategory;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class TaxCategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $slabs = [0, 5, 12, 18, 28];

        foreach ($slabs as $percent) {

            // Exclusive
            TaxCategory::create([
                'name' => "GST {$percent}% (Exclusive)",
                'tax_percent' => $percent,
                'type' => 'exclusive',
            ]);

            // Inclusive
            TaxCategory::create([
                'name' => "GST {$percent}% (Inclusive)",
                'tax_percent' => $percent,
                'type' => 'inclusive',
            ]);
        }
    }
}
