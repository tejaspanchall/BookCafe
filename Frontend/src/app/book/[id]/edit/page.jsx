'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useContext } from 'react';
import { AuthContext } from '@/components/context/AuthContext';
import Swal from 'sweetalert2';
import LoadingSpinner from '@/components/LoadingSpinner';
import CategorySelect from '@/components/books/CategorySelect';
import AuthorInput from '@/components/books/AuthorInput';

const getStorageValue = (key) => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.error(`Error accessing localStorage for key ${key}:`, e);
    return null;
  }
};

export default function EditBook() {
  const BACKEND = process.env.NEXT_PUBLIC_BACKEND;
  const { id } = useParams();
  const router = useRouter();
  const { token, user, authState, logout } = useContext(AuthContext);
  const [book, setBook] = useState(null);
  const [editedBook, setEditedBook] = useState({
    title: "",
    authors: [],
    isbn: "",
    description: "",
    image: null,
    categories: [],
    price: ""
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [previewUrl, setPreviewUrl] = useState('');

  const validateISBN = (isbn) => {
    // Remove any hyphens or spaces from the ISBN
    const cleanISBN = isbn.replace(/[-\s]/g, '');
    // Check if the ISBN contains only digits and is either 10 or 13 digits long
    return /^\d{10}$|^\d{13}$/.test(cleanISBN);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const currentToken = token || getStorageValue('token');
    const currentUser = user || (() => {
      try {
        const stored = getStorageValue('user');
        return stored ? JSON.parse(stored) : null;
      } catch (e) {
        return null;
      }
    })();

    if (!currentToken || !currentUser || currentUser.role !== 'teacher') {
      Swal.fire({
        icon: 'error',
        title: 'Access Denied',
        text: 'You must be logged in as a teacher to edit books',
        confirmButtonColor: 'var(--color-button-primary)'
      }).then(() => {
        router.push('/login');
      });
      setIsLoading(false);
      return;
    }

    const fetchBook = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`${BACKEND}/books/get-books?id=${id}`, {
          headers: { 
            "Accept": "application/json",
            "Authorization": `Bearer ${currentToken}`
          }
        });

        if (res.status === 401) {
          throw new Error("Your session has expired. Please log in again.");
        }

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
        setEditedBook({ 
          ...foundBook,
          categories: foundBook.categories ? foundBook.categories.map(cat => cat.name) : [],
          authors: foundBook.authors ? foundBook.authors.map(auth => auth.name) : [],
          image: null // Reset image to null since we'll handle it as a file
        });

        const getImageUrl = (imagePath) => {
          console.log('EditBook - Processing image path:', {
            originalPath: imagePath,
            backendUrl: BACKEND
          });

          if (!imagePath) {
            console.log('EditBook - No image path, using placeholder');
            return null;
          }

          // If it's already a full URL (starts with http:// or https://)
          if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
            console.log('EditBook - Using direct URL:', imagePath);
            return imagePath;
          }

          // Remove /api/ from BACKEND URL if it exists
          const baseUrl = BACKEND.replace('/api', '');

          // For local storage paths, ensure we don't duplicate the 'books' directory
          const imageName = imagePath.replace(/^books\//, '');
          const finalUrl = `${baseUrl}/storage/books/${imageName}`;
          console.log('EditBook - Constructed storage URL:', {
            baseUrl,
            imagePath,
            imageName,
            finalUrl
          });
          return finalUrl;
        };

        // Set the preview URL to the current image if it exists
        if (foundBook.image) {
          const previewPath = getImageUrl(foundBook.image);
          console.log('EditBook - Setting preview URL:', {
            originalImage: foundBook.image,
            constructedUrl: previewPath
          });
          setPreviewUrl(previewPath);
        }
      } catch (error) {
        console.error("Fetch error:", error);
        setError(error.message);
        
        if (error.message.includes("session has expired")) {
          Swal.fire({
            icon: 'error',
            title: 'Session Expired',
            text: 'Your session has expired. You will be redirected to login.',
            timer: 2000,
            timerProgressBar: true
          });
          
          setTimeout(() => {
            logout();
            router.refresh();
            router.push("/login");
          }, 2000);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchBook();
  }, [id, token, user, router, BACKEND]);

  useEffect(() => {
    // Map author data when book data is loaded
    if (book && book.authors) {
      console.log('EditBook - Setting authors:', book.authors);
      // Extract author names from the authors array
      const authorNames = book.authors.map(author => author.name);
      setEditedBook(prev => ({
        ...prev,
        authors: authorNames
      }));
    }
  }, [book]);

  const validateForm = () => {
    const errors = {};
    const requiredFields = ['title', 'isbn', 'description'];
    
    requiredFields.forEach(field => {
      if (!editedBook[field]?.trim()) {
        errors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
      }
    });

    // Validate ISBN format
    if (!validateISBN(editedBook.isbn)) {
      errors.isbn = 'ISBN must be either 10 or 13 digits';
    }

    if (editedBook.authors.length === 0) {
      errors.authors = 'At least one author is required';
    }

    if (editedBook.price && isNaN(parseFloat(editedBook.price))) {
      errors.price = 'Price must be a valid number';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      console.log('EditBook - New image selected:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });

      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        console.warn('EditBook - Image too large:', {
          fileSize: file.size,
          maxSize: 2 * 1024 * 1024
        });
        Swal.fire({
          title: 'Error!',
          text: 'Image size should not exceed 2MB',
          icon: 'error',
          confirmButtonColor: 'var(--color-button-primary)'
        });
        e.target.value = '';
        return;
      }

      if (!['image/jpeg', 'image/png', 'image/gif', 'image/jpg'].includes(file.type)) {
        console.warn('EditBook - Invalid image type:', {
          fileType: file.type,
          allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/jpg']
        });
        Swal.fire({
          title: 'Error!',
          text: 'Please upload a valid image file (JPEG, PNG, GIF)',
          icon: 'error',
          confirmButtonColor: 'var(--color-button-primary)'
        });
        e.target.value = '';
        return;
      }

      setEditedBook({ ...editedBook, image: file });
      const previewUrl = URL.createObjectURL(file);
      console.log('EditBook - Preview URL created:', previewUrl);
      setPreviewUrl(previewUrl);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedBook((prev) => ({ ...prev, [name]: value }));
    
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    const currentToken = token || getStorageValue('token');
    const currentUser = user || (() => {
      try {
        const stored = getStorageValue('user');
        return stored ? JSON.parse(stored) : null;
      } catch (e) {
        return null;
      }
    })();

    if (!currentToken || !currentUser || currentUser.role !== 'teacher') {
      Swal.fire({
        icon: 'error',
        title: 'Access Denied',
        text: 'You must be logged in as a teacher to edit books',
        confirmButtonColor: 'var(--color-button-primary)'
      }).then(() => {
        router.push('/login');
      });
      return;
    }
    
    setValidationErrors({});
    setIsSaving(true);
    
    // Flag to track if we should show success message
    let isSuccess = false;
    
    try {
      const formData = new FormData();
      formData.append('title', editedBook.title.trim());
      formData.append('isbn', editedBook.isbn.trim());
      formData.append('description', editedBook.description?.trim() || '');
      
      if (editedBook.authors && editedBook.authors.length > 0) {
        editedBook.authors.forEach((author, index) => {
          formData.append(`authors[${index}]`, author.trim());
        });
      }
      
      if (editedBook.categories && editedBook.categories.length > 0) {
        editedBook.categories.forEach((category, index) => {
          formData.append(`categories[${index}]`, category.trim());
        });
      }
      
      if (editedBook.price) {
        formData.append('price', parseFloat(editedBook.price));
      }
      if (editedBook.image) {
        formData.append('image', editedBook.image);
      }

      try {
        const response = await fetch(`${BACKEND}/books/${id}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentToken}`,
            'X-HTTP-Method-Override': 'PUT'
          },
          body: formData
        });
        
        if (response.status === 401) {
          throw new Error("Your session has expired. Please log in again.");
        }
        
        if (response.ok) {
          isSuccess = true;
        } else {
          const errorText = await response.text();
          let errorMessage;
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error || 'Failed to update book';
          } catch (e) {
            errorMessage = 'Failed to update book. Please try again.';
          }
          throw new Error(errorMessage);
        }
      } catch (fetchError) {
        console.error("Network error:", fetchError);
        
        // Wait a moment to let the server process the request
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if the book was actually updated by trying to fetch it again
        try {
          const checkResponse = await fetch(`${BACKEND}/books/get-books?id=${id}`, {
            headers: { "Accept": "application/json" }
          });
          
          if (checkResponse.ok) {
            const data = await checkResponse.json();
            if (data.status === 'success' && Array.isArray(data.books)) {
              // Look for the updated book
              const updatedBook = data.books.find(b => b.id == id);
              
              if (updatedBook && 
                  updatedBook.title.trim() === editedBook.title.trim() && 
                  updatedBook.isbn.trim() === editedBook.isbn.trim()) {
                console.log("Book was successfully updated despite network error");
                isSuccess = true;
              }
            }
          }
        } catch (checkError) {
          console.error("Error checking if book was updated:", checkError);
        }
        
        if (!isSuccess) {
          throw new Error("Network issue detected. The book may have been updated. Please check the catalog.");
        }
      }
      
      // Show success message without attempting to parse the response
      await Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Book updated successfully',
        confirmButtonColor: 'var(--color-button-primary)'
      });
      
      // Navigate only after the alert is completely closed
      window.location.href = `/book/${id}`;
      
    } catch (error) {
      console.error("Update error:", error);
      
      await Swal.fire({
        icon: error.message.includes("Network issue") ? 'info' : 'error',
        title: error.message.includes("Network issue") ? 'Note' : 'Error',
        text: error.message || "An unexpected error occurred",
        confirmButtonColor: 'var(--color-button-primary)'
      });
      
      // If it was a network issue, we might want to redirect anyway
      if (error.message.includes("Network issue")) {
        setTimeout(() => {
          window.location.href = `/book/${id}`;
        }, 2000);
      } else if (error.message.includes("session has expired")) {
        setTimeout(() => {
          logout();
          router.refresh();
          router.push("/login");
        }, 2000);
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8 text-center text-[var(--color-text-primary)]">Edit Book</h1>
        <LoadingSpinner />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4 text-center">
        <h1 className="text-3xl font-bold mb-4 text-[var(--color-danger)]">Error</h1>
        <p className="text-[var(--color-text-primary)] mb-6">{error}</p>
        <button 
          onClick={() => router.push('/catalog')}
          className="w-full max-w-xs py-3 rounded-lg text-lg font-medium transition duration-300"
          style={{ 
            backgroundColor: 'var(--color-button-primary)',
            color: 'var(--color-bg-primary)'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-button-hover)'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--color-button-primary)'}
        >
          Back to Catalog
        </button>
      </div>
    );
  }
  
  if (!book) {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center text-[var(--color-text-primary)]">Edit Book</h1>
      
      <form onSubmit={handleSaveEdit} className="space-y-6">
        <div>
          <label className="block mb-2 text-[var(--color-text-primary)] font-medium">Book Title</label>
          <input
            type="text"
            name="title"
            value={editedBook.title}
            onChange={handleInputChange}
            className="w-full p-3 bg-transparent rounded focus:outline-none"
            style={{ 
              color: 'var(--color-text-primary)',
              borderColor: validationErrors.title ? "red" : 'var(--color-border)',
              borderWidth: '1px',
            }}
            placeholder="Enter book title"
          />
          {validationErrors.title && (
            <p className="text-red-500 text-sm mt-1">{validationErrors.title}</p>
          )}
        </div>

        <div>
          <label className="block mb-2 text-[var(--color-text-primary)] font-medium">Cover Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="w-full p-3 bg-transparent rounded focus:outline-none"
            style={{ 
              color: 'var(--color-text-primary)',
              borderColor: validationErrors.image ? "red" : 'var(--color-border)',
              borderWidth: '1px',
            }}
          />
          {validationErrors.image && (
            <p className="text-red-500 text-sm mt-1">{validationErrors.image}</p>
          )}
          {previewUrl && (
            <div className="mt-4 flex justify-center">
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="max-w-full h-auto max-h-64 rounded"
                style={{ objectFit: 'contain' }}
              />
            </div>
          )}
        </div>

        <div>
          <label className="block mb-2 text-[var(--color-text-primary)] font-medium">Description</label>
          <textarea
            name="description"
            value={editedBook.description}
            onChange={handleInputChange}
            rows="4"
            className="w-full p-3 bg-transparent rounded focus:outline-none"
            style={{ 
              color: 'var(--color-text-primary)',
              borderColor: validationErrors.description ? "red" : 'var(--color-border)',
              borderWidth: '1px',
            }}
            placeholder="Enter book description"
          />
          {validationErrors.description && (
            <p className="text-red-500 text-sm mt-1">{validationErrors.description}</p>
          )}
        </div>

        <div>
          <label className="block mb-2 text-[var(--color-text-primary)] font-medium">ISBN</label>
          <input
            type="text"
            name="isbn"
            value={editedBook.isbn}
            onChange={handleInputChange}
            className={`w-full p-3 bg-transparent rounded focus:outline-none ${
              validationErrors.isbn || (editedBook.isbn && !validateISBN(editedBook.isbn)) ? 'border-red-500' : ''
            }`}
            style={{ 
              color: 'var(--color-text-primary)',
              borderColor: validationErrors.isbn || (editedBook.isbn && !validateISBN(editedBook.isbn)) ? '' : 'var(--color-border)',
              borderWidth: '1px',
            }}
            placeholder="Enter ISBN number (10 or 13 digits)"
          />
          {(validationErrors.isbn || (editedBook.isbn && !validateISBN(editedBook.isbn))) && (
            <p className="text-red-500 text-sm mt-1">
              {validationErrors.isbn || 'ISBN must be either 10 or 13 digits (hyphens and spaces are allowed)'}
            </p>
          )}
        </div>

        <div>
          <label className="block mb-2 text-[var(--color-text-primary)] font-medium">Author(s)</label>
          <AuthorInput
            value={editedBook.authors}
            onChange={(value) => setEditedBook({ ...editedBook, authors: value })}
            style={{ 
              backgroundColor: "transparent",
              borderColor: validationErrors.authors ? "red" : "var(--color-border)",
              color: "var(--color-text-primary)"
            }}
          />
          {validationErrors.authors && (
            <p className="text-red-500 text-sm mt-1">{validationErrors.authors}</p>
          )}
        </div>

        <div>
          <label className="block mb-2 text-[var(--color-text-primary)] font-medium">Categories</label>
          <CategorySelect
            value={editedBook.categories}
            onChange={(value) => setEditedBook({ ...editedBook, categories: value })}
            style={{ 
              backgroundColor: "transparent",
              borderColor: "var(--color-border)",
              color: "var(--color-text-primary)"
            }}
          />
        </div>

        <div>
          <label className="block mb-2 text-[var(--color-text-primary)] font-medium">Price (₹)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            name="price"
            value={editedBook.price}
            onChange={handleInputChange}
            className="w-full p-3 bg-transparent rounded focus:outline-none"
            style={{ 
              color: 'var(--color-text-primary)',
              borderColor: validationErrors.price ? "red" : 'var(--color-border)',
              borderWidth: '1px',
            }}
            placeholder="Enter book price"
          />
          {validationErrors.price && (
            <p className="text-red-500 text-sm mt-1">{validationErrors.price}</p>
          )}
        </div>

        <div className="pt-4">
          <button
            type="submit"
            className="w-full py-3 rounded-lg text-lg font-medium transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            style={{ 
              backgroundColor: isSaving || !validateISBN(editedBook.isbn) ? 'var(--color-text-light)' : 'var(--color-button-primary)',
              color: 'var(--color-bg-primary)', 
            }}
            onMouseOver={(e) => !isSaving && validateISBN(editedBook.isbn) && (e.currentTarget.style.backgroundColor = 'var(--color-button-hover)')}
            onMouseOut={(e) => !isSaving && validateISBN(editedBook.isbn) && (e.currentTarget.style.backgroundColor = 'var(--color-button-primary)')}
            disabled={isSaving || !validateISBN(editedBook.isbn)}
          >
            {isSaving ? <div className="flex justify-center items-center"><LoadingSpinner size="w-5 h-5" color="text-white" /></div> : 'Save Changes'}
          </button>
        </div>
        
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-[var(--color-link)] hover:underline font-medium"
          >
            Back to Book Details
          </button>
        </div>
      </form>
    </div>
  );
}