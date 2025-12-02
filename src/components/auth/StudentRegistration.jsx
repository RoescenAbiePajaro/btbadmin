// src/components/auth/StudentRegistration.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';

export default function StudentRegistration() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [academicOptions, setAcademicOptions] = useState({
    school: [],
    departments: [],
    years: [],
    blocks: []
  });

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    school: '',
    department: '',
    year: '',
    block: '',
    classCode: ''
  });

  const [errors, setErrors] = useState({});

  // Fetch academic options
  useEffect(() => {
    const fetchAcademicOptions = async () => {
      try {
        // Fetch departments, years, and blocks from the API
        const [schoolRes, departmentsRes, yearsRes, blocksRes] = await Promise.all([
          axios.get('http://localhost:5000/api/academic-settings/school'),
          axios.get('http://localhost:5000/api/academic-settings/department'),
          axios.get('http://localhost:5000/api/academic-settings/year'),
          axios.get('http://localhost:5000/api/academic-settings/block')
        ]);

        setAcademicOptions({
          school: schoolRes.data.map(item => item.name),
          departments: departmentsRes.data.map(item => item.name),
          years: yearsRes.data.map(item => item.name),
          blocks: blocksRes.data.map(item => item.name)
        });
      } catch (error) {
        console.error('Error fetching academic options:', error);
        // Fallback to empty arrays if API fails
        setAcademicOptions({
          school: [],
          departments: [],
          years: [],
          blocks: []
        });
      }
    };

    fetchAcademicOptions();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field
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
    
    if (!formData.classCode.trim()) newErrors.classCode = 'Class code is required';
    
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
          department: formData.department,
          year: formData.year,
          block: formData.block,
          classCode: formData.classCode.toUpperCase()
        }
      );

      if (response.data.toast?.show) {
        // Show success message
        setSuccessMessage('Registration successful! Please login with your credentials.');
        
        // Clear form data
        setFormData({
          fullName: '',
          email: '',
          username: '',
          password: '',
          confirmPassword: '',
          school: '',
          department: '',
          year: '',
          block: '',
          classCode: ''
        });
        
        // Clear errors
        setErrors({});
        
        // Redirect to login page after 2 seconds
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <button
          onClick={handleBack}
          className="text-gray-400 hover:text-white transition duration-200 flex items-center gap-2 mb-6"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Role Selection
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6"
        >
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">
              Student Registration
            </h2>
            <p className="text-gray-400 text-sm">
              Join your educator's virtual class
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
                className={`w-full bg-gray-900/50 border ${errors.fullName ? 'border-red-500' : 'border-gray-700'} rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
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
                className={`w-full bg-gray-900/50 border ${errors.email ? 'border-red-500' : 'border-gray-700'} rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
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
                className={`w-full bg-gray-900/50 border ${errors.username ? 'border-red-500' : 'border-gray-700'} rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
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
                className={`w-full bg-gray-900/50 border ${errors.password ? 'border-red-500' : 'border-gray-700'} rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
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
                className={`w-full bg-gray-900/50 border ${errors.confirmPassword ? 'border-red-500' : 'border-gray-700'} rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="Confirm your password"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-400">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Academic Information Grid */}
            <div className="grid grid-cols-3 gap-4">
              {/* School */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  School
                </label>
                <select
                  name="school"
                  value={formData.school}
                  onChange={handleChange}
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select</option>
                  {academicOptions.school.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              {/* Department */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Department
                </label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select</option>
                  {academicOptions.departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              {/* Year */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Year
                </label>
                <select
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select</option>
                  {academicOptions.years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              {/* Block */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Block
                </label>
                <select
                  name="block"
                  value={formData.block}
                  onChange={handleChange}
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select</option>
                  {academicOptions.blocks.map(block => (
                    <option key={block} value={block}>{block}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Class Code */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Class Code *
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="classCode"
                  value={formData.classCode}
                  onChange={handleChange}
                  className={`w-full bg-gray-900/50 border ${errors.classCode ? 'border-red-500' : 'border-gray-700'} rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase`}
                  placeholder="Enter class code (e.g., ABCD12)"
                />
                <div className="absolute right-3 top-3">
                  <span className="text-gray-500 text-sm">Ask your educator</span>
                </div>
              </div>
              {errors.classCode && (
                <p className="mt-1 text-sm text-red-400">{errors.classCode}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Enter the class code provided by your educator to join their virtual class
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || successMessage}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
              <Link to="/login" className="text-blue-400 hover:text-blue-300 transition duration-200">
                Login here
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}