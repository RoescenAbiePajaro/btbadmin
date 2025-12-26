// src/components/student/StudentDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import StudentFileSharing from './StudentFileSharing'; // Import the component

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

  const fetchUserData = useCallback(async () => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      navigate('/login');
      return null;
    }

    try {
      // Always fetch fresh user data from server
      const response = await axios.get('http://localhost:5000/api/auth/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.data?.user) {
        const userData = response.data.data.user;
        console.log('Fetched fresh user data:', userData);
        
        // Update localStorage with fresh data
        localStorage.setItem('user', JSON.stringify(userData));
        return userData;
      } else {
        // Fallback to localStorage data
        const parsedUser = JSON.parse(userData);
        if (parsedUser.role !== 'student') {
          navigate('/login');
          return null;
        }
        return parsedUser;
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Fallback to localStorage data
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
      
      // First validate the class code
      const validateResponse = await axios.get(
        `http://localhost:5000/api/classes/validate/${joinClassCode.toUpperCase()}`,
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

      // Join the class
      const joinResponse = await axios.post(
        'http://localhost:5000/api/classes/join',
        { classCode: joinClassCode.toUpperCase() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (joinResponse.data.toast?.type === 'success') {
        // Update user state with new data
        const updatedUser = joinResponse.data.data.user;
        console.log('Updated user after joining:', updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        
        // Close modal and reset
        setShowJoinClassModal(false);
        setJoinClassCode('');
        setJoinClassInfo(null);
        
        // Force refresh
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

  const handleLogout = () => {
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
          {!user && (
            <button
              onClick={() => window.location.reload()}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition duration-200"
            >
              Reload Page
            </button>
          )}
        </div>
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
              <h1 className="text-2xl font-bold text-white">Student Dashboard</h1>
              <p className="text-gray-400">Welcome, {user.fullName}</p>
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

      {/* Add Tabs */}
      <div className="container mx-auto px-4 py-4 border-b border-gray-700">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-1 font-medium text-sm border-b-2 transition duration-200 ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`py-3 px-1 font-medium text-sm border-b-2 transition duration-200 ${
              activeTab === 'files'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            File Sharing
          </button>
        </nav>
      </div>

      {/* Dashboard Content */}
      <div className="container mx-auto px-4 py-8">
        {activeTab === 'overview' ? (
          <>
            <div className="grid md:grid-cols-3 gap-6">
              {/* User Info Card */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Your Information</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-400">Full Name:</span>
                    <p className="text-white">{user.fullName}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Email:</span>
                    <p className="text-white">{user.email}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Username:</span>
                    <p className="text-white">{user.username}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Role:</span>
                    <p className="text-white capitalize">{user.role}</p>
                  </div>
                </div>
              </div>

              {/* Academic Info Card */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Academic Information</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-400">School:</span>
                    <p className="text-white">{user.school || 'Not specified'}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Course:</span>
                    <p className="text-white">{user.course || 'Not specified'}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Year:</span>
                    <p className="text-white">{user.year || 'Not specified'}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Block:</span>
                    <p className="text-white">{user.block || 'Not specified'}</p>
                  </div>
                </div>
              </div>

              {/* Class Info Card (shows only count) */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Classes Joined</h3>
                    <p className="text-gray-400 text-sm">Total number of classes</p>
                  </div>
                  <div className="bg-blue-900 text-blue-300 font-bold text-3xl px-5 py-3 rounded-lg">
                    {user.allClasses ? user.allClasses.length : (user.enrolledClass ? 1 : 0)}
                  </div>
                </div>
                
                <button
                  onClick={() => setShowJoinClassModal(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition duration-200 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Join New Class
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-8">
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-md mx-auto">
                <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  {!user.enrolledClassDetails && (
                    <button
                      onClick={() => setShowJoinClassModal(true)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg transition duration-200 flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Join a Class
                    </button>
                  )}
                  <button
                    onClick={() => setActiveTab('files')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition duration-200 flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Go to File Sharing
                  </button>
                  <a
                    href="https://mega.nz/file/8Ndx0Qpb#O-1yE6KF8KdndwiOiOuQTLGvDuKKviplPToqwy-sa1w"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-gradient-to-r from-purple-600 to-purple-600 hover:opacity-90 text-white py-3 rounded-lg transition duration-200 text-center"
                  >
                    Download PC
                  </a>
                </div>
              </div>
            </div>
          </>
        ) : (
          // File Sharing Tab - Render the StudentFileSharing component
          <StudentFileSharing student={user} />
        )}
      </div>
    </div>
  );
}