// src/components/student/StudentDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [classCode, setClassCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      navigate('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      if (parsedUser.role !== 'student') {
        navigate('/login');
        return;
      }
      setUser(parsedUser);
    } catch (error) {
      console.error('Error parsing user data:', error);
      navigate('/login');
    }
  }, [navigate]);

  // Prevent caching of dashboard page
  useEffect(() => {
    window.onpageshow = function(event) {
      if (event.persisted) {
        window.location.reload();
      }
    };
    
    // Clear browser history and replace current entry
    window.history.pushState(null, document.title, window.location.href);
    window.onpopstate = function() {
      window.history.pushState(null, document.title, window.location.href);
      if (!localStorage.getItem('token') || !localStorage.getItem('user')) {
        navigate('/login');
      }
    };

    return () => {
      window.onpopstate = null;
    };
  }, [navigate]);

  // Handle joining a class with access code
  const handleJoinClass = async () => {
    if (!classCode.trim()) {
      alert('Please enter a class code');
      return;
    }

    setJoinLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5000/api/classes/join',
        { classCode: classCode.trim().toUpperCase() },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.toast?.type === 'success') {
        // Update user data
        const updatedUser = { ...user, enrolledClassDetails: response.data.data.enrolledClass };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        setShowJoinModal(false);
        setClassCode('');
        alert('Successfully joined class!');
      }
    } catch (error) {
      console.error('Error joining class:', error);
      alert(error.response?.data?.toast?.message || 'Failed to join class');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Clear browser history and navigate to login
    window.history.replaceState(null, '', '/login');
    navigate('/login', { replace: true });
  };

  if (!user) {
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
            {!user.enrolledClassDetails ? (
              <div className="text-center py-4">
                <p className="text-gray-400">Not enrolled in any class</p>
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="mt-4 w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg transition duration-200"
                >
                  Join a Class
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <span className="text-gray-400">Class Code:</span>
                  <p className="text-white font-mono">{user.enrolledClassDetails.classCode}</p>
                </div>
                <div>
                  <span className="text-gray-400">Class Name:</span>
                  <p className="text-white">{user.enrolledClassDetails.className}</p>
                </div>
                <button
                  onClick={() => navigate('/')}
                  className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition duration-200"
                >
                  Go to Drawing App
                </button>
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
              <p>No recent activity</p>
              <p className="text-sm mt-2">Your activity will appear here</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Join Class Modal */}
    {showJoinModal && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white">Join a Class</h3>
            <button
              onClick={() => {
                setShowJoinModal(false);
                setClassCode('');
              }}
              className="text-gray-400 hover:text-white transition duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Enter Class Code
              </label>
              <input
                type="text"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono text-center focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., ABCD12"
                maxLength={6}
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowJoinModal(false);
                  setClassCode('');
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg transition duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleJoinClass}
                disabled={joinLoading || !classCode.trim()}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {joinLoading ? 'Joining...' : 'Join Class'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
  );
}