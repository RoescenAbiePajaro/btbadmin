// src/components/auth/EducatorRegistration.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import AnimatedBackground from '../AnimatedBackground';

function TermsModal({ onClose }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-700">
            <h2 className="text-white font-bold text-lg">Terms of Service &amp; Privacy Policy</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition duration-200 p-1 rounded-lg hover:bg-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto p-5 space-y-5 text-sm text-gray-300 leading-relaxed">
            <section>
              <h3 className="text-pink-400 font-semibold text-base mb-2">Terms of Service</h3>
              <p className="mb-2">
                By registering as an educator on <span className="text-white font-medium">Beyond The Brush</span>, you agree to the following terms:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-400">
                <li>You will use the platform solely for legitimate educational purposes.</li>
                <li>You are responsible for the content you upload and share with students.</li>
                <li>You will not share your account credentials with others.</li>
                <li>You will not upload content that is harmful, offensive, or violates copyright.</li>
                <li>We reserve the right to suspend accounts that violate these terms.</li>
                <li>The platform may be updated or modified at any time without prior notice.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-pink-400 font-semibold text-base mb-2">Privacy Policy</h3>
              <p className="mb-2">
                We are committed to protecting your personal information. Here's how we handle your data:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-400">
                <li>We collect your name, email, and username for account management.</li>
                <li>Your data is stored securely and is never sold to third parties.</li>
                <li>We may use your email to send important platform notifications.</li>
                <li>You may request deletion of your account and associated data at any time.</li>
                <li>Cookies may be used to maintain your session and improve user experience.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-pink-400 font-semibold text-base mb-2">Educator Responsibilities</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-400">
                <li>Ensure all learning materials shared are appropriate for your students.</li>
                <li>Manage class access codes responsibly.</li>
                <li>Report any platform issues or misuse to the administrators.</li>
              </ul>
            </section>

            <p className="text-gray-500 text-xs pt-2 border-t border-gray-700">
              Last updated: May 2026. By creating an account, you acknowledge that you have read and understood these terms.
            </p>
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-gray-700">
            <button
              onClick={onClose}
              className="w-full bg-pink-500 hover:bg-pink-600 text-white py-2.5 rounded-lg font-medium transition duration-200"
            >
              I Understand
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function EducatorRegistration() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({});
  const [agreeToTerms, setAgreeToTerms] = useState(false);

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
    
    if (!agreeToTerms) {
      newErrors.terms = 'You must agree to the Terms of Service';
    }
    
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
        `https://btbtestservice.onrender.com/api/auth/register/educator`,
        {
          fullName: formData.fullName,
          email: formData.email,
          username: formData.username,
          password: formData.password
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
          confirmPassword: ''
        });
        
        // Clear errors and terms checkbox
        setErrors({});
        setAgreeToTerms(false);
        
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
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative">
      <AnimatedBackground />
      {showTermsModal && <TermsModal onClose={() => setShowTermsModal(false)} />}
      <div className="w-full max-w-md relative z-10">
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
              Educator Registration
            </h2>
            <p className="text-gray-400 text-sm">
              Create an account to manage your classes
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

            {/* Terms and Conditions */}
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="terms"
                checked={agreeToTerms}
                onChange={(e) => setAgreeToTerms(e.target.checked)}
                className="mt-1"
              />
              <label htmlFor="terms" className="text-sm text-gray-400">
                I agree to the{' '}
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="text-pink-400 hover:text-pink-300 underline underline-offset-2 transition duration-200"
                >
                  Terms of Service and Privacy Policy
                </button>
                .
              </label>
            </div>
            {errors.terms && (
              <p className="text-sm text-red-400">{errors.terms}</p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || successMessage}
              className="w-full bg-pink-500 text-white py-3 rounded-lg font-medium hover:bg-pink-600 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                'Create Educator Account'
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