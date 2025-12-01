// src/components/auth/EmailVerification.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

export default function EmailVerification() {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      const params = new URLSearchParams(location.search);
      const token = params.get('token');
      const email = params.get('email');

      if (!token || !email) {
        setStatus('error');
        setMessage('Invalid verification link');
        return;
      }

      try {
        const response = await axios.get(
          `http://localhost:5000/api/auth/verify-email`,
          {
            params: { token, email }
          }
        );

        if (response.data.toast?.show) {
          // Save token and redirect to educator dashboard
          localStorage.setItem('token', response.data.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.data.user));
          
          setStatus('success');
          setMessage('Email verified successfully! Redirecting to dashboard...');
          
          // Redirect after 2 seconds
          setTimeout(() => {
            navigate('/educator/dashboard');
          }, 2000);
        }
      } catch (error) {
        console.error('Verification error:', error);
        setStatus('error');
        setMessage(error.response?.data?.toast?.message || 'Verification failed');
      }
    };

    verifyEmail();
  }, [location, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-4">
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 w-full max-w-md text-center">
        <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center">
          {status === 'verifying' ? (
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          ) : status === 'success' ? (
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ) : (
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
        </div>

        <h2 className="text-2xl font-bold text-white mb-4">
          {status === 'verifying' && 'Verifying Email...'}
          {status === 'success' && 'Email Verified!'}
          {status === 'error' && 'Verification Failed'}
        </h2>

        <p className="text-gray-300 mb-6">{message}</p>

        {status === 'error' && (
          <div className="space-y-4">
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition duration-200"
            >
              Go to Login
            </button>
            <button
              onClick={() => navigate('/register/educator')}
              className="w-full bg-gray-700 text-white py-3 rounded-lg font-medium hover:bg-gray-600 transition duration-200"
            >
              Register Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}