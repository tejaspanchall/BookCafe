'use client';
import React from "react";

const BookCard = ({ book, onClick, getImageUrl, showRemoveButton, onRemove, showLiveToggle, onToggleLive }) => {
  const handleRemove = (e) => {
    e.stopPropagation();
    onRemove(book.id);
  };

  const handleToggleLive = (e) => {
    e.stopPropagation();
    onToggleLive(book.id);
  };

  const imageUrl = getImageUrl(book.image);
  
  // Define an inline base64 fallback image
  const fallbackImageUrl = "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";

  return (
    <div
      className="group relative h-full rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer"
      style={{ 
        backgroundColor: 'var(--color-bg-secondary)',
        transform: 'translateZ(0)', // Fix for Safari rendering issue
      }}
      onClick={onClick}
    >

      {/* Cover Area - 3D Effect with Shadow */}
      <div className="relative overflow-hidden">
        {/* 3D Effect Shadow */}
        <div className="absolute inset-y-0 right-0 w-4 z-10 bg-gradient-to-l from-black/20 to-transparent"></div>
        <div className="absolute inset-x-0 bottom-0 h-4 z-10 bg-gradient-to-t from-black/30 to-transparent"></div>
        
        {/* Cover Image with Dynamic Overlay */}
        <div className="relative">
          <div 
            className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
          />
          <img
            src={imageUrl}
            alt={book.title}
            className="w-full aspect-[2/3] object-cover transform group-hover:scale-105 transition-transform duration-700"
            loading="lazy"
            onError={(e) => {
              e.target.src = fallbackImageUrl;
            }}
          />

          {/* Price Tag - Modern Floating Design */}
          {book.price !== null && (
            <div 
              className="absolute bottom-3 right-3 px-3 py-1 rounded-full text-sm font-bold shadow-lg backdrop-blur-sm z-20"
              style={{ 
                backgroundColor: 'rgba(var(--color-primary-rgb), 0.85)',
                color: 'white'
              }}
            >
              ₹{parseFloat(book.price).toFixed(0)}
            </div>
          )}

          {/* Remove Button */}
          {showRemoveButton && (
            <button
              onClick={handleRemove}
              className="absolute top-2 left-2 w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 text-xl font-bold z-30 group-hover:z-50 hover:scale-110 hover:shadow-xl"
              style={{ 
                backgroundColor: 'rgba(239, 68, 68, 0.9)',
                backdropFilter: 'blur(4px)',
                color: 'white',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 1)';
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
                e.currentTarget.style.zIndex = '9999';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.9)';
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                e.currentTarget.style.zIndex = '30';
              }}
            >
              ×
            </button>
          )}

          {/* Live Toggle Button */}
          {showLiveToggle && (
            <button
              onClick={handleToggleLive}
              className="absolute top-2 right-2 px-3 py-1 rounded-full text-xs font-bold z-30 group-hover:z-50 transition-all duration-200"
              style={{ 
                backgroundColor: book.is_live ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)',
                backdropFilter: 'blur(4px)',
                color: 'white',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = book.is_live ? 'rgba(34, 197, 94, 1)' : 'rgba(239, 68, 68, 1)';
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = book.is_live ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)';
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
              }}
            >
              {book.is_live ? 'Live' : 'Hidden'}
            </button>
          )}
        </div>
      </div>

      {/* Content Area - Clean and Modern */}
      <div className="p-4">
        {/* Title */}
        <h5 
          className="font-bold text-base line-clamp-1 mb-2 group-hover:text-primary transition-colors duration-300"
          style={{ color: 'var(--color-primary)' }}
        >
          {book.title}
        </h5>

        {/* Author with Improved Typography */}
        <div className="text-xs font-medium mb-3 opacity-80 line-clamp-1">
          By {book.authors && book.authors.length > 0 
            ? book.authors.map(author => author.name).join(', ')
            : 'Unknown Author'}
        </div>

        {/* Categories - Horizontal Pills */}
        <div className="flex flex-wrap gap-1 mt-auto">
          {book.categories && book.categories.length > 0 
            ? book.categories.slice(0, 2).map(cat => (
                <span 
                  key={cat.name}
                  className="text-[8px] px-2 py-0.5 rounded-full truncate max-w-[100px] font-medium"
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
                className="text-[8px] px-2 py-0.5 rounded-full font-medium"
                style={{ 
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  color: '#3b82f6'
                }}
              >
                Uncategorized
              </span>
            )
          }
          {book.categories && book.categories.length > 2 && (
            <span 
              className="text-[8px] px-2 py-0.5 rounded-full font-medium"
              style={{ 
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                color: '#3b82f6'
              }}
            >
              +{book.categories.length - 2}
            </span>
          )}
        </div>
      </div>

      {/* Hover Action Button with Animation */}
      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-20">
        <div 
          className="px-5 py-2.5 rounded-lg text-sm font-semibold translate-y-4 group-hover:translate-y-0 transition-transform duration-300 shadow-xl"
          style={{ 
            backgroundColor: '#2563eb',
            color: 'white',
            boxShadow: '0 0 20px rgba(37, 99, 235, 0.8)'
          }}
        >
          View Details
        </div>
      </div>
    </div>
  );
};

export default BookCard;