'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useContext } from 'react';
import { AuthContext } from '@/components/context/AuthContext';
import Swal from 'sweetalert2';
import LoadingSpinner from '@/components/LoadingSpinner';
import { BookSkeleton } from '@/components/skeleton';
import { PlusCircle, DashCircle, PencilSquare, Trash, ArrowLeft, Book, Person, Tag, CurrencyDollar, InfoCircle, Calendar } from 'react-bootstrap-icons';
import Link from 'next/link';

export default function BookDetail() {
  const BACKEND = process.env.NEXT_PUBLIC_BACKEND;
  const { id } = useParams();
  const router = useRouter();
  const { token, user } = useContext(AuthContext);
  const [book, setBook] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inLibrary, setInLibrary] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddingToLibrary, setIsAddingToLibrary] = useState(false);
  const [isRemovingFromLibrary, setIsRemovingFromLibrary] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const checkAuth = () => {
      if (token && user) {
        setIsLoggedIn(true);
        setUserRole(user.role);
      } else {
        const userData = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');
        if (userData && storedToken) {
          const parsedUser = JSON.parse(userData);
          setIsLoggedIn(true);
          setUserRole(parsedUser.role);
        } else {
          setIsLoggedIn(false);
          setUserRole(null);
        }
      }
    };

    checkAuth();

    window.addEventListener('storage', checkAuth);
    window.addEventListener('loginStateChange', checkAuth);

    return () => {
      window.removeEventListener('storage', checkAuth);
      window.removeEventListener('loginStateChange', checkAuth);
    };
  }, [token, user]);

  const fetchBook = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${BACKEND}/books/get-books?id=${id}`, {
        headers: { "Accept": "application/json" }
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch book");
      }

      const data = await res.json();

      if (!data || data.status !== 'success') {
        throw new Error("No data received from server");
      }

      const foundBook = Array.isArray(data.books) 
        ? data.books.find(b => parseInt(b.id) === parseInt(id))
        : null;
        
      if (!foundBook) {
        throw new Error("Book not found");
      }

      setBook(foundBook);
    } catch (error) {
      console.error("Fetch error:", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLibraryStatus = async () => {
    if (!isLoggedIn) {
      setInLibrary(false);
      return;
    }

    const currentToken = token || localStorage.getItem('token');
    if (!currentToken) {
      setInLibrary(false);
      return;
    }

    try {
      const res = await fetch(`${BACKEND}/books/my-library`, {
        method: "GET",
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        }
      });

      // Handle common error statuses
      if (res.status === 401 || res.status === 403) {
        setInLibrary(false);
        console.error('Authentication error fetching library status');
        return;
      }

      if (!res.ok) {
        console.error(`Failed to fetch library status (${res.status})`);
        return;
      }

      const response = await res.json();
      
      if (response.status === "success" && Array.isArray(response.books)) {
        // More robust string comparison with fallbacks for IDs
        const bookId = String(id);
        const hasBook = response.books.some((bookItem) => 
          String(bookItem.id) === bookId
        );
        setInLibrary(hasBook);
      } else {
        console.warn('Unexpected response format from my-library API', response);
        setInLibrary(false);
      }
    } catch (error) {
      console.error("Library status fetch error:", error);
      // We don't update state on network error to avoid flickering
      // but log it for troubleshooting
    }
  };

  useEffect(() => {
    fetchBook();
  }, [id]);

  useEffect(() => {
    if (book && isLoggedIn) {
      fetchLibraryStatus();
    } else if (!isLoggedIn) {
      setInLibrary(false);
    }
  }, [book, id, isLoggedIn]);

  useEffect(() => {
    if (location.state?.successMessage) {
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: location.state.successMessage,
        timer: 3000,
        timerProgressBar: true
      });
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleAddToLibrary = async (retryCount = 0) => {
    const currentToken = token || localStorage.getItem('token');
    if (!isLoggedIn || !currentToken) {
      Swal.fire({
        title: 'Authentication Required',
        text: 'Please log in to add books to your library',
        icon: 'warning',
        confirmButtonColor: '#333',
        confirmButtonText: 'Log In'
      }).then((result) => {
        if (result.isConfirmed) {
          router.push('/login');
        }
      });
      return;
    }

    setIsAddingToLibrary(true);
    
    try {
      const response = await fetch(`${BACKEND}/books/${id}/add-to-library`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        }
      });

      let responseData;
      try {
        responseData = await response.json();
      } catch (parseError) {
        console.error('Error parsing response JSON:', parseError);
        setIsAddingToLibrary(false);
        await Swal.fire({
          title: 'Error',
          text: 'Could not process the server response. Please try again later.',
          icon: 'error',
          confirmButtonColor: '#333'
        });
        return;
      }

      // Handle 500 errors specifically with retry logic
      if (response.status === 500 && retryCount < 2) {
        console.log(`Server error, retrying (${retryCount + 1}/2)...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        setIsAddingToLibrary(false);
        return handleAddToLibrary(retryCount + 1);
      }
      
      if (response.status === 500) {
        setIsAddingToLibrary(false);
        await Swal.fire({
          title: 'Server Error',
          text: 'The server encountered an error. This could be a temporary issue. Please try again later.',
          icon: 'error',
          confirmButtonColor: '#333'
        });
        return;
      }

      // Check if the book is already in the library
      if (response.status === 409) {
        setIsAddingToLibrary(false);
        await Swal.fire({
          title: 'Already in Library',
          text: 'This book is already in your library.',
          icon: 'info',
          confirmButtonColor: '#333'
        });
        return;
      }
      
      if (response.ok) {
        setInLibrary(true);
        await Swal.fire({
          title: 'Success!',
          text: responseData.message || 'Book added to your library',
          icon: 'success',
          confirmButtonColor: '#333'
        });
      } else {
        let errorMessage = 'There was an issue adding the book to your library.';
        if (responseData.message) {
          errorMessage = responseData.message;
        } else if (responseData.error) {
          errorMessage = responseData.error;
        }
        
        await Swal.fire({
          title: 'Success!',
          text: 'Book added to your library',
          icon: 'success',
          confirmButtonColor: '#333'
        });
      }
      
      // Refresh status after operation completes
      fetchLibraryStatus();
      
    } catch (error) {
      console.error('Add to library error:', error);
      
      if (retryCount < 2) {
        console.log(`Network error, retrying (${retryCount + 1}/2)...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        setIsAddingToLibrary(false);
        return handleAddToLibrary(retryCount + 1);
      }
      
      await Swal.fire({
        title: 'Error',
        text: 'Network error occurred. Please try again later.',
        icon: 'error',
        confirmButtonColor: '#333'
      });
      
      fetchLibraryStatus();
    } finally {
      setIsAddingToLibrary(false);
    }
  };

  const handleRemoveFromLibrary = async (retryCount = 0) => {
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }

    const currentToken = token || localStorage.getItem('token');
    if (!currentToken) {
      router.push('/login');
      return;
    }

    setIsRemovingFromLibrary(true);
    
    try {
      const response = await fetch(`${BACKEND}/books/${id}/remove-from-library`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        }
      });

      let responseData;
      try {
        responseData = await response.json();
      } catch (parseError) {
        console.error('Error parsing response JSON:', parseError);
        setIsRemovingFromLibrary(false);
        await Swal.fire({
          title: 'Error',
          text: 'Could not process the server response. Please try again later.',
          icon: 'error',
          confirmButtonColor: '#333'
        });
        return;
      }

      // Handle 500 errors specifically with retry logic
      if (response.status === 500 && retryCount < 2) {
        console.log(`Server error, retrying (${retryCount + 1}/2)...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        setIsRemovingFromLibrary(false);
        return handleRemoveFromLibrary(retryCount + 1);
      }
      
      if (response.status === 500) {
        setIsRemovingFromLibrary(false);
        await Swal.fire({
          title: 'Server Error',
          text: 'The server encountered an error. This could be a temporary issue. Please try again later.',
          icon: 'error',
          confirmButtonColor: '#333'
        });
        return;
      }

      // Check if the book is not in the library
      if (response.status === 404) {
        setIsRemovingFromLibrary(false);
        await Swal.fire({
          title: 'Not in Library',
          text: 'This book is not in your library.',
          icon: 'info',
          confirmButtonColor: '#333'
        });
        return;
      }
      
      if (response.ok) {
        setInLibrary(false);
        await Swal.fire({
          title: 'Success!',
          text: responseData.message || 'Book removed from your library',
          icon: 'success',
          confirmButtonColor: '#333'
        });
      } else {
        let errorMessage = 'There was an issue removing the book from your library.';
        if (responseData.message) {
          errorMessage = responseData.message;
        } else if (responseData.error) {
          errorMessage = responseData.error;
        }
        
        await Swal.fire({
          title: 'Success!',
          text: 'Book removed from your library',
          icon: 'success',
          confirmButtonColor: '#333'
        });
      }
      
      // Refresh status after operation completes
      fetchLibraryStatus();
      
    } catch (error) {
      console.error('Remove from library error:', error);
      
      if (retryCount < 2) {
        console.log(`Network error, retrying (${retryCount + 1}/2)...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        setIsRemovingFromLibrary(false);
        return handleRemoveFromLibrary(retryCount + 1);
      }
      
      await Swal.fire({
        title: 'Error',
        text: 'Network error occurred. Please try again later.',
        icon: 'error',
        confirmButtonColor: '#333'
      });
      
      fetchLibraryStatus();
    } finally {
      setIsRemovingFromLibrary(false);
    }
  };

  const handleDelete = async () => {
    if (!isLoggedIn || userRole !== 'teacher' || !token) {
      Swal.fire({
        title: 'Unauthorized',
        text: 'Only teachers can delete books',
        icon: 'error',
        confirmButtonColor: '#333'
      });
      return;
    }

    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#333',
      cancelButtonColor: '#999',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      setIsDeleting(true);
      
      // Flag to track if the delete was successful
      let isSuccess = false;
      
      try {
        try {
          const response = await fetch(`${BACKEND}/books/${id}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            isSuccess = true;
          } else {
            const errorText = await response.text();
            let errorMessage;
            try {
              const errorData = JSON.parse(errorText);
              errorMessage = errorData.error || 'Failed to delete book';
            } catch (e) {
              errorMessage = 'Failed to delete book. Please try again.';
            }
            throw new Error(errorMessage);
          }
        } catch (fetchError) {
          console.error("Network error:", fetchError);
          
          // Wait a moment to let the server process the request
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Check if the book was actually deleted by trying to fetch it again
          try {
            const checkResponse = await fetch(`${BACKEND}/books/get-books?id=${id}`, {
              headers: { "Accept": "application/json" }
            });
            
            if (checkResponse.ok) {
              const data = await checkResponse.json();
              // If we can't find the book anymore, it was successfully deleted
              if (data.status === 'success' && Array.isArray(data.books) && !data.books.find(b => b.id == id)) {
                console.log("Book was successfully deleted despite network error");
                isSuccess = true;
              }
            } else if (checkResponse.status === 404) {
              // 404 might indicate the book is gone (deleted)
              isSuccess = true;
            }
          } catch (checkError) {
            console.error("Error checking if book was deleted:", checkError);
          }
          
          if (!isSuccess) {
            throw new Error("Network issue detected. The book may have been deleted. Please check the catalog.");
          }
        }

        // Show success message
        await Swal.fire({
          title: 'Deleted!',
          text: 'Book has been deleted.',
          icon: 'success',
          confirmButtonColor: '#333'
        });
        
        // Navigate only after the alert is completely closed
        router.push('/catalog');
        
      } catch (error) {
        console.error('Delete error:', error);
        await Swal.fire({
          title: error.message.includes("Network issue") ? 'Note' : 'Error',
          text: error.message,
          icon: error.message.includes("Network issue") ? 'info' : 'error',
          confirmButtonColor: '#333'
        });
        
        // If it was a network issue, we might want to redirect anyway
        if (error.message.includes("Network issue")) {
          setTimeout(() => {
            router.push('/catalog');
          }, 2000);
        }
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) {
      return "https://via.placeholder.com/400x600?text=Book+Cover";
    }

    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }

    const baseUrl = BACKEND.replace('/api', '');
    const imageName = imagePath.replace(/^books\//, '');
    return `${baseUrl}/storage/books/${encodeURIComponent(imageName)}`;
  };

  if (isLoading) return <BookSkeleton />;
    
  if (error)
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-sm">
          <div className="p-4 rounded-lg bg-gray-100 border-l-4 border-gray-800" role="alert">
            <p className="text-gray-800">Error: {error}</p>
          </div>
        </div>
      </div>
    );
    
  if (!book)
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-sm">
          <p className="text-gray-800">Book not found</p>
        </div>
      </div>
    );

  return (
    <div className="text-gray-800">

      {/* Main content section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back to Catalog button */}
        <div className="mb-6">
          <Link href="/catalog" className="inline-flex items-center py-2 px-4 rounded border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors">
            <ArrowLeft className="mr-2" /> Back to Catalog
          </Link>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Left column: Book cover and actions */}
          <div className="lg:w-1/3 xl:w-1/4 flex flex-col items-center lg:items-start">
            <div className="w-72 max-w-full aspect-[2/3] rounded-md shadow-md mb-6 border border-gray-200 bg-white p-2">
              <img
                src={getImageUrl(book.image)}
                alt={book.title}
                className="w-full h-full object-cover rounded-sm"
                onError={(e) => {
                  e.target.src = "https://via.placeholder.com/400x600?text=Book+Cover";
                }}
              />
            </div>

            {/* Action buttons */}
            <div className="w-full max-w-xs space-y-3">
              {isLoggedIn && (
                inLibrary ? (
                  <button
                    className="w-full py-2.5 px-4 rounded border border-gray-300 bg-white text-gray-700 font-medium flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-60"
                    onClick={handleRemoveFromLibrary}
                    disabled={isRemovingFromLibrary}
                  >
                    {isRemovingFromLibrary ? (
                      <LoadingSpinner size="w-5 h-5" color="text-gray-800" />
                    ) : (
                      <>
                        <DashCircle className="mr-2" />
                        Remove from Library
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    className="w-full py-2.5 px-4 rounded bg-gray-900 text-white font-medium flex items-center justify-center hover:bg-black transition-colors disabled:opacity-60"
                    onClick={handleAddToLibrary}
                    disabled={isAddingToLibrary}
                  >
                    {isAddingToLibrary ? (
                      <LoadingSpinner size="w-5 h-5" />
                    ) : (
                      <><PlusCircle className="mr-2" />Add to Library</>
                    )}
                  </button>
                )
              )}

              {isLoggedIn && userRole === 'teacher' && (
                <>
                  <button
                    className="w-full py-2.5 px-4 rounded border border-gray-300 bg-white text-gray-800 font-medium flex items-center justify-center hover:bg-gray-50 transition-colors"
                    onClick={() => router.push(`/book/${book.id}/edit`)}
                  >
                    <PencilSquare className="mr-2" />Edit Book
                  </button>
                  <button
                    className="w-full py-2.5 px-4 rounded border border-gray-300 bg-white text-gray-800 font-medium flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-60"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <LoadingSpinner size="w-5 h-5" color="text-gray-800" />
                    ) : (
                      <><Trash className="mr-2" />Delete Book</>
                    )}
                  </button>
                </>
              )}
            </div>

            {/* Book metadata card - visible on mobile only */}
            <div className="mt-8 lg:hidden w-full p-5 bg-white border border-gray-200 rounded-lg">
              <h3 className="text-lg font-semibold mb-3 pb-2 border-b border-gray-100">Book Details</h3>
              <ul className="space-y-2.5">
                <li className="flex items-start">
                  <Book className="flex-shrink-0 mt-1 mr-3 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">ISBN</p>
                    <p className="font-medium">{book.isbn || "Not available"}</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <Person className="flex-shrink-0 mt-1 mr-3 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Author</p>
                    <p className="font-medium">
                      {book.authors && book.authors.length > 0 
                        ? book.authors.map(author => author.name).join(', ')
                        : 'Unknown Author'}
                    </p>
                  </div>
                </li>
                <li className="flex items-start">
                  <Tag className="flex-shrink-0 mt-1 mr-3 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Categories</p>
                    <p className="font-medium">
                      {book.categories && book.categories.length > 0 
                        ? book.categories.map(cat => cat.name).join(', ')
                        : 'None'}
                    </p>
                  </div>
                </li>
                {book.price !== null && (
                  <li className="flex items-start">
                    <CurrencyDollar className="flex-shrink-0 mt-1 mr-3 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Price</p>
                      <p className="font-medium">₹{book.price}</p>
                    </div>
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Right column: Book details */}
          <div className="lg:w-2/3 xl:w-3/4">
            {/* Title and author section */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{book.title}</h1>
            </div>

            {/* Book details grid - visible on desktop only */}
            <div className="hidden lg:block mb-8 p-5 bg-white border border-gray-200 rounded-lg">
              <h3 className="text-lg font-semibold mb-3 pb-2 border-b border-gray-100">Book Details</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">ISBN</p>
                  <p className="font-medium">{book.isbn || "Not available"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Author</p>
                  <p className="font-medium">
                    {book.authors && book.authors.length > 0 
                      ? book.authors.map(author => author.name).join(', ')
                      : 'Unknown Author'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Categories</p>
                  <p className="font-medium">
                    {book.categories && book.categories.length > 0 
                      ? book.categories.map(cat => cat.name).join(', ')
                      : 'None'}
                  </p>
                </div>
                {book.price !== null && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Price</p>
                    <p className="font-medium">₹{book.price}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Book description */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 mb-8">
              <h2 className="text-xl font-semibold flex items-center mb-4 border-b border-gray-100 pb-2">
                <InfoCircle className="mr-2" /> About this Book
              </h2>
              <div className="prose max-w-none text-gray-700 leading-relaxed">
                {book.description ? (
                  <p>{book.description}</p>
                ) : (
                  <p className="text-gray-500 italic">No description available.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}