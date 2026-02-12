'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import BookCard from '@/components/books/BookCard';
import { Search, Funnel, Check, ArrowUp, ArrowDown, XCircle } from 'react-bootstrap-icons';
import { CardSkeleton } from '@/components/skeleton';

// Add custom styles for the scrollbar
const scrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: var(--color-border);
    border-radius: 20px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background-color: var(--color-secondary);
  }
`;

export default function BookCatalog() {
  const BACKEND = process.env.NEXT_PUBLIC_BACKEND;
  const router = useRouter();
  const [allBooks, setAllBooks] = useState([]);
  const [displayedBooks, setDisplayedBooks] = useState([]);
  const [search, setSearch] = useState("");
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [searchType, setSearchType] = useState("all");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [pageNumber, setPageNumber] = useState(1);
  const [filter, setFilter] = useState("recent");
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [priceRange, setPriceRange] = useState([0, 5000]);
  const [maxBookPrice, setMaxBookPrice] = useState(5000);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const BOOKS_PER_PAGE = 18; // 6 books per row * 3 rows = 18 books per page
  
  const observer = useRef();
  const lastBookElementRef = useCallback(node => {
    if (isLoading || isLoadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMoreBooks();
      }
    });
    if (node) observer.current.observe(node);
  }, [isLoading, isLoadingMore, hasMore]);

  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Effect to track scroll position
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getImageUrl = (imagePath) => {
    console.log('Catalog - Constructing image URL:', {
      originalPath: imagePath,
      backendUrl: BACKEND
    });

    // If no image path provided, return placeholder
    if (!imagePath) {
      console.log('Catalog - No image path provided, using placeholder');
      return "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";
    }

    // If it's already a full URL (starts with http:// or https://)
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      console.log('Catalog - Using direct URL:', imagePath);
      return imagePath;
    }

    // If it's a data URL, use it directly
    if (imagePath.startsWith('data:')) {
      console.log('Catalog - Using data URL'); 
      return imagePath;
    }

    // Get the base URL without /api
    const baseUrl = BACKEND.replace('/api', '');

    // For local storage paths, ensure we don't duplicate the 'books' directory
    const imageName = imagePath.replace(/^books\//, '');
    const finalUrl = `${baseUrl}/storage/books/${encodeURIComponent(imageName)}`;
    
    console.log('Catalog - Constructed storage URL:', {
      baseUrl,
      imagePath,
      imageName,
      finalUrl,
      fullPath: `${baseUrl}/storage/books/${encodeURIComponent(imageName)}`
    });
    
    return finalUrl;
  };

  const applyFilter = (books) => {
    // First filter by selected categories
    let filteredBooks = books;
    
    if (selectedCategories.length > 0) {
      filteredBooks = filteredBooks.filter(book => {
        // If book has no categories, check if 'Uncategorized' is selected
        if (!book.categories || book.categories.length === 0) {
          return selectedCategories.includes('Uncategorized');
        }
        
        // Check if any of the book's categories match any of the selected categories
        return book.categories.some(cat => 
          selectedCategories.includes(cat.name)
        );
      });
    }
    
    // Then filter by price range
    filteredBooks = filteredBooks.filter(book => {
      const price = parseFloat(book.price || 0);
      return price >= priceRange[0] && price <= priceRange[1];
    });
    
    // Finally apply sorting
    switch (filter) {
      case "asc":
        return [...filteredBooks].sort((a, b) => a.title.localeCompare(b.title));
      case "desc":
        return [...filteredBooks].sort((a, b) => b.title.localeCompare(a.title));
      case "recent":
        return [...filteredBooks].sort((a, b) => b.id - a.id);
      case "last":
        return [...filteredBooks].sort((a, b) => a.id - b.id);
      case "price_low_high":
        return [...filteredBooks].sort((a, b) => parseFloat(a.price || 0) - parseFloat(b.price || 0));
      case "price_high_low":
        return [...filteredBooks].sort((a, b) => parseFloat(b.price || 0) - parseFloat(a.price || 0));
      default:
        return filteredBooks;
    }
  };

  const searchBooks = async () => {
    setIsLoading(true);
    setPageNumber(1);
    try {
      let url;
      if (search) {
        url = `${BACKEND}/books/search?query=${encodeURIComponent(search)}&type=${searchType}`;
      } else {
        url = `${BACKEND}/books/get-books`;
      }
      
      console.log("Fetching from URL:", url);
      
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("API Error Response:", errorText);
        throw new Error(`Server responded with ${res.status}: ${errorText}`);
      }
      
      const data = await res.json();
      console.log("API Response:", data);
      
      const books = data.status === 'success' ? data.books : [];
      
      // Extract unique categories
      const uniqueCategories = [...new Set(
        books.flatMap(book => 
          book.categories && book.categories.length > 0 
            ? book.categories.map(cat => cat.name) 
            : ['Uncategorized']
        )
      )].sort();
      setCategories(uniqueCategories);
      
      // Find the maximum book price and round it to the nearest hundred above
      if (books.length > 0) {
        const highestPrice = Math.max(...books.map(book => parseFloat(book.price || 0)));
        const roundedMaxPrice = Math.ceil(highestPrice / 100) * 100;
        setMaxBookPrice(roundedMaxPrice);
        // Update price range to use the new maximum
        setPriceRange([0, roundedMaxPrice]);
      }
      
      const filteredBooks = applyFilter(books);
      setAllBooks(books);

      // Set displayed books to first page
      const booksToDisplay = filteredBooks.slice(0, BOOKS_PER_PAGE);
      setDisplayedBooks(booksToDisplay);
      
      // Determine if there are more books to load
      setHasMore(filteredBooks.length > BOOKS_PER_PAGE);
      
      setMessage("");
    } catch (error) {
      console.error("Fetch error details:", error);
      setMessage(`Search failed: ${error.message}`);
      setAllBooks([]);
      setDisplayedBooks([]);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreBooks = () => {
    if (!hasMore || isLoadingMore) return;
    
    setIsLoadingMore(true);
    
    // Calculate next page
    const nextPage = pageNumber + 1;
    const startIndex = (nextPage - 1) * BOOKS_PER_PAGE;
    const endIndex = startIndex + BOOKS_PER_PAGE;
    
    // Get filtered books
    const filteredBooks = applyFilter(allBooks);
    
    // Get next batch of books
    const nextBatch = filteredBooks.slice(startIndex, endIndex);
    
    // Update state after a small delay to avoid UI freezes
    setTimeout(() => {
      setDisplayedBooks(prev => [...prev, ...nextBatch]);
      setPageNumber(nextPage);
      setHasMore(endIndex < filteredBooks.length);
      setIsLoadingMore(false);
    }, 500);
  };

  useEffect(() => {
    // Clear any existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Skip the API call if search is triggered by initial render (empty string)
    if (search === '' && allBooks.length === 0) {
      return;
    }
    
    // Create a new timeout to delay searching until typing stops
    const timer = setTimeout(() => {
      searchBooks().catch(err => {
        console.error("Search error:", err);
        setMessage("Could not perform search. Please try again.");
      });
    }, 250); // 250ms delay for responsive search
    
    setSearchTimeout(timer);
    
    // Cleanup the timeout when component unmounts or search changes again
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [search]); // Re-run when search changes

  // Effect to handle search type changes
  useEffect(() => {
    // Clear the search when switching search types
    setSearch("");
    
    // Reset page number
    setPageNumber(1);
  }, [searchType]);

  // Initial load effect (separate from search effect)
  useEffect(() => {
    if (allBooks.length === 0) {
      const timer = setTimeout(() => {
        searchBooks().catch(err => {
          console.error("Initial load error:", err);
          setMessage("Could not load books. Please check your API configuration.");
        });
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (allBooks.length) {
      setPageNumber(1);
      const filteredBooks = applyFilter(allBooks);
      const booksToDisplay = filteredBooks.slice(0, BOOKS_PER_PAGE);
      setDisplayedBooks(booksToDisplay);
      setHasMore(filteredBooks.length > BOOKS_PER_PAGE);
    }
  }, [filter, selectedCategories, priceRange]);

  const handleBookClick = (bookId) => {
    router.refresh();
    router.push(`/book/${bookId}`);
  };

  const handleCategoryToggle = (category) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(cat => cat !== category);
      } else {
        return [...prev, category];
      }
    });
  };

  const handlePriceRangeChange = (value) => {
    setPriceRange([0, value]);
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setPriceRange([0, maxBookPrice]);
    setFilter("recent");
  };

  const FilterSidebar = () => (
    <>
      {/* Backdrop overlay for mobile */}
      {isMobileFilterOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" 
          onClick={() => setIsMobileFilterOpen(false)}
          aria-hidden="true"
        />
      )}
      
      <div 
        className={`bg-white p-4 rounded-lg shadow-md ${isMobileFilterOpen ? 'fixed inset-0 z-50 overflow-auto pt-14 pb-24' : 'hidden'} md:block md:sticky md:top-4 md:relative md:z-10 md:pt-4 md:pb-4`}
        style={{ 
          backgroundColor: "var(--color-bg-secondary)", 
          color: "var(--color-text-primary)",
          maxHeight: "100vh",
          overflowY: "auto"
        }}
      >
        {/* Fixed header for mobile */}
        <div className={`${isMobileFilterOpen ? 'fixed top-0 left-0 right-0 p-4 z-10' : 'mb-4 sticky top-0 pt-1 pb-2'} flex justify-between items-center bg-inherit`}
          style={{
            borderBottom: isMobileFilterOpen ? '1px solid var(--color-border)' : 'none',
            boxShadow: isMobileFilterOpen ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
          }}
        >
          <h3 className="text-lg font-bold">Filters</h3>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsMobileFilterOpen(false)}
              className="md:hidden text-sm flex items-center justify-center p-1 rounded-full"
              style={{ 
                backgroundColor: "rgba(var(--color-secondary-rgb), 0.1)"
              }}
              aria-label="Close filters"
            >
              <XCircle size={18} />
            </button>
            <button 
              onClick={clearFilters}
              className="text-sm flex items-center gap-1 hover:underline transition-colors duration-200 px-2 py-1 rounded-md md:block hidden"
              style={{ 
                color: "var(--color-secondary)",
                backgroundColor: "rgba(var(--color-secondary-rgb), 0.1)"
              }}
            >
              <XCircle size={14} /> Clear all
            </button>
          </div>
        </div>
      
        {/* Sort Options */}
        <div className="mb-6">
          <h4 className="font-semibold mb-2 border-b pb-1" style={{ borderColor: "var(--color-border)" }}>Sort By</h4>
          <div className="space-y-1.5">
            <button 
              onClick={() => setFilter("recent")}
              className={`flex items-center gap-2 w-full text-left px-2 py-1.5 rounded transition-colors duration-200 ${filter === 'recent' ? 'font-semibold' : ''}`}
              style={{ 
                backgroundColor: filter === 'recent' ? "var(--color-border)" : "transparent",
              }}
            >
              {filter === 'recent' && <Check size={14} />} Recently Added
            </button>
            <button 
              onClick={() => setFilter("last")}
              className={`flex items-center gap-2 w-full text-left px-2 py-1.5 rounded transition-colors duration-200 ${filter === 'last' ? 'font-semibold' : ''}`}
              style={{ 
                backgroundColor: filter === 'last' ? "var(--color-border)" : "transparent",
              }}
            >
              {filter === 'last' && <Check size={14} />} Last Added
            </button>
            <button 
              onClick={() => setFilter("asc")}
              className={`flex items-center gap-2 w-full text-left px-2 py-1.5 rounded transition-colors duration-200 ${filter === 'asc' ? 'font-semibold' : ''}`}
              style={{ 
                backgroundColor: filter === 'asc' ? "var(--color-border)" : "transparent",
              }}
            >
              {filter === 'asc' && <Check size={14} />} Title (A-Z)
            </button>
            <button 
              onClick={() => setFilter("desc")}
              className={`flex items-center gap-2 w-full text-left px-2 py-1.5 rounded transition-colors duration-200 ${filter === 'desc' ? 'font-semibold' : ''}`}
              style={{ 
                backgroundColor: filter === 'desc' ? "var(--color-border)" : "transparent",
              }}
            >
              {filter === 'desc' && <Check size={14} />} Title (Z-A)
            </button>
            <button 
              onClick={() => setFilter("price_low_high")}
              className={`flex items-center gap-2 w-full text-left px-2 py-1.5 rounded transition-colors duration-200 ${filter === 'price_low_high' ? 'font-semibold' : ''}`}
              style={{ 
                backgroundColor: filter === 'price_low_high' ? "var(--color-border)" : "transparent",
              }}
            >
              {filter === 'price_low_high' && <Check size={14} />} Price <ArrowUp size={14} />
            </button>
            <button 
              onClick={() => setFilter("price_high_low")}
              className={`flex items-center gap-2 w-full text-left px-2 py-1.5 rounded transition-colors duration-200 ${filter === 'price_high_low' ? 'font-semibold' : ''}`}
              style={{ 
                backgroundColor: filter === 'price_high_low' ? "var(--color-border)" : "transparent",
              }}
            >
              {filter === 'price_high_low' && <Check size={14} />} Price <ArrowDown size={14} />
            </button>
          </div>
        </div>
        
        {/* Price Range */}
        <div className="mb-6">
          <h4 className="font-semibold mb-2 border-b pb-1" style={{ borderColor: "var(--color-border)" }}>Price Range</h4>
          <div className="mb-2 text-sm flex justify-between">
            <span>₹0</span>
            <span className="px-2 py-0.5 rounded" style={{ backgroundColor: "rgba(var(--color-primary-rgb), 0.1)" }}>₹{priceRange[1]}</span>
          </div>
          <div className="px-1 mb-2">
            <input
              type="range"
              min="0"
              max={maxBookPrice}
              step={Math.max(1, Math.floor(maxBookPrice / 50))}
              value={priceRange[1]}
              onChange={(e) => handlePriceRangeChange(Number(e.target.value))}
              className="w-full accent-current"
              style={{ accentColor: "var(--color-primary)" }}
            />
          </div>
        </div>
        
        {/* Categories */}
        <div className="mb-6">
          <h4 className="font-semibold mb-2 border-b pb-1" style={{ borderColor: "var(--color-border)" }}>Categories</h4>
          <div className="max-h-64 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
            {categories.map(category => (
              <label 
                key={category} 
                className="flex items-center gap-2 text-sm cursor-pointer px-2 py-1.5 rounded transition-colors duration-200 hover:bg-opacity-50"
                style={{ 
                  backgroundColor: selectedCategories.includes(category) 
                    ? "rgba(var(--color-primary-rgb), 0.1)" 
                    : "transparent" 
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(category)}
                  onChange={() => handleCategoryToggle(category)}
                  className="text-blue-600 rounded"
                  style={{ accentColor: "var(--color-primary)" }}
                />
                <span className={selectedCategories.includes(category) ? "font-medium" : ""}>
                  {category}
                </span>
              </label>
            ))}
          </div>
        </div>
        
        {/* Apply Filters Button (Mobile Only) - Fixed to bottom of screen */}
        {isMobileFilterOpen && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-inherit border-t md:hidden shadow-[0_-2px_10px_rgba(0,0,0,0.05)]"
            style={{ borderColor: "var(--color-border)" }}
          >
            <div className="flex justify-between gap-3">
              <button 
                onClick={clearFilters}
                className="py-3 px-4 rounded-lg transition-colors duration-200 border flex items-center justify-center gap-1 font-medium flex-1"
                style={{ 
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-secondary)",
                  backgroundColor: "rgba(var(--color-bg-secondary-rgb), 0.4)"
                }}
              >
                <XCircle size={14} /> Clear All
              </button>
              <button 
                className="py-3 px-4 rounded-lg font-medium transition-colors duration-200 flex-1"
                style={{ 
                  backgroundColor: "var(--color-button-primary)", 
                  color: "var(--color-bg-primary)"
                }}
                onClick={() => setIsMobileFilterOpen(false)}
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="container mx-auto py-8 md:py-12 px-4" style={{ backgroundColor: "var(--color-bg-primary)", color: "var(--color-text-primary)" }}>
      {/* Add custom scrollbar styles and color variables */}
      <style jsx global>{`
        ${scrollbarStyles}
        
        :root {
          --color-primary-rgb: 59, 130, 246;    /* Blue shade - adjust to match your primary color */
          --color-secondary-rgb: 107, 114, 128; /* Gray shade - adjust to match your secondary color */
          --color-bg-secondary-rgb: 243, 244, 246; /* Light gray shade for backgrounds */
        }

        @keyframes dot-bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-4px); }
        }
        
        .animate-dot-bounce {
          animation: dot-bounce 1.4s infinite ease-in-out both;
        }
        
        /* Minimal search bar styles */
        .search-container {
          transition: all 0.3s ease;
          border-radius: 0.75rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        
        .search-container:focus-within {
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          transform: translateY(-1px);
        }
        
        .search-input {
          transition: all 0.2s ease;
        }
        
        .search-type {
          transition: all 0.2s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .search-type:hover {
          background-color: var(--color-text-light) !important;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
        }
        
        .search-icon {
          transition: all 0.3s ease;
        }
        
        .search-container:focus-within .search-icon {
          color: var(--color-primary) !important;
        }
        
        @media (min-width: 640px) {
          .search-container {
            max-width: 85%;
            margin: 0 auto;
          }
        }

        /* Scroll to top button styles */
        .scroll-top-button {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 50;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
          opacity: 0;
          visibility: hidden;
          transform: translateY(20px);
        }
        
        .scroll-top-button.visible {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }
        
        .scroll-top-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 10px rgba(0, 0, 0, 0.15), 0 3px 6px rgba(0, 0, 0, 0.1);
        }
      `}</style>
      
      <div className="mb-8 md:mb-12">
        <div className="max-w-3xl mx-auto">
          {/* Minimal Search Bar */}
          <div className="search-container bg-white overflow-hidden" style={{ 
            backgroundColor: "var(--color-bg-secondary)"
          }}>
            <div className="flex flex-col sm:flex-row">
              {/* Search Input */}
              <div className="relative flex-grow">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <Search className="text-lg search-icon" style={{ color: "var(--color-secondary)" }} />
                </div>
                <input
                  type="text"
                  className="search-input w-full pl-12 pr-4 py-3.5 border-0 focus:outline-none focus:ring-0"
                  placeholder={`Search by ${searchType}...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label={`Search books by ${searchType}`}
                  aria-describedby="search-description"
                  style={{ 
                    backgroundColor: "var(--color-bg-secondary)", 
                    color: "var(--color-text-primary)"
                  }}
                />
                {isLoading && (
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex space-x-1" aria-hidden="true">
                    <div className="h-1.5 w-1.5 rounded-full animate-dot-bounce" style={{ backgroundColor: "var(--color-secondary)" }}></div>
                    <div className="h-1.5 w-1.5 rounded-full animate-dot-bounce" style={{ backgroundColor: "var(--color-secondary)", animationDelay: '0.2s' }}></div>
                    <div className="h-1.5 w-1.5 rounded-full animate-dot-bounce" style={{ backgroundColor: "var(--color-secondary)", animationDelay: '0.4s' }}></div>
                  </div>
                )}
              </div>
              
              {/* Vertical divider - only visible on sm and up */}
              <div className="hidden sm:block w-px h-full self-stretch" style={{ backgroundColor: "var(--color-border)" }}></div>
              
              {/* Buttons Container for mobile */}
              <div className="md:hidden flex flex-shrink-0 border-t sm:border-t-0 overflow-hidden rounded-lg" style={{ borderColor: "var(--color-border)" }}>
                {/* Mobile Filter Button */}
                <button 
                  className="flex items-center justify-between py-3.5 px-4 font-medium w-1/2 text-center rounded-l-lg"
                  style={{ 
                    backgroundColor: "var(--color-text-secondary)", 
                    color: "white",
                    borderRight: "1px solid var(--color-border)"
                  }}
                  onClick={() => setIsMobileFilterOpen(true)}
                  aria-label="Open filters"
                >
                  <Funnel size={16} />
                  <span>Filters</span>
                  <div className="w-4"></div> {/* Empty spacer to balance layout */}
                </button>
                
                {/* Search Type Dropdown - Mobile */}
                <div className="relative w-1/2">
                  <select
                    value={searchType}
                    onChange={(e) => setSearchType(e.target.value)}
                    className="search-type w-full px-3 py-3.5 appearance-none border-0 focus:outline-none focus:ring-0 text-center cursor-pointer font-medium rounded-r-lg"
                    aria-label="Search type"
                    style={{ 
                      backgroundColor: "var(--color-text-secondary)",
                      color: "white"
                    }}
                  >
                    <option value="all">All Fields</option>
                    <option value="name">Name</option>
                    <option value="author">Author</option>
                    <option value="isbn">ISBN</option>
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ color: "white" }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* Search Type Dropdown - Desktop Only */}
              <div className="hidden md:block sm:w-32 md:w-36 flex-shrink-0 relative overflow-hidden sm:overflow-visible">
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value)}
                  className="search-type w-full h-full px-3 py-3.5 appearance-none border-0 focus:outline-none focus:ring-0 text-center sm:text-left pr-8 cursor-pointer font-medium sm:rounded-none rounded-b-lg transition duration-300"
                  aria-label="Search type"
                  style={{ 
                    backgroundColor: "var(--color-text-secondary)",
                    color: "white"
                  }}
                >
                  <option value="all">All Fields</option>
                  <option value="name">Name</option>
                  <option value="author">Author</option>
                  <option value="isbn">ISBN</option>
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ color: "white" }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </div>
            </div>
          </div>
          
          {/* Helper text */}
          <p className="text-xs mt-2 text-center" id="search-description" style={{ color: "var(--color-text-secondary)" }}>
            Results update as you type • Searching by {searchType === "all" ? "all fields" : searchType === "name" ? "book title" : searchType === "author" ? "author name" : "ISBN"}
          </p>
        </div>
      </div>

      {/* Results count row - remove filter button from here */}
      <div className="flex flex-wrap justify-between items-center mb-4">
        {search && (
          <div className="mb-4 w-full">
            <p className="text-sm md:text-base font-medium" style={{ color: "var(--color-text-primary)" }}>
              {isLoading ? (
                <span className="inline-flex items-center">
                  <span>Searching</span>
                  <span className="ml-1 flex space-x-1">
                    <span className="h-1.5 w-1.5 rounded-full animate-dot-bounce" style={{ backgroundColor: "var(--color-secondary)" }}></span>
                    <span className="h-1.5 w-1.5 rounded-full animate-dot-bounce" style={{ backgroundColor: "var(--color-secondary)", animationDelay: '0.2s' }}></span>
                    <span className="h-1.5 w-1.5 rounded-full animate-dot-bounce" style={{ backgroundColor: "var(--color-secondary)", animationDelay: '0.4s' }}></span>
                  </span>
                </span>
              ) : (
                <span>
                  {applyFilter(allBooks).length.toLocaleString()} {applyFilter(allBooks).length === 1 ? 'result' : 'results'} for "<span className="font-semibold">{search}</span>"
                </span>
              )}
            </p>
          </div>
        )}
      </div>

      {message && (
        <div
          className="p-4 mb-6 rounded-lg text-center"
          style={{ 
            backgroundColor: message.includes("success") ? "rgba(var(--color-bg-secondary), 0.2)" : "rgba(var(--color-accent), 0.2)",
            color: message.includes("success") ? "var(--color-text-secondary)" : "var(--color-text-light)"
          }}
        >
          {message}
        </div>
      )}

      {/* Main Content with sidebar */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Filter Sidebar */}
        <div className="md:w-1/4 lg:w-1/5">
          <FilterSidebar />
        </div>
        
        {/* Book Grid */}
        <div className="md:w-3/4 lg:w-4/5">
          {isLoading ? (
            <CardSkeleton count={12} />
          ) : displayedBooks.length === 0 ? (
            <div className="text-center mt-8">
              <p style={{ color: "var(--color-text-secondary)" }}>No books found</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 px-1">
                {displayedBooks.map((book, index) => (
                  <div 
                    key={book.id} 
                    ref={index === displayedBooks.length - 1 ? lastBookElementRef : null}
                    className="transform transition-transform duration-300 hover:-translate-y-1"
                  >
                    <BookCard
                      book={book}
                      onClick={() => handleBookClick(book.id)}
                      getImageUrl={getImageUrl}
                    />
                  </div>
                ))}
              </div>

              {isLoadingMore && (
                <div className="mt-8 flex justify-center">
                  <div className="flex space-x-2">
                    <div className="h-2 w-2 rounded-full animate-dot-bounce" style={{ backgroundColor: "var(--color-secondary)" }}></div>
                    <div className="h-2 w-2 rounded-full animate-dot-bounce" style={{ backgroundColor: "var(--color-secondary)", animationDelay: '0.2s' }}></div>
                    <div className="h-2 w-2 rounded-full animate-dot-bounce" style={{ backgroundColor: "var(--color-secondary)", animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              )}
              
              {!hasMore && displayedBooks.length > 0 && allBooks.length > BOOKS_PER_PAGE && (
                <div className="mt-8 text-center">
                  <p className="py-3 px-6 rounded-lg inline-block text-sm"
                     style={{ 
                       backgroundColor: "rgba(var(--color-bg-secondary-rgb), 0.3)",
                       color: "var(--color-text-secondary)" 
                     }}>
                    You've reached the end of the catalog
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Scroll to top button */}
      <button 
        className={`scroll-top-button ${showScrollTop ? 'visible' : ''}`}
        onClick={scrollToTop}
        aria-label="Scroll to top"
        style={{ 
          backgroundColor: "var(--color-primary)", 
          color: "white"
        }}
      >
        <ArrowUp size={20} />
      </button>
    </div>
  );
}