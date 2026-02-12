<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\BookController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\AuthorController;
use App\Http\Controllers\BookImportController;
use App\Http\Controllers\ProductController;

Route::prefix('books')->group(function () {
    Route::get('/search', [BookController::class, 'search']);
    Route::get('/get-books', [BookController::class, 'getBooks']);
    Route::get('/book/{id}', [BookController::class, 'getBook']);
    Route::get('/popular', [BookController::class, 'getPopularBooks']);
});

Route::prefix('categories')->group(function () {
    Route::get('/', [CategoryController::class, 'index']);
    Route::post('/', [CategoryController::class, 'store']);
    Route::get('/{id}/books', [CategoryController::class, 'getBooks']);
});

Route::prefix('authors')->group(function () {
    Route::get('/', [AuthorController::class, 'index']);
    Route::post('/', [AuthorController::class, 'store']);
    Route::get('/{id}/books', [AuthorController::class, 'getBooks']);
});

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
    
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('books')->group(function () {
        Route::get('/my-library', [BookController::class, 'myLibrary']);
        Route::get('/recent', [BookController::class, 'getRecentBooks']);
        Route::post('/{book}/add-to-library', [BookController::class, 'addToLibrary']);
        Route::delete('/{book}/remove-from-library', [BookController::class, 'removeFromLibrary']);
        Route::get('/get-library', [BookController::class, 'getLibrary']);
        Route::post('/add', [BookController::class, 'add']);
        Route::post('/add-multiple', [BookController::class, 'addMultiple']);
        Route::get('/export', [BookController::class, 'exportBooks']);
        Route::put('/{book}', [BookController::class, 'update']);
        Route::delete('/{book}', [BookController::class, 'deleteBook']);
        Route::post('/{book}/toggle-live', [BookController::class, 'toggleLive']);
    });
    
    Route::prefix('excel-imports')->group(function () {
        Route::post('/upload', [BookImportController::class, 'uploadExcel']);
        Route::get('/files', [BookImportController::class, 'getExcelFiles']);
        Route::delete('/file/{fileId}', [BookImportController::class, 'deleteExcelFile']);
        Route::post('/import/{fileId}', [BookImportController::class, 'importBooks']);
        Route::get('/template', [BookImportController::class, 'downloadTemplate']);
    });
    
    Route::prefix('categories')->group(function () {
        Route::post('/', [CategoryController::class, 'store']);
    });
});

Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/search', [ProductController::class, 'search']);
Route::get('/products/{id}/stock', [ProductController::class, 'getStock']);
Route::post('/products', [ProductController::class, 'store']);
Route::put('/products/{id}', [ProductController::class, 'update']);
Route::delete('/products/{id}', [ProductController::class, 'destroy']);