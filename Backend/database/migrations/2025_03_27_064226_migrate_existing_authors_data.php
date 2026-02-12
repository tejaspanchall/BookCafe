<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use App\Models\Book;
use App\Models\Author;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Only run if there is an author column and old_author column
        if (Schema::hasColumn('books', 'author') && Schema::hasColumn('books', 'old_author')) {
            // Backup existing author data
            DB::statement('UPDATE books SET old_author = author');

            // Migrate existing authors data to the new authors table
            $books = DB::table('books')->get();

            foreach ($books as $book) {
                if (!empty($book->author)) {
                    // Check if the author already exists
                    $author = DB::table('authors')->where('name', $book->author)->first();
                    
                    if (!$author) {
                        // Create a new author
                        $authorId = DB::table('authors')->insertGetId([
                            'name' => $book->author,
                            'created_at' => now(),
                            'updated_at' => now()
                        ]);
                    } else {
                        $authorId = $author->id;
                    }
                    
                    // Link the author to the book
                    if (!DB::table('book_authors')->where('book_id', $book->id)->where('author_id', $authorId)->exists()) {
                        DB::table('book_authors')->insert([
                            'book_id' => $book->id,
                            'author_id' => $authorId
                        ]);
                    }
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Only run if there is an author column and old_author column
        if (Schema::hasColumn('books', 'author') && Schema::hasColumn('books', 'old_author')) {
            // Restore author data from backup
            DB::statement('UPDATE books SET author = old_author WHERE old_author IS NOT NULL');
            
            // Clean up
            DB::table('book_authors')->truncate();
        }
    }
};
