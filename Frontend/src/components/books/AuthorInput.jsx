'use client';

import { useState } from 'react';

const AuthorInput = ({ value = [], onChange, className, style }) => {
  const [currentAuthor, setCurrentAuthor] = useState('');

  const handleAddAuthor = () => {
    if (currentAuthor.trim() && !value.includes(currentAuthor.trim())) {
      onChange([...value, currentAuthor.trim()]);
      setCurrentAuthor('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddAuthor();
    }
  };

  const handleRemoveAuthor = (author) => {
    onChange(value.filter(a => a !== author));
  };

  return (
    <div className="space-y-2">
      <div className="flex space-x-2">
        <input
          type="text"
          value={currentAuthor}
          onChange={(e) => setCurrentAuthor(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter author name"
          className={`flex-grow p-2 rounded border focus:outline-none ${className}`}
          style={style}
        />
        <button
          onClick={handleAddAuthor}
          className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          disabled={!currentAuthor.trim()}
          type="button"
        >
          Add
        </button>
      </div>
      
      {/* Display added authors */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {value.map((author, index) => (
            <div 
              key={index} 
              className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded"
            >
              {author}
              <button 
                onClick={() => handleRemoveAuthor(author)}
                className="ml-2 text-blue-600 hover:text-red-600"
                type="button"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AuthorInput; 