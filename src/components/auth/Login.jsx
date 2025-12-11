// src/components/auth/Login.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import AnimatedBackground from '../AnimatedBackground';

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email.trim()) newErrors.email = 'Email or username is required';
    if (!formData.password) newErrors.password = 'Password is required';
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(
        `http://localhost:5000/api/auth/login`,
        formData
      );

      if (response.data.toast?.show) {
        // Save token and user data
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
        
        // Track successful login
        await axios.post('http://localhost:5000/api/analytics/login', {}, {
          headers: {
            Authorization: `Bearer ${response.data.data.token}` 
          }
        });
        
        // Clear fresh registration flag if it exists
        localStorage.removeItem('freshRegistration');
        
        // Redirect based on role
        const user = response.data.data.user;
        if (user.role === 'student') {
          navigate('/student/dashboard', { replace: true });
        } else if (user.role === 'educator') {
          navigate('/educator/dashboard', { replace: true });
        } else if (user.role === 'admin') {
          navigate('/admin/dashboard', { replace: true });
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.toast?.message || 'Login failed. Please try again.';
      setErrors({ form: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <AnimatedBackground />
      <button
        onClick={handleBackToHome}
        className="absolute top-6 left-6 text-gray-400 hover:text-white transition duration-200 flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Home
      </button>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-black border border-gray-800 rounded-2xl p-8 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4">
            <img
              src="/icon/logo.png"
              alt="Beyond The Brush"
              className="w-full h-full object-contain"
              width="80"
              height="80"
              loading="eager"
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-400">
            Login to your account to continue
          </p>
        </div>

        {errors.form && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
            <p className="text-red-300 text-sm">{errors.form}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email/Username */}
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Email or Username *
            </label>
            <input
              type="text"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full bg-gray-900 border ${errors.email ? 'border-red-500' : 'border-gray-800'} rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="Enter your email or username"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-400">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-gray-300 text-sm font-medium">
                Password *
              </label>
            </div>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={`w-full bg-gray-900 border ${errors.password ? 'border-red-500' : 'border-gray-800'} rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="Enter your password"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-400">{errors.password}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-3 rounded-lg font-medium transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Logging in...
              </>
            ) : (
              'Log In'
            )}
          </button>
        </form>

        <div className="mt-8">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-800"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-800/50 text-gray-500">
                Don't have an account?
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <button
              onClick={() => navigate('/register/student')}
              className="bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 text-blue-400 py-3 rounded-lg font-medium transition duration-200"
            >
              Register as Student
            </button>
            <button
              onClick={() => navigate('/register/educator')}
              className="bg-pink-600/10 hover:bg-pink-600/20 border border-pink-500/20 text-pink-400 py-3 rounded-lg font-medium transition duration-200"
            >
              Register as Educator
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}