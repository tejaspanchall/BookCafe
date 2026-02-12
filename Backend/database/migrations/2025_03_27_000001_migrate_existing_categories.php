<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use App\Models\Book;
use App\Models\Category;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // First, get all unique categories from books
        $categories = DB::table('books')
            ->select('category')
            ->whereNotNull('category')
            ->where('category', '!=', '')
            ->distinct()
            ->pluck('category')
            ->toArray();
        
        // Insert categories into categories table
        foreach ($categories as $categoryName) {
            DB::table('categories')->insert([
                'name' => $categoryName
            ]);
        }
        
        // For each book with a category, add entry to book_categories
        $books = DB::table('books')->whereNotNull('category')->where('category', '!=', '')->get();
        foreach ($books as $book) {
            if (!$book->category) continue;
            
            $category = DB::table('categories')->where('name', $book->category)->first();
            if ($category) {
                DB::table('book_categories')->insert([
                    'book_id' => $book->id,
                    'category_id' => $category->id
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     * This can't be fully reversed, but we'll clean up if needed
     */
    public function down(): void
    {
        // Nothing to do for down - we can't fully restore the old data
    }
}; 