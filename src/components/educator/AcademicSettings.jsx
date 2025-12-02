// src/components/educator/AcademicSettings.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function AcademicSettings() {
  const [activeType, setActiveType] = useState('course');
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchItems();
  }, [activeType]);

  const fetchItems = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/academic-settings/${activeType}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setItems(response.data || []);
    } catch (error) {
      console.error('Error fetching academic settings:', error);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.trim()) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://localhost:5000/api/academic-settings`,
        {
          name: newItem.trim(),
          type: activeType
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.data?.setting) {
        setItems([...items, response.data.data.setting]);
        setNewItem('');
      }
    } catch (error) {
      console.error('Error adding academic setting:', error);
      alert(error.response?.data?.toast?.message || 'Failed to add item');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      const token = localStorage.getItem('token');
      // You'll need to implement delete endpoint in backend
      // For now, just remove from frontend
      setItems(items.filter(item => item._id !== id));
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const typeLabels = {
    school: 'Schools',
    course: 'Courses',
    year: 'Years',
    block: 'Blocks'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Academic Settings</h2>
        <p className="text-gray-400">Manage schools,courses, years, and blocks for student registration</p>
      </div>

      {/* Type Tabs */}
      <div className="border-b border-gray-700">
        <nav className="flex space-x-6">
          {['school','course', 'year', 'block'].map((type) => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`py-3 px-1 font-medium text-sm border-b-2 transition duration-200 ${
                activeType === type
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              {typeLabels[type]}
            </button>
          ))}
        </nav>
      </div>

      {/* Add New Form */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <div className="flex gap-4">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder={`Add new ${activeType}...`}
            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={handleAddItem}
            disabled={loading || !newItem.trim()}
            className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>

      {/* Items List */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h3 className="font-semibold text-white">
            {typeLabels[activeType]} ({items.length})
          </h3>
          <div className="relative w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-700 rounded-lg bg-gray-900 text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder={`Search ${activeType}s...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="divide-y divide-gray-700">
          {items
            .filter(item => 
              searchTerm === '' || 
              item.name.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map((item) => (
            <div key={item._id} className="p-4 flex justify-between items-center hover:bg-gray-750 transition duration-200">
              <div>
                <span className="text-white">{item.name}</span>
                <span className="ml-2 px-2 py-1 bg-gray-700 rounded text-xs text-gray-400">
                  {item.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {/* Edit functionality */}}
                  className="text-blue-400 hover:text-blue-300 transition duration-200"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteItem(item._id)}
                  className="text-red-400 hover:text-red-300 transition duration-200"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          
          {items.filter(item => 
            searchTerm === '' || 
            item.name.toLowerCase().includes(searchTerm.toLowerCase())
          ).length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {searchTerm 
                ? `No ${activeType}s found matching "${searchTerm}"`
                : `No ${activeType}s added yet. Add your first one above.`}
            </div>
          ) : null}
        </div>
      </div>

     
    </div>
  );
}