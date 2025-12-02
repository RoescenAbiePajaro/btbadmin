// src/components/educator/ClassManagement.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function ClassManagement() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    className: '',
    description: ''
  });
  const [generatedCode, setGeneratedCode] = useState('');

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

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Class code copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Class Codes</h2>
          <p className="text-gray-400">Create and manage your class codes</p>
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

      {/* Classes Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map((classItem) => (
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
              <div className="flex gap-2">
                <button
                  onClick={() => copyToClipboard(classItem.classCode)}
                  className="text-blue-400 hover:text-blue-300 transition duration-200"
                >
                  Copy Code
                </button>
                <button
                  onClick={() => {/* Navigate to student list */}}
                  className="text-purple-400 hover:text-purple-300 transition duration-200"
                >
                  View Students
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Generate Code Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Generate Class Code</h3>
              <button
                onClick={() => setShowModal(false)}
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
                  onClick={() => setShowModal(false)}
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