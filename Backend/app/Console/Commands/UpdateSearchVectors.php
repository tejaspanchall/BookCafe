<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use App\Models\Book;

class UpdateSearchVectors extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'search:update-vectors';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Update the full-text search vectors for all books';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Updating search vectors for all books...');

        // Update books with title, ISBN, and author names with proper weights
        DB::statement('
            UPDATE books b
            SET search_vector = (
                SELECT 
                    setweight(to_tsvector(\'english\', COALESCE(b.title, \'\')), \'A\') ||
                    setweight(to_tsvector(\'english\', COALESCE(b.isbn, \'\')), \'B\') ||
                    setweight(to_tsvector(\'english\', COALESCE(string_agg(a.name, \' \'), \'\')), \'C\')
                FROM book_authors ba
                JOIN authors a ON a.id = ba.author_id
                WHERE ba.book_id = b.id
                GROUP BY b.id
            )
            WHERE EXISTS (
                SELECT 1 FROM book_authors ba WHERE ba.book_id = b.id
            )
        ');

        // Update books without authors (only title and ISBN)
        DB::statement('
            UPDATE books b
            SET search_vector = 
                setweight(to_tsvector(\'english\', COALESCE(b.title, \'\')), \'A\') ||
                setweight(to_tsvector(\'english\', COALESCE(b.isbn, \'\')), \'B\')
            WHERE NOT EXISTS (
                SELECT 1 FROM book_authors ba WHERE ba.book_id = b.id
            )
        ');

        $this->info('Search vectors updated successfully!');
        $this->info('Books with updated vectors: ' . DB::table('books')->count());
    }
} 