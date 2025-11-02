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

  return (
    <div className="min-h-screen bg-black flex flex-col relative">
      <AnimatedBackground />
      {/* Header Navigation */}
      <header className="w-full bg-black border-b border-gray-800">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="w-20"></div>
          <div className="flex-1 flex justify-center"></div>
          <button
            onClick={handleMenuClick}
            className="bg-white text-black py-2 px-6 rounded-lg font-semibold text-sm hover:bg-gray-200 transition duration-200"
          >
            Admin Login
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="bg-black border border-gray-800 rounded-2xl p-8 w-full max-w-md text-center">
          <div className="w-28 h-28 mx-auto mb-4">
            <img
              src="/icon/logo.webp"
              srcSet="/icon/logo.png 1x, /icon/logo@2x.webp 2x"
              alt="Beyond The Brush"
              className="w-full h-full object-contain"
              width="112"
              height="112"
              loading="lazy"
            />
          </div>

          <h2 className="text-4xl text-white text-center mb-8">
            Beyond The Brush
          </h2>

          <div className="flex flex-col space-y-4">
            <button
              className="w-full bg-pink-500 text-white py-3 px-6 rounded-lg font-semibold text-lg hover:bg-pink-600 transition duration-200 text-center no-underline disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={async (e) => {
                e.preventDefault();
                const url = "https://btblite.vercel.app";
                setIsLinkLoading(true);
                try {
                  await trackClick("visit_link", "home_page");
                  window.open(url, "_blank", "noopener,noreferrer");
                } catch (error) {
                  console.error("Error tracking click:", error);
                  window.open(url, "_blank", "noopener,noreferrer");
                } finally {
                  setIsLinkLoading(false);
                }
              }}
              disabled={isLinkLoading}
            >
              {isLinkLoading ? 'Opening...' : 'Visit Link'}
            </button>

            <button
              className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg font-semibold text-lg hover:bg-blue-600 transition duration-200 text-center no-underline disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={async (e) => {
                e.preventDefault();
                const url = "https://mega.nz/folder/NFVAnJSL#xdiixtFhQvP7t-McXYN_kw";
                setIsDownloadLoading(true);
                try {
                  await trackClick("download", "home_page");
                  window.open(url, "_blank", "noopener,noreferrer");
                } catch (error) {
                  console.error("Error tracking download:", error);
                  window.open(url, "_blank", "noopener,noreferrer");
                } finally {
                  setIsDownloadLoading(false);
                }
              }}
              disabled={isDownloadLoading}
            >
              {isDownloadLoading ? 'Preparing...' : 'Download PC'}
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
                onClick={() =>
                  setSelectedImage("/1.jpg")
                }
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
                className="w-64 h-40 rounded-2xl shadow-lg object-cover"
              ></video>
              <p className="text-gray-300 mt-3 text-sm max-w-xs">
                A PC app that uses hand gesture controls also a  AI-driven digital painting using webcams allowing users to draw or present key ideas.
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
    </div>
  );
}
