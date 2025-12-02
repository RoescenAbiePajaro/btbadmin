// src/components/educator/EducatorDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ClassManagement from './ClassManagement';
import AcademicSettings from './AcademicSettings';
import StudentList from './StudentList';

export default function EducatorDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('classes');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      navigate('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      if (parsedUser.role !== 'educator') {
        navigate('/login');
        return;
      }
      setUser(parsedUser);
    } catch (error) {
      console.error('Error parsing user data:', error);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // Handle browser/tab close or navigation away
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      // Clear local storage on close
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Send a logout request to the server if possible
      const token = localStorage.getItem('token');
      if (token) {
        // Use sendBeacon for reliable logout request on page unload
        const data = new FormData();
        data.append('token', token);
        navigator.sendBeacon(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/auth/logout`, data);
      }
    };

    // Prevent caching of dashboard page
    window.onpageshow = function(event) {
      if (event.persisted) {
        window.location.reload();
      }
    };
    
    // Clear browser history and replace current entry
    window.history.pushState(null, document.title, window.location.href);
    
    // Handle back/forward navigation
    window.onpopstate = function() {
      window.history.pushState(null, document.title, window.location.href);
      if (!localStorage.getItem('token') || !localStorage.getItem('user')) {
        navigate('/login');
      }
    };

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Cleanup function
    return () => {
      window.onpopstate = null;
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Clear browser history and navigate to login
    window.history.replaceState(null, '', '/login');
    navigate('/login', { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">Educator Panel</h1>
              <p className="text-gray-400">Welcome back, {user?.fullName}</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="border-b border-gray-700 mb-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('classes')}
              className={`py-4 px-1 font-medium text-sm border-b-2 transition duration-200 ${
                activeTab === 'classes'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Class Codes
              </span>
            </button>
            <button
              onClick={() => setActiveTab('academic')}
              className={`py-4 px-1 font-medium text-sm border-b-2 transition duration-200 ${
                activeTab === 'academic'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Academic Settings
              </span>
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`py-4 px-1 font-medium text-sm border-b-2 transition duration-200 ${
                activeTab === 'students'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-7.645a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Student Management
              </span>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'classes' && <ClassManagement />}
          {activeTab === 'academic' && <AcademicSettings />}
          {activeTab === 'students' && <StudentList />}
        </div>
      </div>
    </div>
  );
}