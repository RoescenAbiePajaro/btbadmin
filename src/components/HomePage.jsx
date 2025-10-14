// HomePage.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { trackClick } from "../../backend/utils/trackClick";

export default function HomePage() {
  const navigate = useNavigate();

  const handleMenuClick = () => {
    navigate("/admin");
  };

  const handleDownload = async () => {
    try {
      await trackClick("download", "home_page");
    } catch (error) {
      console.error("Error tracking click:", error);
    }

    // Direct automatic download (from your hosted server)
    const link = document.createElement("a");
    link.href = "/btbbtb_setup.exe"; // ✅ your hosted file path
    link.download = "btbbtb_setup.exe"; // filename for the computer
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
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

      {/* Main */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-black rounded-2xl p-8 w-full max-w-md text-center">
          <div className="w-32 h-32 mx-auto mb-4">
            <img
              src="/icon/logo.png"
              alt="Beyond The Brush"
              className="w-full h-full object-contain"
              onError={(e) => (e.target.style.display = "none")}
            />
          </div>
          <h2 className="text-4xl text-white mb-8">Beyond The Brush</h2>

          {/* Buttons */}
          <div className="flex flex-col space-y-4">
            <a
              href="https://btblite.onrender.com"
              onClick={async (e) => {
                e.preventDefault();
                const url = e.currentTarget.href;
                try {
                  await trackClick("visit_link", "home_page");
                } catch (error) {
                  console.error("Error tracking click:", error);
                }
                window.open(url, "_blank", "noopener,noreferrer");
              }}
              className="bg-pink-500 text-white py-3 px-6 rounded-lg font-semibold text-lg hover:bg-pink-600 transition duration-200 no-underline"
            >
              Visit Link
            </a>

            <button
              onClick={handleDownload}
              className="bg-blue-500 text-white py-3 px-6 rounded-lg font-semibold text-lg hover:bg-blue-600 transition duration-200"
            >
              Download PC
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
