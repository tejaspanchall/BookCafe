<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class AddFullTextSearchToBooks extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        // Add tsvector column for full-text search using raw SQL
        DB::statement('ALTER TABLE books ADD COLUMN search_vector TSVECTOR');

        // Create indexes for the tsvector column
        DB::statement('CREATE INDEX books_search_idx ON books USING GIN(search_vector)');

        // Create a trigger to automatically update the search_vector when a book is updated
        // Include title, ISBN, and author names
        DB::statement('
            CREATE OR REPLACE FUNCTION books_search_vector_update() RETURNS trigger AS $$
            DECLARE
                author_names text;
            BEGIN
                -- Get author names for the book
                SELECT string_agg(a.name, \' \')
                INTO author_names
                FROM book_authors ba
                JOIN authors a ON a.id = ba.author_id
                WHERE ba.book_id = NEW.id;

                -- Update search vector with title, ISBN, and author names
                NEW.search_vector := 
                    setweight(to_tsvector(\'english\', COALESCE(NEW.title, \'\')), \'A\') ||
                    setweight(to_tsvector(\'english\', COALESCE(NEW.isbn, \'\')), \'B\') ||
                    setweight(to_tsvector(\'english\', COALESCE(author_names, \'\')), \'C\');
                
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        ');

        DB::statement('
            CREATE TRIGGER books_search_vector_update
            BEFORE INSERT OR UPDATE ON books
            FOR EACH ROW
            EXECUTE FUNCTION books_search_vector_update();
        ');

        // Update existing books with title, ISBN, and author names in search vector
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
        ');
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        // Drop the trigger
        DB::statement('DROP TRIGGER IF EXISTS books_search_vector_update ON books');
        
        // Drop the indexes
        DB::statement('DROP INDEX IF EXISTS books_search_idx');
        
        // Drop the column
        DB::statement('ALTER TABLE books DROP COLUMN IF EXISTS search_vector');
    }
} 