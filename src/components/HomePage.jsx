// src/components/HomePage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AnimatedBackground from "./AnimatedBackground";

export default function HomePage() {
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState(null);
  const [isDownloadLoading, setIsDownloadLoading] = useState(false);

  const handleMenuClick = () => {
    navigate("/login");
  };

  const closeModal = () => setSelectedImage(null);

  const handleDownload = async (e) => {
    e.preventDefault();
    const url = "https://mega.nz/file/8Ndx0Qpb#O-1yE6KF8KdndwiOiOuQTLGvDuKKviplPToqwy-sa1w";
    
    setIsDownloadLoading(true);
    
    try {
      await trackClick("download", "home_page");
    } catch (error) {
      console.error("Error tracking download:", error);
    } finally {
      setIsDownloadLoading(false);
      // Navigate to the URL in the same tab
      window.location.href = url;
    }
  };

  const handleGetStarted = () => {
    navigate("/select-role");
  };

  const handleLogin = () => {
    navigate("/login");
  };

  const handleRegister = () => {
    navigate("/select-role");
  };

  const checkUserStatus = () => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        if (user.role === "student") {
          navigate("/student/dashboard");
        } else if (user.role === "educator") {
          navigate("/educator/dashboard");
        } else if (user.role === "admin") {
          navigate("/admin-dashboard");
        }
      } catch (error) {
        console.error("Error parsing user data:", error);
        navigate("/login");
      }
    } else {
      navigate("/select-role");
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col relative overflow-x-hidden">
      <AnimatedBackground />
      
      {/* Header Navigation */}
      <header className="w-full bg-black border-b border-gray-800">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          {/* Logo placeholder */}
          <div className="w-20"></div>
          
          <div className="flex-1 flex justify-center">
           
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/login')}
              className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-medium text-sm transition duration-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Admin Login
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 w-full">
        <div className="bg-black border border-gray-800 rounded-2xl p-4 sm:p-6 md:p-8 w-full max-w-md text-center mx-2 sm:mx-4">
          {/* Main Logo - Responsive */}
          <div className="w-28 h-28 mx-auto mb-8 flex items-center justify-center">
            <img
              src="/icon/logo.png"
              alt="Beyond The Brush"
              className="w-full h-full object-contain max-w-full max-h-full"
              width="112"
              height="112"
              loading="eager"
            />
          </div>

          <h2 className="text-4xl text-white text-center mb-8 font-bold">
            Beyond The Brush
          </h2>

          <div className="flex flex-col space-y-4">
            <button
              className="w-full bg-violet-600 hover:bg-violet-700 text-white py-3 px-4 sm:px-6 rounded-lg font-semibold text-base sm:text-lg transition duration-200 text-center no-underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 sm:gap-3"
              onClick={handleDownload}
              disabled={isDownloadLoading}
            >
              {isDownloadLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Preparing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download PC
                </>
              )}
            </button>

            {/* Auth Buttons Section */}
            <div className="pt-4 border-t border-gray-800">
              
              
              <div className="flex space-x-4">
                <button
                  onClick={handleLogin}
                  className="flex-1 bg-yellow-500 text-white py-3 px-6 rounded-lg font-semibold text-lg hover:bg-yellow-600 transition duration-200 flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Login
                </button>
                
                <button
                  onClick={handleRegister}
                  className="flex-1 bg-green-500 text-white py-3 px-6 rounded-lg font-semibold text-lg hover:bg-green-600 transition duration-200 flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Register
                </button>
              </div>
            </div>
          </div>

          {/* Info Cards */}
          <div className="mt-6 sm:mt-8 grid grid-cols-3 gap-2 sm:gap-4">
            <div className="bg-gradient-to-br from-blue-900/20 to-blue-700/10 border border-blue-500/20 rounded-lg p-2 sm:p-3 md:p-4 text-center">
              <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                </svg>
              </div>
              <h4 className="text-white text-sm font-medium">For Students</h4>
              <p className="text-gray-400 text-xs mt-1">Join classes with codes</p>
            </div>
            
            <div className="bg-gradient-to-br from-pink-900/20 to-pink-700/10 border border-pink-500/20 rounded-lg p-2 sm:p-3 md:p-4 text-center">
              <div className="w-10 h-10 bg-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h4 className="text-white text-sm font-medium">For Educators</h4>
              <p className="text-gray-400 text-xs mt-1">Create & manage classes</p>
            </div>
            
            <div className="bg-gradient-to-br from-red-900/20 to-red-700/10 border border-red-500/20 rounded-lg p-2 sm:p-3 md:p-4 text-center">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A7.968 7.968 0 015 16c0-4.418 3.582-8 8-8s8 3.582 8 8a7.968 7.968 0 01-.121 1.804m-15.758 0A9.003 9.003 0 0012 21a9.003 9.003 0 008.877-5.196m-15.758 0A9 9 0 0112 3a9 9 0 018.877 12.804" />
                </svg>
              </div>
              <h4 className="text-white text-sm font-medium">For Admins</h4>
              <p className="text-gray-400 text-xs mt-1">Manage system & users</p>
            </div>
          </div>
        </div>

        {/* Images + Video Section */}
        <div className="mt-12 sm:mt-16 w-full max-w-6xl px-2 sm:px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 items-start">
            {/* Image 1 */}
            <div className="flex flex-col items-center text-center">
              <img
                loading="lazy"
                src="/1.jpg"
                alt="Art Showcase"
                className="w-64 h-40 rounded-2xl shadow-lg object-cover cursor-pointer hover:opacity-80 transition"
                onClick={() => setSelectedImage("/1.jpg")}
              />
              <p className="text-gray-300 mt-3 text-sm max-w-xs">
                A simple drawing web-app that allows users to draw, present ideas or key terms.
              </p>
            </div>

            {/* Image 2 */}
            <div className="flex flex-col items-center text-center">
              <img
                loading="lazy"
                src="/7faf63e8-ed37-4167-8bc3-8354acbdca5f.jpg"
                alt="Art Collaboration"
                className="w-64 h-40 rounded-2xl shadow-lg object-cover cursor-pointer hover:opacity-80 transition"
                onClick={() => setSelectedImage("/7faf63e8-ed37-4167-8bc3-8354acbdca5f.jpg")}
              />
              <p className="text-gray-300 mt-3 text-sm max-w-xs">
                Another example of drawing made in Beyond The Brush Lite.
              </p>
            </div>

            {/* Video */}
            <div className="flex flex-col items-center text-center">
              <video
                src="/Beyond The Brush 2025-09-14 15-04-56.mp4"
                controls
                preload="metadata"
                className="w-64 h-40 rounded-2xl shadow-lg object-cover"
              ></video>
              <p className="text-gray-300 mt-3 text-sm max-w-xs">
                A PC app that uses hand gesture controls also a AI-driven digital painting using webcams allowing users to draw or present key ideas.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Modal for image preview */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50"
          onClick={closeModal}
        >
          <div className="relative">
            <img
              src={selectedImage}
              alt="Preview"
              className="max-h-[80vh] max-w-[90vw] rounded-2xl shadow-lg"
            />
            <button
              onClick={closeModal}
              className="absolute -top-4 -right-4 bg-white text-black rounded-full px-3 py-1 font-bold text-lg shadow-lg hover:bg-gray-200"
            >
              ×
            </button>
          </div>
        </div>
      )}
      
      {/* Footer */}
      <footer className="w-full py-6 text-center text-white text-sm mt-12 bg-gradient-to-r from-pink-600 via-blue-600 to-black">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h3 className="font-bold text-lg">Beyond The Brush</h3>
              <p className="text-gray-300">Digital Painting & Learning Platform</p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-6 mb-4 md:mb-0">
              <a href="#" className="hover:text-gray-300 transition duration-200">Features</a>
              <a href="#" className="hover:text-gray-300 transition duration-200">For Students</a>
              <a href="#" className="hover:text-gray-300 transition duration-200">For Educators</a>
              <a href="#" className="hover:text-gray-300 transition duration-200">For Admins</a>
              <a href="#" className="hover:text-gray-300 transition duration-200">Contact</a>
            </div>
            
            <div>
              <p>@2025 Beyond The Brush | All rights reserved</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}