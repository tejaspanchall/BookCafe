# BookCafe Backend API

A robust and scalable Laravel-based RESTful API for a modern online bookstore application.

## Frontend Repository

The frontend for this project is available at: [BookCafe-Frontend](https://github.com/tejaspanchall/BookCafe-Frontend)

## Overview

BookCafe is a comprehensive digital bookstore platform designed to manage books, users, and reading preferences. The backend is built with Laravel 12 and offers a complete RESTful API for book management, user authentication, and personalized library features.

The system supports two user roles:
- **Teachers**: Can add, update, and delete books, as well as manage their personal libraries
- **Students**: Can view and search books, and manage their personal libraries

Data is stored primarily in PostgreSQL with Redis caching for improved performance. The API design follows RESTful conventions with proper authentication and authorization checks throughout.

## Features

- 📚 Book management system with categorization and author attribution
- 👥 User authentication and authorization with Sanctum
- 🔍 Advanced search and filtering capabilities with PostgreSQL full-text search
- 🔒 Robust security features
- 📊 User-specific book library management
- 📈 Bulk book import via Excel templates
- 💾 Redis caching for improved performance
- 🌱 Database seeding with popular books

## Technologies Used

- **Framework**: Laravel 12
- **PHP Version**: 8.2+
- **Primary Database**: PostgreSQL
- **Search Technology**: PostgreSQL full-text search with tsvector
- **Caching**: Redis
- **Authentication**: Laravel Sanctum
- **Queue System**: Laravel Queue with Database Driver
- **File Storage**: Laravel Storage
- **Excel Processing**: PhpSpreadsheet library

## Prerequisites

- PHP 8.2 or higher
- Composer
- PostgreSQL
- Redis
- Node.js & NPM (for asset compilation)

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/tejaspanchall/BookCafe-Backend.git
cd BookCafe-Backend
```

2. Install dependencies:
```bash
composer install
```

3. Set up environment variables:
```bash
cp .env.example .env
php artisan key:generate
```

4. Update the `.env` file with your database credentials:
```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=bookstore
DB_USERNAME=postgres
DB_PASSWORD=your_password

REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379
REDIS_DB=0
REDIS_CACHE_DB=1
```

5. Run database migrations and seeders:
```bash
php artisan migrate
php artisan db:seed
```

6. Create a symbolic link for storage:
```bash
php artisan storage:link
```

7. Update search vectors for full-text search:
```bash
php artisan search:update-vectors
```

8. Generate Excel template for book imports:
```bash
php artisan books:create-import-template
```

9. Start the development server:
```bash
php artisan serve
```

The API will be available at `http://localhost:8000/api`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout (requires authentication)
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

### Books
- `GET /api/books/search` - Search for books
- `GET /api/books/get-books` - Get all books
- `GET /api/books/book/{id}` - Get book details
- `GET /api/books/popular` - Get popular books
- `GET /api/books/my-library` - Get user's book library (requires authentication)
- `POST /api/books/{book}/add-to-library` - Add book to user's library (requires authentication)
- `DELETE /api/books/{book}/remove-from-library` - Remove book from user's library (requires authentication)
- `POST /api/books/add` - Add a new book (requires teacher role)
- `PUT /api/books/{book}` - Update a book (requires teacher role)
- `DELETE /api/books/{book}` - Delete a book (requires teacher role)

### Excel Imports
- `POST /api/excel-imports/upload` - Upload Excel file (requires teacher role)
- `GET /api/excel-imports/files` - Get uploaded Excel files (requires teacher role)
- `DELETE /api/excel-imports/file/{fileId}` - Delete Excel file (requires teacher role)
- `POST /api/excel-imports/import/{fileId}` - Import books from Excel file (requires teacher role)
- `GET /api/excel-imports/template` - Download Excel template (requires teacher role)

### Categories
- `GET /api/categories` - Get all categories
- `GET /api/categories/{id}/books` - Get books by category
- `POST /api/categories` - Create a new category (requires authentication)

### Authors
- `GET /api/authors` - Get all authors
- `GET /api/authors/{id}/books` - Get books by author
- `POST /api/authors` - Create a new author (requires authentication)

## Redis Cache

The application uses Redis for caching to improve performance. Cache data is stored in database 1.

### Key Patterns Used
- `books:all` - All books
- `books:popular` - Popular books
- `books:search:*` - Search results
- `book:*` - Individual book cache
- `categories:all` - All categories
- `category:*:books` - Books by category
- `authors:all` - All authors
- `author:*:books` - Books by author
- `books:user:{id}:library` - User's book library

### Check Redis Cache
To view all cache keys in Redis database 1:

```bash
redis-cli
> SELECT 1
> KEYS *
```

## Full-Text Search

The application uses PostgreSQL's powerful full-text search capabilities for efficient and accurate book searching. It implements:

- Search by title, author, and ISBN
- Support for prefix matching
- Special handling for short search terms (1-3 characters)
- Query optimization for search relevancy

### Search Functionality
- **Title Search**: Search books by title
- **Author Search**: Search books by author name
- **ISBN Search**: Search books by ISBN number
- **All Fields Search**: Search across all searchable fields

### Initialize/Update Search Vectors

After adding new books or updating existing ones, run the following command to update the search vectors:

```bash
php artisan search:update-vectors
```

This command:
1. Updates the `search_vector` column for all books with data from their title and ISBN fields
2. Merges author names into the search vectors for more comprehensive search results
3. Optimizes the search vectors for prefix matching and text similarity

## Seed Database with 100 Popular books (*Optional*)
```bash
php artisan db:seed --class=BookSeeder
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.
