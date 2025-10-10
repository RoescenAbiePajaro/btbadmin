// LoadingScreen.jsx
import React, { useEffect } from "react";

export default function LoadingScreen({ progress, setProgress, onComplete }) {
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 500);
          return 100;
        }
        return prev + 1;
      });
    }, 30);
    
    return () => clearInterval(interval);
  }, [setProgress, onComplete]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden">
      <div className="text-center p-4 w-full max-w-md">
        <div className="w-48 h-48 mx-auto mb-8">
          <img 
            src="/icon/logo.png" 
            alt="Beyond The Brush" 
            className="w-full h-full object-contain"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }}
          />
          <h1 
            className="text-4xl font-bold text-white hidden"
            style={{display: 'none'}}
          >
            Beyond The Brush
          </h1>
        </div>
        <div className="text-2xl text-white mb-4">Loading...</div>
        <div className="w-80 h-6 bg-gray-700 rounded-full mx-auto overflow-hidden">
          <div 
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}