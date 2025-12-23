// src/components/student/StudentDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [forceRefresh, setForceRefresh] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');
  const [showJoinClassModal, setShowJoinClassModal] = useState(false);
  const [joinClassCode, setJoinClassCode] = useState('');
  const [joinClassLoading, setJoinClassLoading] = useState(false);
  const [joinClassError, setJoinClassError] = useState('');
  const [joinClassInfo, setJoinClassInfo] = useState(null);
  const [joinSuccess, setJoinSuccess] = useState(false);

  // Function to fetch fresh user data from server
  const fetchFreshUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return null;
      }

      const response = await axios.get('http://localhost:5000/api/auth/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.data?.user) {
        const userData = response.data.data.user;
        console.log('Fresh user data fetched:', userData);
        
        // Update localStorage with fresh data
        localStorage.setItem('user', JSON.stringify(userData));
        return userData;
      }
      return null;
    } catch (error) {
      console.error('Error fetching fresh user data:', error);
      return null;
    }
  };

  useEffect(() => {
    const loadUserData = async () => {
      setLoading(true);
      const userData = await fetchFreshUserData();
      if (userData) {
        setUser(userData);
        console.log('User state updated with fresh data:', userData);
      }
      setLoading(false);
    };

    loadUserData();
  }, [navigate, forceRefresh]);

  // Debug logging
  useEffect(() => {
    console.log('Current user state:', user);
    console.log('Enrolled class details:', user?.enrolledClassDetails);
    console.log('Enrolled class object:', user?.enrolledClass);
    console.log('Has enrolledClass in DB:', !!user?.enrolledClass);
  }, [user]);

  const handleJoinClass = async () => {
    if (!joinClassCode.trim()) {
      setJoinClassError('Please enter a class code');
      return;
    }

    setJoinClassLoading(true);
    setJoinClassError('');
    setJoinSuccess(false);

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
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Join class response:', joinResponse.data);

      if (joinResponse.data.data?.user) {
        // Success! Update local state with the response data
        const updatedUser = joinResponse.data.data.user;
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        setJoinSuccess(true);
        
        // Show success message
        setTimeout(() => {
          alert(`Successfully joined class: ${validateResponse.data.className}!`);
        }, 100);
        
        // Close modal and reset
        setTimeout(() => {
          setShowJoinClassModal(false);
          setJoinClassCode('');
          setJoinClassInfo(null);
          setJoinClassLoading(false);
          
          // Force refresh to update UI
          setForceRefresh(prev => prev + 1);
        }, 500);
        
      } else if (joinResponse.data.toast?.type === 'error') {
        // Server returned an error
        setJoinClassError(joinResponse.data.toast.message || 'Failed to join class');
        setJoinClassLoading(false);
      } else {
        // Generic error
        setJoinClassError('Failed to join class. Please try again.');
        setJoinClassLoading(false);
      }
    } catch (error) {
      console.error('Join class error:', error);
      
      // Handle specific error cases
      if (error.response) {
        // Server responded with error status
        const errorMessage = error.response.data?.toast?.message || 
                           error.response.data?.message || 
                           error.response.data?.error ||
                           'Failed to join class';
        
        // Check if student is already enrolled
        if (errorMessage.includes('already enrolled') || errorMessage.includes('already in this class')) {
          // Student is already enrolled, fetch fresh data to update UI
          const freshData = await fetchFreshUserData();
          if (freshData) {
            setUser(freshData);
            setJoinClassError('You are already enrolled in this class.');
          } else {
            setJoinClassError(errorMessage);
          }
        } else {
          setJoinClassError(errorMessage);
        }
      } else if (error.request) {
        // Request was made but no response
        setJoinClassError('Network error. Please check your connection and try again.');
      } else {
        // Something else happened
        setJoinClassError('An unexpected error occurred. Please try again.');
      }
      
      setJoinClassLoading(false);
    }
  };

  // Function to manually refresh user data
  const refreshUserData = async () => {
    setLoading(true);
    const freshData = await fetchFreshUserData();
    if (freshData) {
      setUser(freshData);
      alert('User data refreshed successfully!');
    } else {
      alert('Failed to refresh user data. Please try logging in again.');
    }
    setLoading(false);
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
              {user.enrolledClassDetails ? (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-green-400">
                    Joined: {user.enrolledClassDetails.className} ({user.enrolledClassDetails.classCode})
                  </span>
                  <button
                    onClick={refreshUserData}
                    className="text-xs bg-gray-700 hover:bg-gray-600 text-white py-1 px-2 rounded transition duration-200"
                    title="Refresh data"
                  >
                    ↻
                  </button>
                </div>
              ) : user.enrolledClass ? (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-yellow-400">
                    Class data needs refresh
                  </span>
                  <button
                    onClick={refreshUserData}
                    className="text-xs bg-yellow-600 hover:bg-yellow-700 text-white py-1 px-2 rounded transition duration-200"
                    title="Refresh to see class details"
                  >
                    Refresh
                  </button>
                </div>
              ) : (
                <p className="text-sm text-red-400 mt-1">Not enrolled in any class</p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={refreshUserData}
                className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition duration-200"
                title="Refresh user data"
              >
                Refresh
              </button>
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
                  setJoinSuccess(false);
                }}
                className="text-gray-400 hover:text-white"
                disabled={joinClassLoading}
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
                  setJoinSuccess(false);
                }}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                placeholder="Enter class code (e.g., ABCD12)"
                disabled={joinClassLoading}
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

            {joinSuccess && (
              <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-green-300 text-sm">Successfully joined class!</p>
                </div>
                <p className="text-green-400 text-xs mt-1">
                  Redirecting...
                </p>
              </div>
            )}

            {joinClassError && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-300 text-sm">{joinClassError}</p>
                </div>
                {joinClassError.includes('already enrolled') && (
                  <button
                    onClick={refreshUserData}
                    className="mt-2 text-xs bg-red-600 hover:bg-red-700 text-white py-1 px-3 rounded transition duration-200"
                  >
                    Refresh My Status
                  </button>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (!joinClassLoading) {
                    setShowJoinClassModal(false);
                    setJoinClassCode('');
                    setJoinClassError('');
                    setJoinClassInfo(null);
                    setJoinSuccess(false);
                  }
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={joinClassLoading}
              >
                {joinSuccess ? 'Close' : 'Cancel'}
              </button>
              <button
                onClick={handleJoinClass}
                disabled={joinClassLoading || !joinClassCode.trim() || joinSuccess}
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
                ) : joinSuccess ? (
                  <>
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Success!
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
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-white">Your Information</h3>
                  <button
                    onClick={refreshUserData}
                    className="text-gray-400 hover:text-white text-sm"
                    title="Refresh data"
                  >
                    ↻ Refresh
                  </button>
                </div>
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

              {/* Class Info Card */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-white">Class Information</h3>
                  <button
                    onClick={refreshUserData}
                    className="text-gray-400 hover:text-white text-sm"
                    title="Refresh class info"
                  >
                    ↻ Refresh
                  </button>
                </div>
                {user.enrolledClassDetails ? (
                  <div className="space-y-3">
                    <div>
                      <span className="text-gray-400">Class Code:</span>
                      <p className="text-white font-mono">{user.enrolledClassDetails.classCode}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Class Name:</span>
                      <p className="text-white">{user.enrolledClassDetails.className}</p>
                    </div>
                    {user.enrolledClassDetails.educatorName && (
                      <div>
                        <span className="text-gray-400">Educator:</span>
                        <p className="text-white">{user.enrolledClassDetails.educatorName}</p>
                      </div>
                    )}
                    <div className="pt-3">
                      <button
                        onClick={() => setActiveTab('files')}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition duration-200"
                      >
                        Go to Learning Materials
                      </button>
                    </div>
                  </div>
                ) : user.enrolledClass ? (
                  <div className="space-y-3">
                    <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3">
                      <p className="text-yellow-300 text-sm">
                        Class data needs to be refreshed. Click the Refresh button above.
                      </p>
                    </div>
                    <button
                      onClick={refreshUserData}
                      className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-lg transition duration-200"
                    >
                      Refresh Class Data
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-400 mb-4">Not enrolled in any class</p>
                    <button
                      onClick={() => setShowJoinClassModal(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition duration-200"
                    >
                      Join a Class
                    </button>
                  </div>
                )}
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
                  <button
                    onClick={refreshUserData}
                    className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg transition duration-200 flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh All Data
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
          // File Sharing Tab
          <div className="space-y-8">
            {/* File Sharing Content */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-white">
                    File Sharing
                  </h3>
                  {user.enrolledClassDetails && (
                    <p className="text-gray-400 text-sm mt-1">
                      Class: {user.enrolledClassDetails.className} ({user.enrolledClassDetails.classCode})
                    </p>
                  )}
                </div>
                <button
                  onClick={refreshUserData}
                  className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition duration-200"
                >
                  Refresh
                </button>
              </div>
              
              {user.enrolledClassDetails ? (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-white mb-2">Welcome to File Sharing</p>
                  <p className="text-gray-400 text-sm mb-4">
                    You can view and download learning materials from your educator
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => window.location.reload()}
                      className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition duration-200"
                    >
                      Refresh Page
                    </button>
                    <button
                      onClick={() => setActiveTab('overview')}
                      className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition duration-200"
                    >
                      Back to Overview
                    </button>
                  </div>
                </div>
              ) : user.enrolledClass ? (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-yellow-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <p className="text-white mb-2">Class Data Needs Refresh</p>
                  <p className="text-gray-400 text-sm mb-4">
                    Your class information needs to be refreshed to access files
                  </p>
                  <button
                    onClick={refreshUserData}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-lg transition duration-200"
                  >
                    Refresh Class Data
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-white mb-2">You need to join a class first</p>
                  <p className="text-gray-400 text-sm mb-4">
                    Join a class to access files shared by your educator
                  </p>
                  <button
                    onClick={() => setShowJoinClassModal(true)}
                    className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition duration-200"
                  >
                    Join a Class
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}