// src/components/student/StudentDashboard.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import StudentFileSharing from './StudentFileSharing';
import StudFeedback from './StudFeedback';
import StudentProfileSettings from './StudentProfileSettings';
import { FiMessageSquare, FiHome, FiFolder, FiUser, FiBookOpen, FiRefreshCw } from 'react-icons/fi';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [forceRefresh, setForceRefresh] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showJoinClassModal, setShowJoinClassModal] = useState(false);
  const [joinClassCode, setJoinClassCode] = useState('');
  const [joinClassLoading, setJoinClassLoading] = useState(false);
  const [joinClassError, setJoinClassError] = useState('');
  const [joinClassInfo, setJoinClassInfo] = useState(null);
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
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL || 'https://btbtestservice.onrender.com'}/api/auth/profile`, {
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
        if (parsedUser.role !== 'student') {
          navigate('/login');
          return null;
        }
        return parsedUser;
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      try {
        const parsedUser = JSON.parse(userData);
        if (parsedUser.role !== 'student') {
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
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL || 'https://btbtestservice.onrender.com'}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.data?.user) {
        const updatedUser = response.data.data.user;
        const currentUser = user || JSON.parse(localStorage.getItem('user') || '{}');
        const currentClasses = currentUser.allClasses?.map(c => c.classCode) || [];
        const newClasses = updatedUser.allClasses?.map(c => c.classCode) || [];
        
        if (JSON.stringify(currentClasses) !== JSON.stringify(newClasses)) {
          console.log('Classes changed! Updating UI...');
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
          setLastUpdated(new Date());
          
          if (newClasses.length < currentClasses.length) {
            const removedClass = currentClasses.find(code => !newClasses.includes(code));
            if (removedClass) {
              alert(`You have been removed from class ${removedClass}`);
            }
          }
        } else {
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
          setLastUpdated(new Date());
        }
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
    console.log('Current user state:', user);
    console.log('Enrolled class:', user?.enrolledClass);
    console.log('Enrolled class details:', user?.enrolledClassDetails);
  }, [user]);

  const handleJoinClass = async () => {
    if (!joinClassCode.trim()) {
      setJoinClassError('Please enter a class code');
      return;
    }

    setJoinClassLoading(true);
    setJoinClassError('');

    try {
      const token = localStorage.getItem('token');
      
      const validateResponse = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL || 'https://btbtestservice.onrender.com'}/api/classes/validate/${joinClassCode.toUpperCase()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!validateResponse.data.valid) {
        setJoinClassError('Invalid class code');
        setJoinClassInfo(null);
        setJoinClassLoading(false);
        return;
      }

      setJoinClassInfo({
        className: validateResponse.data.className,
        educatorName: validateResponse.data.educatorName,
        academicData: validateResponse.data.academicData
      });

      const joinResponse = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL || 'https://btbtestservice.onrender.com'}/api/classes/join`,
        { classCode: joinClassCode.toUpperCase() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (joinResponse.data.toast?.type === 'success') {
        const updatedUser = joinResponse.data.data.user;
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        
        setShowJoinClassModal(false);
        setJoinClassCode('');
        setJoinClassInfo(null);
        setForceRefresh(!forceRefresh);
      } else {
        setJoinClassError(joinResponse.data.toast?.message || 'Failed to join class');
      }
    } catch (error) {
      console.error('Join class error details:', error.response?.data);
      setJoinClassError(error.response?.data?.toast?.message || 'Failed to join class');
    } finally {
      setJoinClassLoading(false);
    }
  };

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

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
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
              <h1 className="text-xl sm:text-2xl font-bold text-white">Student Dashboard</h1>
              <p className="text-gray-400">Welcome, {user.fullName}</p>
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
                  title={autoRefreshEnabled ? 'Auto-refresh enabled (30s)' : 'Auto-refresh disabled'}
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

      {/* Join Class Modal */}
      {showJoinClassModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Join a Class</h3>
              <button
                onClick={() => {
                  setShowJoinClassModal(false);
                  setJoinClassCode('');
                  setJoinClassError('');
                  setJoinClassInfo(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Class Code
              </label>
              <input
                type="text"
                value={joinClassCode}
                onChange={(e) => {
                  setJoinClassCode(e.target.value.toUpperCase());
                  setJoinClassError('');
                  setJoinClassInfo(null);
                }}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                placeholder="Enter class code (e.g., ABCD12)"
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter the class code provided by your educator
              </p>
            </div>

            {joinClassInfo && (
              <div className="mb-4 p-3 bg-blue-500/20 border border-blue-500/50 rounded-lg">
                <p className="text-blue-300 text-sm">
                  Class: <span className="font-semibold">{joinClassInfo.className}</span>
                </p>
                <p className="text-blue-400 text-xs mt-1">
                  Educator: {joinClassInfo.educatorName}
                </p>
                {joinClassInfo.academicData && (
                  <div className="mt-2 text-xs">
                    <p className="text-blue-300">Academic Information:</p>
                    <p className="text-blue-400">School: {joinClassInfo.academicData.school || 'Not specified'}</p>
                    <p className="text-blue-400">Course: {joinClassInfo.academicData.course || 'Not specified'}</p>
                    <p className="text-blue-400">Year: {joinClassInfo.academicData.year || 'Not specified'}</p>
                    <p className="text-blue-400">Block: {joinClassInfo.academicData.block || 'Not specified'}</p>
                  </div>
                )}
              </div>
            )}

            {joinClassError && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                <p className="text-red-300 text-sm">{joinClassError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowJoinClassModal(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg transition duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleJoinClass}
                disabled={joinClassLoading || !joinClassCode.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {joinClassLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Joining...
                  </>
                ) : (
                  'Join Class'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="border-b border-gray-700 bg-gray-800/50 sticky top-[73px] z-10">
        <div className="container mx-auto px-4">
          <nav className="flex space-x-4 md:space-x-8 overflow-x-auto whitespace-nowrap py-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-3 font-medium text-sm rounded-lg transition duration-200 flex items-center gap-2 ${
                activeTab === 'overview'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
              }`}
            >
              <FiHome className="w-4 h-4" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className={`py-2 px-3 font-medium text-sm rounded-lg transition duration-200 flex items-center gap-2 ${
                activeTab === 'files'
                  ? 'bg-blue-500/20 text-blue-400'
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
                  ? 'bg-blue-500/20 text-blue-400'
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
                  ? 'bg-blue-500/20 text-blue-400'
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
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {/* User Info Card */}
              <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-xl p-6">
                <div className="flex items-center gap-4 mb-4">
                  {user?.profilePicture?.url ? (
                    <img
                      src={user.profilePicture.url}
                      alt={user.fullName}
                      className="w-16 h-16 rounded-full object-cover ring-2 ring-blue-500"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <span className="text-white font-bold text-xl">
                        {user?.fullName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </span>
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-white">{user.fullName}</h3>
                    <p className="text-gray-400 text-sm">{user.email}</p>
                    <p className="text-blue-400 text-xs capitalize mt-1">Student</p>
                  </div>
                </div>
              </div>

              {/* Academic Info Card */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <FiBookOpen className="w-5 h-5 text-blue-400" />
                  Academic Information
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">School:</span>
                    <span className="text-white">{user.school || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Course:</span>
                    <span className="text-white">{user.course || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Year:</span>
                    <span className="text-white">{user.year || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Block:</span>
                    <span className="text-white">{user.block || 'Not specified'}</span>
                  </div>
                </div>
              </div>

              {/* Class Info Card */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Classes Joined</h3>
                  <div className="bg-blue-900 text-blue-300 font-bold text-2xl px-4 py-2 rounded-lg">
                    {user.allClasses ? user.allClasses.length : (user.enrolledClass ? 1 : 0)}
                  </div>
                </div>
                
                {user?.enrolledClassDetails && !(user?.allClasses || []).some(c => c.classCode === user.enrolledClassDetails.classCode) && (
                  <div className="mb-3 p-2 bg-red-900/30 border border-red-700 text-red-300 text-xs rounded">
                    Your current class is inactive. Switch to an active class to access materials.
                  </div>
                )}
                
                <button
                  onClick={() => setShowJoinClassModal(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition duration-200 flex items-center justify-center gap-2 text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Join New Class
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="max-w-md mx-auto">
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setActiveTab('files')}
                    disabled={!user?.allClasses || user.allClasses.length === 0}
                    className={`w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition duration-200 flex items-center justify-center gap-2 text-sm ${
                      (!user?.allClasses || user.allClasses.length === 0) ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <FiFolder className="w-4 h-4" />
                    Go to File Sharing
                  </button>
                  <button
                    onClick={() => setActiveTab('profile')}
                    className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition duration-200 flex items-center justify-center gap-2 text-sm"
                  >
                    <FiUser className="w-4 h-4" />
                    Update Profile
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
        
        {activeTab === 'files' && (
          <StudentFileSharing 
            student={user} 
            onRefresh={handleManualRefresh}
            lastUpdated={lastUpdated}
          />
        )}
        
        {activeTab === 'feedback' && <StudFeedback student={user} />}
        
        {activeTab === 'profile' && (
          <StudentProfileSettings 
            user={user} 
            onProfileUpdate={(updatedUser) => {
              setUser(updatedUser);
              refreshUserData();
            }}
          />
        )}
      </div>
    </div>
  );
}