<?php

namespace App\Console\Commands;

use App\Models\Category;
use App\Models\Brand;
use App\Models\Product;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class BackfillSlugs extends Command
{
    protected $signature   = 'app:backfill-slugs {--dry-run : Show what would change without saving}';
    protected $description = 'Backfill slugs for categories, brands, and products that have no slug set';

    public function handle(): int
    {
        $dryRun = $this->option('dry-run');

        if ($dryRun) {
            $this->warn('DRY RUN — no changes will be saved.');
        }

        $this->backfillModel(Category::class, 'category');
        $this->backfillModel(Brand::class, 'brand');
        $this->backfillModel(Product::class, 'product');

        $this->info('Slug backfill complete.');

        return self::SUCCESS;
    }

    private function backfillModel(string $modelClass, string $label): void
    {
        $dryRun = $this->option('dry-run');
        $total  = 0;

        $modelClass::whereNull('slug')->orWhere('slug', '')->chunkById(100, function ($records) use ($modelClass, $label, $dryRun, &$total) {
            foreach ($records as $record) {
                $slug = $this->uniqueSlug($modelClass, $record->name, $record->id);

                $this->line("[{$label}] {$record->id}: \"{$record->name}\" → \"{$slug}\"");

                if (! $dryRun) {
                    $record->update(['slug' => $slug]);
                }

                $total++;
            }
        });

        $this->info("  → {$total} {$label}(s) processed.");
    }

    private function uniqueSlug(string $modelClass, string $name, int $excludeId): string
    {
        $base  = Str::slug($name);
        $slug  = $base;
        $counter = 1;

        while (
            $modelClass::where('slug', $slug)
                ->where('id', '!=', $excludeId)
                ->exists()
        ) {
            $slug = $base . '-' . $counter++;
        }

        return $slug;
    }
}
