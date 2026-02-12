'use client';

import { useState, useEffect } from 'react';

const PREDEFINED_CATEGORIES = [
  'Fiction',
  'Non-Fiction',
  'Science Fiction',
  'Mystery',
  'Romance',
  'Fantasy',
  'Biography',
  'History',
  'Science',
  'Technology',
  'Business',
  'Self-Help',
  'Children\'s Books',
  'Educational',
  'Other'
];

const CategorySelect = ({ value = [], onChange, className, style }) => {
  const [customCategory, setCustomCategory] = useState('');
  const [availableCategories, setAvailableCategories] = useState(PREDEFINED_CATEGORIES);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch all categories from the backend when component mounts
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND}/categories`);
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'success' && data.categories) {
            const categoryNames = data.categories.map(cat => cat.name);
            // Merge with predefined categories and remove duplicates
            const mergedCategories = [...new Set([...PREDEFINED_CATEGORIES, ...categoryNames])];
            setAvailableCategories(mergedCategories.sort());
          }
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCategories();
  }, []);

  const handleSelectChange = (e) => {
    const selectedValue = e.target.value;
    if (!selectedValue) return;
    
    if (selectedValue === 'Other') {
      // Focus on the custom input field
      document.getElementById('custom-category-input')?.focus();
    } else if (!value.includes(selectedValue)) {
      onChange([...value, selectedValue]);
    }
    
    // Reset the select to placeholder
    e.target.value = '';
  };

  const handleCustomCategoryAdd = () => {
    if (customCategory && !value.includes(customCategory)) {
      onChange([...value, customCategory]);
      setCustomCategory('');
    }
  };

  const handleRemoveCategory = (category) => {
    onChange(value.filter(cat => cat !== category));
  };

  return (
    <div className="space-y-2">
      <div className="flex space-x-2">
        <select
          value=""
          onChange={handleSelectChange}
          className={`flex-grow p-2 rounded border focus:outline-none ${className}`}
          style={style}
          disabled={isLoading}
        >
          <option value="">Select Categories...</option>
          {availableCategories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
          <option value="Other">Add Custom Category</option>
        </select>
      </div>
      
      <div className="flex space-x-2">
        <input
          id="custom-category-input"
          type="text"
          value={customCategory}
          onChange={(e) => setCustomCategory(e.target.value)}
          placeholder="Enter custom category"
          className={`flex-grow p-2 rounded border focus:outline-none ${className}`}
          style={style}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleCustomCategoryAdd();
            }
          }}
        />
        <button
          onClick={handleCustomCategoryAdd}
          className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          disabled={!customCategory}
        >
          Add
        </button>
      </div>
      
      {/* Selected categories display */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {value.map((category) => (
            <div 
              key={category} 
              className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded"
            >
              {category}
              <button 
                onClick={() => handleRemoveCategory(category)}
                className="ml-2 text-blue-600 hover:text-red-600"
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

export default CategorySelect; 