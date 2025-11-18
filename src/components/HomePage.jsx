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
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(true);

  const handleMenuClick = () => {
    navigate("/admin");
  };

  const closeModal = () => setSelectedImage(null);
  const closePrivacyNotice = () => setShowPrivacyNotice(false);

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

  // Updated: Opens in same browser tab
  const handleDownload = async (e) => {
    e.preventDefault();
    const url = "https://mega.nz/file/ZAcAzBQB#l2K2jNJpj8Vhlom_U_BybDLwzC7iRMBoVdlO4BrEkWg";
    
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

  return (
    <div className="min-h-screen bg-black flex flex-col relative">
      <AnimatedBackground />
      
      {/* Header Navigation - Logo removed */}
      <header className="w-full bg-black border-b border-gray-800">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          {/* Empty div for spacing - logo removed */}
          <div className="w-20"></div>
          
          <div className="flex-1 flex justify-center">
            {/* Optional: Add title or other content here */}
          </div>
          
          <button
            onClick={handleMenuClick}
            className="bg-white text-black py-2 px-6 rounded-lg font-semibold text-sm hover:bg-gray-200 transition duration-200 flex-shrink-0"
          >
            Admin Login
          </button>
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

          <h2 className="text-4xl text-white text-center mb-8">
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
        </div>
      </div>

      {/* Data Privacy Act Popup */}
      {showPrivacyNotice && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-pink-600 to-blue-600 p-4">
              <h2 className="text-2xl font-bold text-white text-center">
                Important Notice: Data Privacy Act
              </h2>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="text-white space-y-4">
                <p className="font-semibold text-lg text-pink-400">
                  Your Privacy Matters
                </p>
                
                <p>
                  In compliance with the <strong>Data Privacy Act of 2012 (Republic Act No. 10173)</strong>, 
                  Beyond The Brush is committed to protecting your personal information and privacy.
                </p>

                <div className="bg-gray-800 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-400 mb-2">What We Collect:</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Click interactions (button clicks using the app, link visits,installing app 
                      and downloads)</li>
                    <li>Timestamp of your interactions</li>
                    <li>Anonymous usage statistics</li>
                  </ul>
                </div>

                <div className="bg-gray-800 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-400 mb-2">Why We Collect This Information:</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>To improve user experience and what most devices people use to run such pc or web-app</li>
                    <li>To understand how users interact with platform</li>
                    <li>To enhance security and prevent misuse</li>
                    <li>To gather insights for future development</li>
                  </ul>
                </div>

                <p className="text-sm text-gray-300">
                  <strong>Note:</strong> We do not collect sensitive personal information. All collected data 
                  is anonymized and used solely for improving services. By continuing to use Beyond The Brush, 
                  you acknowledge and consent to this data collection in accordance with the Data Privacy Act.
                </p>
              </div>
            </div>
            
            {/* Footer with Close Button */}
            <div className="border-t border-gray-700 p-4 bg-gray-800">
              <div className="flex justify-center">
                <button
                  onClick={closePrivacyNotice}
                  className="bg-gradient-to-r from-pink-500 to-blue-500 text-white py-3 px-8 rounded-lg font-semibold hover:from-pink-600 hover:to-blue-600 transition duration-200"
                >
                  I Understand
                </button>
              </div>
              <p className="text-center text-gray-400 text-xs mt-2">
                Beyond The Brush complies with RA 10173 - Data Privacy Act of 2012
              </p>
            </div>
          </div>
        </div>
      )}

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
          @2025 Beyond The Brush
        </div>
      </footer>
    </div>
  );
}