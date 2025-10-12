import React, { useState, useEffect } from 'react';
import { FiKey, FiPlus, FiEdit2, FiTrash2, FiSave, FiX } from 'react-icons/fi';

export default function AdminAccessCode() {
  const [accessCodes, setAccessCodes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    isActive: true,
    maxUses: 1,
    currentUses: 0
  });

  // Fetch access codes on component mount
  useEffect(() => {
    fetchAccessCodes();
  }, []);

  const fetchAccessCodes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/access-codes', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch access codes');
      }

      const data = await response.json();
      setAccessCodes(data);
      setIsLoading(false);
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const url = editingId 
        ? `http://localhost:5000/api/access-codes/${editingId}`
        : 'http://localhost:5000/api/access-codes';
      
      const method = editingId ? 'PUT' : 'POST';

      // Only send the fields that the backend expects
      const requestData = {
        code: formData.code,
        description: formData.description,
        maxUses: formData.maxUses,
        isActive: formData.isActive
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(editingId ? 'Failed to update access code' : 'Failed to create access code');
      }

      await fetchAccessCodes();
      resetForm();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (code) => {
    setEditingId(code._id);
    setFormData({
      code: code.code,
      description: code.description,
      isActive: code.isActive,
      maxUses: code.maxUses,
      currentUses: code.currentUses
    });
    setIsAdding(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this access code?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/access-codes/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete access code');
      }

      await fetchAccessCodes();
    } catch (err) {
      setError(err.message);
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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Access Codes</h2>
        <button
          onClick={toggleAddForm}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <FiPlus className="mr-2" />
          {isAdding ? 'Cancel' : 'Add New Code'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900 text-red-100 rounded-lg">
          {error}
        </div>
      )}

      {/* Add/Edit Form */}
      {isAdding && (
        <div className="mb-8 p-6 bg-gray-800 rounded-xl border border-gray-700">
          <h3 className="text-lg font-medium text-white mb-4">
            {editingId ? 'Edit Access Code' : 'Add New Access Code'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Code *
                </label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
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
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                rows="3"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={formData.isActive}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-300">
                Active
              </label>
            </div>
            
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {editingId ? 'Update' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Access Codes List */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Code
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Description
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Uses
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {accessCodes.length > 0 ? (
                accessCodes.map((code) => (
                  <tr key={code._id} className="hover:bg-gray-750">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FiKey className="flex-shrink-0 h-5 w-5 text-blue-400" />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white">{code.code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-300 max-w-xs truncate">
                        {code.description || 'No description'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">
                        {code.currentUses} / {code.maxUses || '∞'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        code.isActive 
                          ? 'bg-green-900 text-green-200' 
                          : 'bg-gray-700 text-gray-300'
                      }`}>
                        {code.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(code)}
                        className="text-blue-400 hover:text-blue-300 mr-4"
                        title="Edit"
                      >
                        <FiEdit2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(code._id)}
                        className="text-red-400 hover:text-red-300"
                        title="Delete"
                      >
                        <FiTrash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-400">
                    No access codes found. Click 'Add New Code' to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
