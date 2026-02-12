<?php

namespace App\Http\Controllers;

use App\Models\Author;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use App\Traits\RedisCacheTrait;
use Symfony\Component\HttpFoundation\Response;

class AuthorController extends Controller
{
    use RedisCacheTrait;
    const CACHE_DURATION = 3600;

    /**
     * Get all authors
     */
    public function index()
    {
        try {
            $authors = $this->getCachedBookData('authors:all', self::CACHE_DURATION, function() {
                return Author::withCount('books')->get();
            });
            
            return response()->json([
                'status' => 'success',
                'authors' => $authors
            ]);
        } catch (\Exception $e) {
            $authors = Author::withCount('books')->get();
            
            return response()->json([
                'status' => 'success',
                'authors' => $authors
            ]);
        }
    }

    /**
     * Add a new author
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:100|unique:authors,name'
        ]);

        try {
            $author = Author::create([
                'name' => $request->name
            ]);

            $this->invalidateBookCache('authors:*');

            return response()->json([
                'status' => 'success',
                'message' => 'Author added successfully',
                'author' => $author
            ], Response::HTTP_CREATED);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to add author',
                'error' => $e->getMessage()
            ], Response::HTTP_BAD_REQUEST);
        }
    }

    /**
     * Get books by a specific author
     */
    public function getBooks($id)
    {
        try {
            $author = Author::findOrFail($id);
            
            $books = $this->getCachedBookData("author:{$id}:books", self::CACHE_DURATION, function() use ($author) {
                return $author->books()
                    ->with(['categories', 'authors'])
                    ->where('is_live', true)
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
                'author' => $author,
                'books' => $booksWithUrls
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Author not found',
                'error' => $e->getMessage()
            ], Response::HTTP_NOT_FOUND);
        }
    }
} 