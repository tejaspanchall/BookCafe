'use client';

import { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Swal from 'sweetalert2';
import { AuthContext } from '@/components/context/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { FileEarmarkArrowDown, FileEarmarkExcel, Upload, ArrowLeft, Trash, FileEarmarkCheck, Download } from 'react-bootstrap-icons';

export default function AddMultipleBooks() {
  const BACKEND = process.env.NEXT_PUBLIC_BACKEND;
  const router = useRouter();
  const { token, isTeacher } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingFileId, setProcessingFileId] = useState(null);

  useEffect(() => {
    if (!token || !isTeacher()) {
      router.push('/');
      return;
    }
    
    fetchUploadedFiles();
  }, [token, router]);

  const fetchUploadedFiles = async () => {
    setIsLoading(true);
    try {
      const filesUrl = `${BACKEND}/excel-imports/files`;
      console.log('Fetching files from URL:', filesUrl);
      
      const response = await fetch(filesUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Files response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Files response data:', data);
        
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

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFileError('');
    
    if (!selectedFile) {
      setFile(null);
      return;
    }
    
    // Validate file type
    const validTypes = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'];
    if (!validTypes.includes(selectedFile.type)) {
      setFileError('Please select a valid Excel file (.xlsx, .xls, or .csv)');
      e.target.value = '';
      setFile(null);
      return;
    }
    
    // Validate file size (10MB max)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setFileError('File size must be less than 10MB');
      e.target.value = '';
      setFile(null);
      return;
    }
    
    setFile(selectedFile);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setFileError('Please select a file to upload');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('excel_file', file);
      
      // Log upload attempt
      console.log('Uploading file:', file.name);
      console.log('File size:', file.size);
      console.log('File type:', file.type);
      console.log('Upload URL:', `${BACKEND}/excel-imports/upload`);
      
      const response = await fetch(`${BACKEND}/excel-imports/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Don't set Content-Type with FormData, browser will set it with boundary
        },
        body: formData
      });
      
      console.log('Upload response status:', response.status);
      console.log('Upload response status text:', response.statusText);
      
      // Get response as text first for debugging
      const responseText = await response.text();
      console.log('Raw upload response:', responseText);
      
      // Try to parse the response
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('Parsed upload response:', data);
      } catch (error) {
        console.error('Failed to parse upload response as JSON:', error);
        throw new Error('Invalid JSON response from server');
      }
      
      if (response.ok && data.status === 'success') {
        // Save the file_id from the response for easy access
        const fileId = data.file_id;
        console.log('Uploaded successfully. File ID:', fileId);
        
        Swal.fire({
          title: 'Success!',
          text: 'Excel file uploaded successfully',
          icon: 'success',
          confirmButtonColor: 'var(--color-button-primary)'
        });
        
        setFile(null);
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
          handleImport(fileId);
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

  const handleDeleteFile = async (fileId) => {
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

  const handleImport = async (fileId) => {
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
      setIsProcessing(true);
      setProcessingFileId(fileId);
      
      try {
        // Log the URL being used to help with debugging
        const importUrl = `${BACKEND}/excel-imports/import/${fileId}`;
        console.log('Importing from URL:', importUrl);
        console.log('Using authorization token:', token ? 'Token exists' : 'No token');
        
        // Make the import request
        const response = await fetch(importUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          // Add empty body to ensure proper POST request formatting
          body: JSON.stringify({})
        });
        
        // Log response status and headers
        console.log('Import response status:', response.status);
        console.log('Import response status text:', response.statusText);
        console.log('Import response headers:', [...response.headers.entries()]);
        
        // Get the response as text first for debugging
        const responseText = await response.text();
        console.log('Raw response text:', responseText);
        
        // Try to parse the response as JSON
        let data;
        try {
          data = JSON.parse(responseText);
          console.log('Parsed response data:', data);
        } catch (error) {
          console.error('Failed to parse response as JSON:', error);
          throw new Error('Invalid JSON response from server');
        }
        
        if (response.ok && data.status === 'success') {
          let resultMessage = `Successfully imported ${data.results.success} books.`;
          
          // Build detailed message
          let duplicateMessage = '';
          if (data.results.duplicates > 0) {
            duplicateMessage = `<div class="mt-4"><strong>${data.results.duplicates} duplicate entries were found:</strong>`;
            duplicateMessage += '<ul class="mt-2 text-left">';
            
            // Show only book titles for duplicates
            data.results.duplicate_details.slice(0, 5).forEach(duplicate => {
              duplicateMessage += `<li>"${duplicate.title}"</li>`;
            });
            
            if (data.results.duplicate_details.length > 5) {
              duplicateMessage += `<li>...and ${data.results.duplicate_details.length - 5} more duplicate entries</li>`;
            }
            
            duplicateMessage += '</ul></div>';
          }
          
          let errorMessage = '';
          if (data.results.failed > 0) {
            errorMessage = `<div class="mt-4"><strong>${data.results.failed} records failed validation:</strong>`;
            errorMessage += '<ul class="mt-2 text-left">';
            
            data.results.errors.slice(0, 5).forEach(error => {
              errorMessage += `<li>${error}</li>`;
            });
            
            if (data.results.errors.length > 5) {
              errorMessage += `<li>...and ${data.results.errors.length - 5} more errors</li>`;
            }
            
            errorMessage += '</ul></div>';
          }
          
          await Swal.fire({
            title: 'Import Complete',
            html: `<div class="text-center">
                    ${resultMessage}
                    <p class="mt-2 text-sm text-green-600">Newly imported books will appear at the top of your book list.</p>
                   </div>${duplicateMessage}${errorMessage}`,
            icon: 'success',
            confirmButtonColor: 'var(--color-button-primary)'
          });
          
          // Refresh the list of uploaded files
          await fetchUploadedFiles();
        } else {
          const errorMessage = data.message || data.error || 'Failed to import books';
          console.error('Server returned error:', errorMessage);
          throw new Error(errorMessage);
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

  const handleDownloadTemplate = async () => {
    setIsLoading(true);
    try {
      console.log('Template download URL:', `${BACKEND}/excel-imports/template`);
      
      const response = await fetch(`${BACKEND}/excel-imports/template`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Template download response status:', response.status);
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorMessage = `Error: ${response.status}`;
        
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        }
        
        throw new Error(errorMessage);
      }
      
      // Get the blob from the response
      const blob = await response.blob();
      console.log('Template blob received, size:', blob.size);
      
      if (blob.size === 0) {
        throw new Error('Downloaded file is empty.');
      }
      
      // Create a temporary URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link element
      const a = document.createElement('a');
      a.href = url;
      a.download = 'book_import_template.xlsx';
      document.body.appendChild(a);
      
      // Trigger the download
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      Swal.fire({
        title: 'Success!',
        text: 'Template downloaded successfully',
        icon: 'success',
        confirmButtonColor: 'var(--color-button-primary)'
      });
    } catch (error) {
      console.error('Error downloading template:', error);
      Swal.fire({
        title: 'Error!',
        text: `Failed to download template: ${error.message}`,
        icon: 'error',
        confirmButtonColor: 'var(--color-button-primary)'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportBooks = async () => {
    try {
      setIsExporting(true);
      
      // Create a temporary anchor element
      const a = document.createElement('a');
      a.href = `${BACKEND}/books/export`;
      a.download = `books_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      // Add authorization header
      const headers = new Headers();
      headers.append('Authorization', `Bearer ${token}`);
      
      // Fetch the file
      const response = await fetch(`${BACKEND}/books/export`, {
        method: 'GET',
        headers: headers
      });
      
      if (!response.ok) {
        throw new Error(`Export failed: ${response.status} ${response.statusText}`);
      }
      
      // Get blob from response
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      a.href = url;
      
      // Trigger download
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      Swal.fire({
        title: 'Success!',
        text: 'Books exported successfully',
        icon: 'success',
        confirmButtonColor: 'var(--color-button-primary)'
      });
    } catch (error) {
      console.error('Error exporting books:', error);
      Swal.fire({
        title: 'Error!',
        text: `Failed to export books: ${error.message}`,
        icon: 'error',
        confirmButtonColor: 'var(--color-button-primary)'
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center mb-8">
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Add Multiple Books</h1>
      </div>
      
      <div className="bg-[var(--color-bg-secondary)] p-6 rounded-lg mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">Upload Excel File</h2>
          
          {/* <button
            onClick={handleExportBooks}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200"
            disabled={isExporting}
          >
            {isExporting ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <Download className="mr-2" />
                Export Books
              </>
            )}
          </button> */}
        </div>
        
        <div className="flex flex-col md:flex-row items-start md:items-center mb-6">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center mb-4 md:mb-0 md:mr-4 px-5 py-2.5 bg-[var(--color-button-secondary)] text-[var(--color-text-primary)] rounded-md transition-all duration-300 hover:opacity-90 hover:shadow-md"
            disabled={isLoading}
          >
            {isLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <FileEarmarkArrowDown className="mr-2" />
                Download Template
              </>
            )}
          </button>
          
          <p className="text-sm text-[var(--color-text-secondary)]">
            Use our template to ensure your data is formatted correctly.
          </p>
        </div>
        
        <div className="mb-6 p-5 bg-[var(--color-bg-hover)] rounded-md shadow-sm border-l-4 border-[var(--color-button-primary)]">
          <h3 className="text-md font-semibold mb-3 text-[var(--color-text-primary)]">Template Instructions:</h3>
          <ul className="list-disc pl-5 text-sm text-[var(--color-text-secondary)] space-y-2">
            <li>Required fields: <span className="font-medium">Title, ISBN, and Authors</span></li>
            <li>Optional fields: Description, Categories, Price, and Image URL</li>
            <li>You can add image URLs directly in the Excel file instead of uploading them separately</li>
            <li>Multiple authors or categories should be separated by commas</li>
          </ul>
        </div>
        
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block mb-2 text-[var(--color-text-primary)]">Select Excel File</label>
            <input
              id="excel-file-input"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="w-full p-3 bg-transparent rounded focus:outline-none focus:border-[var(--color-button-primary)] focus:ring-1 focus:ring-[var(--color-button-primary)]"
              style={{ 
                color: 'var(--color-text-primary)',
                borderColor: 'var(--color-border)',
                borderWidth: '1px',
              }}
              disabled={isLoading}
            />
            {fileError && (
              <p className="mt-2 text-red-500">{fileError}</p>
            )}
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              className="flex items-center justify-center px-6 py-3 bg-[var(--color-button-primary)] text-white rounded-md hover:opacity-90 transition-opacity"
              disabled={isLoading || !file}
            >
              {isLoading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <Upload className="mr-2" />
                  Upload File
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      
      <div className="bg-[var(--color-bg-secondary)] p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4 text-[var(--color-text-primary)]">Uploaded Excel Files</h2>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        ) : uploadedFiles.length === 0 ? (
          <div className="text-center py-8 text-[var(--color-text-secondary)]">
            <FileEarmarkExcel className="mx-auto text-4xl mb-3" />
            <p>No Excel files uploaded yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-[var(--color-border)]">
                <tr>
                  <th className="px-4 py-3 text-left text-[var(--color-text-primary)]">File Name</th>
                  <th className="px-4 py-3 text-left text-[var(--color-text-primary)]">Uploaded At</th>
                  <th className="px-4 py-3 text-right text-[var(--color-text-primary)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {uploadedFiles.map((file) => (
                  <tr key={file.file_id} className="border-b border-[var(--color-border)]">
                    <td className="px-4 py-3 text-[var(--color-text-primary)]">
                      <div className="flex items-center">
                        <FileEarmarkExcel className="mr-2 text-[var(--color-text-secondary)]" />
                        {file.original_name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                      {new Date(file.uploaded_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleDeleteFile(file.file_id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-full"
                          disabled={isProcessing && processingFileId === file.file_id}
                        >
                          <Trash />
                        </button>
                        <button
                          onClick={() => handleImport(file.file_id)}
                          className="p-2 text-[var(--color-button-primary)] hover:bg-[var(--color-button-primary-light)] rounded-full"
                          disabled={isProcessing && processingFileId === file.file_id}
                        >
                          {isProcessing && processingFileId === file.file_id ? (
                            <LoadingSpinner size="sm" color="text-[var(--color-button-primary)]" />
                          ) : (
                            <FileEarmarkCheck />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="text-center mt-6">
            <Link 
              href="/dashboard" 
              className="text-[var(--color-link)] hover:underline font-medium"
            >
              Back to Dashboard
            </Link>
          </div>
    </div>
  );
} 