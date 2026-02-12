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
        if (Schema::hasColumn('books', 'author')) {
            Schema::table('books', function (Blueprint $table) {
                $table->dropColumn('author');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasColumn('books', 'author')) {
            Schema::table('books', function (Blueprint $table) {
                $table->string('author', 100)->nullable();
                
                // The data would have to be manually restored from the old_author field
                // or from the authors relationship if needed
            });
        }
    }
};
