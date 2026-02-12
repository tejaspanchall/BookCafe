'use client';
import React from 'react';

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  // Generate visible page numbers with ellipsis for large page counts
  const getVisiblePages = () => {
    // For small number of pages, show all
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    // For larger number of pages, show current page with neighbors and ellipsis
    let pages = [];
    
    // Always show first page
    pages.push(1);
    
    // Add ellipsis if needed
    if (currentPage > 3) {
      pages.push('...');
    }
    
    // Add pages around current page
    const startPage = Math.max(2, currentPage - 1);
    const endPage = Math.min(totalPages - 1, currentPage + 1);
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    // Add ellipsis if needed
    if (currentPage < totalPages - 2) {
      pages.push('...');
    }
    
    // Always show last page if not already included
    if (totalPages > 1) {
      pages.push(totalPages);
    }
    
    return pages;
  };
  
  const visiblePages = getVisiblePages();
  
  return (
    <nav className="flex justify-center mt-4">
      <ul className="flex flex-wrap justify-center list-none">
        <li>
          <button
            className="px-2 sm:px-3 py-1 sm:py-2 border rounded-l transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            style={{ 
              backgroundColor: 'var(--color-bg-secondary)',
              color: 'var(--color-text-primary)',
              borderColor: 'var(--color-border)',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
            }}
            onMouseOver={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'var(--color-button-hover)', e.currentTarget.style.color = 'var(--color-bg-primary)')}
            onMouseOut={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)', e.currentTarget.style.color = 'var(--color-text-primary)')}
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Prev
          </button>
        </li>
        
        {visiblePages.map((page, index) => (
          <li key={index}>
            {page === '...' ? (
              <span className="px-2 sm:px-3 py-1 sm:py-2 border text-sm sm:text-base flex items-center justify-center"
                style={{ 
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-primary)',
                  borderColor: 'var(--color-border)'
                }}>
                ...
              </span>
            ) : (
              <button
                className="px-2 sm:px-3 py-1 sm:py-2 border transition duration-300 min-w-[30px] sm:min-w-[36px] text-sm sm:text-base"
                style={{ 
                  backgroundColor: currentPage === page ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                  color: currentPage === page ? 'var(--color-bg-primary)' : 'var(--color-text-primary)',
                  borderColor: 'var(--color-border)',
                  fontWeight: currentPage === page ? 'bold' : 'normal',
                  cursor: 'pointer'
                }}
                onMouseOver={(e) => currentPage !== page && (e.currentTarget.style.backgroundColor = 'var(--color-button-hover)', e.currentTarget.style.color = 'var(--color-bg-primary)')}
                onMouseOut={(e) => currentPage !== page && (e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)', e.currentTarget.style.color = 'var(--color-text-primary)')}
                onClick={() => onPageChange(page)}
              >
                {page}
              </button>
            )}
          </li>
        ))}
        
        <li>
          <button
            className="px-2 sm:px-3 py-1 sm:py-2 border rounded-r transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            style={{ 
              backgroundColor: 'var(--color-bg-secondary)',
              color: 'var(--color-text-primary)',
              borderColor: 'var(--color-border)',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
            }}
            onMouseOver={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'var(--color-button-hover)', e.currentTarget.style.color = 'var(--color-bg-primary)')}
            onMouseOut={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)', e.currentTarget.style.color = 'var(--color-text-primary)')}
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </li>
      </ul>
    </nav>
  );
}