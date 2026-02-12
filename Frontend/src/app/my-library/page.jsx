'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import BookCard from '@/components/books/BookCard';
import Pagination from '@/components/books/Pagination';
import { CardSkeleton } from '@/components/skeleton';
import { FiPlusCircle, FiFilter, FiSearch, FiBookOpen, FiPlus } from 'react-icons/fi';

export default function MyLibrary() {
  const BACKEND = process.env.NEXT_PUBLIC_BACKEND;
  const router = useRouter();
  const [allBooks, setAllBooks] = useState([]);
  const [displayedBooks, setDisplayedBooks] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [activeView, setActiveView] = useState('grid'); // 'grid' or 'list'
  const [sortOrder, setSortOrder] = useState('default'); // 'default', 'title', 'author', 'date_added'
  const BOOKS_PER_PAGE = 18;

  const getImageUrl = (imagePath) => {
    // If no image path provided, return placeholder
    if (!imagePath) {
      return "https://via.placeholder.com/200x300?text=Book+Cover";
    }

    // If it's already a full URL (starts with http:// or https://)
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }

    // Remove /api/ from BACKEND URL if it exists
    const baseUrl = BACKEND.replace('/api', '');

    // For local storage paths, ensure we don't duplicate the 'books' directory
    const imageName = imagePath.replace(/^books\//, '');
    const finalUrl = `${baseUrl}/storage/books/${imageName}`;
    return finalUrl;
  };

  const updateDisplayedBooks = (books, page) => {
    const startIndex = (page - 1) * BOOKS_PER_PAGE;
    const endIndex = startIndex + BOOKS_PER_PAGE;
    const booksToDisplay = books.slice(startIndex, endIndex);
    setDisplayedBooks(booksToDisplay);
    setCurrentPage(page);
    setTotalPages(Math.ceil(books.length / BOOKS_PER_PAGE));
  };

  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    
    if (query.trim() === '') {
      setFilteredBooks(allBooks);
      updateDisplayedBooks(allBooks, 1);
    } else {
      const filtered = allBooks.filter(book => 
        book.title.toLowerCase().includes(query) || 
        (book.authors && book.authors.some(author => 
          author.name.toLowerCase().includes(query)
        ))
      );
      setFilteredBooks(filtered);
      updateDisplayedBooks(filtered, 1);
    }
  };

  const handleSort = (order) => {
    setSortOrder(order);
    let sorted = [...filteredBooks];
    
    switch(order) {
      case 'title':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'title_desc':
        sorted.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case 'date_added_newest':
        sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case 'date_added_oldest':
        sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        break;
      default:
        // Use the original order
        sorted = [...filteredBooks];
    }
    
    setFilteredBooks(sorted);
    updateDisplayedBooks(sorted, 1);
  };

  const handleRemoveFromLibrary = async (bookId) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        router.refresh();
        router.push("/login");
        return;
      }

      const response = await fetch(`${BACKEND}/books/${bookId}/remove-from-library`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to remove book from library');
      }

      // Remove the book from all states
      const updatedBooks = allBooks.filter(book => book.id !== bookId);
      setAllBooks(updatedBooks);
      
      const updatedFiltered = filteredBooks.filter(book => book.id !== bookId);
      setFilteredBooks(updatedFiltered);
      
      updateDisplayedBooks(updatedFiltered, currentPage);

      Swal.fire({
        title: 'Success',
        text: 'Book removed from your library',
        icon: 'success',
        confirmButtonColor: 'var(--color-button-primary)'
      });
    } catch (error) {
      console.error("Remove error:", error);
      Swal.fire({
        title: 'Success',
        text: 'Book removed from your library',
        icon: 'success',
        confirmButtonColor: 'var(--color-button-primary)'
      });
    }
  };

  useEffect(() => {
    const fetchMyLibrary = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          router.refresh();
          router.push("/login");
          return;
        }
        
        const response = await fetch(`${BACKEND}/books/my-library`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json"
          }
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch library');
        }

        if (data.status === 'error') {
          throw new Error(data.message);
        }

        const books = data.status === 'success' ? data.books : [];
        setAllBooks(books);
        setFilteredBooks(books);
        updateDisplayedBooks(books, 1);
      } catch (error) {
        console.error("Fetch error:", error);
        if (error.message?.includes('token')) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          router.refresh();
          router.push("/login");
          return;
        }
        setError(error.message || "Failed to fetch library. Please try again later.");
        
        Swal.fire({
          title: 'Error',
          text: error.message || "Failed to fetch library. Please try again later.",
          icon: 'error',
          confirmButtonText: 'Try Again',
          confirmButtonColor: 'var(--color-button-primary)'
        }).then((result) => {
          if (result.isConfirmed) {
            window.location.reload();
          }
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMyLibrary();
  }, [BACKEND, router]);

  // Stats data for the dashboard summary
  const stats = {
    totalBooks: allBooks.length,
    categories: new Set(allBooks.flatMap(book => book.categories?.map(cat => cat.name) || [])).size,
    authors: new Set(allBooks.flatMap(book => book.authors?.map(author => author.name) || [])).size
  };

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>
            My Library
          </h1>
          <div className="w-full md:w-auto">
            <div className="h-10 w-64 rounded-full animate-pulse" style={{ backgroundColor: 'var(--color-bg-secondary)' }}></div>
          </div>
        </div>
        <CardSkeleton count={12} layout="my-library" showStats={true} showFilters={true} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 p-8 rounded-lg text-center shadow-lg" style={{ borderColor: 'var(--color-primary)' }}>
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>Something went wrong</h2>
          <p className="mb-6 text-gray-700">{error}</p>
          <button 
            className="px-6 py-3 rounded-lg shadow-md transition duration-300"
            style={{ 
              backgroundColor: 'var(--color-button-primary)',
              color: 'var(--color-bg-primary)'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-button-hover)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--color-button-primary)'}
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header with Stats */}
      <header className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>
            My Library
          </h1>
          <button 
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg transition duration-300 text-sm font-medium"
            style={{ 
              backgroundColor: 'var(--color-button-primary)',
              color: 'var(--color-bg-primary)'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-button-hover)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--color-button-primary)'}
            onClick={() => router.push("/")}
          >
            <FiPlus size={18} />
            Browse More Books
          </button>
        </div>

        {/* Stats Cards */}
        {allBooks.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <div 
              className="p-4 rounded-lg shadow-sm flex items-center gap-4"
              style={{ backgroundColor: 'var(--color-bg-secondary)' }}
            >
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(var(--color-primary-rgb), 0.1)' }}>
                <FiBookOpen size={24} style={{ color: 'var(--color-primary)' }} />
              </div>
              <div>
                <h3 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{stats.totalBooks}</h3>
                <p className="text-sm" style={{ color: 'var(--color-text-light)' }}>Total Books</p>
              </div>
            </div>
            <div 
              className="p-4 rounded-lg shadow-sm flex items-center gap-4"
              style={{ backgroundColor: 'var(--color-bg-secondary)' }}
            >
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                <FiFilter size={24} style={{ color: '#3b82f6' }} />
              </div>
              <div>
                <h3 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{stats.categories}</h3>
                <p className="text-sm" style={{ color: 'var(--color-text-light)' }}>Categories</p>
              </div>
            </div>
            <div 
              className="p-4 rounded-lg shadow-sm flex items-center gap-4"
              style={{ backgroundColor: 'var(--color-bg-secondary)' }}
            >
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}>
                <FiBookOpen size={24} style={{ color: '#8b5cf6' }} />
              </div>
              <div>
                <h3 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{stats.authors}</h3>
                <p className="text-sm" style={{ color: 'var(--color-text-light)' }}>Authors</p>
              </div>
            </div>
          </div>
        )}
      </header>

      {allBooks.length === 0 ? (
        <div 
          className="py-16 px-8 rounded-lg text-center shadow-sm flex flex-col items-center"
          style={{ backgroundColor: 'var(--color-bg-secondary)' }}
        >
          <div 
            className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
            style={{ backgroundColor: 'rgba(var(--color-primary-rgb), 0.1)' }}
          >
            <FiBookOpen size={48} style={{ color: 'var(--color-primary)' }} />
          </div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>
            Your library is empty
          </h2>
          <p className="text-md mb-8 max-w-md mx-auto" style={{ color: 'var(--color-text-light)' }}>
            Start building your personal collection by adding books from our extensive catalog.
          </p>
          <button 
            className="px-6 py-3 text-lg rounded-lg transition duration-300 flex items-center gap-2"
            style={{ 
              backgroundColor: 'var(--color-button-primary)',
              color: 'var(--color-bg-primary)'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-button-hover)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--color-button-primary)'}
            onClick={() => router.push("/")}
          >
            <FiPlusCircle size={20} />
            Discover Books
          </button>
        </div>
      ) : (
        <>
          {/* Search and Filter Controls */}
          <div className="mb-6 flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch size={18} style={{ color: 'var(--color-text-light)' }} />
              </div>
              <input
                type="text"
                placeholder="Search by title or author..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 transition-all"
                style={{ 
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}
                value={searchQuery}
                onChange={handleSearch}
              />
            </div>
            <div className="flex gap-2">
              <select
                className="pl-4 pr-8 py-2.5 rounded-lg border appearance-none bg-no-repeat focus:outline-none focus:ring-2 transition-all"
                style={{ 
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundSize: '1.5em 1.5em',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}
                value={sortOrder}
                onChange={(e) => handleSort(e.target.value)}
              >
                <option value="default">Sort by: Default</option>
                <option value="title">Title (A-Z)</option>
                <option value="title_desc">Title (Z-A)</option>
                <option value="date_added_newest">Date Added (Newest)</option>
                <option value="date_added_oldest">Date Added (Oldest)</option>
              </select>
              <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  className="px-3 py-2.5 transition duration-300"
                  style={{ 
                    backgroundColor: activeView === 'grid' ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                    color: activeView === 'grid' ? 'var(--color-bg-primary)' : 'var(--color-text-primary)',
                  }}
                  onClick={() => setActiveView('grid')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                  </svg>
                </button>
                <button
                  className="px-3 py-2.5 transition duration-300"
                  style={{ 
                    backgroundColor: activeView === 'list' ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                    color: activeView === 'list' ? 'var(--color-bg-primary)' : 'var(--color-text-primary)',
                  }}
                  onClick={() => setActiveView('list')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="8" y1="6" x2="21" y2="6"></line>
                    <line x1="8" y1="12" x2="21" y2="12"></line>
                    <line x1="8" y1="18" x2="21" y2="18"></line>
                    <line x1="3" y1="6" x2="3.01" y2="6"></line>
                    <line x1="3" y1="12" x2="3.01" y2="12"></line>
                    <line x1="3" y1="18" x2="3.01" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* No Results Message */}
          {displayedBooks.length === 0 && (
            <div 
              className="py-12 px-8 rounded-lg text-center"
              style={{ backgroundColor: 'var(--color-bg-secondary)' }}
            >
              <p className="text-lg mb-4" style={{ color: 'var(--color-text-primary)' }}>
                No books found matching "{searchQuery}"
              </p>
              <button 
                className="px-4 py-2 rounded-lg transition duration-300"
                style={{ 
                  backgroundColor: 'var(--color-button-primary)',
                  color: 'var(--color-bg-primary)'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-button-hover)'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--color-button-primary)'}
                onClick={() => {
                  setSearchQuery('');
                  setFilteredBooks(allBooks);
                  updateDisplayedBooks(allBooks, 1);
                }}
              >
                Clear Search
              </button>
            </div>
          )}

          {/* Books Display - Grid View */}
          {activeView === 'grid' && displayedBooks.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5">
              {displayedBooks.map((book) => (
                <div key={book.id} className="h-full">
                  <BookCard
                    book={book}
                    onClick={() => router.push(`/book/${book.id}`)}
                    getImageUrl={getImageUrl}
                    showRemoveButton={true}
                    onRemove={handleRemoveFromLibrary}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Books Display - List View */}
          {activeView === 'list' && displayedBooks.length > 0 && (
            <div className="flex flex-col gap-4">
              {displayedBooks.map((book) => (
                <div 
                  key={book.id}
                  className="flex flex-col sm:flex-row gap-4 p-4 rounded-lg cursor-pointer transition-all hover:shadow-md"
                  style={{ 
                    backgroundColor: 'var(--color-bg-secondary)',
                    borderLeft: '4px solid var(--color-primary)'
                  }}
                  onClick={() => router.push(`/book/${book.id}`)}
                >
                  <img 
                    src={getImageUrl(book.image)} 
                    alt={book.title}
                    className="w-20 h-28 object-cover rounded"
                    onError={(e) => {
                      e.target.src = "https://via.placeholder.com/200x300?text=Book+Cover";
                    }}
                  />
                  <div className="flex-grow flex flex-col">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--color-primary)' }}>
                          {book.title}
                        </h3>
                        <p className="text-sm mb-2" style={{ color: 'var(--color-text-light)' }}>
                          By {book.authors && book.authors.length > 0 
                            ? book.authors.map(author => author.name).join(', ')
                            : 'Unknown Author'}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFromLibrary(book.id);
                        }}
                        className="p-2 rounded-full transition-colors duration-200 text-lg font-bold"
                        style={{ 
                          backgroundColor: 'rgba(255, 0, 0, 0.1)',
                          color: 'rgba(255, 0, 0, 0.8)'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 0, 0, 0.2)'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 0, 0, 0.1)'}
                      >
                        ×
                      </button>
                    </div>
                    <div className="mt-auto flex flex-wrap gap-2">
                      {book.categories && book.categories.length > 0 
                        ? book.categories.slice(0, 3).map(cat => (
                          <span 
                            key={cat.name}
                            className="text-xs px-2 py-0.5 rounded-full truncate max-w-[120px] font-medium"
                            style={{ 
                              backgroundColor: 'rgba(59, 130, 246, 0.1)',
                              color: '#3b82f6'
                            }}
                          >
                            {cat.name}
                          </span>
                        ))
                        : (
                          <span 
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ 
                              backgroundColor: 'rgba(59, 130, 246, 0.1)',
                              color: '#3b82f6'
                            }}
                          >
                            Uncategorized
                          </span>
                        )
                      }
                      {book.categories && book.categories.length > 3 && (
                        <span 
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ 
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            color: '#3b82f6'
                          }}
                        >
                          +{book.categories.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => updateDisplayedBooks(filteredBooks, page)}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}