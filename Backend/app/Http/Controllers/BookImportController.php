<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Book;
use App\Models\Author;
use App\Models\Category;
use App\Models\ExcelImport;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Cache;
use App\Traits\RedisCacheTrait;

class BookImportController extends Controller
{
    use RedisCacheTrait;
    
    /**
     * Cache duration in seconds (24 hours)
     */
    const CACHE_DURATION = 86400;

    /**
     * Upload Excel file
     */
    public function uploadExcel(Request $request)
    {
        if (Auth::user()->role !== 'teacher') {
            return response()->json(['error' => 'Unauthorized. Teachers only.'], Response::HTTP_FORBIDDEN);
        }

        $request->validate([
            'excel_file' => 'required|file|mimes:xlsx,xls,csv|max:10240',
        ]);

        try {
            $file = $request->file('excel_file');
            $filename = time() . '_' . $file->getClientOriginalName();
            $path = $file->storeAs('excel_imports', $filename, 'public');

            // Store file information in database
            $excelImport = ExcelImport::create([
                'teacher_id' => Auth::id(),
                'file_id' => $filename,
                'original_name' => $file->getClientOriginalName()
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Excel file uploaded successfully',
                'file_id' => $filename,
                'original_name' => $file->getClientOriginalName(),
                'uploaded_at' => now()->toDateTimeString(),
            ], Response::HTTP_CREATED);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to upload Excel file',
                'error' => $e->getMessage()
            ], Response::HTTP_BAD_REQUEST);
        }
    }

    /**
     * Get all uploaded Excel files
     */
    public function getExcelFiles()
    {
        if (Auth::user()->role !== 'teacher') {
            return response()->json(['error' => 'Unauthorized. Teachers only.'], Response::HTTP_FORBIDDEN);
        }

        try {
            $files = ExcelImport::where('teacher_id', Auth::id())
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($file) {
                    return [
                        'file_id' => $file->file_id,
                        'original_name' => $file->original_name,
                        'uploaded_at' => $file->created_at->toDateTimeString(),
                    ];
                });

            return response()->json([
                'status' => 'success',
                'files' => $files
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to retrieve Excel files',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Delete Excel file
     */
    public function deleteExcelFile($fileId)
    {
        if (Auth::user()->role !== 'teacher') {
            return response()->json(['error' => 'Unauthorized. Teachers only.'], Response::HTTP_FORBIDDEN);
        }

        try {
            $excelImport = ExcelImport::where('file_id', $fileId)
                ->where('teacher_id', Auth::id())
                ->first();

            if (!$excelImport) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'File not found or unauthorized'
                ], Response::HTTP_NOT_FOUND);
            }

            $filePath = 'excel_imports/' . $fileId;
            
            if (Storage::disk('public')->exists($filePath)) {
                Storage::disk('public')->delete($filePath);
            }

            $excelImport->delete();

            return response()->json([
                'status' => 'success',
                'message' => 'Excel file deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to delete Excel file',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Import books from Excel file
     */
    public function importBooks($fileId)
    {
        \Log::info('ImportBooks method called with fileId: ' . $fileId);
        
        if (Auth::user()->role !== 'teacher') {
            \Log::warning('Unauthorized attempt to import books - user is not a teacher');
            return response()->json(['error' => 'Unauthorized. Teachers only.'], Response::HTTP_FORBIDDEN);
        }

        // Verify file ownership
        $excelImport = ExcelImport::where('file_id', $fileId)
            ->where('teacher_id', Auth::id())
            ->first();

        if (!$excelImport) {
            return response()->json([
                'status' => 'error',
                'message' => 'File not found or unauthorized'
            ], Response::HTTP_NOT_FOUND);
        }

        // Check database connection before proceeding
        if (!$this->checkDatabaseConnection()) {
            \Log::error('Database connection check failed');
            return response()->json([
                'status' => 'error',
                'message' => 'Database connection error. Please try again later.'
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        $filePath = 'excel_imports/' . $fileId;
        \Log::info('Looking for file at path: ' . $filePath);
        
        if (!Storage::disk('public')->exists($filePath)) {
            \Log::error('File not found: ' . $filePath);
            return response()->json([
                'status' => 'error',
                'message' => 'File not found'
            ], Response::HTTP_NOT_FOUND);
        }

        $file = Storage::disk('public')->path($filePath);
        \Log::info('Full file path: ' . $file);
        \Log::info('Starting Excel import process for file: ' . $filePath);

        try {
            $spreadsheet = IOFactory::load($file);
            // Get the first sheet directly
            $worksheet = $spreadsheet->getSheet(0);
            $rows = $worksheet->toArray();
            \Log::info('Excel file loaded successfully. Total rows: ' . count($rows));
            
            // Remove header row
            $header = array_shift($rows);
            \Log::info('Header row: ' . json_encode($header));
            
            // Validate header row
            $requiredColumns = ['title', 'isbn', 'authors'];
            $headerMap = [];
            
            foreach ($requiredColumns as $column) {
                $index = array_search(strtolower($column), array_map('strtolower', $header));
                if ($index === false) {
                    \Log::error("Required column '$column' not found in Excel file");
                    return response()->json([
                        'status' => 'error',
                        'message' => "Required column '$column' not found in Excel file"
                    ], Response::HTTP_BAD_REQUEST);
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
            \Log::info('Header mapping: ' . json_encode($headerMap));
            
            $results = [
                'success' => 0,
                'failed' => 0,
                'errors' => [],
                'duplicates' => 0,
                'duplicate_details' => [],
                'book_ids' => [] // Add an array to track created book IDs for verification
            ];

            DB::beginTransaction();
            \Log::info('Database transaction started');
            
            try {
                foreach ($rows as $rowIndex => $row) {
                    $rowNum = $rowIndex + 2; // +2 because we removed header and Excel is 1-indexed
                    \Log::info("Processing row $rowNum: " . json_encode($row));
                    
                    // Skip empty rows
                    if (empty($row[$headerMap['title']]) && empty($row[$headerMap['isbn']])) {
                        \Log::info("Row $rowNum: Skipping empty row");
                        continue;
                    }
                    
                    // Validate required fields
                    if (empty($row[$headerMap['title']])) {
                        $results['failed']++;
                        $results['errors'][] = "Row $rowNum: Title is required";
                        \Log::warning("Row $rowNum: Title is required");
                        continue;
                    }
                    
                    if (empty($row[$headerMap['isbn']])) {
                        $results['failed']++;
                        $results['errors'][] = "Row $rowNum: ISBN is required";
                        \Log::warning("Row $rowNum: ISBN is required");
                        continue;
                    }
                    
                    if (empty($row[$headerMap['authors']])) {
                        $results['failed']++;
                        $results['errors'][] = "Row $rowNum: Authors are required";
                        \Log::warning("Row $rowNum: Authors are required");
                        continue;
                    }
                    
                    // Check for duplicate ISBN
                    $existingBook = Book::where('isbn', $row[$headerMap['isbn']])->first();
                    if ($existingBook) {
                        $results['duplicates']++;
                        $results['duplicate_details'][] = [
                            'row' => $rowNum,
                            'isbn' => $row[$headerMap['isbn']],
                            'title' => $row[$headerMap['title']],
                            'existing_title' => $existingBook->title
                        ];
                        \Log::warning("Row $rowNum: Duplicate ISBN " . $row[$headerMap['isbn']]);
                        continue;
                    }
                    
                    try {
                        // Create book
                        $book = new Book();
                        $book->title = $row[$headerMap['title']];
                        $book->isbn = $row[$headerMap['isbn']];
                        \Log::info("Row $rowNum: Creating book with title: " . $book->title . " and ISBN: " . $book->isbn);
                        
                        if (isset($headerMap['description']) && isset($row[$headerMap['description']])) {
                            $book->description = $row[$headerMap['description']];
                        } else {
                            $book->description = ""; // Set default empty description
                        }
                        
                        if (isset($headerMap['price']) && !empty($row[$headerMap['price']])) {
                            $book->price = $row[$headerMap['price']];
                        } else {
                            $book->price = null; // Set default null price
                        }
                        
                        // Handle image URL if present
                        if (isset($headerMap['image_url']) && !empty($row[$headerMap['image_url']])) {
                            $imageUrl = trim($row[$headerMap['image_url']]);
                            if (filter_var($imageUrl, FILTER_VALIDATE_URL)) {
                                $book->image = $imageUrl;
                            } else {
                                $results['errors'][] = "Row $rowNum: Invalid image URL - " . $imageUrl;
                                \Log::warning("Row $rowNum: Invalid image URL - " . $imageUrl);
                            }
                        } else {
                            $book->image = null; // Set default null image
                        }
                        
                        // Set the created_at timestamp and created_by to current user
                        $book->created_at = now();
                        $book->created_by = Auth::id();
                        $book->is_live = false; // Set imported books to not live by default
                        \Log::info("Row $rowNum: About to save book");
                        
                        // Temporarily disable trigger to avoid search_vector issues
                        try {
                            DB::statement('ALTER TABLE books DISABLE TRIGGER books_search_vector_update');
                            \Log::info("Row $rowNum: Disabled search_vector trigger");
                        } catch (\Exception $triggerEx) {
                            \Log::warning("Row $rowNum: Could not disable trigger: " . $triggerEx->getMessage());
                        }
                        
                        $saveResult = $book->save();
                        \Log::info("Row $rowNum: Book save result: " . ($saveResult ? 'Success' : 'Failed'));
                        
                        // Re-enable trigger
                        try {
                            DB::statement('ALTER TABLE books ENABLE TRIGGER books_search_vector_update');
                            \Log::info("Row $rowNum: Re-enabled search_vector trigger");
                        } catch (\Exception $triggerEx) {
                            \Log::warning("Row $rowNum: Could not re-enable trigger: " . $triggerEx->getMessage());
                        }
                        
                        if (!$saveResult) {
                            \Log::error("Row $rowNum: Failed to save book with Eloquent, trying direct DB insertion");
                            
                            // Fallback method: direct database insertion
                            try {
                                $bookId = DB::table('books')->insertGetId([
                                    'title' => $book->title,
                                    'isbn' => $book->isbn,
                                    'description' => $book->description,
                                    'price' => $book->price,
                                    'image' => $book->image,
                                    'created_at' => now(),
                                    'is_live' => false // Set imported books to not live by default
                                ]);
                                
                                if ($bookId) {
                                    \Log::info("Row $rowNum: Book successfully inserted via direct DB with ID: $bookId");
                                    $book->id = $bookId;
                                } else {
                                    \Log::error("Row $rowNum: Direct DB insertion also failed");
                                    throw new \Exception("Failed to insert book");
                                }
                            } catch (\Exception $dbEx) {
                                \Log::error("Row $rowNum: DB insertion exception: " . $dbEx->getMessage());
                                throw $dbEx;
                            }
                        }
                        
                        // Store the created book ID for verification
                        $results['book_ids'][] = $book->id;
                        
                        // Verify book was actually created
                        $verifyBook = Book::find($book->id);
                        if (!$verifyBook) {
                            \Log::error("Row $rowNum: Book verification failed - Book with ID {$book->id} not found after save");
                            throw new \Exception("Book verification failed - Could not find book after creation");
                        }
                        \Log::info("Row $rowNum: Book verification successful - Book with ID {$book->id} found");
                        
                        // Process authors
                        $authorNames = array_map('trim', explode(',', $row[$headerMap['authors']]));
                        \Log::info("Row $rowNum: Processing authors: " . json_encode($authorNames));
                        
                        $authorIds = [];
                        foreach ($authorNames as $authorName) {
                            if (!empty($authorName)) {
                                $author = Author::firstOrCreate(['name' => $authorName]);
                                \Log::info("Row $rowNum: Found/Created author: " . $authorName . " (ID: " . $author->id . ")");
                                $authorIds[] = $author->id;
                            }
                        }
                        
                        if (!empty($authorIds)) {
                            \Log::info("Row $rowNum: Attaching authors: " . implode(', ', $authorIds));
                            $book->authors()->sync($authorIds);
                            
                            // Verify author relationships
                            $attachedAuthors = $book->authors()->pluck('id')->toArray();
                            \Log::info("Row $rowNum: Verified attached authors: " . implode(', ', $attachedAuthors));
                            
                            if (count($attachedAuthors) !== count($authorIds)) {
                                \Log::warning("Row $rowNum: Author attachment verification failed - Expected: " . 
                                    implode(', ', $authorIds) . " but got: " . implode(', ', $attachedAuthors));
                            }
                        }
                        
                        // Process categories if present
                        if (isset($headerMap['categories']) && !empty($row[$headerMap['categories']])) {
                            $categoryNames = array_map('trim', explode(',', $row[$headerMap['categories']]));
                            \Log::info("Row $rowNum: Processing categories: " . json_encode($categoryNames));
                            
                            $categoryIds = [];
                            foreach ($categoryNames as $categoryName) {
                                if (!empty($categoryName)) {
                                    $category = Category::firstOrCreate(['name' => $categoryName]);
                                    \Log::info("Row $rowNum: Found/Created category: " . $categoryName . " (ID: " . $category->id . ")");
                                    $categoryIds[] = $category->id;
                                }
                            }
                            
                            if (!empty($categoryIds)) {
                                \Log::info("Row $rowNum: Attaching categories: " . implode(', ', $categoryIds));
                                $book->categories()->sync($categoryIds);
                                
                                // Verify category relationships
                                $attachedCategories = $book->categories()->pluck('id')->toArray();
                                \Log::info("Row $rowNum: Verified attached categories: " . implode(', ', $attachedCategories));
                                
                                if (count($attachedCategories) !== count($categoryIds)) {
                                    \Log::warning("Row $rowNum: Category attachment verification failed - Expected: " . 
                                        implode(', ', $categoryIds) . " but got: " . implode(', ', $attachedCategories));
                                }
                            }
                        }
                        
                        $results['success']++;
                        \Log::info("Row $rowNum: Successfully processed");
                    } catch (\Exception $rowEx) {
                        \Log::error("Row $rowNum: Exception while processing row: " . $rowEx->getMessage());
                        $results['failed']++;
                        $results['errors'][] = "Row $rowNum: " . $rowEx->getMessage();
                    }
                }
                
                \Log::info('All rows processed. Committing transaction');
                DB::commit();
                
                // Double-check if books were actually created
                if (!empty($results['book_ids'])) {
                    $createdBooks = Book::whereIn('id', $results['book_ids'])->count();
                    \Log::info("Verification after commit: Found {$createdBooks} of {$results['success']} books");
                    
                    if ($createdBooks !== $results['success']) {
                        \Log::warning("Book count mismatch: Expected {$results['success']} but found {$createdBooks}");
                    }
                }
                
                // Refresh book caches to ensure imported books appear in catalog
                \Log::info('Refreshing book caches');
                $this->refreshBookCaches();
                
                return response()->json([
                    'status' => 'success',
                    'message' => 'Books imported successfully',
                    'results' => $results
                ]);
            } catch (\Exception $e) {
                \Log::error('Error in transaction: ' . $e->getMessage());
                DB::rollBack();
                throw $e;
            }
        } catch (\Exception $e) {
            \Log::error('Excel import failed: ' . $e->getMessage() . "\n" . $e->getTraceAsString());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to import books from Excel file',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Download Excel template
     */
    public function downloadTemplate()
    {
        if (Auth::user()->role !== 'teacher') {
            return response()->json(['error' => 'Unauthorized. Teachers only.'], Response::HTTP_FORBIDDEN);
        }
        
        try {
            // Log request for diagnostics
            \Log::info('Template download requested by user: ' . Auth::id());
            
            $templatePath = storage_path('app/templates/book_import_template.xlsx');
            \Log::info('Template path: ' . $templatePath);
            
            // Always generate a fresh template
            $templatesDir = storage_path('app/templates');
            \Log::info('Templates directory: ' . $templatesDir);
            
            // Create directory if it doesn't exist
            if (!file_exists($templatesDir)) {
                \Log::info('Templates directory does not exist, creating it');
                try {
                    if (!mkdir($templatesDir, 0755, true)) {
                        throw new \Exception("Failed to create templates directory: {$templatesDir}");
                    }
                    // Try to set permissions but don't fail if it doesn't work
                    try {
                        chmod($templatesDir, 0755);
                        \Log::info('Templates directory created with 0755 permissions');
                    } catch (\Exception $e) {
                        \Log::warning('Could not set permissions on templates directory: ' . $e->getMessage());
                        // Continue execution, don't rethrow
                    }
                } catch (\Exception $e) {
                    \Log::error('Failed to create templates directory: ' . $e->getMessage());
                    throw new \Exception("Could not create template directory. Please contact administrator.");
                }
            }
            
            // Generate fresh template using Artisan command
            \Log::info('Calling books:create-import-template command');
            $exitCode = \Artisan::call('books:create-import-template');
            
            \Log::info('Artisan command exit code: ' . $exitCode);
            $output = \Artisan::output();
            \Log::info('Artisan command output: ' . $output);
            
            if ($exitCode !== 0) {
                throw new \Exception('Template creation failed. Please contact administrator.');
            }
            
            // Check if file exists after creation
            if (!file_exists($templatePath)) {
                throw new \Exception('Template file could not be created. Please contact administrator.');
            }
            
            \Log::info('Template file exists, size: ' . filesize($templatePath) . ' bytes');
            
            // Try to set file permissions but don't fail if it doesn't work
            try {
                chmod($templatePath, 0644);
                \Log::info('Set template file permissions to 0644');
            } catch (\Exception $e) {
                \Log::warning('Could not set permissions on template file: ' . $e->getMessage());
                // Continue execution, don't rethrow
            }
            
            // Return the file as a download with cache prevention headers
            \Log::info('Returning file download response');
            
            // Create the response first
            $response = response()->download($templatePath, 'book_import_template.xlsx');
            
            // Add headers to the response
            $response->headers->set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
            $response->headers->set('Pragma', 'no-cache');
            $response->headers->set('Expires', 'Sat, 01 Jan 2000 00:00:00 GMT');
            
            return $response;
                
        } catch (\Exception $e) {
            \Log::error('Template download failed: ' . $e->getMessage());
            \Log::error('Exception trace: ' . $e->getTraceAsString());
            
            $errorMessage = $e->getMessage();
            // Provide a user-friendly message for permission errors
            if (strpos($errorMessage, 'Permission denied') !== false || 
                strpos($errorMessage, 'Operation not permitted') !== false) {
                $errorMessage = 'Server permission error. Please contact your administrator.';
            }
            
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to create template: ' . $errorMessage
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Refresh book caches to make imported books visible in the catalog
     */
    protected function refreshBookCaches()
    {
        try {
            \Log::info('Starting cache refresh...');
            
            // Clear main book caches
            Cache::forget('books:all');
            Cache::forget('books:library');
            Cache::forget('books:popular');
            \Log::info('Cleared main book caches');
            
            // Clear search caches
            $this->invalidateBookCache('books:search:*');
            \Log::info('Cleared search caches');
            
            // Clear individual book caches
            $this->invalidateBookCache('book:*');
            \Log::info('Cleared individual book caches');
            
            // Clear category-related book caches
            $this->invalidateBookCache('category:*:books');
            \Log::info('Cleared category book caches');
            
            // Clear author-related book caches
            $this->invalidateBookCache('author:*:books');
            \Log::info('Cleared author book caches');
            
            // Clear specific cache keys that might be used in other controllers
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
            \Log::info('Cleared additional specific caches');
            
            \Log::info('Cache refresh completed successfully');
        } catch (\Exception $e) {
            // Log the error but don't fail the import process
            \Log::error('Error refreshing book caches after import: ' . $e->getMessage());
        }
    }

    /**
     * Check if the PostgreSQL database connection is working
     */
    protected function checkDatabaseConnection()
    {
        try {
            \Log::info('Checking database connection...');
            // Perform a simple query to check connection
            $result = DB::select('SELECT 1 as connected');
            $isConnected = !empty($result) && isset($result[0]->connected) && $result[0]->connected == 1;
            \Log::info('Database connection status: ' . ($isConnected ? 'Connected' : 'Failed'));
            return $isConnected;
        } catch (\Exception $e) {
            \Log::error('Database connection check failed: ' . $e->getMessage());
            return false;
        }
    }
} 