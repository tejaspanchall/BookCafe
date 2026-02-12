<?php

namespace App\Http\Controllers;

use App\Models\Book;
use App\Models\Category;
use App\Traits\RedisCacheTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;
use App\Models\User;
use App\Models\Author;

class BookController extends Controller
{
    use RedisCacheTrait;
    const CACHE_DURATION = 3600;

    public function add(Request $request)
    {
        if (Auth::user()->role !== 'teacher') {
            return response()->json(['error' => 'Unauthorized. Teachers only.'], Response::HTTP_FORBIDDEN);
        }

        $request->validate([
            'title' => 'required|string|max:255',
            'authors' => 'required|array',
            'authors.*' => 'required|string|max:100',
            'isbn' => 'required|string|max:20|unique:books,isbn',
            'description' => 'nullable|string',
            'categories' => 'nullable|array',
            'categories.*' => 'string|max:50',
            'price' => 'nullable|numeric',
            'image' => 'nullable|image|max:2048'
        ]);

        try {
            $book = new Book();
            $book->title = $request->title;
            $book->isbn = $request->isbn;
            $book->description = $request->description;
            $book->price = $request->price;
            $book->created_at = now();
            $book->created_by = Auth::id();
            $book->is_live = false;

            if ($request->hasFile('image')) {
                $image = $request->file('image');
                $filename = time() . '_' . $image->getClientOriginalName();
                $path = $image->storeAs('books', $filename, 'public');
                $book->image = $filename;
            }

            $book->save();

            // Handle authors
            if ($request->has('authors') && is_array($request->authors)) {
                $this->syncAuthors($book, $request->authors);
            }

            // Handle categories
            if ($request->has('categories') && is_array($request->categories)) {
                $this->syncCategories($book, $request->categories);
            }

            $this->refreshBookCaches();

            return response()->json([
                'status' => 'success',
                'book' => $book->load(['categories', 'authors']),
            ], Response::HTTP_CREATED);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to add book',
                'error' => $e->getMessage()
            ], Response::HTTP_BAD_REQUEST);
        }
    }

    /**
     * Add multiple books at once
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function addMultiple(Request $request)
    {
        if (Auth::user()->role !== 'teacher') {
            return response()->json(['error' => 'Unauthorized. Teachers only.'], Response::HTTP_FORBIDDEN);
        }

        $request->validate([
            'books' => 'required|array|min:1',
            'books.*.title' => 'required|string|max:255',
            'books.*.authors' => 'required|array',
            'books.*.authors.*' => 'required|string|max:100',
            'books.*.isbn' => 'required|string|max:20',
            'books.*.description' => 'nullable|string',
            'books.*.categories' => 'nullable|array',
            'books.*.categories.*' => 'string|max:50',
            'books.*.price' => 'nullable|numeric',
        ]);

        $results = [
            'success' => [],
            'failed' => []
        ];

        \DB::beginTransaction();

        try {
            foreach ($request->books as $index => $bookData) {
                // Check if ISBN already exists
                if (Book::where('isbn', $bookData['isbn'])->exists()) {
                    $results['failed'][] = [
                        'index' => $index,
                        'title' => $bookData['title'],
                        'isbn' => $bookData['isbn'],
                        'error' => 'ISBN already exists'
                    ];
                    continue;
                }
                
                $book = new Book();
                $book->title = $bookData['title'];
                $book->isbn = $bookData['isbn'];
                $book->description = $bookData['description'] ?? null;
                $book->price = $bookData['price'] ?? null;
                $book->created_at = now();
                $book->created_by = Auth::id();
                $book->is_live = false;
                $book->save();

                // Handle authors
                if (isset($bookData['authors']) && is_array($bookData['authors'])) {
                    $this->syncAuthors($book, $bookData['authors']);
                }

                // Handle categories
                if (isset($bookData['categories']) && is_array($bookData['categories'])) {
                    $this->syncCategories($book, $bookData['categories']);
                }

                $results['success'][] = [
                    'index' => $index,
                    'id' => $book->id,
                    'title' => $book->title,
                    'isbn' => $book->isbn
                ];
            }

            \DB::commit();
            $this->refreshBookCaches();

            return response()->json([
                'status' => 'success',
                'message' => count($results['success']) . ' books added successfully',
                'results' => $results
            ], Response::HTTP_CREATED);
        } catch (\Exception $e) {
            \DB::rollBack();
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to add books',
                'error' => $e->getMessage(),
                'results' => $results
            ], Response::HTTP_BAD_REQUEST);
        }
    }

    /**
     * Get all books
     */
    public function getBooks()
    {
        try {
            // Bypass cache and get books directly from the database
            $books = Book::with(['users', 'categories', 'authors'])
                ->where('is_live', true)
                ->orderBy('created_at', 'desc')
                ->get();
            
            $booksWithUrls = $books->map(function($book) {
                $book->image_url = $book->image 
                    ? url('storage/books/' . urlencode($book->image))
                    : "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";
                return $book;
            });
            
            return response()->json([
                'status' => 'success',
                'books' => $booksWithUrls
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to retrieve books',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    public function getLibrary()
    {
        if (Auth::user()->role !== 'teacher') {
            return response()->json(['error' => 'Unauthorized. Teachers only.'], Response::HTTP_FORBIDDEN);
        }

        // Bypass cache and get books directly from the database
        $books = Book::with(['categories', 'authors'])
            ->orderBy('created_at', 'desc')
            ->get();
        
        $booksWithUrls = $books->map(function($book) {
            $book->image_url = $book->image 
                ? url('storage/books/' . urlencode($book->image))
                : "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";
            return $book;
        });

        return response()->json([
            'status' => 'success',
            'books' => $booksWithUrls
        ]);
    }

    public function myLibrary()
    {
        try {
            $userId = Auth::id();
            $books = $this->getCachedBookData("books:user:{$userId}:library", self::CACHE_DURATION, function() {
                return Auth::user()->books()
                    ->with(['users', 'categories', 'authors'])
                    ->orderBy('books.created_at', 'desc')
                    ->get();
            });
            
            $booksWithUrls = $books->map(function($book) {
                $book->image_url = $book->image 
                    ? url('storage/books/' . urlencode($book->image))
                    : "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";
                return $book;
            });

            return response()->json([
                'status' => 'success',
                'books' => $booksWithUrls
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to retrieve books',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get recently added books by the authenticated user
     * 
     * @return \Illuminate\Http\JsonResponse
     */
    public function getRecentBooks()
    {
        try {
            $userId = Auth::id();
            // Directly fetch recent books without caching for immediate updates
            $books = Book::query()
                ->with(['categories', 'authors'])
                ->where('created_by', $userId)
                ->orderBy('created_at', 'desc')
                ->limit(10)
                ->get();
            
            return response()->json([
                'status' => 'success',
                'books' => $books
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to retrieve recent books',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    public function addToLibrary(Book $book)
    {
        try {
            $user = Auth::user();
            
            if (!$user) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'User not authenticated'
                ], Response::HTTP_UNAUTHORIZED);
            }
            
            if ($user->books()->where('book_id', $book->id)->exists()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Book already in library'
                ], Response::HTTP_BAD_REQUEST);
            }

            \DB::beginTransaction();

            try {
                // Add the book to user's library
                $user->books()->attach($book->id);
                
                \DB::commit();
                
                // Move cache refresh outside the transaction to prevent transaction issues
                try {
                    $this->refreshUserLibraryCache($user->id);
                    $this->refreshBookCaches();
                } catch (\Exception $cacheException) {
                    // Log cache errors but don't fail the request
                    \Log::error('Cache refresh error in addToLibrary: ' . $cacheException->getMessage());
                }

                return response()->json([
                    'status' => 'success',
                    'message' => 'Book added to library',
                    'book' => $book
                ]);
            } catch (\Exception $e) {
                \DB::rollBack();
                \Log::error('Database error in addToLibrary: ' . $e->getMessage());
                throw $e;
            }
        } catch (\Exception $e) {
            \Log::error('Error in addToLibrary: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to add book to library',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    public function removeFromLibrary(Book $book)
    {
        try {
            $user = Auth::user();
            
            if (!$user) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'User not authenticated'
                ], Response::HTTP_UNAUTHORIZED);
            }
            
            if (!$user->books()->where('book_id', $book->id)->exists()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Book not in library'
                ], Response::HTTP_BAD_REQUEST);
            }

            \DB::beginTransaction();

            try {
                // Remove the book from the user's library
                $user->books()->detach($book->id);
                
                \DB::commit();
                
                // Move cache refresh outside the transaction to prevent transaction issues
                try {
                    $this->refreshUserLibraryCache($user->id);
                    $this->refreshBookCaches();
                } catch (\Exception $cacheException) {
                    // Log cache errors but don't fail the request
                    \Log::error('Cache refresh error in removeFromLibrary: ' . $cacheException->getMessage());
                }

                return response()->json([
                    'status' => 'success',
                    'message' => 'Book removed from library'
                ]);
            } catch (\Exception $e) {
                \DB::rollBack();
                \Log::error('Database error in removeFromLibrary: ' . $e->getMessage());
                throw $e;
            }
        } catch (\Exception $e) {
            \Log::error('Error in removeFromLibrary: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to remove book from library',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    public function deleteBook(Book $book)
    {
        if (Auth::user()->role !== 'teacher') {
            return response()->json(['error' => 'Unauthorized. Teachers only.'], Response::HTTP_FORBIDDEN);
        }

        try {
            if ($book->image) {
                Storage::disk('public')->delete('books/' . $book->image);
            }

            $users = $book->users()->get();
            
            $book->delete();

            $this->refreshBookCaches();

            foreach ($users as $user) {
                $this->refreshUserLibraryCache($user->id);
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Book deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to delete book',
                'error' => $e->getMessage()
            ], Response::HTTP_BAD_REQUEST);
        }
    }

    public function update(Request $request, Book $book)
    {
        if (Auth::user()->role !== 'teacher') {
            return response()->json(['error' => 'Unauthorized. Teachers only.'], Response::HTTP_FORBIDDEN);
        }

        $validatedData = $request->validate([
            'title' => 'string|max:255',
            'authors' => 'nullable|array',
            'authors.*' => 'string|max:100',
            'isbn' => 'string|max:20|unique:books,isbn,' . $book->id,
            'description' => 'nullable|string',
            'categories' => 'nullable|array',
            'categories.*' => 'string|max:50',
            'price' => 'nullable|numeric',
            'image' => 'nullable|image|max:2048'
        ]);

        try {
            if ($request->filled('title')) {
                $book->title = $request->title;
            }
            
            if ($request->filled('isbn')) {
                $book->isbn = $request->isbn;
            }
            
            if ($request->filled('description')) {
                $book->description = $request->description;
            }
            
            if ($request->filled('price')) {
                $book->price = $request->price;
            }

            if ($request->hasFile('image')) {
                if ($book->image) {
                    Storage::disk('public')->delete('books/' . $book->image);
                }
                
                $image = $request->file('image');
                $filename = time() . '_' . $image->getClientOriginalName();
                $path = $image->storeAs('books', $filename, 'public');
                $book->image = $filename;
            }

            $book->save();

            // Handle authors
            if ($request->has('authors')) {
                $this->syncAuthors($book, $request->authors);
            }

            // Handle categories
            if ($request->has('categories')) {
                $this->syncCategories($book, $request->categories);
            }

            $this->refreshBookCaches();

            $imageUrl = $book->image 
                ? url('storage/books/' . urlencode($book->image))
                : "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";

            return response()->json([
                'status' => 'success',
                'book' => $book->load(['categories', 'authors']),
                'image_url' => $imageUrl,
                'message' => 'Book updated successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to update book',
                'error' => $e->getMessage()
            ], Response::HTTP_BAD_REQUEST);
        }
    }

    public function search(Request $request)
    {
        try {
            $query = $request->input('query', '');
            $type = $request->input('type', 'all'); // Default to 'all' instead of 'name'
            
            if (empty($query)) {
                return response()->json([
                    'status' => 'success',
                    'books' => []
                ]);
            }

            $cacheKey = "books:search:{$type}:{$query}";
            
            $books = $this->getCachedBookData($cacheKey, self::CACHE_DURATION, function() use ($query, $type) {
                $bookQuery = Book::query()
                    ->with(['users', 'categories', 'authors'])
                    ->where('is_live', true); // Only return live books
                
                // Apply different search criteria based on type
                switch($type) {
                    case 'author':
                        // Use full-text search for author name
                        $bookQuery->searchByAuthor($query);
                        break;
                    case 'isbn':
                        // Use full-text search for ISBN
                        $bookQuery->searchByIsbn($query);
                        break;
                    case 'name':
                        // Use full-text search for title
                        $bookQuery->searchByTitle($query);
                        break;
                    case 'all':
                    default:
                        // Use full-text search across all fields
                        $bookQuery->searchAll($query);
                        break;
                }
                
                return $bookQuery->get();
            });
            
            $booksWithUrls = $books->map(function($book) {
                $book->image_url = $book->image 
                    ? url('storage/books/' . urlencode($book->image))
                    : "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";
                return $book;
            });

            return response()->json([
                'status' => 'success',
                'books' => $booksWithUrls
            ]);
        } catch (\Exception $e) {
            \Log::error('Error searching books: ' . $e->getMessage());
            
            // Fallback to basic search if full-text search fails
            $bookQuery = Book::query()
                ->with(['users', 'categories', 'authors'])
                ->where('is_live', true); // Only return live books
            $lowercaseQuery = strtolower($query);
            $words = array_filter(explode(' ', $lowercaseQuery), function($word) {
                return strlen($word) > 2;
            });
            
            // Apply different search criteria based on type
            switch($type) {
                case 'author':
                    $bookQuery->whereHas('authors', function($q) use ($lowercaseQuery, $words) {
                        $q->where(function($subQ) use ($lowercaseQuery, $words) {
                            // Exact match
                            $subQ->whereRaw('LOWER(name) = ?', [$lowercaseQuery]);
                            // Starts with
                            $subQ->orWhereRaw('LOWER(name) LIKE ?', [$lowercaseQuery . '%']);
                            // Contains
                            $subQ->orWhereRaw('LOWER(name) LIKE ?', ['%' . $lowercaseQuery . '%']);
                            
                            // Match each word for multi-word queries
                            if (count($words) > 1) {
                                // Add condition to match all words
                                $whereClause = "";
                                $params = [];
                                
                                foreach ($words as $word) {
                                    if (strlen($word) > 2) {
                                        $whereClause .= (strlen($whereClause) > 0 ? " AND " : "");
                                        $whereClause .= "LOWER(name) LIKE ?";
                                        $params[] = '%' . $word . '%';
                                    }
                                }
                                
                                if (!empty($whereClause)) {
                                    $subQ->orWhereRaw("($whereClause)", $params);
                                }
                                
                                // Also match individual words
                                foreach ($words as $word) {
                                    if (strlen($word) > 2) {
                                        $subQ->orWhereRaw('LOWER(name) LIKE ?', ['%' . $word . '%']);
                                    }
                                }
                            }
                        });
                    })->orderByRaw("
                        CASE 
                            WHEN EXISTS (SELECT 1 FROM book_authors ba JOIN authors a ON ba.author_id = a.id 
                                        WHERE ba.book_id = books.id AND LOWER(a.name) = ?) THEN 1
                            WHEN EXISTS (SELECT 1 FROM book_authors ba JOIN authors a ON ba.author_id = a.id 
                                        WHERE ba.book_id = books.id AND LOWER(a.name) LIKE ?) THEN 2
                            WHEN EXISTS (SELECT 1 FROM book_authors ba JOIN authors a ON ba.author_id = a.id 
                                        WHERE ba.book_id = books.id AND LOWER(a.name) LIKE ?) THEN 3
                            ELSE 4
                        END
                    ", [$lowercaseQuery, $lowercaseQuery . '%', '%' . $lowercaseQuery . '%']);
                    break;
                    
                case 'isbn':
                    $bookQuery->where(function($q) use ($lowercaseQuery) {
                        // Exact match
                        $q->whereRaw('LOWER(isbn) = ?', [$lowercaseQuery]);
                        // Starts with
                        $q->orWhereRaw('LOWER(isbn) LIKE ?', [$lowercaseQuery . '%']);
                        // Contains
                        $q->orWhereRaw('LOWER(isbn) LIKE ?', ['%' . $lowercaseQuery . '%']);
                        
                        // Try without dashes if the query has them
                        if (str_contains($lowercaseQuery, '-')) {
                            $plainIsbn = str_replace('-', '', $lowercaseQuery);
                            $q->orWhereRaw('LOWER(isbn) = ?', [$plainIsbn]);
                            $q->orWhereRaw('LOWER(isbn) LIKE ?', [$plainIsbn . '%']);
                            $q->orWhereRaw('LOWER(isbn) LIKE ?', ['%' . $plainIsbn . '%']);
                        }
                    })->orderByRaw("
                        CASE 
                            WHEN LOWER(isbn) = ? THEN 1
                            WHEN LOWER(isbn) LIKE ? THEN 2
                            WHEN LOWER(isbn) LIKE ? THEN 3
                            ELSE 4
                        END
                    ", [$lowercaseQuery, $lowercaseQuery . '%', '%' . $lowercaseQuery . '%']);
                    break;
                    
                case 'name':
                    $bookQuery->where(function($q) use ($lowercaseQuery, $words) {
                        // Exact match
                        $q->whereRaw('LOWER(title) = ?', [$lowercaseQuery]);
                        // Starts with
                        $q->orWhereRaw('LOWER(title) LIKE ?', [$lowercaseQuery . '%']);
                        // Contains
                        $q->orWhereRaw('LOWER(title) LIKE ?', ['%' . $lowercaseQuery . '%']);
                        
                        // Match each word for multi-word queries
                        if (count($words) > 1) {
                            // Add condition to match all words
                            $whereClause = "";
                            $params = [];
                            
                            foreach ($words as $word) {
                                if (strlen($word) > 2) {
                                    $whereClause .= (strlen($whereClause) > 0 ? " AND " : "");
                                    $whereClause .= "LOWER(title) LIKE ?";
                                    $params[] = '%' . $word . '%';
                                }
                            }
                            
                            if (!empty($whereClause)) {
                                $q->orWhereRaw("($whereClause)", $params);
                            }
                            
                            // Also match individual words
                            foreach ($words as $word) {
                                if (strlen($word) > 2) {
                                    $q->orWhereRaw('LOWER(title) LIKE ?', ['%' . $word . '%']);
                                }
                            }
                        }
                    })->orderByRaw("
                        CASE 
                            WHEN LOWER(title) = ? THEN 1
                            WHEN LOWER(title) LIKE ? THEN 2
                            WHEN LOWER(title) LIKE ? THEN 3
                            ELSE 4
                        END
                    ", [$lowercaseQuery, $lowercaseQuery . '%', '%' . $lowercaseQuery . '%']);
                    break;
                    
                case 'all':
                default:
                    $bookQuery->where(function($q) use ($lowercaseQuery, $words) {
                        // Title exact match
                        $q->whereRaw('LOWER(title) = ?', [$lowercaseQuery]);
                        // Title starts with
                        $q->orWhereRaw('LOWER(title) LIKE ?', [$lowercaseQuery . '%']);
                        // Title contains
                        $q->orWhereRaw('LOWER(title) LIKE ?', ['%' . $lowercaseQuery . '%']);
                        
                        // ISBN match
                        $q->orWhereRaw('LOWER(isbn) = ?', [$lowercaseQuery]);
                        $q->orWhereRaw('LOWER(isbn) LIKE ?', [$lowercaseQuery . '%']);
                        $q->orWhereRaw('LOWER(isbn) LIKE ?', ['%' . $lowercaseQuery . '%']);
                        
                        // Author match
                        $q->orWhereHas('authors', function($authorQuery) use ($lowercaseQuery) {
                            $authorQuery->whereRaw('LOWER(name) = ?', [$lowercaseQuery]);
                            $authorQuery->orWhereRaw('LOWER(name) LIKE ?', [$lowercaseQuery . '%']);
                            $authorQuery->orWhereRaw('LOWER(name) LIKE ?', ['%' . $lowercaseQuery . '%']);
                        });
                        
                        // Match all words in multi-word queries
                        if (count($words) > 1) {
                            // Title contains all words
                            $titleWhereClause = "";
                            $titleParams = [];
                            
                            foreach ($words as $word) {
                                if (strlen($word) > 2) {
                                    $titleWhereClause .= (strlen($titleWhereClause) > 0 ? " AND " : "");
                                    $titleWhereClause .= "LOWER(title) LIKE ?";
                                    $titleParams[] = '%' . $word . '%';
                                }
                            }
                            
                            if (!empty($titleWhereClause)) {
                                $q->orWhereRaw("($titleWhereClause)", $titleParams);
                            }
                            
                            // Match each word individually in title
                            foreach ($words as $word) {
                                if (strlen($word) > 2) {
                                    $q->orWhereRaw('LOWER(title) LIKE ?', ['%' . $word . '%']);
                                }
                            }
                            
                            // Author contains all words
                            $q->orWhereHas('authors', function($authorQuery) use ($words) {
                                $authorQuery->where(function($subQ) use ($words) {
                                    $nameWhereClause = "";
                                    $nameParams = [];
                                    
                                    foreach ($words as $word) {
                                        if (strlen($word) > 2) {
                                            $nameWhereClause .= (strlen($nameWhereClause) > 0 ? " AND " : "");
                                            $nameWhereClause .= "LOWER(name) LIKE ?";
                                            $nameParams[] = '%' . $word . '%';
                                        }
                                    }
                                    
                                    if (!empty($nameWhereClause)) {
                                        $subQ->whereRaw("($nameWhereClause)", $nameParams);
                                    }
                                    
                                    // Match each word individually in author name
                                    foreach ($words as $word) {
                                        if (strlen($word) > 2) {
                                            $subQ->orWhereRaw('LOWER(name) LIKE ?', ['%' . $word . '%']);
                                        }
                                    }
                                });
                            });
                        }
                    })->orderByRaw("
                        CASE 
                            WHEN LOWER(title) = ? THEN 1
                            WHEN LOWER(title) LIKE ? THEN 2
                            WHEN LOWER(title) LIKE ? THEN 3
                            WHEN EXISTS (SELECT 1 FROM book_authors ba JOIN authors a ON ba.author_id = a.id 
                                        WHERE ba.book_id = books.id AND LOWER(a.name) = ?) THEN 4
                            WHEN EXISTS (SELECT 1 FROM book_authors ba JOIN authors a ON ba.author_id = a.id 
                                        WHERE ba.book_id = books.id AND LOWER(a.name) LIKE ?) THEN 5
                            WHEN isbn = ? THEN 6
                            ELSE 7
                        END
                    ", [
                        $lowercaseQuery, $lowercaseQuery . '%', '%' . $lowercaseQuery . '%',
                        $lowercaseQuery, $lowercaseQuery . '%',
                        $lowercaseQuery
                    ]);
                    break;
            }
            
            $books = $bookQuery->get();
            
            $booksWithUrls = $books->map(function($book) {
                $book->image_url = $book->image 
                    ? url('storage/books/' . urlencode($book->image))
                    : "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";
                return $book;
            });

            return response()->json([
                'status' => 'success',
                'books' => $booksWithUrls
            ]);
        }
    }

    /**
     * Get a single book by ID
     */
    public function getBook($id)
    {
        try {
            $book = $this->getCachedBookData("book:{$id}", self::CACHE_DURATION, function() use ($id) {
                return Book::with(['categories', 'authors'])->findOrFail($id);
            });
            
            $book->image_url = $book->image 
                ? url('storage/books/' . urlencode($book->image))
                : "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";
                
            return response()->json([
                'status' => 'success',
                'book' => $book
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Book not found',
                'error' => $e->getMessage()
            ], Response::HTTP_NOT_FOUND);
        }
    }

    /**
     * Sync categories for a book
     */
    private function syncCategories(Book $book, array $categoryNames)
    {
        $categoryIds = [];
        
        foreach ($categoryNames as $name) {
            if (empty($name)) continue;
            
            // Find or create the category
            $category = Category::firstOrCreate(['name' => $name]);
            $categoryIds[] = $category->id;
        }
        
        // Sync the categories with the book
        $book->categories()->sync($categoryIds);
        
        // Clear category cache
        Cache::forget('categories:all');
    }

    /**
     * Sync authors for a book
     */
    private function syncAuthors(Book $book, array $authorNames)
    {
        $authorIds = [];
        
        foreach ($authorNames as $name) {
            if (empty($name)) continue;
            
            // Find or create the author
            $author = Author::firstOrCreate(['name' => $name]);
            $authorIds[] = $author->id;
        }
        
        // Sync the authors with the book
        $book->authors()->sync($authorIds);
    }

    protected function refreshBookCaches()
    {
        try {
            $this->clearBookCaches();

            $books = Book::with(['users', 'categories', 'authors'])
                ->orderBy('created_at', 'desc')
                ->get();
            Cache::put('books:all', $books, self::CACHE_DURATION);
            Cache::put('books:library', $books, self::CACHE_DURATION);
            
            // Cache popular books
            $popularBooks = Book::withCount('users')
                ->with(['categories', 'authors'])
                ->orderBy('users_count', 'desc')
                ->take(10)
                ->get();
            Cache::put('books:popular', $popularBooks, self::CACHE_DURATION);
            
        } catch (\Exception $e) {
            // Silently fail if Redis is unavailable
            \Log::error('Error refreshing book caches: ' . $e->getMessage());
        }
    }

    protected function refreshUserLibraryCache($userId)
    {
        try {
            $user = User::find($userId);
            if ($user) {
                $books = $user->books()
                    ->with(['users', 'categories', 'authors'])
                    ->orderBy('books.created_at', 'desc')
                    ->get();
                Cache::put("books:user:{$userId}:library", $books, self::CACHE_DURATION);
            }
        } catch (\Exception $e) {
            // Silently fail if Redis is unavailable
            \Log::error('Error refreshing user library cache: ' . $e->getMessage());
        }
    }

    protected function clearBookCaches()
    {
        try {
            Cache::forget('books:all');
            Cache::forget('books:library');
            Cache::forget('books:popular');
            
            // Also clear search caches
            $this->invalidateBookCache('books:search:*');
            
            // Clear individual book caches
            $this->invalidateBookCache('book:*');
            
            // Clear category-related book caches
            $this->invalidateBookCache('category:*:books');
            
            // Clear author-related book caches
            $this->invalidateBookCache('author:*:books');
            
            // Clear user library caches
            $users = User::all();
            foreach ($users as $user) {
                Cache::forget("books:user:{$user->id}:library");
            }
        } catch (\Exception $e) {
            // Silently fail if Redis is unavailable
            \Log::error('Error clearing book caches: ' . $e->getMessage());
        }
    }

    /**
     * Get popular books based on the number of users who have the book in their library
     */
    public function getPopularBooks()
    {
        try {
            $books = $this->getCachedBookData('books:popular', self::CACHE_DURATION, function() {
                return Book::withCount('users')
                    ->with(['categories', 'authors'])
                    ->orderBy('users_count', 'desc')
                    ->take(10)
                    ->get();
            });
            
            $booksWithUrls = $books->map(function($book) {
                $book->image_url = $book->image 
                    ? url('storage/books/' . urlencode($book->image))
                    : "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";
                return $book;
            });

            return response()->json([
                'status' => 'success',
                'books' => $booksWithUrls
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching popular books: ' . $e->getMessage());
            $books = Book::withCount('users')
                ->with(['categories', 'authors'])
                ->orderBy('users_count', 'desc')
                ->take(10)
                ->get();
                
            $booksWithUrls = $books->map(function($book) {
                $book->image_url = $book->image 
                    ? url('storage/books/' . urlencode($book->image))
                    : "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";
                return $book;
            });

            return response()->json([
                'status' => 'success',
                'books' => $booksWithUrls
            ]);
        }
    }

    /**
     * Export books as Excel file
     * 
     * @return \Illuminate\Http\Response
     */
    public function exportBooks()
    {
        if (Auth::user()->role !== 'teacher') {
            return response()->json(['error' => 'Unauthorized. Teachers only.'], Response::HTTP_FORBIDDEN);
        }

        try {
            // Get recent books (10 most recent books created by the authenticated user)
            $books = Book::query()
                ->with(['categories', 'authors'])
                ->where('created_by', Auth::id())
                ->orderBy('created_at', 'desc')
                ->limit(10)
                ->get();
            
            // Create a new spreadsheet
            $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            
            // Set headers
            $sheet->setCellValue('A1', 'Title');
            $sheet->setCellValue('B1', 'ISBN');
            $sheet->setCellValue('C1', 'Authors');
            $sheet->setCellValue('D1', 'Categories');
            $sheet->setCellValue('E1', 'Description');
            $sheet->setCellValue('F1', 'Price');
            $sheet->setCellValue('G1', 'Image URL');
            
            // Style headers
            $headerStyle = [
                'font' => ['bold' => true],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['rgb' => 'E9E9E9']
                ]
            ];
            $sheet->getStyle('A1:G1')->applyFromArray($headerStyle);
            
            // Add data
            $row = 2;
            foreach ($books as $book) {
                $sheet->setCellValue('A' . $row, $book->title);
                $sheet->setCellValue('B' . $row, $book->isbn);
                
                // Join authors
                $authorNames = $book->authors->pluck('name')->implode(', ');
                $sheet->setCellValue('C' . $row, $authorNames);
                
                // Join categories
                $categoryNames = $book->categories->pluck('name')->implode(', ');
                $sheet->setCellValue('D' . $row, $categoryNames);
                
                $sheet->setCellValue('E' . $row, $book->description);
                $sheet->setCellValue('F' . $row, $book->price);
                
                // Add image URL/path
                $imageInfo = $book->image;
                if ($imageInfo) {
                    // Check if it's a URL (imported book) or a file path (manually uploaded)
                    if (filter_var($imageInfo, FILTER_VALIDATE_URL)) {
                        // For imported books, keep the URL as is
                        $imageValue = $imageInfo;
                    } else {
                        // For manually uploaded books, provide the storage path
                        $imageValue = 'storage/books/' . $imageInfo;
                    }
                } else {
                    $imageValue = '';
                }
                $sheet->setCellValue('G' . $row, $imageValue);
                
                $row++;
            }
            
            // Auto-size columns
            foreach (range('A', 'G') as $column) {
                $sheet->getColumnDimension($column)->setAutoSize(true);
            }
            
            // Create writer
            $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);
            
            // Create a temporary file
            $tempFilePath = tempnam(sys_get_temp_dir(), 'books_export_');
            $writer->save($tempFilePath);
            
            // Return file download response
            return response()->download($tempFilePath, 'recent_books_export_' . date('Y-m-d') . '.xlsx')
                ->deleteFileAfterSend(true);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to export books',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Toggle the live status of a book
     */
    public function toggleLive(Book $book)
    {
        if (Auth::user()->role !== 'teacher') {
            return response()->json(['error' => 'Unauthorized. Teachers only.'], Response::HTTP_FORBIDDEN);
        }

        try {
            $book->is_live = !$book->is_live;
            $book->save();

            $this->refreshBookCaches();

            return response()->json([
                'status' => 'success',
                'book' => $book->load(['categories', 'authors']),
                'message' => $book->is_live ? 'Book is now live' : 'Book is now hidden'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to toggle book status',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
} 