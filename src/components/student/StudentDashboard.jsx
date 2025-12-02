// src/components/student/StudentDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [forceRefresh, setForceRefresh] = useState(false);

  // Function to fetch and set user data
  const fetchUserData = useCallback(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      navigate('/login');
      return null;
    }

    try {
      const parsedUser = JSON.parse(userData);
      if (parsedUser.role !== 'student') {
        navigate('/login');
        return null;
      }
      
      console.log('Fetched user data:', parsedUser);
      console.log('Class details:', parsedUser.enrolledClassDetails);
      
      return parsedUser;
    } catch (error) {
      console.error('Error parsing user data:', error);
      navigate('/login');
      return null;
    }
  }, [navigate]);

  // Check for fresh registration and force reload
  useEffect(() => {
    const isFreshRegistration = localStorage.getItem('freshRegistration');
    
    if (isFreshRegistration === 'true') {
      console.log('Fresh registration detected, forcing reload...');
      localStorage.removeItem('freshRegistration');
      
      // Clear localStorage and reload to get fresh data
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      
      if (token && userData) {
        // Force state update
        try {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
        } catch (error) {
          console.error('Error parsing user data on fresh registration:', error);
        }
      }
      
      setForceRefresh(true);
    }
  }, []);

  // Initial load and periodic refresh
  useEffect(() => {
    const loadUserData = () => {
      const userData = fetchUserData();
      if (userData) {
        setUser(userData);
      }
      setLoading(false);
    };

    loadUserData();

    // Set up interval to check for data updates
    const intervalId = setInterval(() => {
      if (forceRefresh) {
        console.log('Force refresh triggered...');
        loadUserData();
        setForceRefresh(false);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [fetchUserData, forceRefresh]);

  // Listen for localStorage changes
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'user') {
        console.log('User data changed in localStorage, updating...');
        const userData = fetchUserData();
        if (userData) {
          setUser(userData);
        }
      }
    };

    // Also check on focus in case data was updated in another tab
    const handleFocus = () => {
      console.log('Window focused, checking for user data updates...');
      const userData = fetchUserData();
      if (userData) {
        setUser(userData);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchUserData]);

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

  const handleRefreshData = () => {
    console.log('Manually refreshing user data...');
    const userData = fetchUserData();
    if (userData) {
      setUser(userData);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Clear browser history and navigate to login
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
              {user.enrolledClassDetails && (
                <p className="text-sm text-green-400 mt-1">
                  Enrolled in: {user.enrolledClassDetails.className} ({user.enrolledClassDetails.classCode})
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              {/* Debug/Refresh button - can be removed in production */}
              <button
                onClick={handleRefreshData}
                className="bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-lg transition duration-200 text-sm"
                title="Refresh user data"
              >
                Refresh Data
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

      {/* Dashboard Content */}
      <div className="container mx-auto px-4 py-8">
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
                <span className="text-gray-400">Department:</span>
                <p className="text-white">{user.department || 'Not specified'}</p>
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
            <h3 className="text-lg font-semibold text-white mb-4">Class Information</h3>
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
                <button
                  onClick={() => navigate('/')}
                  className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition duration-200"
                >
                  Go to Drawing App
                </button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-400">Not enrolled in any class</p>
                <div className="mt-4 space-y-2">
                  <button
                    onClick={() => window.location.reload()}
                    className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition duration-200"
                  >
                    Check Enrollment Status
                  </button>
                  <button
                    onClick={() => navigate('/select-role')}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg transition duration-200"
                  >
                    Join a Class
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <a
                href="https://mega.nz/file/8Ndx0Qpb#O-1yE6KF8KdndwiOiOuQTLGvDuKKviplPToqwy-sa1w"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white py-3 rounded-lg transition duration-200 text-center"
              >
                Download PC
              </a>
              <button
                onClick={() => {/* View assignments */}}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg transition duration-200"
              >
                View Assignments
              </button>
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
            <div className="text-gray-400 text-center py-8">
              {user.enrolledClassDetails ? (
                <>
                  <p className="text-green-400">✓ Successfully enrolled in class</p>
                  <p className="text-sm mt-2">
                    Class: {user.enrolledClassDetails.className}
                  </p>
                  <p className="text-sm">Code: {user.enrolledClassDetails.classCode}</p>
                </>
              ) : (
                <>
                  <p>No recent activity</p>
                  <p className="text-sm mt-2">Your activity will appear here</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}