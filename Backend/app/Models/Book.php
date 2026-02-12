<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class Book extends Model
{
    use HasFactory;

    /**
     * Indicates if the model should be timestamped.
     *
     * @var bool
     */
    public $timestamps = false;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'title',
        'image',
        'description',
        'isbn',
        'price',
        'created_at',
        'is_live'
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array
     */
    protected $appends = ['image_url'];

    /**
     * Get the users that have this book in their library.
     */
    public function users()
    {
        return $this->belongsToMany(User::class, 'user_books');
    }

    /**
     * Get the categories for this book.
     */
    public function categories()
    {
        return $this->belongsToMany(Category::class, 'book_categories');
    }

    /**
     * Get the authors for this book.
     */
    public function authors()
    {
        return $this->belongsToMany(Author::class, 'book_authors');
    }

    /**
     * Get the image URL for the book.
     *
     * @return string|null
     */
    public function getImageUrlAttribute()
    {
        if (!$this->image) {
            return null;
        }
        
        // If the image is already a full URL, return it as is
        if (filter_var($this->image, FILTER_VALIDATE_URL)) {
            return $this->image;
        }
        
        // For local files, construct the full URL
        return url('storage/books/' . urlencode($this->image));
    }

    /**
     * Prepare the search query for PostgreSQL full-text search.
     * This approach uses word beginning matching only.
     *
     * @param  string  $searchQuery
     * @return string
     */
    private function prepareSearchQuery(string $searchQuery): string
    {
        // Clean input and remove special characters while preserving spaces
        $searchQuery = preg_replace('/[^\p{L}\p{N}\s]+/u', ' ', $searchQuery);
        $searchQuery = trim($searchQuery);
        
        // If the search query is empty, return empty string
        if (empty($searchQuery)) {
            return '';
        }

        // Get stop words that should be ignored when alone but kept in phrases
        $stopWords = ['the', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'as'];
        
        // For multi-word queries, match the beginning of each word
        if (str_word_count($searchQuery) > 1) {
            // Simple word-by-word with AND between them
            $terms = explode(' ', $searchQuery);
            $formattedTerms = [];
            
            foreach ($terms as $term) {
                $term = trim($term);
                if (!empty($term) && (!in_array($term, $stopWords) || str_word_count($searchQuery) <= 2)) {
                    // Use :* operator to match at the beginning of words
                    $formattedTerms[] = "$term:*";
                }
            }
            
            // Join all terms with AND operator for precision
            return implode(' & ', $formattedTerms);
        }
        
        // Single word query - simple prefix matching
        return "$searchQuery:*";
    }

    /**
     * Get the word beginning matching conditions.
     * This only matches the beginning of words, not anywhere in the text.
     *
     * @param  string  $searchQuery
     * @param  string  $column
     * @return array
     */
    private function getWordBeginningConditions(string $searchQuery, string $column): array
    {
        // Clean and trim search query
        $searchQuery = trim($searchQuery);
        
        if (empty($searchQuery)) {
            return [];
        }
        
        $conditions = [];
        
        // Exact match (highest priority)
        $conditions[] = ["LOWER($column) = ?", strtolower($searchQuery)];
        
        // Starts with (high priority)
        $conditions[] = ["LOWER($column) LIKE ?", strtolower($searchQuery) . '%'];
        
        // Word boundary starts with (medium-high priority)
        $conditions[] = ["LOWER($column) ~ ?", '\\m' . strtolower(preg_quote($searchQuery))];
        
        // If we have multiple words, create conditions for individual words at word beginnings
        $words = array_filter(explode(' ', $searchQuery));
        if (count($words) > 1) {
            // Add condition for matching all words at word boundaries
            $allWordsCondition = "";
            $allWordsParams = [];
            
            foreach ($words as $word) {
                if (strlen($word) > 1) { // Consider words of at least 2 chars
                    if (strlen($allWordsCondition) > 0) {
                        $allWordsCondition .= " AND ";
                    }
                    $allWordsCondition .= "LOWER($column) ~ ?";
                    $allWordsParams[] = '\\m' . strtolower(preg_quote($word));
                }
            }
            
            if (!empty($allWordsCondition)) {
                $conditions[] = ["($allWordsCondition)", $allWordsParams];
            }
        }
        
        return $conditions;
    }

    /**
     * Scope a query to include books that match the search query by title.
     * Only matches the beginning of words in titles.
     *
     * @param  Builder  $query
     * @param  string  $searchQuery
     * @return Builder
     */
    public function scopeSearchByTitle(Builder $query, string $searchQuery)
    {
        // Clean and trim search query
        $searchQuery = trim($searchQuery);
        
        if (empty($searchQuery)) {
            return $query->whereRaw('1=0'); // Empty result if query is empty
        }

        // Prepare query for full-text search
        $preparedQuery = $this->prepareSearchQuery($searchQuery);
        
        // Create an array of words from the query for word-by-word matching
        $words = array_filter(explode(' ', $searchQuery), function($word) {
            return strlen($word) > 1;
        });
        
        // Get conditions that match the beginning of words
        $conditions = $this->getWordBeginningConditions($searchQuery, 'title');
        
        if (empty($conditions)) {
            return $query->whereRaw('1=0'); // No valid query terms
        }
        
        // Start building the query with OR conditions
        $query->where(function($q) use ($conditions, $preparedQuery, $searchQuery, $words) {
            // Add full-text search for title (most comprehensive, but lower priority)
            $q->whereRaw("to_tsvector('english', title) @@ to_tsquery('english', ?)", [$preparedQuery]);
            
            // Add each word beginning condition
            foreach ($conditions as $condition) {
                if (is_array($condition[1])) {
                    // Multi-parameter condition
                    $q->orWhereRaw($condition[0], $condition[1]);
                } else {
                    // Single parameter condition
                    $q->orWhereRaw($condition[0], [$condition[1]]);
                }
            }
        });
        
        // Order by a combination of match quality and full-text search ranking
        return $query->orderByRaw("
            CASE 
                WHEN LOWER(title) = ? THEN 1  -- Exact match
                WHEN LOWER(title) LIKE ? THEN 2  -- Starts with
                WHEN LOWER(title) ~ ? THEN 3  -- Word boundary match
                WHEN " . (count($words) > 1 ? $this->buildWordBeginningCondition('title', $words) : "FALSE") . " THEN 4  -- Contains all words at boundaries
                ELSE 5
            END,
            -- Enhanced ranking with ts_rank_cd for cover density (proximity of terms)
            -- and normalization factor 8 (divide by the number of unique words)
            ts_rank_cd(to_tsvector('english', title), to_tsquery('english', ?), 8) DESC
        ", [
            strtolower($searchQuery), 
            strtolower($searchQuery) . '%',
            '\\m' . strtolower(preg_quote($searchQuery)),
            $preparedQuery
        ]);
    }

    /**
     * Scope a query to include books that match the search query by author name.
     * Only matches the beginning of words in author names.
     *
     * @param  Builder  $query
     * @param  string  $searchQuery
     * @return Builder
     */
    public function scopeSearchByAuthor(Builder $query, string $searchQuery)
    {
        // Clean and trim search query
        $searchQuery = trim($searchQuery);
        
        if (empty($searchQuery)) {
            return $query->whereRaw('1=0'); // Empty result if query is empty
        }
        
        // Prepare query for full-text search
        $preparedQuery = $this->prepareSearchQuery($searchQuery);
        
        // Create an array of words from the query for word-by-word matching
        $words = array_filter(explode(' ', $searchQuery), function($word) {
            return strlen($word) > 1;
        });
        
        return $query->whereHas('authors', function($q) use ($preparedQuery, $searchQuery, $words) {
            // Full-text search on author name
            $q->whereRaw("to_tsvector('english', name) @@ to_tsquery('english', ?)", [$preparedQuery]);
            
            // Author name starts with query
            $q->orWhereRaw("LOWER(name) LIKE ?", [strtolower($searchQuery) . '%']);
            
            // Word in author name starts with query (word boundary)
            $q->orWhereRaw("LOWER(name) ~ ?", ['\\m' . strtolower(preg_quote($searchQuery))]);
            
            // For multi-word searches, match all words at word boundaries
            if (count($words) > 1) {
                // Match all words at word boundaries
                $boundaryClause = "";
                $boundaryParams = [];
                
                foreach ($words as $word) {
                    $boundaryClause .= (strlen($boundaryClause) > 0 ? " AND " : "");
                    $boundaryClause .= "LOWER(name) ~ ?";
                    $boundaryParams[] = '\\m' . strtolower(preg_quote($word));
                }
                
                if (!empty($boundaryClause)) {
                    $q->orWhereRaw("($boundaryClause)", $boundaryParams);
                }
            }
        })->orderByRaw("
            -- Order based on author name match quality
            CASE 
                WHEN EXISTS (SELECT 1 FROM book_authors ba JOIN authors a ON ba.author_id = a.id 
                            WHERE ba.book_id = books.id AND LOWER(a.name) = ?) THEN 1  -- Exact match
                WHEN EXISTS (SELECT 1 FROM book_authors ba JOIN authors a ON ba.author_id = a.id 
                            WHERE ba.book_id = books.id AND LOWER(a.name) LIKE ?) THEN 2  -- Starts with
                WHEN EXISTS (SELECT 1 FROM book_authors ba JOIN authors a ON ba.author_id = a.id 
                            WHERE ba.book_id = books.id AND LOWER(a.name) ~ ?) THEN 3  -- Word boundary match
                WHEN " . (count($words) > 1 ? "EXISTS (SELECT 1 FROM book_authors ba JOIN authors a ON ba.author_id = a.id 
                            WHERE ba.book_id = books.id AND " . $this->buildWordBeginningRawCondition('a.name', $words) . ")" : "FALSE") . " THEN 4  -- Contains all words at boundaries
                ELSE 5
            END,
            -- Advanced ranking: Using combined ts_rank (with normalization factor 2 - divide by the sum of all lexemes) 
            -- and ts_rank_cd (with normalization factor 16 - divide by 1 + logarithm of the document length)
            (
                SELECT 0.6 * ts_rank(to_tsvector('english', a.name), to_tsquery('english', ?), 2) + 
                       0.4 * ts_rank_cd(to_tsvector('english', a.name), to_tsquery('english', ?), 16)
                FROM book_authors ba 
                JOIN authors a ON ba.author_id = a.id 
                WHERE ba.book_id = books.id
                ORDER BY 1 DESC
                LIMIT 1
            ) DESC
        ", [
            strtolower($searchQuery), 
            strtolower($searchQuery) . '%',
            '\\m' . strtolower(preg_quote($searchQuery)),
            $preparedQuery,
            $preparedQuery
        ]);
    }

    private function buildWordBeginningCondition($column, array $words) 
    {
        if (empty($words)) {
            return 'FALSE';
        }
        
        $conditions = [];
        foreach ($words as $word) {
            if (!empty($word)) {
                $conditions[] = "LOWER($column) ~ '\\m" . strtolower(preg_quote($word)) . "'";
            }
        }
        return !empty($conditions) ? '(' . implode(' AND ', $conditions) . ')' : 'FALSE';
    }

    private function buildWordBeginningRawCondition($column, array $words)
    {
        if (empty($words)) {
            return 'FALSE';
        }
        
        $conditions = [];
        foreach ($words as $word) {
            if (!empty($word)) {
                $conditions[] = "LOWER($column) ~ '\\m" . strtolower(preg_quote($word)) . "'";
            }
        }
        return !empty($conditions) ? '(' . implode(' AND ', $conditions) . ')' : 'FALSE';
    }

    /**
     * Scope a query to include books that match the search query by ISBN.
     *
     * @param  Builder  $query
     * @param  string  $searchQuery
     * @return Builder
     */
    public function scopeSearchByIsbn(Builder $query, string $searchQuery)
    {
        // Clean and trim search query
        $searchQuery = trim($searchQuery);
        
        if (empty($searchQuery)) {
            return $query->whereRaw('1=0'); // Empty result if query is empty
        }
        
        // ISBNs are special - they work better with direct LIKE matching
        return $query->where(function($q) use ($searchQuery) {
            // Exact match
            $q->whereRaw('isbn = ?', [$searchQuery]);
            
            // Starts with (common for partial ISBNs)
            $q->orWhereRaw('isbn LIKE ?', [$searchQuery . '%']);
            
            // Contains (for wildcard matching)
            $q->orWhereRaw('isbn LIKE ?', ['%' . $searchQuery . '%']);
            
            // If it looks like a formatted ISBN, try to match without formatting
            if (str_contains($searchQuery, '-')) {
                $plainIsbn = str_replace('-', '', $searchQuery);
                $q->orWhereRaw('isbn = ?', [$plainIsbn]);
                $q->orWhereRaw('isbn LIKE ?', [$plainIsbn . '%']);
                $q->orWhereRaw('isbn LIKE ?', ['%' . $plainIsbn . '%']);
            }
        })->orderByRaw("
            CASE 
                WHEN isbn = ? THEN 1
                WHEN isbn LIKE ? THEN 2
                WHEN isbn LIKE ? THEN 3
                ELSE 4
            END
        ", [$searchQuery, $searchQuery . '%', '%' . $searchQuery . '%']);
    }

    /**
     * Scope a query to include books that match the search query across all fields.
     * Only matches the beginning of words in titles, author names, and ISBN.
     *
     * @param  Builder  $query
     * @param  string  $searchQuery
     * @return Builder
     */
    public function scopeSearchAll(Builder $query, string $searchQuery)
    {
        // Clean and trim search query
        $searchQuery = trim($searchQuery);
        
        if (empty($searchQuery)) {
            return $query->whereRaw('1=0'); // Empty result if query is empty
        }
        
        // Prepare query for full-text search
        $preparedQuery = $this->prepareSearchQuery($searchQuery);
        
        // Create an array of words from the query for word-by-word matching
        $stopWords = ['the', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'as'];
        $searchTerms = $searchQuery; // Store the original search query for later use
        $words = array_filter(explode(' ', $searchTerms), function($word) use ($stopWords, $searchTerms) {
            return strlen($word) > 1 && (!in_array(strtolower($word), $stopWords) || count(explode(' ', $searchTerms)) <= 2);
        });
        
        // Get the query columns, or default to '*'
        $columns = $query->getQuery()->columns ?? ['*'];
        
        // First find exact matches for title, author, or ISBN
        $exactMatches = clone $query;
        $exactMatches = $exactMatches->newQuery()
            ->select($columns)
            ->where(function($q) use ($searchQuery) {
                // Exact title match
                $q->whereRaw("LOWER(title) = ?", [strtolower($searchQuery)]);
                
                // Exact author match
                $q->orWhereHas('authors', function($authorQuery) use ($searchQuery) {
                    $authorQuery->whereRaw("LOWER(name) = ?", [strtolower($searchQuery)]);
                });
                
                // Exact ISBN match
                $q->orWhereRaw('isbn = ?', [$searchQuery]);
            })
            ->orderByRaw("
                CASE 
                    WHEN LOWER(title) = ? THEN 1  -- Exact title match
                    WHEN EXISTS (SELECT 1 FROM book_authors ba JOIN authors a ON ba.author_id = a.id 
                                WHERE ba.book_id = books.id AND LOWER(a.name) = ?) THEN 2  -- Exact author match
                    WHEN isbn = ? THEN 3  -- Exact ISBN match
                    ELSE 4
                END
            ", [strtolower($searchQuery), strtolower($searchQuery), $searchQuery]);
            
        // Then find matches where search terms appear at the beginning of words
        $wordBeginningMatches = clone $query;
        $wordBeginningMatches = $wordBeginningMatches->newQuery()
            ->select($columns)
            ->where(function($q) use ($searchQuery) {
                // Exclude exact matches for title, author, and ISBN
                $q->whereRaw("LOWER(title) <> ?", [strtolower($searchQuery)]);
                
                $q->whereNotExists(function($q) use ($searchQuery) {
                    $q->selectRaw('1')
                      ->from('book_authors as ba')
                      ->join('authors as a', 'ba.author_id', '=', 'a.id')
                      ->whereRaw('ba.book_id = books.id AND LOWER(a.name) = ?', [strtolower($searchQuery)]);
                });
                
                $q->whereRaw('isbn <> ?', [$searchQuery]);
            })
            ->where(function($q) use ($preparedQuery, $searchQuery, $words) {
                // Full-text search
                $q->whereRaw("search_vector @@ to_tsquery('english', ?)", [$preparedQuery]);
                
                // Title starts with search query
                $q->orWhereRaw("LOWER(title) LIKE ?", [strtolower($searchQuery) . '%']);
                
                // Words in title start with search query (word boundary)
                $q->orWhereRaw("LOWER(title) ~ ?", ['\\m' . strtolower(preg_quote($searchQuery))]);
                
                // Author starts with search query
                $q->orWhereHas('authors', function($authorQuery) use ($searchQuery) {
                    $authorQuery->whereRaw("LOWER(name) LIKE ?", [strtolower($searchQuery) . '%']);
                });
                
                // Words in author name start with search query (word boundary)
                $q->orWhereHas('authors', function($authorQuery) use ($searchQuery) {
                    $authorQuery->whereRaw("LOWER(name) ~ ?", ['\\m' . strtolower(preg_quote($searchQuery))]);
                });
                
                // ISBN starts with search query
                $q->orWhereRaw("isbn LIKE ?", [$searchQuery . '%']);
                
                // For multi-word searches, match all words at word boundaries
                if (count($words) > 1) {
                    // Title contains all words at word boundaries
                    $titleBoundaryClause = "";
                    $titleBoundaryParams = [];
                    
                    foreach ($words as $word) {
                        $titleBoundaryClause .= (strlen($titleBoundaryClause) > 0 ? " AND " : "");
                        $titleBoundaryClause .= "LOWER(title) ~ ?";
                        $titleBoundaryParams[] = '\\m' . strtolower(preg_quote($word));
                    }
                    
                    if (!empty($titleBoundaryClause)) {
                        $q->orWhereRaw("($titleBoundaryClause)", $titleBoundaryParams);
                    }
                    
                    // Author contains all words at word boundaries
                    $q->orWhereHas('authors', function($authorQuery) use ($words) {
                        $authorQuery->where(function($subQ) use ($words) {
                            $boundaryClause = "";
                            $boundaryParams = [];
                            
                            foreach ($words as $word) {
                                $boundaryClause .= (strlen($boundaryClause) > 0 ? " AND " : "");
                                $boundaryClause .= "LOWER(name) ~ ?";
                                $boundaryParams[] = '\\m' . strtolower(preg_quote($word));
                            }
                            
                            if (!empty($boundaryClause)) {
                                $subQ->whereRaw("($boundaryClause)", $boundaryParams);
                            }
                        });
                    });
                }
            })
            ->orderByRaw("
                CASE 
                    WHEN LOWER(title) LIKE ? THEN 1  -- Title starts with query
                    WHEN LOWER(title) ~ ? THEN 2  -- Title has word starting with query
                    WHEN EXISTS (SELECT 1 FROM book_authors ba JOIN authors a ON ba.author_id = a.id 
                                WHERE ba.book_id = books.id AND LOWER(a.name) LIKE ?) THEN 3  -- Author starts with
                    WHEN EXISTS (SELECT 1 FROM book_authors ba JOIN authors a ON ba.author_id = a.id 
                                WHERE ba.book_id = books.id AND LOWER(a.name) ~ ?) THEN 4  -- Author has word starting with query
                    WHEN isbn LIKE ? THEN 5  -- ISBN starts with
                    WHEN " . (count($words) > 1 ? $this->buildWordBeginningCondition('title', $words) : "FALSE") . " THEN 6  -- Title has all words at word boundaries
                    WHEN " . (count($words) > 1 ? "EXISTS (SELECT 1 FROM book_authors ba JOIN authors a ON ba.author_id = a.id 
                                WHERE ba.book_id = books.id AND " . $this->buildWordBeginningRawCondition('a.name', $words) . ")" : "FALSE") . " THEN 7  -- Author has all words at word boundaries
                    ELSE 8
                END,
                -- Enhanced ranking: Using ts_rank with normalization factor 4 (divide by document length)
                -- and ts_rank_cd to consider cover density (proximity of search terms)
                (ts_rank(search_vector, to_tsquery('english', ?), 4) + 
                 ts_rank_cd(search_vector, to_tsquery('english', ?), 32)) DESC
            ", [
                strtolower($searchQuery) . '%',
                '\\m' . strtolower(preg_quote($searchQuery)),
                strtolower($searchQuery) . '%',
                '\\m' . strtolower(preg_quote($searchQuery)),
                $searchQuery . '%',
                $preparedQuery,
                $preparedQuery
            ]);
        
        // Combine exact and word beginning matches using UNION ALL with proper SQL building
        $exactSql = $exactMatches->toSql();
        $wordBeginningsSql = $wordBeginningMatches->toSql();
        $bindings = array_merge($exactMatches->getBindings(), $wordBeginningMatches->getBindings());
        
        // Apply the SQL to our original query
        return $query->fromRaw("(($exactSql) UNION ALL ($wordBeginningsSql)) as books_search", $bindings);
    }
}