// src/components/educator/ClassManagement.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function ClassManagement() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [formData, setFormData] = useState({
    className: '',
    description: ''
  });
  const [generatedCode, setGeneratedCode] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/classes/my-classes`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (response.data.data?.classes) {
        setClasses(response.data.data.classes);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const handleGenerateCode = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://localhost:5000/api/classes/generate-code`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.data?.class) {
        const newClass = response.data.data.class;
        setClasses([newClass, ...classes]);
        setGeneratedCode(newClass.classCode);
        setShowModal(false);
        setFormData({ className: '', description: '' });
        
        // Show success message
        alert(`Class code generated: ${newClass.classCode}`);
      }
    } catch (error) {
      console.error('Error generating class code:', error);
      alert(error.response?.data?.toast?.message || 'Failed to generate class code');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClass = (classItem) => {
    setEditingClass(classItem);
    setFormData({
      className: classItem.className,
      description: classItem.description || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateClass = async (e) => {
    e.preventDefault();
    if (!editingClass) return;
    
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `http://localhost:5000/api/classes/${editingClass._id}`,
        {
          ...formData,
          isActive: true
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.data?.class) {
        const updatedClass = response.data.data.class;
        setClasses(classes.map(cls => 
          cls._id === updatedClass._id ? updatedClass : cls
        ));
        setShowEditModal(false);
        setEditingClass(null);
        setFormData({ className: '', description: '' });
        alert('Class updated successfully!');
      }
    } catch (error) {
      console.error('Error updating class:', error);
      alert(error.response?.data?.toast?.message || 'Failed to update class');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClass = async (classId) => {
    if (!window.confirm('Are you sure you want to delete this class? This action cannot be undone.')) {
      return;
    }
    
    setIsDeleting(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(
        `http://localhost:5000/api/classes/${classId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.data?.class) {
        setClasses(classes.filter(cls => cls._id !== classId));
        alert('Class deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting class:', error);
      alert(error.response?.data?.toast?.message || 'Failed to delete class');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setShowEditModal(false);
    setEditingClass(null);
    setFormData({ className: '', description: '' });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Class code copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Class Codes</h2>
          <p className="text-gray-400">Create and manage your class codes</p>
        </div>
        
        {/* Search Bar */}
        <div className="relative w-full md:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-700 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Search classes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-6 rounded-lg transition duration-200 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Generate New Class Code
        </button>
      </div>

      {/* Filter classes based on search term */}
      {classes.filter(classItem => 
        searchTerm === '' || 
        classItem.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
        classItem.classCode.toLowerCase().includes(searchTerm.toLowerCase())
      ).length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">No classes found matching "{searchTerm}"</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes
            .filter(classItem => 
              searchTerm === '' || 
              classItem.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
              classItem.classCode.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map((classItem) => (
          <div key={classItem._id} className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{classItem.className}</h3>
                <p className="text-gray-400 text-sm">{classItem.classCode}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                classItem.isActive 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {classItem.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            
            <p className="text-gray-300 mb-4">{classItem.description || 'No description'}</p>
            
            <div className="flex items-center justify-between text-sm">
              <div>
                <span className="text-gray-400">Students: </span>
                <span className="text-white font-medium">{classItem.students?.length || 0}</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => copyToClipboard(classItem.classCode)}
                  className="text-blue-400 hover:text-blue-300 transition duration-200"
                  title="Copy Code"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                </button>
                <button
                  onClick={() => handleEditClass(classItem)}
                  className="text-yellow-400 hover:text-yellow-300 transition duration-200"
                  title="Edit Class"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDeleteClass(classItem._id)}
                  disabled={isDeleting}
                  className="text-red-400 hover:text-red-300 transition duration-200 disabled:opacity-50"
                  title="Delete Class"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
            ))}
        </div>
      )}

      {/* Edit Class Modal */}
      {showEditModal && editingClass && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Edit Class</h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-white transition duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleUpdateClass} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Class Name
                </label>
                <input
                  type="text"
                  value={formData.className}
                  onChange={(e) => setFormData({...formData, className: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Computer Science 101"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows="3"
                  placeholder="Enter class description..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition duration-200"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition duration-200 flex items-center gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Updating...
                    </>
                  ) : 'Update Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generate Code Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Generate Class Code</h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-white transition duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleGenerateCode} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Class Name
                </label>
                <input
                  type="text"
                  value={formData.className}
                  onChange={(e) => setFormData({...formData, className: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Computer Science 101"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows="3"
                  placeholder="Brief description of the class..."
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg transition duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !formData.className.trim()}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Generating...' : 'Generate Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}