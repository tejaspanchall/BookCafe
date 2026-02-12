'use client';

import { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { AuthContext } from '@/components/context/AuthContext';
import Swal from 'sweetalert2';

export default function RecentBooks() {
  const BACKEND = process.env.NEXT_PUBLIC_BACKEND;
  const router = useRouter();
  const { token } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [recentBooks, setRecentBooks] = useState([]);

  const fetchRecentBooks = async () => {
    try {
      const response = await fetch(`${BACKEND}/books/recent`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch recent books');
      const data = await response.json();
      setRecentBooks(data.books || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching recent books:', error);
      setRecentBooks([]);
      setLoading(false);
    }
  };

  // Initial fetch when component mounts
  useEffect(() => {
    fetchRecentBooks();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchRecentBooks();
    }, 30000); // 30 seconds

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  // Add event listener for custom event that can be triggered when a new book is added
  useEffect(() => {
    const handleBookAdded = () => {
      fetchRecentBooks();
    };

    window.addEventListener('bookAdded', handleBookAdded);
    return () => window.removeEventListener('bookAdded', handleBookAdded);
  }, []);

  const handleToggleLive = async (bookId) => {
    try {
      const response = await fetch(`${BACKEND}/books/${bookId}/toggle-live`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to toggle book status');
      
      const data = await response.json();
      
      // Update the book in the list
      setRecentBooks(books => books.map(book => 
        book.id === bookId ? { ...book, is_live: !book.is_live } : book
      ));

      // Show success message
      Swal.fire({
        title: 'Success!',
        text: data.message,
        icon: 'success',
        confirmButtonColor: 'var(--color-button-primary)'
      });
    } catch (error) {
      console.error('Error toggling book status:', error);
      Swal.fire({
        title: 'Error!',
        text: 'Failed to toggle book status',
        icon: 'error',
        confirmButtonColor: 'var(--color-button-primary)'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Recently Added Books</h1>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Back
          </button>
        </div>

        <div className="space-y-4">
          {recentBooks.map((book) => (
            <div key={book.id} className="bg-white rounded-lg shadow-sm p-4 flex items-center border border-gray-100">
              <div className="flex-shrink-0 w-16 h-20 mr-4">
                <img
                  src={book.image_url || '/default-book-cover.jpg'}
                  alt={book.title}
                  className="w-full h-full object-cover rounded"
                />
              </div>
              <div className="flex-grow">
                <h3 
                  onClick={() => router.push(`/book/${book.id}`)}
                  className="font-semibold text-lg hover:text-[var(--color-primary)] cursor-pointer transition-colors"
                >
                  {book.title}
                </h3>
                <p className="text-gray-600 text-sm">
                  {book.authors?.map(author => author.name).join(', ')}
                </p>
                <div className="flex items-center text-gray-500 text-xs mt-1">
                  <span>Added on {new Date(book.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="relative inline-flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={book.is_live}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleToggleLive(book.id);
                    }}
                  />
                  <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--color-primary)] rounded-full peer 
                    peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] 
                    after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 
                    after:w-5 after:transition-all peer-checked:bg-green-500`}>
                  </div>
                  <span className="absolute hidden group-hover:block whitespace-nowrap bg-gray-800 text-white text-xs rounded px-2 py-1 -top-8 left-1/2 transform -translate-x-1/2">
                    {book.is_live ? 'Live' : 'Hidden'}
                  </span>
                </label>
              </div>
            </div>
          ))}
          {recentBooks.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No books have been added recently.
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 