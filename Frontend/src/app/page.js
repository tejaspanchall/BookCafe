'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { JournalBookmark, Book, People, Laptop, ChevronRight, ChevronLeft, Search, ArrowRight, Stack, BookmarkStar, ArrowDownCircle } from 'react-bootstrap-icons';
import BookCard from '@/components/books/BookCard';
import { CardSkeleton } from '@/components/skeleton';
import CategoryHighlight from '@/components/books/CategoryHighlight';

export default function Home() {
  const router = useRouter();
  const BACKEND = process.env.NEXT_PUBLIC_BACKEND;
  const [popularBooks, setPopularBooks] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(null);
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [noBooks, setNoBooks] = useState(false);
  const [categoryLoading, setCategoryLoading] = useState(false);
  
  // Categories to display
  const categories = [
    'Fiction',
    'Non-Fiction',
    'Science Fiction',
    'Mystery',
    'Romance'
  ];
  
  // Helper function to get categories that have books
  const getAvailableCategories = () => {
    return categories.filter(cat => popularBooks[cat]?.length > 0);
  };
  
  const getImageUrl = (imagePath) => {
    try {
      // If no image path provided, return placeholder
      if (!imagePath) {
        return "https://via.placeholder.com/200x300?text=Book+Cover";
      }

      // If it's already a full URL
      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
      }

      // Make sure we have a backend URL
      if (!BACKEND) {
        return "https://via.placeholder.com/200x300?text=Error+Loading+Image";
      }

      // Remove /api/ from BACKEND URL if it exists
      const baseUrl = BACKEND.replace('/api', '');

      // For local storage paths, ensure we don't duplicate the 'books' directory
      const imageName = imagePath.replace(/^books\//, '');
      return `${baseUrl}/storage/books/${imageName}`;
    } catch (error) {
      console.error("Error generating image URL:", error);
      return "https://via.placeholder.com/200x300?text=Error+Loading+Image";
    }
  };

  useEffect(() => {
    const fetchPopularBooks = async () => {
      setIsLoading(true);
      try {
        // Validate backend URL
        if (!BACKEND) {
          console.error("Backend URL is not defined. Check your .env file");
          setNoBooks(true);
          return;
        }

        const results = {};
        // Fetch all books at once
        const url = `${BACKEND}/books/get-books`;
        console.log("Fetching books from:", url);
        
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (!res.ok) {
          throw new Error(`Failed to fetch books: ${res.status} ${res.statusText}`);
        }
        
        const data = await res.json();
        if (data.status === 'success') {
          const allBooks = data.books || [];
          console.log("Total books fetched:", allBooks.length);
          
          if (allBooks.length === 0) {
            setNoBooks(true);
            return;
          }
          
          let totalBooksFound = 0;
          
          // Process each category
          for (const category of categories) {
            // Filter books that have the current category
            const categoryBooks = allBooks
              .filter(book => {
                if (!book.categories || book.categories.length === 0) return false;
                
                // Check if any of the book's categories match the current category
                return book.categories.some(cat => {
                  const bookCategory = cat.name.toLowerCase();
                  const searchCategory = category.toLowerCase();
                  
                  // Try different matching strategies
                  return (
                    bookCategory === searchCategory ||
                    bookCategory.includes(searchCategory) ||
                    searchCategory.includes(bookCategory) ||
                    // Handle plurals (e.g., "Science" matches "Sciences")
                    (bookCategory.endsWith('s') && searchCategory === bookCategory.slice(0, -1)) ||
                    (searchCategory.endsWith('s') && bookCategory === searchCategory.slice(0, -1))
                  );
                });
              })
              // Sort by popularity metrics instead of just ID
              .sort((a, b) => {
                // First sort by rating if available
                if (a.rating !== undefined && b.rating !== undefined) {
                  return b.rating - a.rating;
                }
                // Then by view count if available
                if (a.views !== undefined && b.views !== undefined) {
                  return b.views - a.views;
                }
                // Finally sort by newest (ID)
                return b.id - a.id;
              })
              .slice(0, 6);
            
            console.log(`Books in ${category} category:`, categoryBooks.length);
            results[category] = categoryBooks;
            totalBooksFound += categoryBooks.length;
          }
          
          // If no books found in any category
          setNoBooks(totalBooksFound === 0);
        } else {
          console.error("API returned error:", data);
          setNoBooks(true);
        }
        
        setPopularBooks(results);
        
        // Initialize categories 
        initializeCategories(results);

      } catch (error) {
        console.error("Error fetching popular books:", error);
        setNoBooks(true);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Helper function to initialize categories after fetching data
    const initializeCategories = (booksData) => {
      // Get only categories that have books
      const availableCategories = categories.filter(cat => booksData[cat]?.length > 0);
      
      if (availableCategories.length > 0) {
        // Set active category to the first one that has books
        const firstCategoryWithBooks = availableCategories[0];
        setActiveCategory(firstCategoryWithBooks);
        // Also set category index to match
        setCategoryIndex(categories.indexOf(firstCategoryWithBooks));
      } else {
        // If no categories have books, set noBooks to true
        setNoBooks(true);
      }
    };
    
    fetchPopularBooks();
  }, []);
  
  const handleNextCategory = () => {
    // Get only categories that have books
    const availableCategories = getAvailableCategories();
    if (availableCategories.length === 0) return;
    
    // Find current index in available categories
    const currentIndex = availableCategories.indexOf(activeCategory);
    // Get next index, wrapping around if needed
    const nextIndex = (currentIndex + 1) % availableCategories.length;
    // Get the actual category at that index
    const nextCategory = availableCategories[nextIndex];
    
    // Use the handleCategoryChange to update the active category
    handleCategoryChange(nextCategory, categories.indexOf(nextCategory));
  };
  
  const handlePrevCategory = () => {
    // Get only categories that have books
    const availableCategories = getAvailableCategories();
    if (availableCategories.length === 0) return;
    
    // Find current index in available categories
    const currentIndex = availableCategories.indexOf(activeCategory);
    // Get previous index, wrapping around if needed
    const prevIndex = (currentIndex - 1 + availableCategories.length) % availableCategories.length;
    // Get the actual category at that index
    const prevCategory = availableCategories[prevIndex];
    
    // Use the handleCategoryChange to update the active category
    handleCategoryChange(prevCategory, categories.indexOf(prevCategory));
  };
  
  const handleCategoryChange = (category, index) => {
    setCategoryLoading(true);
    setActiveCategory(category);
    setCategoryIndex(index);
    // Use setTimeout to create a small delay for transition effect
    setTimeout(() => {
      setCategoryLoading(false);
    }, 300);
  };
  
  const handleBookClick = (bookId) => {
    router.push(`/book/${bookId}`);
  };

  // Creative patterns for background
  const renderPattern = (type, count) => {
    return [...Array(count)].map((_, i) => {
      const size = Math.random() * 20 + 5;
      const opacity = Math.random() * 0.15 + 0.05;
      const delay = Math.random() * 5;
      const duration = Math.random() * 20 + 20;
      const posX = Math.random() * 100;
      const posY = Math.random() * 100;
      
      const styles = {
        left: `${posX}%`,
        top: `${posY}%`,
        opacity: opacity,
        animation: `float ${duration}s ease-in-out ${delay}s infinite alternate`
      };
      
      if (type === 'circle') {
        return (
          <div 
            key={`circle-${i}`} 
            className="absolute rounded-full bg-black"
            style={{
              ...styles,
              width: `${size}px`,
              height: `${size}px`,
            }}
          />
        );
      } else if (type === 'square') {
        return (
          <div 
            key={`square-${i}`} 
            className="absolute bg-black"
            style={{
              ...styles,
              width: `${size}px`,
              height: `${size}px`,
              transform: `rotate(${Math.random() * 45}deg)`
            }}
          />
        );
      } else if (type === 'line') {
        const width = Math.random() * 100 + 50;
        const height = 1;
        return (
          <div 
            key={`line-${i}`} 
            className="absolute bg-black"
            style={{
              ...styles,
              width: `${width}px`,
              height: `${height}px`,
              transform: `rotate(${Math.random() * 180}deg)`
            }}
          />
        );
      }
      return null;
    });
  };

  return (
    <main className="min-h-screen bg-white text-black">
      {/* Hero Section - Minimalist Book Aesthetic */}
      <section className="relative min-h-[60vh] flex items-center overflow-hidden bg-white">
        {/* Animated patterns - reduced count for better performance */}
        <div className="absolute inset-0 overflow-hidden">
          <style jsx global>{`
            @keyframes float {
              0% { transform: translateY(0) rotate(0); }
              100% { transform: translateY(-15px) rotate(3deg); }
            }
            
            @keyframes bookFloat {
              0% { transform: translateY(0); }
              50% { transform: translateY(-10px); }
              100% { transform: translateY(0); }
            }
          `}</style>
          {renderPattern('circle', 15)}
          {renderPattern('square', 10)}
          {renderPattern('line', 12)}
        </div>

        <div className="container mx-auto px-6 py-8 md:py-12 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-center">
            <div className="lg:col-span-3 space-y-5">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-none">
                BOOK<span className="inline-block relative">CAFE
                  <div className="absolute h-1 w-full bg-black bottom-1"></div>
                </span>
              </h1>
              
              <h2 className="text-lg md:text-xl font-light max-w-md">
                A minimalist digital library for the modern reader.
              </h2>
              
              <div className="pt-3 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => router.push('/catalog')}
                  className="group flex items-center justify-center gap-2 px-6 py-3 bg-black text-white font-semibold hover:bg-gray-900 transition-all duration-300 rounded-none"
                >
                  <span>BROWSE</span>
                  <ArrowRight className="transition-transform duration-300 group-hover:translate-x-2" />
                </button>
                
                <button
                  onClick={() => {
                    const section = document.getElementById('featured-books');
                    section?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-black border border-black font-semibold hover:bg-gray-100 transition-all duration-300 rounded-none"
                >
                  <span>DISCOVER</span>
                  <ArrowDownCircle />
                </button>
              </div>
            </div>
            
            <div className="relative hidden lg:flex lg:col-span-2 justify-center items-center" style={{ margin: "0 auto" }}>
              <div className="book-stack relative" style={{ top: "-150px" }}>
                {[...Array(2)].map((_, i) => (
                  <div 
                    key={i} 
                    className="absolute w-56 h-80 bg-white shadow-2xl"
                    style={{
                      transform: `perspective(1000px) rotateY(${-5 * (i+1)}deg) rotateX(${2 * (i+1)}deg) translateZ(${-10 * i}px) translateX(${15 * i}px)`,
                      zIndex: 3 - i,
                      border: '1px solid black',
                      animation: 'bookFloat 4s ease-in-out infinite',
                      animationDelay: `${i * 0.5}s`
                    }}
                  >
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-gray-50">
                      <BookmarkStar className="text-5xl mb-6" />
                      <div className="w-3/4 h-1 bg-black mb-3"></div>
                      <div className="w-1/2 h-1 bg-black"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white via-white to-transparent"></div>
      </section>

      {/* Featured Categories - Horizontal Scrolling */}
      <section id="featured-books" className="pt-12 md:pt-16 pb-8 bg-white">
        <div className="container mx-auto px-6">
          <div className="flex justify-between items-end mb-12">
            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight">
              Featured <br className="hidden md:block" />Collections
            </h2>
            <button
              onClick={() => router.push('/catalog')}
              className="text-black font-medium flex items-center gap-2 border-b border-transparent hover:border-black transition-all pb-1"
            >
              All Collections <ChevronRight />
            </button>
          </div>
          
          <div className="mb-8 relative">
            <div className="flex items-center space-x-4 overflow-x-auto pb-4 scrollbar-hide">
              {getAvailableCategories().map((category) => (
                <button
                  key={category}
                  onClick={() => handleCategoryChange(category, categories.indexOf(category))}
                  className={`whitespace-nowrap px-6 py-2 text-sm md:text-base font-semibold transition-all ${
                    activeCategory === category
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-black hover:bg-gray-200'
                  }`}
                >
                  {category.toUpperCase()}
                </button>
              ))}
            </div>
            
            {getAvailableCategories().length > 1 && (
              <div className="hidden md:flex absolute -right-2 top-0 bottom-0 items-center space-x-2">
                <button
                  onClick={handlePrevCategory}
                  className="p-3 bg-white border border-black text-black hover:bg-black hover:text-white transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={handleNextCategory}
                  className="p-3 bg-white border border-black text-black hover:bg-black hover:text-white transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>
          
          {isLoading ? (
            <CardSkeleton count={6} layout="landing" />
          ) : noBooks ? (
            <div className="text-center py-20 border border-gray-300">
              <Book className="text-gray-500 text-5xl mx-auto mb-6" />
              <h3 className="text-2xl font-medium mb-3">No Books Available</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Our collection is currently empty. Would you like to add some titles?
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <button
                  onClick={() => router.push('/add-book')}
                  className="px-8 py-3 bg-black text-white font-medium hover:bg-gray-900 transition-colors"
                >
                  Add First Book
                </button>
              </div>
            </div>
          ) : categoryLoading ? (
            <CardSkeleton count={6} layout="landing" />
          ) : popularBooks[activeCategory]?.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {popularBooks[activeCategory].map((book) => (
                <div key={book.id} className="flex justify-center">
                  <BookCard
                    book={book}
                    onClick={() => handleBookClick(book.id)}
                    getImageUrl={getImageUrl}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div>
              <div className="text-center py-16 border border-gray-300 mb-16">
                <p className="text-gray-600 mb-6">No books found in &quot;{activeCategory}&quot;</p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <button
                    onClick={() => {
                      const availableCategories = getAvailableCategories();
                      if (availableCategories.length > 0) {
                        const firstAvailableCategory = availableCategories[0];
                        handleCategoryChange(firstAvailableCategory, categories.indexOf(firstAvailableCategory));
                      }
                    }}
                    className="px-6 py-3 bg-gray-100 text-black font-medium hover:bg-gray-200 transition-colors"
                  >
                    Browse Available Categories
                  </button>
                  <button
                    onClick={() => router.push('/add-book')}
                    className="px-6 py-3 bg-black text-white font-medium hover:bg-gray-900 transition-colors"
                  >
                    Add Books to {activeCategory}
                  </button>
                </div>
              </div>
              
              {/* Recommendations from other categories */}
              <div className="mb-16">
                <h3 className="text-2xl font-bold mb-8 uppercase tracking-tight">
                  Explore Alternatives
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {getAvailableCategories()
                    .filter(cat => cat !== activeCategory)
                    .slice(0, 3)
                    .map(category => (
                      <CategoryHighlight 
                        key={category}
                        title={category}
                        books={popularBooks[category]}
                        onBookClick={handleBookClick}
                        getImageUrl={getImageUrl}
                        onAddBook={() => router.push('/add-book')}
                      />
                    ))
                  }
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Features Section - Aesthetic Grid */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-black mb-16 uppercase tracking-tight text-center">
            The BookCafe Experience
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-gray-300">
            {[
              {
                icon: <Stack className="text-3xl" />,
                title: "Curated Collection",
                desc: "Carefully selected titles across genres for quality reading experiences."
              },
              {
                icon: <People className="text-3xl" />,
                title: "Reader Community",
                desc: "Connect with fellow book enthusiasts and share recommendations."
              },
              {
                icon: <Laptop className="text-3xl" />,
                title: "Digital First",
                desc: "Read anywhere with our responsive platform optimized for all devices."
              },
              {
                icon: <JournalBookmark className="text-3xl" />,
                title: "Personal Library",
                desc: "Build your own collection of favorites with custom reading lists."
              }
            ].map((feature, i) => (
              <div key={i} className="p-10 md:p-12 bg-white flex flex-col group hover:bg-black hover:text-white transition-colors duration-500">
                <div className="mb-6">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
                <p className="text-gray-600 group-hover:text-gray-300 transition-colors duration-500">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer Banner */}
      <section className="bg-black text-white py-16">
        <div className="container mx-auto px-6 text-center">
          <p className="text-2xl md:text-3xl font-light max-w-2xl mx-auto mb-6">
            Redefining the digital reading experience, one page at a time.
          </p>
          <div className="inline-flex items-center bg-white text-black px-6 py-3 font-medium">
            <span>© BOOKCAFE {new Date().getFullYear()}</span>
          </div>
        </div>
      </section>
    </main>
  );
}