// src/components/HomePage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { trackClick } from "../../backend/utils/trackClick";
import AnimatedBackground from "./AnimatedBackground";

export default function HomePage() {
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState(null);
  const [isLinkLoading, setIsLinkLoading] = useState(false);
  const [isDownloadLoading, setIsDownloadLoading] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);

  const handleMenuClick = () => {
    navigate("/admin-login");
  };

  const closeModal = () => setSelectedImage(null);

  const handleVisitLink = (e) => {
    e.preventDefault();
    const url = "https://btblite.vercel.app";
    
    // Set loading state
    setIsLinkLoading(true);
    
    // Track click in the background without waiting
    trackClick("visit_link", "home_page")
      .catch(error => console.error("Error tracking click:", error))
      .finally(() => setIsLinkLoading(false));
    
    // Open in a new tab for better perceived performance
    const newWindow = window.open(url, '_blank');
    
    // Fallback if popup is blocked
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      window.location.href = url;
    }
  };

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

  const toggleAdminMenu = () => {
    setShowAdminMenu(!showAdminMenu);
  };

  const handleAdminRegister = () => {
    navigate("/admin-register");
    setShowAdminMenu(false);
  };

  const handleAdminLogin = () => {
    navigate("/admin-login");
    setShowAdminMenu(false);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col relative">
      <AnimatedBackground />
      
      {/* Header Navigation */}
      <header className="w-full bg-black border-b border-gray-800">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          {/* Logo placeholder */}
          <div className="w-20"></div>
          
          <div className="flex-1 flex justify-center">
            <h1 className="text-xl font-bold text-white hidden md:block">
              Beyond The Brush
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={checkUserStatus}
              className="text-white hover:text-gray-300 transition duration-200 text-sm font-medium bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
            >
              My Dashboard
            </button>
            
            {/* Admin Menu */}
            <div className="relative">
              <button
                onClick={toggleAdminMenu}
                className="bg-white text-black py-2 px-4 rounded-lg font-semibold text-sm hover:bg-gray-200 transition duration-200 flex-shrink-0 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                Admin
              </button>
              
              {showAdminMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
                  <div className="py-1">
                    <button
                      onClick={handleAdminLogin}
                      className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 transition duration-200 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                      Admin Login
                    </button>
                    <button
                      onClick={handleAdminRegister}
                      className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 transition duration-200 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      Admin Register
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="bg-black border border-gray-800 rounded-2xl p-8 w-full max-w-md text-center">
          {/* Main Logo - Responsive */}
          <div className="w-28 h-28 mx-auto mb-4 flex items-center justify-center">
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
              className="w-full bg-pink-500 text-white py-3 px-6 rounded-lg font-semibold text-lg hover:bg-pink-600 transition duration-200 text-center no-underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              onClick={handleVisitLink}
              disabled={isLinkLoading}
            >
              {isLinkLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Opening...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Visit Link
                </>
              )}
            </button>

            <button
              className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg font-semibold text-lg hover:bg-blue-600 transition duration-200 text-center no-underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
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
                  className="flex-1 bg-gray-800 text-white py-3 px-6 rounded-lg font-semibold text-lg hover:bg-gray-700 transition duration-200 flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Login
                </button>
                
                <button
                  onClick={handleRegister}
                  className="flex-1 bg-purple-600 text-white py-3 px-6 rounded-lg font-semibold text-lg hover:bg-purple-700 transition duration-200 flex items-center justify-center gap-3"
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
          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-900/20 to-blue-700/10 border border-blue-500/20 rounded-lg p-4 text-center">
              <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                </svg>
              </div>
              <h4 className="text-white text-sm font-medium">For Students</h4>
              <p className="text-gray-400 text-xs mt-1">Join classes with codes</p>
            </div>
            
            <div className="bg-gradient-to-br from-purple-900/20 to-purple-700/10 border border-purple-500/20 rounded-lg p-4 text-center">
              <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h4 className="text-white text-sm font-medium">For Educators</h4>
              <p className="text-gray-400 text-xs mt-1">Create & manage classes</p>
            </div>
            
            <div className="bg-gradient-to-br from-red-900/20 to-red-700/10 border border-red-500/20 rounded-lg p-4 text-center">
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
        <div className="mt-16 w-full max-w-6xl px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
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

          {/* Features Section */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-gray-900/50 to-black/50 border border-gray-800 rounded-xl p-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-400 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Easy Registration</h3>
              <p className="text-gray-400">
                Simple role-based registration for students and educators. Students join with class codes, educators create and manage classes.
              </p>
            </div>

            <div className="bg-gradient-to-br from-gray-900/50 to-black/50 border border-gray-800 rounded-xl p-6">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-400 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Class Codes</h3>
              <p className="text-gray-400">
                Educators can generate unique class codes, manage academic settings, and track student participation in real-time.
              </p>
            </div>

            <div className="bg-gradient-to-br from-gray-900/50 to-black/50 border border-gray-800 rounded-xl p-6">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-400 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Progress Tracking</h3>
              <p className="text-gray-400">
                Monitor student engagement and participation. Educators get detailed insights into class activity and student progress.
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
      
      {/* Click outside to close admin menu */}
      {showAdminMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowAdminMenu(false)}
        />
      )}
    </div>
  );
}