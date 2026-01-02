import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';

export default function StudentRegistration() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    school: '',
    course: '',
    year: '',
    block: ''
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
    
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    
    if (!formData.username.trim()) newErrors.username = 'Username is required';
    else if (formData.username.length < 3) newErrors.username = 'Username must be at least 3 characters';
    
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (!formData.school.trim()) newErrors.school = 'School is required';
    if (!formData.course.trim()) newErrors.course = 'Course is required';
    if (!formData.year.trim()) newErrors.year = 'Year is required';
    if (!formData.block.trim()) newErrors.block = 'Block is required';
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage('');
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(
        `http://localhost:5000/api/auth/register/student`,
        {
          fullName: formData.fullName,
          email: formData.email,
          username: formData.username,
          password: formData.password,
          school: formData.school,
          course: formData.course,
          year: formData.year,
          block: formData.block
        }
      );

      if (response.data.toast?.show) {
        setSuccessMessage('Registration successful! Please login with your credentials.');
        
        setFormData({
          fullName: '',
          email: '',
          username: '',
          password: '',
          confirmPassword: '',
          school: '',
          course: '',
          year: '',
          block: ''
        });
        
        setErrors({});
        
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.toast?.message || 'Registration failed. Please try again.';
      setErrors({ form: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/select-role');
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <button
          onClick={handleBack}
          className="bg-red-500 text-white hover:bg-red-600 transition duration-200 flex items-center gap-2 mb-6 px-3 py-2 rounded-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Role Selection
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-black/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6"
        >
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">
              Student Registration
            </h2>
            <p className="text-gray-400 text-sm">
              Create an account to join classes later
            </p>
          </div>

          {successMessage && (
            <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
              <p className="text-green-300 text-sm">{successMessage}</p>
              <p className="text-green-400 text-xs mt-1">Redirecting to login page...</p>
            </div>
          )}

          {errors.form && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-red-300 text-sm">{errors.form}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Full Name *
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className={`w-full bg-black/50 border ${errors.fullName ? 'border-red-500' : 'border-gray-800'} rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500`}
                placeholder="Enter your full name"
              />
              {errors.fullName && (
                <p className="mt-1 text-sm text-red-400">{errors.fullName}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full bg-black/50 border ${errors.email ? 'border-red-500' : 'border-gray-800'} rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500`}
                placeholder="Enter your email"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-400">{errors.email}</p>
              )}
            </div>

            {/* Username */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Username *
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className={`w-full bg-black/50 border ${errors.username ? 'border-red-500' : 'border-gray-800'} rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500`}
                placeholder="Choose a username"
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-400">{errors.username}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Password *
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full bg-black/50 border ${errors.password ? 'border-red-500' : 'border-gray-800'} rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500`}
                placeholder="Create a password"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-400">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Confirm Password *
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`w-full bg-black/50 border ${errors.confirmPassword ? 'border-red-500' : 'border-gray-800'} rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500`}
                placeholder="Confirm your password"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-400">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Academic Information */}
            <div className="bg-black border border-gray-800 rounded-xl p-4 mb-6">
              <h3 className="text-white font-medium mb-3">Academic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                {/* School */}
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    School *
                  </label>
                  <input
                    type="text"
                    name="school"
                    value={formData.school}
                    onChange={handleChange}
                    className={`w-full bg-black/50 border ${errors.school ? 'border-red-500' : 'border-gray-800'} rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500`}
                    placeholder="Enter your school"
                  />
                  {errors.school && (
                    <p className="mt-1 text-sm text-red-400">{errors.school}</p>
                  )}
                </div>

                {/* Course */}
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Course *
                  </label>
                  <input
                    type="text"
                    name="course"
                    value={formData.course}
                    onChange={handleChange}
                    className={`w-full bg-black/50 border ${errors.course ? 'border-red-500' : 'border-gray-800'} rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500`}
                    placeholder="Enter your course"
                  />
                  {errors.course && (
                    <p className="mt-1 text-sm text-red-400">{errors.course}</p>
                  )}
                </div>

                {/* Year */}
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Year *
                  </label>
                  <input
                    type="text"
                    name="year"
                    value={formData.year}
                    onChange={handleChange}
                    className={`w-full bg-black/50 border ${errors.year ? 'border-red-500' : 'border-gray-800'} rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500`}
                    placeholder="Enter your year"
                  />
                  {errors.year && (
                    <p className="mt-1 text-sm text-red-400">{errors.year}</p>
                  )}
                </div>

                {/* Block */}
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Block *
                  </label>
                  <input
                    type="text"
                    name="block"
                    value={formData.block}
                    onChange={handleChange}
                    className={`w-full bg-black/50 border ${errors.block ? 'border-red-500' : 'border-gray-800'} rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500`}
                    placeholder="Enter your block"
                  />
                  {errors.block && (
                    <p className="mt-1 text-sm text-red-400">{errors.block}</p>
                  )}
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-500">
                You can join a class later from your dashboard
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || successMessage}
              className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Account...
                </>
              ) : successMessage ? (
                'Registration Successful!'
              ) : (
                'Create Student Account'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-yellow-400 hover:text-yellow-300 transition duration-200">
                Login here
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}