<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use App\Traits\RedisCacheTrait;
use Symfony\Component\HttpFoundation\Response;

class CategoryController extends Controller
{
    use RedisCacheTrait;
    const CACHE_DURATION = 3600;

    /**
     * Get all categories
     */
    public function index()
    {
        try {
            $categories = $this->getCachedBookData('categories:all', self::CACHE_DURATION, function() {
                return Category::withCount('books')->get();
            });
            
            return response()->json([
                'status' => 'success',
                'categories' => $categories
            ]);
        } catch (\Exception $e) {
            $categories = Category::withCount('books')->get();
            
            return response()->json([
                'status' => 'success',
                'categories' => $categories
            ]);
        }
    }

    /**
     * Add a new category
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:50|unique:categories,name'
        ]);

        try {
            $category = Category::create([
                'name' => $request->name
            ]);

            $this->invalidateBookCache('categories:*');

            return response()->json([
                'status' => 'success',
                'message' => 'Category added successfully',
                'category' => $category
            ], Response::HTTP_CREATED);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to add category',
                'error' => $e->getMessage()
            ], Response::HTTP_BAD_REQUEST);
        }
    }

    /**
     * Get books by category
     */
    public function getBooks($id)
    {
        try {
            $category = Category::findOrFail($id);
            
            $books = $this->getCachedBookData("category:{$id}:books", self::CACHE_DURATION, function() use ($category) {
                return $category->books()
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
                'category' => $category,
                'books' => $booksWithUrls
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Category not found',
                'error' => $e->getMessage()
            ], Response::HTTP_NOT_FOUND);
        }
    }
} 