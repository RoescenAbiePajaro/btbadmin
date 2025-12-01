// src/components/AdminLogin.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Toast from './Toast';
import AnimatedBackground from './AnimatedBackground';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [error, setError] = useState('');
  const [toastType, setToastType] = useState('error');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const showErrorToast = (message) => {
    setToastMessage(message);
    setToastType('error');
    setShowToast(true);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setShowToast(false);

    // Basic validation
    if (!username.trim() || !password) {
      showErrorToast('Please enter both username and password');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://btbsitess.onrender.com/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Save token and admin data
      localStorage.setItem('token', data.token);
      localStorage.setItem('admin', JSON.stringify(data.admin));
      
      // Redirect to admin dashboard
      navigate('/admin');
    } catch (error) {
      console.error('Login error:', error);
      showErrorToast(error.message || 'An error occurred during login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = () => {
    navigate('/admin-registration');
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-black flex flex-col relative">
      <AnimatedBackground />
      {showToast && (
        <Toast 
          message={toastMessage} 
          type={toastType} 
          onClose={() => setShowToast(false)} 
        />
      )}
      {/* Header Navigation */}
      <header className="w-full bg-black border-b border-gray-800">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button 
            onClick={handleBack}
            className="flex items-center gap-2 bg-white text-black py-2 px-6 rounded-lg font-semibold text-sm hover:bg-gray-200 transition duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>
          <div className="flex-1 flex justify-center"></div>
          <div className="w-20"></div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-black border border-gray-800 rounded-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white">Admin Login</h2>
            <p className="text-gray-400 mt-2">Access your admin dashboard</p>
          </div>
          
          {showToast && (
            <Toast 
              message={toastMessage} 
              type={toastType} 
              onClose={() => setShowToast(false)} 
            />
          )}
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative">
              <label htmlFor="username" className="block text-sm font-medium text-white mb-2">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1 block w-full pl-10 pr-3 py-3 border border-gray-800 rounded-lg shadow-sm bg-black text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-white placeholder-gray-500"
                  placeholder="Enter your username"
                  required
                />
              </div>
            </div>
            
            <div className="relative">
              <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full pl-10 pr-3 py-3 border border-gray-800 rounded-lg shadow-sm bg-black text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-white placeholder-gray-500"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3 px-6 border border-transparent rounded-lg font-semibold text-lg text-black bg-white hover:bg-gray-200 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-black" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Logging in...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Login
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={handleRegister}
                className="w-full flex items-center justify-center gap-3 py-3 px-6 border border-transparent rounded-lg font-semibold text-lg text-black bg-white hover:bg-gray-200 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Register as Admin
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;