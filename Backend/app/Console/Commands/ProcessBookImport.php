<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\IOFactory;
use App\Models\Book;
use App\Models\Author;
use App\Models\Category;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class ProcessBookImport extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'books:import-excel {file? : The name of the Excel file in storage/app/public/excel_imports} {user_id? : The ID of the user creating the books}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Process a book import from an Excel file for debugging purposes';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        // Get the file name from the argument or list available files
        $fileName = $this->argument('file');
        
        if (!$fileName) {
            $files = Storage::disk('public')->files('excel_imports');
            if (empty($files)) {
                $this->error('No Excel files found in storage/app/public/excel_imports');
                return 1;
            }
            
            $fileChoices = [];
            foreach ($files as $index => $file) {
                $fileChoices[$index] = basename($file);
            }
            
            $selectedIndex = $this->choice(
                'Select an Excel file to import:',
                $fileChoices,
                0
            );
            
            $fileName = $fileChoices[$selectedIndex];
        }
        
        $filePath = 'excel_imports/' . $fileName;
        
        if (!Storage::disk('public')->exists($filePath)) {
            $this->error("File not found: $filePath");
            return 1;
        }
        
        $this->info("Processing file: $filePath");
        $file = Storage::disk('public')->path($filePath);
        
        try {
            $spreadsheet = IOFactory::load($file);
            // Get the first sheet directly
            $worksheet = $spreadsheet->getSheet(0);
            $rows = $worksheet->toArray();
            $this->info('Excel file loaded successfully. Total rows: ' . count($rows));
            Log::info('Excel file loaded successfully. Total rows: ' . count($rows));
            
            // Remove header row
            $header = array_shift($rows);
            $this->info('Header row: ' . json_encode($header));
            
            // Validate header row
            $requiredColumns = ['title', 'isbn', 'authors'];
            $headerMap = [];
            
            foreach ($requiredColumns as $column) {
                $index = array_search(strtolower($column), array_map('strtolower', $header));
                if ($index === false) {
                    $this->error("Required column '$column' not found in Excel file");
                    return 1;
                }
                $headerMap[$column] = $index;
            }
            
            // Map optional columns
            $optionalColumns = ['description', 'categories', 'price', 'image_url'];
            foreach ($optionalColumns as $column) {
                $index = array_search(strtolower($column), array_map('strtolower', $header));
                if ($index !== false) {
                    $headerMap[$column] = $index;
                }
            }
            
            $results = [
                'success' => 0,
                'failed' => 0,
                'errors' => [],
                'duplicates' => 0,
                'book_ids' => []
            ];
            
            $this->info('Starting import process...');
            $this->output->progressStart(count($rows));
            
            DB::beginTransaction();
            $this->info('Database transaction started');
            
            try {
                foreach ($rows as $rowIndex => $row) {
                    $rowNum = $rowIndex + 2; // +2 because we removed header and Excel is 1-indexed
                    
                    // Skip empty rows
                    if (empty($row[$headerMap['title']]) && empty($row[$headerMap['isbn']])) {
                        $this->output->progressAdvance();
                        continue;
                    }
                    
                    // Validate required fields
                    if (empty($row[$headerMap['title']])) {
                        $results['failed']++;
                        $results['errors'][] = "Row $rowNum: Title is required";
                        $this->output->progressAdvance();
                        continue;
                    }
                    
                    if (empty($row[$headerMap['isbn']])) {
                        $results['failed']++;
                        $results['errors'][] = "Row $rowNum: ISBN is required";
                        $this->output->progressAdvance();
                        continue;
                    }
                    
                    if (empty($row[$headerMap['authors']])) {
                        $results['failed']++;
                        $results['errors'][] = "Row $rowNum: Authors are required";
                        $this->output->progressAdvance();
                        continue;
                    }
                    
                    // Check for duplicate ISBN
                    $existingBook = Book::where('isbn', $row[$headerMap['isbn']])->first();
                    if ($existingBook) {
                        $results['duplicates']++;
                        $this->output->progressAdvance();
                        continue;
                    }
                    
                    try {
                        // Create book with minimal data for debugging
                        $book = new Book();
                        $book->title = $row[$headerMap['title']];
                        $book->isbn = $row[$headerMap['isbn']];
                        $book->description = isset($headerMap['description']) && isset($row[$headerMap['description']]) 
                            ? $row[$headerMap['description']] 
                            : "";
                        $book->price = isset($headerMap['price']) && !empty($row[$headerMap['price']])
                            ? $row[$headerMap['price']]
                            : null;
                        $book->image = isset($headerMap['image_url']) && !empty($row[$headerMap['image_url']])
                            ? $row[$headerMap['image_url']]
                            : null;
                        $book->created_at = now();
                        $book->created_by = $this->argument('user_id') ?? 1; // Default to first user if not specified
                        
                        // Temporarily disable trigger to avoid search_vector issues
                        try {
                            DB::statement('ALTER TABLE books DISABLE TRIGGER books_search_vector_update');
                        } catch (\Exception $triggerEx) {
                            $this->warn("Could not disable trigger: " . $triggerEx->getMessage());
                        }
                        
                        $saveResult = $book->save();
                        
                        // Re-enable trigger
                        try {
                            DB::statement('ALTER TABLE books ENABLE TRIGGER books_search_vector_update');
                        } catch (\Exception $triggerEx) {
                            $this->warn("Could not re-enable trigger: " . $triggerEx->getMessage());
                        }
                        
                        if (!$saveResult) {
                            $this->error("Failed to save book with Eloquent, trying direct DB insertion");
                            
                            // Fallback method: direct database insertion
                            $bookId = DB::table('books')->insertGetId([
                                'title' => $book->title,
                                'isbn' => $book->isbn,
                                'description' => $book->description,
                                'price' => $book->price,
                                'image' => $book->image,
                                'created_at' => now()
                            ]);
                            
                            if ($bookId) {
                                $book->id = $bookId;
                            } else {
                                throw new \Exception("Failed to insert book");
                            }
                        }
                        
                        $results['book_ids'][] = $book->id;
                        
                        // Verify book was actually created
                        $verifyBook = Book::find($book->id);
                        if (!$verifyBook) {
                            throw new \Exception("Book verification failed - Could not find book after creation");
                        }
                        
                        // Process authors
                        $authorNames = array_map('trim', explode(',', $row[$headerMap['authors']]));
                        $authorIds = [];
                        
                        foreach ($authorNames as $authorName) {
                            if (!empty($authorName)) {
                                $author = Author::firstOrCreate(['name' => $authorName]);
                                $authorIds[] = $author->id;
                            }
                        }
                        
                        if (!empty($authorIds)) {
                            $book->authors()->sync($authorIds);
                        }
                        
                        // Process categories if present
                        if (isset($headerMap['categories']) && !empty($row[$headerMap['categories']])) {
                            $categoryNames = array_map('trim', explode(',', $row[$headerMap['categories']]));
                            $categoryIds = [];
                            
                            foreach ($categoryNames as $categoryName) {
                                if (!empty($categoryName)) {
                                    $category = Category::firstOrCreate(['name' => $categoryName]);
                                    $categoryIds[] = $category->id;
                                }
                            }
                            
                            if (!empty($categoryIds)) {
                                $book->categories()->sync($categoryIds);
                            }
                        }
                        
                        $results['success']++;
                    } catch (\Exception $rowEx) {
                        $results['failed']++;
                        $results['errors'][] = "Row $rowNum: " . $rowEx->getMessage();
                        $this->error("Error processing row $rowNum: " . $rowEx->getMessage());
                    }
                    
                    $this->output->progressAdvance();
                }
                
                $this->output->progressFinish();
                
                $this->info('All rows processed. Committing transaction...');
                DB::commit();
                
                // Double-check if books were actually created
                if (!empty($results['book_ids'])) {
                    $createdBooks = Book::whereIn('id', $results['book_ids'])->count();
                    $this->info("Verification after commit: Found {$createdBooks} of {$results['success']} books");
                    
                    if ($createdBooks !== $results['success']) {
                        $this->warn("Book count mismatch: Expected {$results['success']} but found {$createdBooks}");
                    }
                }
                
                // Clear caches
                $this->info('Clearing book caches...');
                $this->clearBookCaches();
                
                $this->info("Import complete:");
                $this->info("- Books added: {$results['success']}");
                $this->info("- Failed rows: {$results['failed']}");
                $this->info("- Duplicates skipped: {$results['duplicates']}");
                
                if (!empty($results['errors'])) {
                    $this->warn("Errors encountered:");
                    foreach ($results['errors'] as $error) {
                        $this->warn("  - $error");
                    }
                }
                
                return 0;
            } catch (\Exception $e) {
                $this->error('Error in transaction: ' . $e->getMessage());
                DB::rollBack();
                return 1;
            }
        } catch (\Exception $e) {
            $this->error('Excel import failed: ' . $e->getMessage());
            return 1;
        }
    }
    
    /**
     * Clear all book-related caches
     */
    protected function clearBookCaches()
    {
        try {
            // Clear main book caches
            Cache::forget('books:all');
            Cache::forget('books:library');
            Cache::forget('books:popular');
            
            // Clear other potential cache keys
            $cachesToClear = [
                'books.all',
                'books.recent',
                'books.featured',
                'categories.with.books',
                'authors.with.books'
            ];
            
            foreach ($cachesToClear as $cache) {
                Cache::forget($cache);
            }
            
            $this->info('Cache cleared successfully');
        } catch (\Exception $e) {
            $this->warn('Error clearing caches: ' . $e->getMessage());
        }
    }
} 