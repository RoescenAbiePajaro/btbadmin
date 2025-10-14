
import React, { useState, useEffect } from 'react';
import { FiKey, FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiRefreshCw } from 'react-icons/fi';
import Toast from './Toast';

export default function AdminAccessCode() {
  const [accessCodes, setAccessCodes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('info');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [codeToDelete, setCodeToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    isActive: true,
    maxUses: 1,
    currentUses: 0
  });

  const showToastMessage = (message, type = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  // Fetch access codes on component mount
  useEffect(() => {
    fetchAccessCodes();
  }, []);


  const fetchAccessCodes = async () => {
    try {
      setIsLoading(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }

      const response = await fetch('https://btbsitess.onrender.com/api/access-codes', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          throw new Error('Authentication failed. Please login again.');
        }
        if (response.status === 403) {
          throw new Error('Access denied. You do not have permission to view access codes.');
        }
        throw new Error(`Failed to fetch access codes: ${response.status}`);
      }

      const data = await response.json();
      setAccessCodes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch error:', err);
      showToastMessage(err.message || 'Failed to load access codes. Please check your connection.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : 
              type === 'number' ? Math.max(1, parseInt(value) || 1) : value
    }));
  };

  const validateForm = () => {
    if (!formData.code.trim()) {
      throw new Error('Access code is required');
    }
    if (formData.maxUses < 1) {
      throw new Error('Max uses must be at least 1');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }

      // Validate form before submission
      validateForm();

      const url = editingId 
        ? `https://beyondthebrush.onrender.com/api/access-codes/${editingId}`
        : 'https://beyondthebrush.onrender.com/api/access-codes';
      
      const method = editingId ? 'PUT' : 'POST';

      const requestData = {
        code: formData.code.trim().toUpperCase(),
        description: formData.description.trim(),
        maxUses: parseInt(formData.maxUses) || 1,
        isActive: formData.isActive
      };

      // Show loading state
      setIsLoading(true);

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });

      const responseText = await response.text();
      let responseData = {};

      try {
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        throw new Error('Invalid response from server. Please try again.');
      }

      if (!response.ok) {
        // Handle specific error status codes
        if (response.status === 400) {
          const errorMessage = responseData.toast?.message || 
                             responseData.message ||
                             responseData.error ||
                             'Invalid data provided';
          throw new Error(errorMessage);
        } else if (response.status === 401) {
          localStorage.removeItem('token');
          throw new Error('Your session has expired. Please login again.');
        } else if (response.status === 403) {
          throw new Error('You do not have permission to perform this action.');
        } else if (response.status === 404) {
          throw new Error('The requested resource was not found.');
        } else {
          throw new Error(
            `Server error: ${response.status} - ${response.statusText}`
          );
        }
      }

      const successMessage = editingId 
        ? 'Access code updated successfully' 
        : 'Access code created successfully';
      
      showToastMessage(successMessage, 'success');
      await fetchAccessCodes();
      resetForm();
    } catch (err) {
      console.error('Submit error:', err);
      showToastMessage(err.message || 'An unexpected error occurred. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (code) => {
    setEditingId(code._id);
    setFormData({
      code: code.code,
      description: code.description || '',
      isActive: code.isActive,
      maxUses: code.maxUses,
      currentUses: code.currentUses
    });
    setIsAdding(true);
  };

  const handleDelete = (id) => {
    setCodeToDelete(id);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!codeToDelete) return;
    
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`https://beyondthebrush.onrender.com/api/access-codes/${codeToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const responseText = await response.text();
      let responseData;

      try {
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        throw new Error('Invalid response from server');
      }

      if (!response.ok) {
        const errorMessage = responseData.toast?.message || 
                           responseData.message ||
                           responseData.error ||
                           'Failed to delete access code';
        throw new Error(errorMessage);
      }

      showToastMessage('Access code deleted successfully', 'success');
      await fetchAccessCodes();
      setShowDeleteModal(false);
      setCodeToDelete(null);
    } catch (err) {
      showToastMessage(err.message, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      isActive: true,
      maxUses: 1,
      currentUses: 0
    });
    setEditingId(null);
    setIsAdding(false);
  };

  const toggleAddForm = () => {
    resetForm();
    setIsAdding(!isAdding);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading access codes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-white">Access Codes Management</h2>
            <button 
              onClick={fetchAccessCodes}
              className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
              title="Refresh Access Codes"
              disabled={isLoading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          <p className="text-gray-200">Manage and monitor access codes for guest authentication</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={toggleAddForm}
            className={`${isAdding ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 px-4 py-2 w-full sm:w-auto`}
          >           
            <FiPlus className="mr-2" />
            {isAdding ? 'Cancel' : 'Add New Code'}
          </button>
        </div>
      </div>


      {/* Add/Edit Form */}
      {isAdding && (
        <div className="mb-6 p-4 sm:p-6 bg-gray-800 rounded-xl border border-gray-700">
          <h3 className="text-lg font-medium text-white mb-4">
            {editingId ? 'Edit Access Code' : 'Add New Access Code'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Code *
                </label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-sm sm:text-base bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter access code"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Max Uses
                </label>
                <input
                  type="number"
                  name="maxUses"
                  min="1"
                  value={formData.maxUses}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-sm sm:text-base bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full px-3 py-2 text-sm sm:text-base bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"
                placeholder="Optional description for this access code"
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={formData.isActive}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 rounded border-gray-600 bg-gray-700 focus:ring-blue-500 focus:ring-offset-gray-800"
              />
              <label htmlFor="isActive" className="ml-2 text-sm text-gray-300">
                Active (code can be used)
              </label>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-3 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-blue-800 hover:bg-blue-900 rounded-md transition-colors flex items-center justify-center"
              >
                <FiSave className="mr-2" />
                {editingId ? 'Update' : 'Create'} Code
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Access Codes Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-800">
                <tr>
                  <th scope="col" className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Code
                  </th>
                  <th scope="col" className="hidden sm:table-cell px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Description
                  </th>
                  <th scope="col" className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    Uses
                  </th>
                  <th scope="col" className="hidden sm:table-cell px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-3 sm:px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {accessCodes.length > 0 ? (
                  accessCodes.map((code) => (
                    <tr key={code._id} className="hover:bg-gray-750 transition-colors">
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-white font-mono">{code.code}</span>
                          <div className="sm:hidden mt-1 space-y-1">
                            <p className="text-xs text-gray-400 truncate max-w-[200px]">
                              {code.description || 'No description'}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-mono ${code.currentUses >= code.maxUses ? 'text-red-400' : 'text-green-400'}`}>
                                {code.currentUses}/{code.maxUses} uses
                              </span>
                              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${code.isActive ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
                                {code.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-3 sm:px-4 py-3 text-sm text-gray-300 max-w-[200px] 2xl:max-w-md truncate">
                        {code.description || '-'}
                      </td>
                      <td className="px-2 sm:px-4 py-3 whitespace-nowrap">
                        <span className={`text-sm font-mono ${code.currentUses >= code.maxUses ? 'text-red-400' : 'text-green-400'}`}>
                          {code.currentUses}/{code.maxUses}
                        </span>
                      </td>
                      <td className="hidden sm:table-cell px-3 sm:px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${code.isActive ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
                          {code.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-1 sm:space-x-2">
                          <button
                            onClick={() => handleEdit(code)}
                            className="text-blue-400 hover:text-blue-300 hover:bg-blue-900 hover:bg-opacity-20 p-1.5 sm:p-2 rounded-full transition-colors"
                            aria-label="Edit"
                            title="Edit access code"
                          >
                            <FiEdit2 className="w-4 h-4 sm:w-4 sm:h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(code._id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-900 hover:bg-opacity-20 p-1.5 sm:p-2 rounded-full transition-colors"
                            aria-label="Delete"
                            title="Delete access code"
                          >
                            <FiTrash2 className="w-4 h-4 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <FiKey className="h-8 w-8 text-gray-600" />
                        <p className="text-sm text-gray-400">No access codes found</p>
                        <p className="text-xs text-gray-500">Create your first access code to get started</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 border border-gray-700">
            <h3 className="text-lg font-medium text-white mb-4">
              Delete Access Code
            </h3>
            <p className="text-gray-400 mb-6">
              Are you sure you want to delete this access code? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setCodeToDelete(null);
                }}
                className="px-4 py-2 rounded-md text-white hover:bg-gray-700 transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 focus:ring-offset-gray-900 disabled:opacity-50 transition-colors"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
}