<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('authors')) {
            Schema::create('authors', function (Blueprint $table) {
                $table->id();
                $table->string('name', 100);
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('book_authors')) {
            Schema::create('book_authors', function (Blueprint $table) {
                $table->unsignedBigInteger('book_id');
                $table->unsignedBigInteger('author_id');
                
                $table->primary(['book_id', 'author_id']);
                
                $table->foreign('book_id')->references('id')->on('books')->onDelete('cascade');
                $table->foreign('author_id')->references('id')->on('authors')->onDelete('cascade');
            });
        }

        // Add old_author column if it doesn't exist
        if (!Schema::hasColumn('books', 'old_author')) {
            Schema::table('books', function (Blueprint $table) {
                $table->text('old_author')->nullable();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('books', 'old_author')) {
            Schema::table('books', function (Blueprint $table) {
                $table->dropColumn('old_author');
            });
        }
        
        Schema::dropIfExists('book_authors');
        Schema::dropIfExists('authors');
    }
};
