'use client';
import React from 'react';
import BookCard from './BookCard';

const CategoryHighlight = ({ 
  title, 
  books = [], 
  onBookClick, 
  getImageUrl, 
  emptyMessage = "No books found in this category",
  onAddBook = null
}) => {
  if (!books || books.length === 0) {
    return (
      <div className="bg-[var(--color-bg-secondary)] p-4 rounded-lg text-center">
        <p className="text-[var(--color-text-secondary)]">{emptyMessage}</p>
        {onAddBook && (
          <button
            onClick={onAddBook}
            className="mt-3 px-3 py-1.5 bg-[var(--color-secondary)] text-white rounded-md text-sm hover:bg-opacity-90 transition-colors"
          >
            Add Book
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-bg-secondary)] p-4 rounded-lg">
      <h3 className="font-bold text-lg mb-3 text-[var(--color-text-primary)]">{title}</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {books.slice(0, 3).map((book) => (
          <div key={book.id}>
            <BookCard
              book={book}
              onClick={() => onBookClick(book.id)}
              getImageUrl={getImageUrl}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryHighlight; 