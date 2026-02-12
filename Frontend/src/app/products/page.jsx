'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, PencilSquare, Trash, X } from 'react-bootstrap-icons';

export default function ProductsPage() {
  const BACKEND = process.env.NEXT_PUBLIC_BACKEND;
  const [products, setProducts] = useState([]);
  const [displayedProducts, setDisplayedProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    stock_value: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Track active input to maintain focus
  const [activeInput, setActiveInput] = useState(null);
  
  // Create refs for form inputs to manage focus
  const inputRefs = {
    name: useRef(null),
    category: useRef(null),
    price: useRef(null),
    stock_value: useRef(null)
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (search) {
      if (searchTimeout) clearTimeout(searchTimeout);
      const timeout = setTimeout(() => {
        searchProducts();
      }, 500);
      setSearchTimeout(timeout);
    } else {
      if (products.length > 0) {
        setDisplayedProducts(products);
      } else {
        fetchProducts();
      }
    }
  }, [search]);
  
  // Effect to restore focus after state updates
  useEffect(() => {
    if (activeInput && inputRefs[activeInput]?.current) {
      inputRefs[activeInput].current.focus();
    }
  }, [formData, activeInput]);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${BACKEND}/products`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`);
      }
      
      const data = await res.json();
      
      setProducts(data);
      setDisplayedProducts(data);
      
      if (data.length === 0) {
        setMessage("No products found");
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      setMessage("Failed to load products");
    } finally {
      setIsLoading(false);
    }
  };

  const searchProducts = async () => {
    setIsLoading(true);
    try {
      // Backend search might be case-sensitive, so we'll implement client-side filtering
      // for case-insensitive search when products are already loaded
      if (products.length > 0) {
        const searchTerm = search.toLowerCase();
        const filteredProducts = products.filter(product => 
          product.name.toLowerCase().includes(searchTerm) || 
          (product.category && product.category.toLowerCase().includes(searchTerm))
        );
        
        setDisplayedProducts(filteredProducts);
        
        if (filteredProducts.length === 0) {
          setMessage(`No products found matching "${search}"`);
        } else {
          setMessage("");
        }
        setIsLoading(false);
      } else {
        // If products aren't loaded yet, we'll still use the backend search
        // but we'll convert to lowercase for the query
        const res = await fetch(`${BACKEND}/products/search?query=${encodeURIComponent(search.toLowerCase())}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (!res.ok) {
          throw new Error(`Server responded with ${res.status}`);
        }
        
        const data = await res.json();
        
        setDisplayedProducts(data);
        
        if (data.length === 0) {
          setMessage(`No products found matching "${search}"`);
        } else {
          setMessage("");
        }
      }
    } catch (error) {
      console.error("Error searching products:", error);
      setMessage("Failed to search products");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAddProduct = async () => {
    setIsSubmitting(true);
    const errors = validateForm();
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setIsSubmitting(false);
      return;
    }
    
    try {
      const response = await fetch(`${BACKEND}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          category: formData.category || null,
          price: parseFloat(formData.price),
          stock_value: parseInt(formData.stock_value || 0)
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Server responded with ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Product added:', data);
      
      // Refresh product list
      await fetchProducts();
      
      // Close modal and reset form
      resetForm();
      setShowAddModal(false);
      
    } catch (error) {
      console.error("Error adding product:", error);
      setFormErrors({ submit: "Failed to add product: " + error.message });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleEditProduct = async () => {
    if (!currentProduct) return;
    
    setIsSubmitting(true);
    const errors = validateForm();
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setIsSubmitting(false);
      return;
    }
    
    try {
      const response = await fetch(`${BACKEND}/products/${currentProduct.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          category: formData.category || null,
          price: parseFloat(formData.price),
          stock_value: parseInt(formData.stock_value || 0)
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Server responded with ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Product updated:', data);
      
      // Refresh product list
      await fetchProducts();
      
      // Close modal and reset form
      resetForm();
      setShowEditModal(false);
      
    } catch (error) {
      console.error("Error updating product:", error);
      setFormErrors({ submit: "Failed to update product: " + error.message });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDeleteProduct = async () => {
    if (!currentProduct) return;
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`${BACKEND}/products/${currentProduct.id}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      
      // Refresh product list
      await fetchProducts();
      
      // Close modal
      setShowDeleteModal(false);
      
    } catch (error) {
      console.error("Error deleting product:", error);
      setMessage("Failed to delete product. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const openEditModal = (product) => {
    setCurrentProduct(product);
    setFormData({
      name: product.name,
      category: product.category || '',
      price: product.price.toString(),
      stock_value: product.stock_value.toString()
    });
    setFormErrors({});
    setShowEditModal(true);
  };
  
  const openDeleteModal = (product) => {
    setCurrentProduct(product);
    setShowDeleteModal(true);
  };
  
  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      price: '',
      stock_value: ''
    });
    setFormErrors({});
    setCurrentProduct(null);
  };
  
  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = "Name is required";
    }
    
    if (!formData.price) {
      errors.price = "Price is required";
    } else if (isNaN(parseFloat(formData.price)) || parseFloat(formData.price) < 0) {
      errors.price = "Price must be a positive number";
    }
    
    if (formData.stock_value && (isNaN(parseInt(formData.stock_value)) || parseInt(formData.stock_value) < 0)) {
      errors.stock_value = "Stock must be a non-negative number";
    }
    
    return errors;
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Track which input is currently active
    setActiveInput(name);
    
    // Update form data without re-rendering the whole form
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error if needed
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Product List Item Component
  const ProductListItem = ({ product, index }) => {
    // Get stock value directly from product
    const stockValue = product.stock_value || 0;
    
    return (
      <tr className="border-b border-gray-200 hover:bg-gray-50">
        <td className="py-3 pl-4 pr-2 text-center">{index + 1}</td>
        <td className="py-3 px-2">{product.name}</td>
        <td className="py-3 px-2">
          {product.category && (
            <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded">
              {product.category}
            </span>
          )}
        </td>
        <td className="py-3 px-2 text-center">
          <span className="tabular-nums">{stockValue}</span>
        </td>
        <td className="py-3 px-2 text-right">${product.price}</td>
        <td className="py-3 px-2 text-center">
          <div className="flex justify-center space-x-2">
            <button 
              className="text-blue-500 hover:text-blue-700"
              onClick={() => openEditModal(product)}
            >
              <PencilSquare size={16} />
            </button>
            <button 
              className="text-red-500 hover:text-red-700"
              onClick={() => openDeleteModal(product)}
            >
              <Trash size={16} />
            </button>
          </div>
        </td>
      </tr>
    );
  };
  
  // Add Product Modal
  const AddProductModal = () => {
    return (
      <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Add New Product</h2>
            <button 
              type="button"
              onClick={() => setShowAddModal(false)} 
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>
          
          <form onSubmit={(e) => { e.preventDefault(); handleAddProduct(); }}>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-1" htmlFor="add-name">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="add-name"
                  name="name"
                  ref={inputRefs.name}
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border ${formErrors.name ? 'border-red-500' : 'border-gray-300'} rounded`}
                  placeholder="Enter product name"
                />
                {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
              </div>
              
              <div>
                <label className="block text-gray-700 mb-1" htmlFor="add-category">
                  Category
                </label>
                <input
                  type="text"
                  id="add-category"
                  name="category"
                  ref={inputRefs.category}
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  placeholder="Enter category (optional)"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-1" htmlFor="add-price">
                  Price <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500">₹</span>
                  </div>
                  <input
                    type="number"
                    id="add-price"
                    name="price"
                    ref={inputRefs.price}
                    value={formData.price}
                    onChange={handleChange}
                    className={`w-full pl-7 pr-3 py-2 border ${formErrors.price ? 'border-red-500' : 'border-gray-300'} rounded`}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>
                {formErrors.price && <p className="text-red-500 text-xs mt-1">{formErrors.price}</p>}
              </div>
              
              <div>
                <label className="block text-gray-700 mb-1" htmlFor="add-stock">
                  Initial Stock
                </label>
                <input
                  type="number"
                  id="add-stock"
                  name="stock_value"
                  ref={inputRefs.stock_value}
                  value={formData.stock_value}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  placeholder="99"
                  min="0"
                />
                {formErrors.stock_value && <p className="text-red-500 text-xs mt-1">{formErrors.stock_value}</p>}
              </div>
            </div>
            
            {formErrors.submit && <p className="text-red-500 text-sm mt-4">{formErrors.submit}</p>}
            
            <div className="flex justify-end mt-5">
              <button 
                type="button" 
                onClick={() => setShowAddModal(false)} 
                className="px-4 py-2 mr-2 text-sm text-gray-600 border border-gray-300 rounded"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Product'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };
  
  // Edit Product Modal
  const EditProductModal = () => {
    return (
      <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Edit Product</h2>
            <button 
              type="button"
              onClick={() => setShowEditModal(false)} 
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>
          
          <form onSubmit={(e) => { e.preventDefault(); handleEditProduct(); }}>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-1" htmlFor="edit-name">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="edit-name"
                  name="name"
                  ref={inputRefs.name}
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border ${formErrors.name ? 'border-red-500' : 'border-gray-300'} rounded`}
                  placeholder="Enter product name"
                />
                {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
              </div>
              
              <div>
                <label className="block text-gray-700 mb-1" htmlFor="edit-category">
                  Category
                </label>
                <input
                  type="text"
                  id="edit-category"
                  name="category"
                  ref={inputRefs.category}
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  placeholder="Enter category (optional)"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-1" htmlFor="edit-price">
                  Price <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500">₹</span>
                  </div>
                  <input
                    type="number"
                    id="edit-price"
                    name="price"
                    ref={inputRefs.price}
                    value={formData.price}
                    onChange={handleChange}
                    className={`w-full pl-7 pr-3 py-2 border ${formErrors.price ? 'border-red-500' : 'border-gray-300'} rounded`}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>
                {formErrors.price && <p className="text-red-500 text-xs mt-1">{formErrors.price}</p>}
              </div>
              
              <div>
                <label className="block text-gray-700 mb-1" htmlFor="edit-stock">
                  Stock
                </label>
                <input
                  type="number"
                  id="edit-stock"
                  name="stock_value"
                  ref={inputRefs.stock_value}
                  value={formData.stock_value}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  placeholder="99"
                  min="0"
                />
                {formErrors.stock_value && <p className="text-red-500 text-xs mt-1">{formErrors.stock_value}</p>}
              </div>
            </div>
            
            {formErrors.submit && <p className="text-red-500 text-sm mt-4">{formErrors.submit}</p>}
            
            <div className="flex justify-end mt-5">
              <button 
                type="button" 
                onClick={() => setShowEditModal(false)} 
                className="px-4 py-2 mr-2 text-sm text-gray-600 border border-gray-300 rounded"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Updating...' : 'Update Product'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };
  
  // Delete Confirmation Modal
  const DeleteProductModal = () => {
    const handleOutsideClick = (e) => {
      if (e.target === e.currentTarget) {
        setShowDeleteModal(false);
      }
    };
    
    return (
      <div 
        className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50"
        onClick={handleOutsideClick}
      >
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Delete Product</h2>
            <button onClick={() => setShowDeleteModal(false)} className="text-gray-500 hover:text-gray-700">
              <X size={20} />
            </button>
          </div>
          
          <p className="mb-6">
            Are you sure you want to delete <span className="font-semibold">{currentProduct?.name}</span>? 
            This action cannot be undone.
          </p>
          
          <div className="flex justify-end">
            <button 
              type="button" 
              onClick={() => setShowDeleteModal(false)} 
              className="px-4 py-2 mr-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-100"
            >
              Cancel
            </button>
            <button 
              type="button" 
              onClick={handleDeleteProduct}
              className="px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Deleting...' : 'Delete Product'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
        <button 
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center"
        >
          + Add Product
        </button>
      </div>
      
      <div className="relative mb-6 max-w-md">
        <input 
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
      </div>
      
      {isLoading ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Loading products...</p>
        </div>
      ) : displayedProducts.length > 0 ? (
        <div className="mt-4 overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="py-3 pl-4 pr-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12 text-center">
                  No.
                </th>
                <th scope="col" className="py-3 px-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="py-3 px-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th scope="col" className="py-3 px-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th scope="col" className="py-3 px-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th scope="col" className="py-3 px-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayedProducts.map((product, index) => (
                <ProductListItem key={product.id} product={product} index={index} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">{message || "No products found"}</p>
          {search && (
            <button 
              onClick={() => {
                setSearch("");
                fetchProducts();
              }}
              className="mt-4 px-3 py-1 bg-gray-900 text-white rounded"
            >
              Clear Search
            </button>
          )}
        </div>
      )}
      
      {showAddModal && <AddProductModal />}
      {showEditModal && <EditProductModal />}
      {showDeleteModal && <DeleteProductModal />}
    </div>
  );
} 