//src/components/HomePage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { trackClick } from "../../backend/utils/trackClick";
import AnimatedBackground from "./AnimatedBackground";

export default function HomePage() {
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState(null);
  const [isLinkLoading, setIsLinkLoading] = useState(false);
  const [isDownloadLoading, setIsDownloadLoading] = useState(false);

  const handleMenuClick = () => {
    navigate("/admin");
  };

  const closeModal = () => setSelectedImage(null);

  // Updated: Opens in same browser tab
  const handleVisitLink = async (e) => {
    e.preventDefault();
    const url = "https://btblite.vercel.app";
    
    setIsLinkLoading(true);
    
    // Track click first, then navigate
    try {
      await trackClick("visit_link", "home_page");
    } catch (error) {
      console.error("Error tracking click:", error);
    } finally {
      setIsLinkLoading(false);
      // Navigate to the URL in the same tab
      window.location.href = url;
    }
  };

  // Updated: Opens in same browser tab
  const handleDownload = async (e) => {
    e.preventDefault();
    const url = "https://mega.nz/file/9FlzALQa#eHujAF53dNZZAhozZON_F2dAN5E3HUVGkJ48g_Y5d78";
    
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