// src/components/educator/AcademicSettings.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DeleteConfirmationModal from '../DeleteConfirmationModal';
import Toast from '../Toast';

export default function AcademicSettings() {
  const [activeType, setActiveType] = useState('school');
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  useEffect(() => {
    fetchItems();
  }, [activeType]);

  const fetchItems = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `https://btbtestservice.onrender.comapi/academic-settings/${activeType}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      setItems(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching academic settings:', error);
      setItems([]);
      showToast('Error fetching items', 'error');
    }
  };

  const handleAddItem = async () => {
    if (activeType === 'school' && items.length > 0) {
      showToast('You can only add one school. Please edit the existing one.', 'error');
      return;
    }

    if (!newItem.trim()) {
      showToast('Please enter a name', 'error');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `https://btbtestservice.onrender.comapi/academic-settings`,
        {
          name: newItem.trim(),
          type: activeType
        },
        {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.toast) {
        showToast(response.data.toast.message, response.data.toast.type);
        
        if (response.data.toast.type === 'success' && response.data.setting) {
          setItems(prevItems => [...prevItems, response.data.setting]);
          setNewItem('');
        }
      }
    } catch (error) {
      console.error('Error adding academic setting:', error);
      const errorMessage = error.response?.data?.toast?.message || 
                         error.response?.data?.message || 
                         'Failed to add item. Please try again.';
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (item) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `https://btbtestservice.onrender.comapi/academic-settings/${itemToDelete._id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      setItems(items.filter(item => item._id !== itemToDelete._id));
      showToast(`${itemToDelete.name} deleted successfully`, 'success');
    } catch (error) {
      console.error('Error deleting item:', error);
      const errorMessage = error.response?.data?.toast?.message || 
                         error.response?.data?.message || 
                         'Failed to delete item.';
      showToast(errorMessage, 'error');
    } finally {
      setShowDeleteModal(false);
      setItemToDelete(null);
    }
  };

  const handleToggleActive = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `https://btbtestservice.onrender.comapi/academic-settings/${id}/toggle`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.toast) {
        showToast(response.data.toast.message, response.data.toast.type);
        
        if (response.data.setting) {
          setItems(items.map(item => 
            item._id === id ? { ...item, isActive: response.data.setting.isActive } : item
          ));
        }
      }
    } catch (error) {
      console.error('Error toggling item:', error);
      const errorMessage = error.response?.data?.toast?.message || 
                         'Failed to update item.';
      showToast(errorMessage, 'error');
    }
  };

  const handleStartEdit = (item) => {
    setEditingId(item._id);
    setEditName(item.name);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleSaveEdit = async (id) => {
    if (!editName.trim()) {
      showToast('Please enter a name', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `https://btbtestservice.onrender.comapi/academic-settings/${id}`,
        {
          name: editName.trim()
        },
        {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.toast) {
        showToast(response.data.toast.message, response.data.toast.type);
        
        if (response.data.toast.type === 'success' && response.data.setting) {
          setItems(items.map(item => 
            item._id === id ? response.data.setting : item
          ));
          setEditingId(null);
          setEditName('');
        }
      }
    } catch (error) {
      console.error('Error updating item:', error);
      const errorMessage = error.response?.data?.toast?.message || 
                         error.response?.data?.message || 
                         'Failed to update item.';
      showToast(errorMessage, 'error');
    }
  };

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const typeLabels = {
    school: 'Schools',
    course: 'Courses',
    year: 'Years',
    block: 'Blocks'
  };

  const filteredItems = items.filter(item => 
    searchTerm === '' || 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 relative">
      {/* Toast Notification */}
      {toast?.show && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(prev => ({ ...prev, show: false }))} 
        />
      )}
      
      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        showModal={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setItemToDelete(null);
        }}
        onConfirm={handleDeleteItem}
        deleteMode={itemToDelete ? 'single' : 'all'}
        isDeleting={loading}
      />

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Academic Settings</h2>
        <p className="text-gray-400">Manage schools, courses, years, and blocks for student registration</p>
        <p className="text-sm text-pink-400 mt-1">
          These settings are specific to your account and will be shown to students joining your classes.
        </p>
      </div>

      {/* Type Tabs */}
      <div className="border-b border-gray-700">
        <nav className="flex space-x-6">
          {['school', 'course', 'year', 'block'].map((type) => (
            <button
              key={type}
              onClick={() => {
                setActiveType(type);
                setEditingId(null);
                setEditName('');
              }}
              className={`py-3 px-1 font-medium text-sm border-b-2 transition duration-200 ${
                activeType === type
                  ? 'border-pink-500 text-pink-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              {typeLabels[type]}
            </button>
          ))}
        </nav>
      </div>

      {/* Add New Form */}
      {(activeType !== 'school' || items.length === 0) && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
              placeholder={`Add new ${activeType} (e.g., ${activeType === 'school' ? 'College of Engineering' : 'Computer Science'})`}
              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
            <button
              onClick={handleAddItem}
              disabled={loading}
              className="bg-pink-600 hover:bg-pink-700 text-white py-3 px-6 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
            >
              {loading ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {/* Items List */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h3 className="font-semibold text-white">
            {typeLabels[activeType]} ({filteredItems.length})
          </h3>
          <div className="relative w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-700 rounded-lg bg-gray-900 text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              placeholder={`Search ${activeType}s...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="divide-y divide-gray-700">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <div key={item._id} className="p-4 hover:bg-gray-750 transition duration-200">
                {editingId === item._id ? (
                  // Edit Mode
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit(item._id)}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(item._id)}
                        className="bg-pink-600 hover:bg-pink-700 text-white py-2 px-4 rounded-lg transition duration-200"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition duration-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className="text-white">{item.name}</span>
                      <button
                        onClick={() => handleToggleActive(item._id)}
                        className={`px-2 py-1 rounded text-xs transition duration-200 ${
                          item.isActive 
                            ? 'bg-green-900/30 text-green-400 hover:bg-green-800/40' 
                            : 'bg-red-900/30 text-red-400 hover:bg-red-800/40'
                        }`}
                      >
                        {item.isActive ? 'Active' : 'Inactive'}
                      </button>
                      <span className="text-xs text-gray-500">
                        Created: {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStartEdit(item)}
                        className="text-yellow-400 hover:text-yellow-300 transition duration-200 p-1 rounded hover:bg-yellow-500/10"
                        title="Edit"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteClick(item)}
                        className="text-red-400 hover:text-red-300 transition duration-200 p-1 rounded hover:bg-red-500/10"
                        title="Delete"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              {searchTerm 
                ? `No ${activeType}s found matching "${searchTerm}"`
                : `No ${activeType}s added yet. Add your first one above.`}
            </div>
          )}
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-pink-900/20 border border-pink-700/50 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <svg className="h-5 w-5 text-pink-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-pink-300 font-medium">How this works:</p>
            <ul className="text-pink-400 text-sm mt-1 space-y-1">
              <li>• These academic settings are specific to your educator account</li>
              <li>• You can add, edit, or delete settings as needed</li>
              <li>• Each educator has their own unique set of academic options</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}