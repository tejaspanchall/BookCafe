'use client';

import { useState, useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import { AuthContext } from '@/components/context/AuthContext';
import CategorySelect from '@/components/books/CategorySelect';
import AuthorInput from '@/components/books/AuthorInput';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import { FileEarmarkPlus, Book, FileEarmarkArrowDown, FileEarmarkExcel, Upload, ArrowLeft, Trash, FileEarmarkCheck } from 'react-bootstrap-icons';

export default function AddBook() {
  const BACKEND = process.env.NEXT_PUBLIC_BACKEND;
  const router = useRouter();
  const { token, isTeacher } = useContext(AuthContext);
  const [activeOption, setActiveOption] = useState('single'); // 'single' or 'multiple'
  const [book, setBook] = useState({
    title: '',
    image: null,
    description: '',
    isbn: '',
    authors: [],
    categories: [],
    price: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  
  // Excel upload state variables
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [excelFile, setExcelFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingFileId, setProcessingFileId] = useState(null);

  const validateISBN = (isbn) => {
    // Remove any hyphens or spaces from the ISBN
    const cleanISBN = isbn.replace(/[-\s]/g, '');
    // Check if the ISBN contains only digits and is either 10 or 13 digits long
    return /^\d{10}$|^\d{13}$/.test(cleanISBN);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
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
        Swal.fire({
          title: 'Error!',
          text: 'Please upload a valid image file (JPEG, PNG, GIF)',
          icon: 'error',
          confirmButtonColor: 'var(--color-button-primary)'
        });
        e.target.value = '';
        return;
      }

      setBook({ ...book, image: file });
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (!token || !isTeacher()) {
        throw new Error('Only teachers can add books');
      }

      const requiredFields = ['title', 'isbn'];
      for (const field of requiredFields) {
        if (!book[field] || !book[field].trim()) {
          throw new Error(`${field.charAt(0).toUpperCase() + field.slice(1)} is required`);
        }
      }

      // Validate ISBN format
      if (!validateISBN(book.isbn)) {
        throw new Error('ISBN must be either 10 or 13 digits');
      }

      if (book.authors.length === 0) {
        throw new Error('At least one author is required');
      }

      if (book.price && isNaN(parseFloat(book.price))) {
        throw new Error('Price must be a valid number');
      }

      const formData = new FormData();
      formData.append('title', book.title.trim());
      formData.append('description', book.description.trim());
      formData.append('isbn', book.isbn.trim());
      if (book.authors.length > 0) {
        book.authors.forEach((author, index) => {
          formData.append(`authors[${index}]`, author.trim());
        });
      }
      if (book.categories.length > 0) {
        book.categories.forEach((category, index) => {
          formData.append(`categories[${index}]`, category.trim());
        });
      }
      if (book.price) {
        formData.append('price', parseFloat(book.price));
      }
      if (book.image) {
        formData.append('image', book.image);
      }
      
      // Flag to track if we should show success message
      let isSuccess = false;
      
      try {
        const response = await fetch(`${BACKEND}/books/add`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData,
        });
        
        if (response.ok) {
          isSuccess = true;
        } else {
          const errorText = await response.text();
          let errorMessage;
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error || 'Failed to add book';
          } catch (e) {
            errorMessage = 'Failed to add book. Please try again.';
          }
          throw new Error(errorMessage);
        }
      } catch (fetchError) {
        console.error("Fetch error:", fetchError);
        
        // This is the key part - we will check if the operation might have succeeded
        // despite a network error, especially in production environments
        
        // Wait a moment to let the server process the request
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Now check if the book was actually added by trying to fetch books
        try {
          const checkResponse = await fetch(`${BACKEND}/books/get-books`, {
            headers: { "Accept": "application/json" }
          });
          
          if (checkResponse.ok) {
            const data = await checkResponse.json();
            if (data.status === 'success' && Array.isArray(data.books)) {
              // Look for a book with matching title and ISBN that was just added
              const recentlyAddedBook = data.books.find(b => 
                b.title.trim() === book.title.trim() && 
                b.isbn.trim() === book.isbn.trim()
              );
              
              if (recentlyAddedBook) {
                console.log("Book was successfully added despite network error");
                isSuccess = true;
              }
            }
          }
        } catch (checkError) {
          console.error("Error checking if book was added:", checkError);
          // If this also fails, we'll go with the original error
        }
        
        if (!isSuccess) {
          throw new Error("Network issue detected. The book may have been added successfully. Please check the catalog.");
        }
      }

      // Success case
      await Swal.fire({
        title: 'Success!',
        text: 'Book added successfully!',
        icon: 'success',
        confirmButtonColor: 'var(--color-button-primary)'
      });
      
      // Navigate only after the alert is completely closed
      router.push('/catalog');
      
    } catch (error) {
      console.error("Add book error:", error);
      await Swal.fire({
        title: error.message.includes("Network issue") ? 'Note' : 'Error!',
        text: error.message,
        icon: error.message.includes("Network issue") ? 'info' : 'error',
        confirmButtonColor: 'var(--color-button-primary)'
      });
      
      // If it was a network issue, we might want to redirect anyway
      if (error.message.includes("Network issue")) {
        setTimeout(() => {
          router.push('/catalog');
        }, 2000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch uploaded Excel files when component mounts
  useEffect(() => {
    if (token && isTeacher() && activeOption === 'multiple') {
      fetchUploadedFiles();
    }
  }, [token, activeOption]);

  // Fetch Excel files that have been previously uploaded
  const fetchUploadedFiles = async () => {
    setIsLoading(true);
    try {
      const filesUrl = `${BACKEND}/excel-imports/files`;
      
      const response = await fetch(filesUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.status === 'success') {
          setUploadedFiles(data.files || []);
        } else {
          console.error('Failed to fetch uploaded files:', data.message);
        }
      } else {
        const errorText = await response.text();
        console.error('Error fetching files:', response.status, errorText);
      }
    } catch (error) {
      console.error('Error fetching uploaded files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Excel file selection
  const handleExcelFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFileError('');
    
    if (!selectedFile) {
      setExcelFile(null);
      return;
    }
    
    // Validate file type
    const validTypes = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'];
    if (!validTypes.includes(selectedFile.type)) {
      setFileError('Please select a valid Excel file (.xlsx, .xls, or .csv)');
      e.target.value = '';
      setExcelFile(null);
      return;
    }
    
    // Validate file size (10MB max)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setFileError('File size must be less than 10MB');
      e.target.value = '';
      setExcelFile(null);
      return;
    }
    
    setExcelFile(selectedFile);
  };

  // Upload Excel file
  const handleExcelUpload = async (e) => {
    e.preventDefault();
    
    if (!excelFile) {
      setFileError('Please select a file to upload');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('excel_file', excelFile);
      
      const response = await fetch(`${BACKEND}/excel-imports/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const responseText = await response.text();
      let data;
      
      try {
        data = JSON.parse(responseText);
      } catch (error) {
        throw new Error('Invalid JSON response from server');
      }
      
      if (response.ok && data.status === 'success') {
        // Save the file_id from the response for easy access
        const fileId = data.file_id;
        
        Swal.fire({
          title: 'Success!',
          text: 'Excel file uploaded successfully',
          icon: 'success',
          confirmButtonColor: 'var(--color-button-primary)'
        });
        
        setExcelFile(null);
        // Reset file input
        document.getElementById('excel-file-input').value = '';
        
        // Refresh the uploaded files list
        await fetchUploadedFiles();
        
        // Option to immediately import the uploaded file
        const importResult = await Swal.fire({
          title: 'Import Now?',
          text: 'Would you like to import the books from this file now?',
          icon: 'question',
          showCancelButton: true,
          confirmButtonColor: 'var(--color-button-primary)',
          cancelButtonColor: 'var(--color-text-light)',
          confirmButtonText: 'Yes, import now',
          cancelButtonText: 'No, I\'ll do it later'
        });
        
        if (importResult.isConfirmed) {
          // Call the import function with the new file_id
          handleImportBooks(fileId);
        }
      } else {
        throw new Error(data.message || data.error || 'Failed to upload file');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      Swal.fire({
        title: 'Error!',
        text: error.message || 'Failed to upload file',
        icon: 'error',
        confirmButtonColor: 'var(--color-button-primary)'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Delete Excel file
  const handleDeleteExcelFile = async (fileId) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This will permanently delete this Excel file',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--color-button-primary)',
      cancelButtonColor: 'var(--color-text-light)',
      confirmButtonText: 'Yes, delete it!'
    });
    
    if (result.isConfirmed) {
      try {
        const response = await fetch(`${BACKEND}/excel-imports/file/${fileId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'success') {
            Swal.fire({
              title: 'Deleted!',
              text: 'The file has been deleted',
              icon: 'success',
              confirmButtonColor: 'var(--color-button-primary)'
            });
            // Remove the deleted file from the list
            setUploadedFiles(uploadedFiles.filter(file => file.file_id !== fileId));
          } else {
            throw new Error(data.message || 'Failed to delete file');
          }
        } else {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to delete file');
        }
      } catch (error) {
        console.error('Error deleting file:', error);
        Swal.fire({
          title: 'Error!',
          text: error.message || 'Failed to delete file',
          icon: 'error',
          confirmButtonColor: 'var(--color-button-primary)'
        });
      }
    }
  };

  // Import books from Excel file
  const handleImportBooks = async (fileId) => {
    const result = await Swal.fire({
      title: 'Import Books',
      text: 'Are you sure you want to import books from this Excel file?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: 'var(--color-button-primary)',
      cancelButtonColor: 'var(--color-text-light)',
      confirmButtonText: 'Yes, import books'
    });
    
    if (result.isConfirmed) {
      try {
        setIsProcessing(true);
        setProcessingFileId(fileId);
        
        const response = await fetch(`${BACKEND}/excel-imports/import/${fileId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });
        
        // First get response as text for debugging
        const responseText = await response.text();
        console.log('Import response text:', responseText);
        
        // Try to parse as JSON
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          console.error('Failed to parse import response:', e);
          throw new Error('Invalid response from server');
        }
        
        if (response.ok && data.status === 'success') {
          Swal.fire({
            title: 'Success!',
            html: `
              <p>Books imported successfully.</p>
              <div class="text-left mt-4">
                <p><strong>Books added:</strong> ${data.results.success}</p>
                <p><strong>Failed entries:</strong> ${data.results.failed}</p>
                <p><strong>Duplicates:</strong> ${data.results.duplicates}</p>
              </div>
            `,
            icon: 'success',
            confirmButtonColor: 'var(--color-button-primary)'
          });
          
          // Refresh uploaded files list to reflect import status
          await fetchUploadedFiles();
          
          // Redirect to catalog after successful import
          router.push('/catalog');
        } else {
          throw new Error(data.message || data.error || 'Failed to import books');
        }
      } catch (error) {
        console.error('Error importing books:', error);
        Swal.fire({
          title: 'Error!',
          text: error.message || 'Failed to import books',
          icon: 'error',
          confirmButtonColor: 'var(--color-button-primary)'
        });
      } finally {
        setIsProcessing(false);
        setProcessingFileId(null);
      }
    }
  };

  // Download Excel template
  const handleDownloadTemplate = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${BACKEND}/excel-imports/template`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        // Create a blob from the response
        const blob = await response.blob();
        // Create a URL for the blob
        const url = window.URL.createObjectURL(blob);
        // Create a temporary anchor element
        const a = document.createElement('a');
        a.href = url;
        a.download = 'books_import_template.xlsx';
        // Trigger a click on the anchor
        document.body.appendChild(a);
        a.click();
        // Clean up
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorText = await response.text();
        let errorMessage;
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.error || 'Failed to download template';
        } catch (e) {
          // If we can't parse the response as JSON, use the text directly
          errorMessage = errorText || 'Failed to download template';
        }
        
        // Check for permission-related errors
        const isPermissionError = errorMessage.includes('Operation not permitted') || 
                                 errorMessage.includes('Permission denied') || 
                                 errorMessage.includes('Server permission error');
        
        Swal.fire({
          title: 'Error!',
          html: `${errorMessage}<br><br>
          ${isPermissionError ? 
            'Please use the <a href="/static/book_import_template.xlsx" download style="color:blue;text-decoration:underline;">static template</a> instead.' : 
            ''}`,
          icon: 'error',
          confirmButtonColor: 'var(--color-button-primary)'
        });
      }
    } catch (error) {
      console.error('Error downloading template:', error);
      
      // Check if it's a permission error
      const isPermissionError = error.message && (
        error.message.includes('Operation not permitted') || 
        error.message.includes('Permission denied') ||
        error.message.includes('Server permission error')
      );
      
      Swal.fire({
        title: 'Error!',
        html: `${error.message || 'Failed to download template'}<br><br>
        ${isPermissionError ? 
          'Please use the <a href="/static/book_import_template.xlsx" download style="color:blue;text-decoration:underline;">static template</a> instead.' : 
          ''}`,
        icon: 'error',
        confirmButtonColor: 'var(--color-button-primary)'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderOptionButtons = () => {
    return (
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4">
        <button
          type="button"
          className={`flex items-center justify-center py-2 sm:py-3 px-4 sm:px-6 rounded-lg text-base sm:text-lg transition-colors duration-200 ${
            activeOption === 'single'
              ? 'bg-[var(--color-button-primary)] text-white'
              : 'bg-transparent text-[var(--color-text-primary)] border border-[var(--color-border)]'
          }`}
          onClick={() => setActiveOption('single')}
        >
          <Book className="mr-2" />
          Add Single Book
        </button>
        
        <Link 
          href="/add-multiple-books"
          className={`flex items-center justify-center py-2 sm:py-3 px-4 sm:px-6 rounded-lg text-base sm:text-lg transition-colors duration-200 
            bg-transparent text-[var(--color-text-primary)] border border-[var(--color-border)]
            hover:bg-[var(--color-button-hover)] hover:text-white`}
        >
          <FileEarmarkPlus className="mr-2" />
          Add Multiple Books
        </Link>
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto py-4 sm:py-8 px-3 sm:px-4">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center text-[var(--color-text-primary)]">Add Books</h1>
      
      {/* {renderOptionButtons()} */}
      
      {activeOption === 'single' ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block mb-2 text-[var(--color-text-primary)] font-medium">Book Title</label>
            <input
              type="text"
              className="w-full p-3 bg-transparent rounded focus:outline-none"
              style={{ 
                color: 'var(--color-text-primary)',
                borderColor: 'var(--color-border)',
                borderWidth: '1px',
              }}
              placeholder="Enter book title"
              value={book.title}
              onChange={(e) => setBook({ ...book, title: e.target.value })}
              required
              disabled={isLoading}
            />
          </div>
          
          <div>
            <label className="block mb-2 text-[var(--color-text-primary)] font-medium">Cover Image</label>
            <input
              type="file"
              accept="image/*"
              className="w-full p-3 bg-transparent rounded focus:outline-none"
              style={{ 
                color: 'var(--color-text-primary)',
                borderColor: 'var(--color-border)',
                borderWidth: '1px',
              }}
              onChange={handleImageChange}
              disabled={isLoading}
            />
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
              className="w-full p-3 bg-transparent rounded focus:outline-none"
              style={{ 
                color: 'var(--color-text-primary)',
                borderColor: 'var(--color-border)',
                borderWidth: '1px',
              }}
              placeholder="Enter book description"
              value={book.description}
              onChange={(e) => setBook({ ...book, description: e.target.value })}
              rows="4"
              disabled={isLoading}
            />
          </div>
          
          <div>
            <label className="block mb-2 text-[var(--color-text-primary)] font-medium">ISBN</label>
            <input
              type="text"
              className={`w-full p-3 bg-transparent rounded focus:outline-none ${
                book.isbn && !validateISBN(book.isbn) ? 'border-red-500' : ''
              }`}
              style={{ 
                color: 'var(--color-text-primary)',
                borderColor: book.isbn && !validateISBN(book.isbn) ? '' : 'var(--color-border)',
                borderWidth: '1px',
              }}
              placeholder="Enter ISBN number (10 or 13 digits)"
              value={book.isbn}
              onChange={(e) => setBook({ ...book, isbn: e.target.value })}
              required
              disabled={isLoading}
            />
            {book.isbn && !validateISBN(book.isbn) && (
              <p className="mt-1 text-sm text-red-500">
                ISBN must be either 10 or 13 digits (hyphens and spaces are allowed)
              </p>
            )}
          </div>
          
          <div>
            <label className="block mb-2 text-[var(--color-text-primary)] font-medium">Author(s)</label>
            <AuthorInput 
              value={book.authors}
              onChange={(value) => setBook({ ...book, authors: value })}
              style={{ 
                backgroundColor: "transparent",
                borderColor: "var(--color-border)",
                color: "var(--color-text-primary)"
              }}
              disabled={isLoading}
            />
          </div>
          
          <div>
            <label className="block mb-2 text-[var(--color-text-primary)] font-medium">Categories</label>
            <CategorySelect 
              value={book.categories}
              onChange={(value) => setBook({ ...book, categories: value })}
              style={{ 
                backgroundColor: "transparent",
                borderColor: "var(--color-border)",
                color: "var(--color-text-primary)"
              }}
              disabled={isLoading}
            />
          </div>
          
          <div>
            <label className="block mb-2 text-[var(--color-text-primary)] font-medium">Price (₹)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-full p-3 bg-transparent rounded focus:outline-none"
              style={{ 
                color: 'var(--color-text-primary)',
                borderColor: 'var(--color-border)',
                borderWidth: '1px',
              }}
              placeholder="Enter book price"
              value={book.price}
              onChange={(e) => setBook({ ...book, price: e.target.value })}
              disabled={isLoading}
            />
          </div>
          
          <div className="pt-4">
            <button 
              type="submit" 
              className="w-full py-3 rounded-lg text-lg font-medium transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              style={{ 
                backgroundColor: isLoading || !validateISBN(book.isbn) ? 'var(--color-text-light)' : 'var(--color-button-primary)',
                color: 'var(--color-bg-primary)', 
              }}
              onMouseOver={(e) => !isLoading && validateISBN(book.isbn) && (e.currentTarget.style.backgroundColor = 'var(--color-button-hover)')}
              onMouseOut={(e) => !isLoading && validateISBN(book.isbn) && (e.currentTarget.style.backgroundColor = 'var(--color-button-primary)')}
              disabled={isLoading || !validateISBN(book.isbn)}
            >
              {isLoading ? (
                <LoadingSpinner size="w-5 h-5" color="text-white" />
              ) : 'Add Book'}
            </button>
          </div>
          
          <div className="text-center pt-2">
            <Link 
              href="/dashboard" 
              className="text-[var(--color-link)] hover:underline font-medium"
            >
              Back to Dashboard
            </Link>
          </div>
        </form>
      ) : (
        <div className="bg-[var(--color-card-bg)] rounded-xl p-4 sm:p-6 shadow-sm">
          <div className="text-center mb-6 sm:mb-8">
            <img 
              src="/excel-import.svg" 
              alt="Excel Import" 
              className="mx-auto w-20 h-20 sm:w-24 sm:h-24 mb-3 sm:mb-4"
            />
            <h2 className="text-xl sm:text-2xl mb-3 sm:mb-4 text-[var(--color-text-primary)]">Add Multiple Books via Excel</h2>
            <p className="mb-4 text-sm sm:text-base text-[var(--color-text-secondary)]">
              Upload an Excel file with multiple book records to quickly add them to your catalog.
            </p>
            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm bg-transparent border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-md hover:bg-[var(--color-bg-hover)] transition-colors duration-200 mb-6 sm:mb-8"
              disabled={isLoading}
            >
              <FileEarmarkArrowDown className="mr-1 sm:mr-2" />
              Download Template
            </button>
            <p className="text-xs text-[var(--color-text-secondary)]">
              If template download fails, use the 
              <a 
                href="/static/book_import_template.xlsx" 
                download 
                className="mx-1 text-[var(--color-link)] hover:underline"
              >
                static template
              </a>
              instead.
            </p>
          </div>

          {/* Upload Form */}
          <form onSubmit={handleExcelUpload} className="mb-8">
            <div className="mb-4">
              <label className="block mb-2 text-[var(--color-text-primary)] font-medium">Select Excel File</label>
              <div className="relative">
                <input
                  id="excel-file-input"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="w-full p-3 bg-transparent rounded focus:outline-none text-sm"
                  style={{ 
                    color: 'var(--color-text-primary)',
                    borderColor: 'var(--color-border)',
                    borderWidth: '1px',
                  }}
                  onChange={handleExcelFileChange}
                  disabled={isLoading}
                />
              </div>
              {fileError && (
                <p className="mt-2 text-red-500 text-sm">{fileError}</p>
              )}
              <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
                Required columns: title, isbn, authors (comma-separated). Optional: description, categories (comma-separated), price, image_url.
                <a 
                  href="/static/book_import_template.xlsx" 
                  download 
                  className="ml-1 text-[var(--color-link)] hover:underline"
                >
                  Download static template
                </a>
              </p>
            </div>
            <button 
              type="submit" 
              className="w-full py-3 rounded-lg text-lg font-medium transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              style={{ 
                backgroundColor: isLoading ? 'var(--color-text-light)' : 'var(--color-button-primary)',
                color: 'var(--color-bg-primary)', 
              }}
              disabled={isLoading || !excelFile}
            >
              {isLoading ? (
                <LoadingSpinner size="w-5 h-5" color="text-white" />
              ) : (
                <>
                  <Upload className="mr-2" />
                  Upload Excel File
                </>
              )}
            </button>
          </form>

          {/* Previously Uploaded Files */}
          {uploadedFiles.length > 0 && (
            <div>
              <h3 className="text-xl mb-4 text-[var(--color-text-primary)]">Previously Uploaded Files</h3>
              <div className="space-y-4">
                {uploadedFiles.map((file) => (
                  <div 
                    key={file.file_id} 
                    className="p-4 rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-3"
                  >
                    <div className="flex items-center w-full">
                      <FileEarmarkExcel className="text-green-500 text-xl min-w-[1.25rem] mr-3" />
                      <div className="overflow-hidden">
                        <p className="font-medium text-[var(--color-text-primary)] truncate">{file.original_name}</p>
                        <p className="text-sm text-[var(--color-text-secondary)]">Uploaded: {new Date(file.uploaded_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2 w-full sm:w-auto justify-end mt-2 sm:mt-0">
                      <button
                        onClick={() => handleImportBooks(file.file_id)}
                        className="p-2 rounded text-white bg-[var(--color-button-primary)] hover:bg-[var(--color-button-hover)] transition-colors duration-200 disabled:opacity-50 flex items-center gap-1"
                        disabled={isProcessing && processingFileId === file.file_id}
                      >
                        {isProcessing && processingFileId === file.file_id ? (
                          <LoadingSpinner size="w-5 h-5" color="text-white" />
                        ) : (
                          <>
                            <FileEarmarkCheck title="Import Books" />
                            <span className="sm:hidden text-sm">Import</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteExcelFile(file.file_id)}
                        className="p-2 rounded text-white bg-red-500 hover:bg-red-600 transition-colors duration-200 disabled:opacity-50 flex items-center gap-1"
                        disabled={isProcessing}
                      >
                        <Trash title="Delete File" />
                        <span className="sm:hidden text-sm">Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="text-center mt-6">
            <Link 
              href="/dashboard" 
              className="text-[var(--color-link)] hover:underline font-medium"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}