// HomePage.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { trackClick } from "../utils/trackClick";

export default function HomePage() {
  const navigate = useNavigate();

  const handleMenuClick = () => {
    navigate("/admin");
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header Navigation */}
      <header className="w-full bg-black border-b border-gray-800">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          {/* Left side - empty for balance */}
          <div className="w-20"></div>
          
          {/* Center - empty since logo was removed */}
          <div className="flex-1 flex justify-center">
            {/* Logo removed from header */}
          </div>
          
          {/* Right side - menu button */}
          <button 
            onClick={handleMenuClick}
            className="bg-white text-black py-2 px-6 rounded-lg font-semibold text-sm hover:bg-gray-200 transition duration-200"
          >
            Admin Login
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <div className="bg-black rounded-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-32 h-32 mx-auto mb-4">
              <img 
                src="/icon/logo.png" 
                alt="Beyond The Brush" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
            </div>
            <h2 className="text-4xl text-white text-center mb-8">
              Beyond The Brush
            </h2>
            
            {/* Two buttons with URL links */}
            <div className="flex flex-col space-y-4">
              <a 
                href="https://your-get-started-url.com" 
                className="bg-white text-black py-3 px-6 rounded-lg font-semibold text-lg hover:bg-gray-200 transition duration-200 text-center no-underline"
                onClick={() => trackClick('visit_link', 'home_page')}
                target="_blank"
                rel="noopener noreferrer"
              >
                Visit Link
              </a>
              <a 
                href="https://your-learn-more-url.com" 
                className="border-2 border-white text-white py-3 px-6 rounded-lg font-semibold text-lg hover:bg-white hover:text-black transition duration-200 text-center no-underline"
                onClick={() => trackClick('download', 'home_page')}
                target="_blank"
                rel="noopener noreferrer"
              >
                Download Now
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}