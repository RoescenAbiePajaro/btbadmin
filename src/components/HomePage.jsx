// HomePage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { trackClick } from "../../backend/utils/trackClick";

export default function HomePage() {
  const navigate = useNavigate();
  const downloadAvailable = useCheckDownload('/btbbtb_setup.exe');

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
                href="https://btblite.onrender.com" 
                className="bg-pink-500 text-white py-3 px-6 rounded-lg font-semibold text-lg hover:bg-pink-600 transition duration-200 text-center no-underline"
                onClick={async (e) => {
                  e.preventDefault();
                  const url = e.currentTarget.href;
                  try {
                    await trackClick('visit_link', 'home_page');
                    window.open(url, '_blank', 'noopener,noreferrer');
                  } catch (error) {
                    console.error('Error tracking click:', error);
                    // Still open the link even if tracking fails
                    window.open(url, '_blank', 'noopener,noreferrer');
                  }
                }}
              >
                Visit Link
              </a>
              {/* Download button: check if file exists on server before enabling */}
              <a
                href={downloadAvailable ? "/btbbtb_setup.exe" : '#'}
                download={!!downloadAvailable}
                aria-disabled={downloadAvailable === false}
                className={`py-3 px-6 rounded-lg font-semibold text-lg transition duration-200 text-center no-underline ${
                  downloadAvailable === false
                    ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
                onClick={(e) => {
                  if (downloadAvailable === false) {
                    // Prevent navigation when not available
                    e.preventDefault();
                    return;
                  }

                  // Fire-and-forget the tracking request; don't await so the browser
                  // can start the download immediately and avoid popup blocking.
                  try {
                    trackClick('download', 'home_page');
                  } catch (err) {
                    // swallow errors from tracking
                    console.error('trackClick error', err);
                  }
                }}
                title={downloadAvailable === false ? 'Download not available on this server' : 'Download for PC'}
              >
                {downloadAvailable === false ? 'Download Unavailable' : 'Download PC'}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Check for the existence of the file when the component mounts
function useCheckDownload(url) {
  const [available, setAvailable] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const resp = await fetch(url, { method: 'HEAD' });
        if (!cancelled) setAvailable(resp.ok);
      } catch (err) {
        if (!cancelled) setAvailable(false);
      }
    }

    check();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return available;
}