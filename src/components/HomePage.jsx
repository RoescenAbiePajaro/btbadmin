// src/components/HomePage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AnimatedBackground from "./AnimatedBackground";
import axios from "axios";

export default function HomePage() {
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState(null);
  const [isDownloadLoading, setIsDownloadLoading] = useState(false);
  const [userCounts, setUserCounts] = useState({ 
    students: 0, 
    educators: 0,
    admins: 0,
    total: 0 
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleMenuClick = () => {
    navigate("/login");
  };

  const closeModal = () => setSelectedImage(null);

  // Track click function
  const trackClick = async (type, location) => {
    try {
      await axios.post('https://btbadmin.onrender.com/api/analytics/page-visit', {
        type,
        location,
        userAgent: navigator.userAgent,
        url: window.location.href
      });
    } catch (error) {
      console.error("Error tracking click:", error);
    }
  };

  const handleDownload = async (e) => {
    e.preventDefault();
    const url = "https://mega.nz/file/8Ndx0Qpb#O-1yE6KF8KdndwiOiOuQTLGvDuKKviplPToqwy-sa1w";
    
    setIsDownloadLoading(true);
    
    try {
      // Track download
      await axios.post('https://btbadmin.onrender.com//api/analytics/download-homepage');
    } catch (error) {
      console.error("Error tracking download:", error);
    } finally {
      setIsDownloadLoading(false);
      window.location.href = url;
    }
  };

  const handleLogin = () => {
    navigate("/login");
  };

  const handleRegister = () => {
    navigate("/select-role");
  };

  const handleAdminRegister = () => {
    navigate("/admin-register");
  };

  useEffect(() => {
    fetchUserCounts();
    // Track page visit
    trackClick('page_visit', 'home_page');
  }, []);

  const fetchUserCounts = async () => {
    try {
      const response = await axios.get('https://btbadmin.onrender.com//api/dashboard/user-counts');
      if (response.data.success) {
        setUserCounts(response.data.counts);
      }
    } catch (error) {
      console.error('Error fetching user counts:', error);
      // Fallback counts if API fails
      setUserCounts({
        students: 124,
        educators: 45,
        admins: 3,
        total: 172
      });
    }
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
          navigate("/admin/dashboard");
        }
      } catch (error) {
        console.error("Error parsing user data:", error);
        navigate("/login");
      }
    } else {
      navigate("/select-role");
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col relative overflow-x-hidden">
      <AnimatedBackground />
      
      {/* Header Navigation */}
      <header className="w-full bg-black/90 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10">
              <img
                src="/icon/logo.png"
                alt="Beyond The Brush"
                className="w-full h-full object-contain"
                loading="eager"
              />
            </div>
            <span className="text-xl font-bold text-white hidden sm:block">
              Beyond The Brush
            </span>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <a 
              href="#features" 
              className="text-gray-300 hover:text-white transition duration-200"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('features').scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Features
            </a>
            <a 
              href="#demo" 
              className="text-gray-300 hover:text-white transition duration-200"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('demo').scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Demo
            </a>
            <a 
              href="#contact" 
              className="text-gray-300 hover:text-white transition duration-200"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Contact
            </a>
          </div>
          
          {/* Mobile Menu Button */}
          <button
            onClick={toggleMenu}
            className="md:hidden text-gray-300 hover:text-white p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-gray-900 border-t border-gray-800 px-4 py-3">
            <div className="flex flex-col gap-3">
              <a 
                href="#features" 
                className="text-gray-300 hover:text-white py-2 transition duration-200"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('features').scrollIntoView({ behavior: 'smooth' });
                  setIsMenuOpen(false);
                }}
              >
                Features
              </a>
              <a 
                href="#demo" 
                className="text-gray-300 hover:text-white py-2 transition duration-200"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('demo').scrollIntoView({ behavior: 'smooth' });
                  setIsMenuOpen(false);
                }}
              >
                Demo
              </a>
              <a 
                href="#contact" 
                className="text-gray-300 hover:text-white py-2 transition duration-200"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
                  setIsMenuOpen(false);
                }}
              >
                Contact
              </a>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 w-full pt-8">
        <div className="bg-black/60 backdrop-blur-sm border border-gray-800 rounded-2xl p-4 sm:p-6 md:p-8 w-full max-w-md text-center mx-2 sm:mx-4 shadow-2xl">
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

          <h2 className="text-4xl md:text-5xl text-white text-center mb-8 font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Beyond The Brush
          </h2>

          <div className="flex flex-col space-y-4">
            <button
              className="w-full bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 text-white py-3 px-4 sm:px-6 rounded-lg font-semibold text-base sm:text-lg transition duration-200 text-center disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 sm:gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              onClick={handleDownload}
              disabled={isDownloadLoading}
            >
              {isDownloadLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Preparing Download...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download PC App
                </>
              )}
            </button>

            {/* Auth Buttons Section */}
            <div className="pt-4 border-t border-gray-800">
              <div className="flex space-x-4">
                <button
                  onClick={handleLogin}
                  className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-3 px-6 rounded-lg font-semibold text-lg hover:from-yellow-600 hover:to-orange-600 transition duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Login
                </button>
                
                <button
                  onClick={handleRegister}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-6 rounded-lg font-semibold text-lg hover:from-green-600 hover:to-emerald-700 transition duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Register
                </button>
              </div>
              <div className="mt-4">
                <button
                  onClick={handleAdminRegister}
                  className="w-full bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white py-3 px-6 rounded-lg font-semibold text-lg transition duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A7.968 7.968 0 015 16c0-4.418 3.582-8 8-8s8 3.582 8 8a7.968 7.968 0 01-.121 1.804m-15.758 0A9.003 9.003 0 0012 21a9.003 9.003 0 008.877-5.196m-15.758 0A9 9 0 0112 3a9 9 0 018.877 12.804" />
                  </svg>
                  Admin Registration
                </button>
              </div>
            </div>
          </div>

          {/* Platform Stats */}
          <div id="features" className="mt-8">
            <h3 className="text-white font-bold mb-4 text-lg">Platform Statistics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-blue-900/30 to-blue-700/20 border border-blue-500/30 rounded-lg p-4 text-center hover:border-blue-400/50 transition duration-300">
                <div className="text-2xl font-bold text-white mb-1">{userCounts.students.toLocaleString()}</div>
                <p className="text-gray-300 text-sm">Students</p>
              </div>
              
              <div className="bg-gradient-to-br from-pink-900/30 to-pink-700/20 border border-pink-500/30 rounded-lg p-4 text-center hover:border-pink-400/50 transition duration-300">
                <div className="text-2xl font-bold text-white mb-1">{userCounts.educators.toLocaleString()}</div>
                <p className="text-gray-300 text-sm">Educators</p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-900/30 to-purple-700/20 border border-purple-500/30 rounded-lg p-4 text-center hover:border-purple-400/50 transition duration-300">
                <div className="text-2xl font-bold text-white mb-1">{userCounts.admins.toLocaleString()}</div>
                <p className="text-gray-300 text-sm">Admins</p>
              </div>
              
              <div className="bg-gradient-to-br from-green-900/30 to-green-700/20 border border-green-500/30 rounded-lg p-4 text-center hover:border-green-400/50 transition duration-300">
                <div className="text-2xl font-bold text-white mb-1">{userCounts.total.toLocaleString()}</div>
                <p className="text-gray-300 text-sm">Total Users</p>
              </div>
            </div>
          </div>

          {/* Info Cards */}
          <div className="mt-6 sm:mt-8 grid grid-cols-3 gap-2 sm:gap-4">
            <div className="bg-gradient-to-br from-blue-900/20 to-blue-700/10 border border-blue-500/20 rounded-lg p-2 sm:p-3 md:p-4 text-center hover:border-blue-400/40 transition duration-300 group">
              <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-blue-500/30 group-hover:scale-110 transition duration-300">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                </svg>
              </div>
              <h4 className="text-white text-sm font-medium">For Students</h4>
              <p className="text-gray-400 text-xs mt-1">Join classes with codes</p>
            </div>
            
            <div className="bg-gradient-to-br from-pink-900/20 to-pink-700/10 border border-pink-500/20 rounded-lg p-2 sm:p-3 md:p-4 text-center hover:border-pink-400/40 transition duration-300 group">
              <div className="w-10 h-10 bg-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-pink-500/30 group-hover:scale-110 transition duration-300">
                <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h4 className="text-white text-sm font-medium">For Educators</h4>
              <p className="text-gray-400 text-xs mt-1">Create & manage classes</p>
            </div>
            
            <div className="bg-gradient-to-br from-red-900/20 to-red-700/10 border border-red-500/20 rounded-lg p-2 sm:p-3 md:p-4 text-center hover:border-red-400/40 transition duration-300 group">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-red-500/30 group-hover:scale-110 transition duration-300">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A7.968 7.968 0 015 16c0-4.418 3.582-8 8-8s8 3.582 8 8a7.968 7.968 0 01-.121 1.804m-15.758 0A9.003 9.003 0 0012 21a9.003 9.003 0 008.877-5.196m-15.758 0A9 9 0 0112 3a9 9 0 018.877 12.804" />
                </svg>
              </div>
              <h4 className="text-white text-sm font-medium">For Admins</h4>
              <p className="text-gray-400 text-xs mt-1">Manage system & users</p>
            </div>
          </div>
        </div>

        {/* Demo Section */}
        <div id="demo" className="mt-12 sm:mt-16 w-full max-w-6xl px-2 sm:px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-8">
            See It In Action
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 items-start">
            {/* Image 1 */}
            <div className="flex flex-col items-center text-center">
              <div className="relative group">
                <img
                  loading="lazy"
                  src="/1.jpg"
                  alt="Art Showcase"
                  className="w-64 h-40 rounded-2xl shadow-lg object-cover cursor-pointer hover:opacity-80 transition duration-300 group-hover:scale-105"
                  onClick={() => setSelectedImage("/1.jpg")}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition duration-300 flex items-end justify-center p-4">
                  <span className="text-white text-sm">Click to enlarge</span>
                </div>
              </div>
              <p className="text-gray-300 mt-3 text-sm max-w-xs">
                A simple drawing web-app that allows users to draw, present ideas or key terms.
              </p>
            </div>

            {/* Image 2 */}
            <div className="flex flex-col items-center text-center">
              <div className="relative group">
                <img
                  loading="lazy"
                  src="/7faf63e8-ed37-4167-8bc3-8354acbdca5f.jpg"
                  alt="Art Collaboration"
                  className="w-64 h-40 rounded-2xl shadow-lg object-cover cursor-pointer hover:opacity-80 transition duration-300 group-hover:scale-105"
                  onClick={() => setSelectedImage("/7faf63e8-ed37-4167-8bc3-8354acbdca5f.jpg")}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition duration-300 flex items-end justify-center p-4">
                  <span className="text-white text-sm">Click to enlarge</span>
                </div>
              </div>
              <p className="text-gray-300 mt-3 text-sm max-w-xs">
                Another example of drawing made in Beyond The Brush Lite.
              </p>
            </div>

            {/* Video */}
            <div className="flex flex-col items-center text-center">
              <div className="relative group">
                <video
                  src="/Beyond The Brush 2025-09-14 15-04-56.mp4"
                  controls
                  preload="metadata"
                  className="w-64 h-40 rounded-2xl shadow-lg object-cover group-hover:scale-105 transition duration-300"
                  poster="/video-thumbnail.jpg"
                ></video>
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition duration-300 flex items-center justify-center">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                </div>
              </div>
              <p className="text-gray-300 mt-3 text-sm max-w-xs">
                A PC app that uses hand gesture controls also a AI-driven digital painting using webcams allowing users to draw or present key ideas.
              </p>
            </div>
          </div>

          {/* Features Grid */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition duration-300">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">AI-Powered Tools</h3>
              <p className="text-gray-400">
                Advanced AI algorithms for gesture recognition and smart drawing assistance.
              </p>
            </div>
            
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition duration-300">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Collaborative Learning</h3>
              <p className="text-gray-400">
                Real-time collaboration between educators and students in virtual classrooms.
              </p>
            </div>
            
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition duration-300">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Secure Platform</h3>
              <p className="text-gray-400">
                Enterprise-grade security with encrypted communications and secure file storage.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal for image preview */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={selectedImage}
              alt="Preview"
              className="rounded-2xl shadow-2xl max-h-[80vh] w-auto max-w-full object-contain"
            />
            <button
              onClick={closeModal}
              className="absolute -top-12 right-0 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 backdrop-blur-sm transition duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
      {/* Footer */}
      <footer id="contact" className="w-full py-12 mt-12 bg-gradient-to-r from-gray-900 via-black to-gray-900">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="mb-4 md:mb-0 text-center md:text-left">
              <div className="flex items-center gap-3 mb-4 justify-center md:justify-start">
                <div className="w-10 h-10">
                  <img
                    src="/icon/logo.png"
                    alt="Beyond The Brush"
                    className="w-full h-full object-contain"
                  />
                </div>
                <h3 className="font-bold text-xl text-white">Beyond The Brush</h3>
              </div>
              <p className="text-gray-400 max-w-md">
                Digital Painting & Learning Platform with AI-powered tools for educators and students worldwide.
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-8 mb-4 md:mb-0">
              <div>
                <h4 className="font-bold text-white mb-3">Platform</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-400 hover:text-white transition duration-200">Features</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition duration-200">Pricing</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition duration-200">API</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-white mb-3">For Users</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-400 hover:text-white transition duration-200">Students</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition duration-200">Educators</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition duration-200">Admins</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-white mb-3">Support</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-400 hover:text-white transition duration-200">Help Center</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition duration-200">Contact Us</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition duration-200">Documentation</a></li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-500 text-sm mb-4 md:mb-0">
              © {new Date().getFullYear()} Beyond The Brush. All rights reserved.
            </div>
            <div className="flex items-center gap-4">
              <a href="#" className="text-gray-400 hover:text-white transition duration-200">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition duration-200">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition duration-200">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}