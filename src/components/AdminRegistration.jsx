// AdminRegistration.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Toast from './Toast';

const AdminRegistration = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [accessCodeInfo, setAccessCodeInfo] = useState(null);
  const [accessCodeValidating, setAccessCodeValidating] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const navigate = useNavigate();

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, show: false }));
  };

  // Validate access code
  const validateAccessCode = async (code) => {
    if (!code || code.trim().length === 0) {
      setAccessCodeInfo(null);
      return;
    }

    setAccessCodeValidating(true);
    try {
      const response = await fetch(`https://btbsitess.onrender.com/api/access-codes/validate/${code.trim()}`);
      const data = await response.json();

      if (response.ok && data.valid) {
        setAccessCodeInfo({
          code: data.code,
          description: data.description,
          remainingUses: data.remainingUses,
          valid: true
        });
      } else {
        setAccessCodeInfo({
          code: code.trim().toUpperCase(),
          valid: false,
          message: data.message || 'Invalid access code'
        });
      }
    } catch (error) {
      console.error('Error validating access code:', error);
      setAccessCodeInfo({
        code: code.trim().toUpperCase(),
        valid: false,
        message: 'Unable to validate access code'
      });
    } finally {
      setAccessCodeValidating(false);
    }
  };

  // Debounced access code validation
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (accessCode.trim()) {
        validateAccessCode(accessCode);
      } else {
        setAccessCodeInfo(null);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [accessCode]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (!firstName || !lastName || !username || !password || !confirmPassword || !accessCode) {
      showToast('All fields are required', 'error');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      showToast('Password must be at least 6 characters long', 'error');
      setLoading(false);
      return;
    }

    // Check access code validity
    if (!accessCodeInfo || !accessCodeInfo.valid) {
      showToast('Please enter a valid access code', 'error');
      setLoading(false);
      return;
    }

    if (accessCodeValidating) {
      showToast('Please wait while validating access code', 'error');
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('https://btbsitess.onrender.com/api/admin/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          firstName, 
          lastName, 
          username, 
          password, 
          accessCode 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('Registration successful:', data);
        const successMessage = data.accessCodeUsed 
          ? `Registration successful! Used access code: ${data.accessCodeUsed.code}${data.accessCodeUsed.description ? ` (${data.accessCodeUsed.description})` : ''}`
          : 'Registration successful!';
        showToast(successMessage, 'success');
        setTimeout(() => {
          navigate('/admin');
        }, 1500);
      } else {
        showToast(data.message || 'Registration failed', 'error');
      }
    } catch (err) {
      console.error('Error during registration:', err);
      showToast('Unable to connect to server. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/admin');
  };

  // Test server connection (optional)
  const testServerConnection = async () => {
    try {
      const response = await fetch('https://btbsitess.onrender.com/api/admin');
      const data = await response.json();
      console.log('Server test:', data);
    } catch (err) {
      console.error('Server connection test failed:', err);
    }
  };

  // Call this on component mount to test connection
  React.useEffect(() => {
    testServerConnection();
  }, []);

  return (
    <div className="min-h-screen bg-black flex flex-col relative">
      {toast.show && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={hideToast} 
        />
      )}
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
          <h2 className="text-2xl font-bold mb-6 text-center text-white">Admin Registration</h2>
          {error && (
            <div className="text-red-500 text-sm mb-4 text-center">{error}</div>
          )}
          <form onSubmit={handleRegister} className="space-y-6">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-white">
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-800 rounded-md shadow-sm bg-black text-white focus:outline-none focus:ring-white focus:border-white"
                placeholder="Enter your first name"
                required
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-white">
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-800 rounded-md shadow-sm bg-black text-white focus:outline-none focus:ring-white focus:border-white"
                placeholder="Enter your last name"
                required
              />
            </div>
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
                placeholder="Enter your password (min. 6 characters)"
                required
                minLength={6}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-white">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-800 rounded-md shadow-sm bg-black text-white focus:outline-none focus:ring-white focus:border-white"
                placeholder="Confirm your password"
                required
              />
            </div>
            <div>
              <label htmlFor="accessCode" className="block text-sm font-medium text-white">
                Access Code
              </label>
              <div className="relative">
                <input
                  id="accessCode"
                  type="text"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm bg-black text-white focus:outline-none focus:ring-2 ${
                    accessCodeValidating 
                      ? 'border-yellow-500 focus:ring-yellow-500 focus:border-yellow-500'
                      : accessCodeInfo?.valid 
                        ? 'border-green-500 focus:ring-green-500 focus:border-green-500'
                        : accessCodeInfo?.valid === false
                          ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                          : 'border-gray-800 focus:ring-white focus:border-white'
                  }`}
                  placeholder="Enter your access code"
                  required
                />
                {accessCodeValidating && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-500"></div>
                  </div>
                )}
                {accessCodeInfo?.valid && !accessCodeValidating && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                {accessCodeInfo?.valid === false && !accessCodeValidating && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <svg className="h-4 w-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              
              {/* Access Code Information */}
              {accessCodeInfo && (
                <div className={`mt-2 p-3 rounded-md text-sm ${
                  accessCodeInfo.valid 
                    ? 'bg-green-900/20 border border-green-500/30 text-green-300'
                    : 'bg-red-900/20 border border-red-500/30 text-red-300'
                }`}>
                  {accessCodeInfo.valid ? (
                    <div>
                      <div className="font-medium">✓ Valid Access Code</div>
                      <div className="text-xs mt-1">
                        {accessCodeInfo.description && (
                          <div>Description: {accessCodeInfo.description}</div>
                        )}
                        <div>Remaining uses: {accessCodeInfo.remainingUses}</div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="font-medium">✗ {accessCodeInfo.message}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-6 border border-transparent rounded-lg font-semibold text-lg text-black bg-white hover:bg-gray-200 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Registering...' : 'Register'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminRegistration;