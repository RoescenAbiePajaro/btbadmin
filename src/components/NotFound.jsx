// src/components/NotFound.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import AnimatedBackground from './AnimatedBackground';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative">
      <AnimatedBackground />
      
      <div className="bg-black/70 border border-gray-800 rounded-2xl p-8 w-full max-w-md text-center z-10">
        <div className="text-9xl font-bold text-red-500 mb-4">404</div>
        
        <h1 className="text-2xl font-bold text-white mb-4">Page Not Found</h1>
        
        <p className="text-gray-400 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        
        <div className="space-y-4">
          <button
            onClick={() => navigate('/')}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold text-lg hover:bg-blue-700 transition duration-200"
          >
            Go to Homepage
          </button>
          
          <button
            onClick={() => navigate(-1)}
            className="w-full bg-gray-800 text-white py-3 px-6 rounded-lg font-semibold text-lg hover:bg-gray-700 transition duration-200"
          >
            Go Back
          </button>
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-800">
          <h3 className="text-white font-semibold mb-3">Quick Links</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/login')}
              className="bg-gray-800 hover:bg-gray-700 text-white py-2 rounded transition duration-200"
            >
              Login
            </button>
            <button
              onClick={() => navigate('/select-role')}
              className="bg-purple-600 hover:bg-purple-700 text-white py-2 rounded transition duration-200"
            >
              Register
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}