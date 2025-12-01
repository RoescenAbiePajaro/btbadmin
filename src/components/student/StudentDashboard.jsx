// src/components/student/StudentDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
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
                onClick={() => navigate('/')}
                className="text-gray-400 hover:text-white transition duration-200"
              >
                Home
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
            </div>
          </div>

          {/* Academic Info Card */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Academic Information</h3>
            <div className="space-y-3">
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
                <button
                  onClick={() => navigate('/select-role')}
                  className="mt-4 w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg transition duration-200"
                >
                  Join a Class
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
              <button
                onClick={() => navigate('/')}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white py-3 rounded-lg transition duration-200"
              >
                Launch Drawing App
              </button>
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
  );
}