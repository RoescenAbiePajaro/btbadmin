// src/components/auth/RoleSelection.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function RoleSelection() {
  const navigate = useNavigate();

  const handleRoleSelect = (role) => {
    navigate(`/register/${role}`);
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
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
        className="bg-black/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 w-full max-w-2xl"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-3">
            Beyond The Brush Portal
          </h1>
          <p className="text-gray-400">
            Please select your role to continue
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Student Card */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-gradient-to-br from-blue-900/20 to-blue-700/10 border border-blue-500/20 rounded-xl p-6 cursor-pointer group"
            onClick={() => handleRoleSelect('student')}
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-500/30 transition duration-200">
                <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14v6l9-5M12 20l-9-5" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">I am a Student</h3>
              <p className="text-gray-400 text-sm mb-4">
                Join classes using a class code provided by your educator
              </p>
              <button className="mt-2 bg-blue-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-blue-700 transition duration-200">
                Continue as Student
              </button>
            </div>
          </motion.div>

          {/* Educator Card */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-gradient-to-br from-pink-900/20 to-pink-700/10 border border-pink-500/20 rounded-xl p-6 cursor-pointer group"
            onClick={() => handleRoleSelect('educator')}
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-pink-500/20 rounded-full flex items-center justify-center mb-4 group-hover:bg-pink-500/30 transition duration-200">
                <svg className="w-10 h-10 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">I am an Educator</h3>
              <p className="text-gray-400 text-sm mb-4">
                Create and manage classes, generate codes, and track student participation
              </p>
              <button className="mt-2 bg-pink-500 text-white py-2 px-6 rounded-lg font-medium hover:bg-pink-600 transition duration-200">
                Continue as Educator
              </button>
            </div>
          </motion.div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-yellow-400 hover:text-yellow-300 transition duration-200"
            >
              Login here
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}