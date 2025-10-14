// AdminLogin.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Toast from './Toast';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [error, setError] = useState('');
  const [toastType, setToastType] = useState('error');
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

    try {
      const response = await fetch('https://localhost:5000/api/admin/login', {
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
      navigate('/admin-dashboard');
    } catch (error) {
      console.error('Login error:', error);
      showErrorToast(error.message || 'An error occurred during login. Please try again.');
    }
  };

  const handleRegister = () => {
    navigate('/admin-registration');
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header Navigation */}
      <header className="w-full bg-black border-b border-gray-800">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="bg-white text-black py-2 px-6 rounded-lg font-semibold text-sm hover:bg-gray-200 transition duration-200"
          >
            Back
          </button>
          <div className="flex-1 flex justify-center"></div>
          <div className="w-20"></div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-black border border-gray-800 rounded-2xl p-8 w-full max-w-md">
          <h2 className="text-2xl font-bold mb-6 text-center text-white">Admin Login</h2>
          {showToast && (
            <Toast 
              message={toastMessage} 
              type={toastType} 
              onClose={() => setShowToast(false)} 
            />
          )}
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-white">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-800 rounded-md shadow-sm bg-black text-white focus:outline-none focus:ring-white focus:border-white"
                placeholder="Enter your username"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-800 rounded-md shadow-sm bg-black text-white focus:outline-none focus:ring-white focus:border-white"
                placeholder="Enter your password"
                required
              />
            </div>
            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-3 px-6 border border-transparent rounded-lg font-semibold text-lg text-black bg-white hover:bg-gray-200 transition duration-200"
              >
                Login
              </button>
            </div>
            <div>
              <button
                type="button"
                onClick={handleRegister}
                className="w-full flex justify-center py-3 px-6 border border-transparent rounded-lg font-semibold text-lg text-black bg-white hover:bg-gray-200 transition duration-200"
              >
                Register
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;