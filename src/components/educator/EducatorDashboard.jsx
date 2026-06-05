// src/components/educator/EducatorDashboard.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ClassManagement from './ClassManagement';
import AcademicSettings from './AcademicSettings';
import StudentList from './StudentList';
import FileSharing from './FileSharing';
import EducFeedback from './EducFeedback';
import EducatorProfileSettings from './EducatorProfileSettings';
import { FiMessageSquare, FiHome, FiUsers, FiFolder, FiSettings, FiUser, FiBookOpen, FiMail, FiUserCheck, FiRefreshCw } from 'react-icons/fi';

const API_URL = 'https://btbtestservice.onrender.com';

export default function EducatorDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [forceRefresh, setForceRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const refreshIntervalRef = useRef(null);

  const fetchUserData = useCallback(async () => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      navigate('/login');
      return null;
    }

    try {
      const response = await axios.get(`${API_URL}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.data?.user) {
        const userData = response.data.data.user;
        console.log('Fetched fresh user data:', userData);
        localStorage.setItem('user', JSON.stringify(userData));
        setLastUpdated(new Date());
        return userData;
      } else {
        const parsedUser = JSON.parse(userData);
        if (parsedUser.role !== 'educator') {
          navigate('/login');
          return null;
        }
        return parsedUser;
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      try {
        const parsedUser = JSON.parse(userData);
        if (parsedUser.role !== 'educator') {
          navigate('/login');
          return null;
        }
        return parsedUser;
      } catch (parseError) {
        console.error('Error parsing user data:', parseError);
        navigate('/login');
        return null;
      }
    }
  }, [navigate]);

  const refreshUserData = async () => {
    console.log('Refreshing user data...');
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await axios.get(`${API_URL}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.data?.user) {
        const updatedUser = response.data.data.user;
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  useEffect(() => {
    const isFreshRegistration = localStorage.getItem('freshRegistration');
    if (isFreshRegistration === 'true') {
      console.log('Fresh registration detected, forcing reload...');
      localStorage.removeItem('freshRegistration');
      setForceRefresh(true);
    }
  }, []);

  useEffect(() => {
    const loadUserData = async () => {
      const userData = await fetchUserData();
      if (userData) {
        setUser(userData);
        console.log('User state set:', userData);
      }
      setLoading(false);
    };
    loadUserData();
  }, [fetchUserData, forceRefresh]);

  useEffect(() => {
    if (autoRefreshEnabled) {
      refreshIntervalRef.current = setInterval(() => {
        refreshUserData();
      }, 30000);
      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    } else {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    }
  }, [autoRefreshEnabled]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    };

    window.onpageshow = function(event) {
      if (event.persisted) {
        window.location.reload();
      }
    };
    
    window.history.pushState(null, document.title, window.location.href);
    
    window.onpopstate = function() {
      window.history.pushState(null, document.title, window.location.href);
      if (!localStorage.getItem('token') || !localStorage.getItem('user')) {
        navigate('/login');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.onpopstate = null;
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [navigate]);

  const handleManualRefresh = async () => {
    await refreshUserData();
  };

  const toggleAutoRefresh = () => {
    setAutoRefreshEnabled(!autoRefreshEnabled);
  };

  const handleLogout = () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.history.replaceState(null, '', '/login');
    navigate('/login', { replace: true });
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Educator Dashboard</h1>
              <p className="text-gray-400">Welcome back, {user?.fullName}</p>
            </div>
            <div className="flex items-center flex-wrap gap-2 sm:gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleManualRefresh}
                  className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-3 rounded-lg transition duration-200 flex items-center gap-2"
                  title="Refresh data"
                >
                  <FiRefreshCw className="w-4 h-4" />
                  Refresh
                </button>
                <button
                  onClick={toggleAutoRefresh}
                  className={`py-2 px-3 rounded-lg transition duration-200 flex items-center gap-2 ${
                    autoRefreshEnabled 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                >
                  {autoRefreshEnabled ? (
                    <>
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      Auto
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      Auto
                    </>
                  )}
                </button>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition duration-200"
              >
                Logout
              </button>
            </div>
          </div>
          {lastUpdated && (
            <div className="mt-2 text-xs text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
              {autoRefreshEnabled && ' • Auto-refresh enabled (every 30s)'}
            </div>
          )}
        </div>
      </header>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-700 bg-gray-800/50 sticky top-[73px] z-10">
        <div className="container mx-auto px-4">
          <nav className="flex space-x-4 md:space-x-8 overflow-x-auto whitespace-nowrap py-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-3 font-medium text-sm rounded-lg transition duration-200 flex items-center gap-2 ${
                activeTab === 'overview'
                  ? 'bg-pink-500/20 text-pink-400'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
              }`}
            >
              <FiHome className="w-4 h-4" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('classes')}
              className={`py-2 px-3 font-medium text-sm rounded-lg transition duration-200 flex items-center gap-2 ${
                activeTab === 'classes'
                  ? 'bg-pink-500/20 text-pink-400'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Class Codes
            </button>
            <button
              onClick={() => setActiveTab('academic')}
              className={`py-2 px-3 font-medium text-sm rounded-lg transition duration-200 flex items-center gap-2 ${
                activeTab === 'academic'
                  ? 'bg-pink-500/20 text-pink-400'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
              }`}
            >
              <FiSettings className="w-4 h-4" />
              Academic Settings
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`py-2 px-3 font-medium text-sm rounded-lg transition duration-200 flex items-center gap-2 ${
                activeTab === 'students'
                  ? 'bg-pink-500/20 text-pink-400'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
              }`}
            >
              <FiUsers className="w-4 h-4" />
              Students
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className={`py-2 px-3 font-medium text-sm rounded-lg transition duration-200 flex items-center gap-2 ${
                activeTab === 'files'
                  ? 'bg-pink-500/20 text-pink-400'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
              }`}
            >
              <FiFolder className="w-4 h-4" />
              File Sharing
            </button>
            <button
              onClick={() => setActiveTab('feedback')}
              className={`py-2 px-3 font-medium text-sm rounded-lg transition duration-200 flex items-center gap-2 ${
                activeTab === 'feedback'
                  ? 'bg-pink-500/20 text-pink-400'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
              }`}
            >
              <FiMessageSquare className="w-4 h-4" />
              Feedback
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-2 px-3 font-medium text-sm rounded-lg transition duration-200 flex items-center gap-2 ${
                activeTab === 'profile'
                  ? 'bg-pink-500/20 text-pink-400'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
              }`}
            >
              <FiUser className="w-4 h-4" />
              Profile
            </button>
          </nav>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="container mx-auto px-4 py-8">
        {activeTab === 'overview' && (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {/* User Info Card */}
              <div className="bg-gradient-to-br from-pink-600/20 to-purple-600/20 border border-pink-500/30 rounded-xl p-6">
                <div className="flex items-center gap-4 mb-4">
                  {user?.profilePicture?.url ? (
                    <img
                      src={user.profilePicture.url}
                      alt={user.fullName}
                      className="w-20 h-20 rounded-full object-cover ring-2 ring-pink-500"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center ring-2 ring-pink-500">
                      <span className="text-white font-bold text-2xl">
                        {getInitials(user?.fullName)}
                      </span>
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-semibold text-white">{user.fullName}</h3>
                    <p className="text-gray-400 text-sm flex items-center gap-1 mt-1">
                      <FiUserCheck className="w-3 h-3" />
                      {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
                    </p>
                    <p className="text-pink-400 text-xs mt-1">
                      {user.educatorSchool || user.school || 'No School Assigned'}
                    </p>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-pink-500/20 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <FiMail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-400">Email:</span>
                    <span className="text-white">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <FiUser className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-400">Username:</span>
                    <span className="text-white">@{user.username}</span>
                  </div>
                </div>
              </div>

              {/* Stats Card */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <FiBookOpen className="w-5 h-5 text-pink-400" />
                  Quick Stats
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-gray-700">
                    <span className="text-gray-400">Classes Created</span>
                    <span className="text-white font-bold text-xl">-</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-gray-700">
                    <span className="text-gray-400">Total Students</span>
                    <span className="text-white font-bold text-xl">-</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Files Shared</span>
                    <span className="text-white font-bold text-xl">-</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions Card */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setActiveTab('classes')}
                    className="w-full bg-pink-600 hover:bg-pink-700 text-white py-2 rounded-lg transition duration-200 flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create New Class
                  </button>
                  <button
                    onClick={() => setActiveTab('files')}
                    className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition duration-200 flex items-center justify-center gap-2"
                  >
                    <FiFolder className="w-4 h-4" />
                    Share Files
                  </button>
                  <button
                    onClick={() => setActiveTab('profile')}
                    className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition duration-200 flex items-center justify-center gap-2"
                  >
                    <FiUser className="w-4 h-4" />
                    Update Profile
                  </button>
                </div>
              </div>
            </div>

            {/* Contact & Academic Info */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Contact Information</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-gray-400 text-sm">Home Address</label>
                    <p className="text-white mt-1">{user?.homeAddress || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm">Cellphone Number</label>
                    <p className="text-white mt-1">{user?.cellphoneNumber || 'Not specified'}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Academic Information</h3>
                <div>
                  <label className="block text-gray-400 text-sm">School</label>
                  <p className="text-white mt-1">{user?.educatorSchool || user?.school || 'Not specified'}</p>
                </div>
              </div>
            </div>
          </>
        )}
        
        {activeTab === 'classes' && <ClassManagement />}
        {activeTab === 'academic' && <AcademicSettings />}
        {activeTab === 'students' && <StudentList />}
        {activeTab === 'files' && <FileSharing educatorId={user?._id} />}
        {activeTab === 'feedback' && <EducFeedback educator={user} />}
        {activeTab === 'profile' && (
          <EducatorProfileSettings 
            user={user} 
            onProfileUpdate={(updatedUser) => {
              setUser(updatedUser);
              localStorage.setItem('user', JSON.stringify(updatedUser));
            }}
          />
        )}
      </div>
    </div>
  );
}