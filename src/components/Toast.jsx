import React, { useEffect, useState } from "react";

export default function Toast({ message, type = "info", duration = 3000, onClose }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      const closeTimer = setTimeout(() => {
        onClose();
      }, 300);
      return () => clearTimeout(closeTimer);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = type === "error" ? "bg-red-900 text-red-300 border-red-500" :
                 type === "success" ? "bg-green-900 text-green-300 border-green-500" :
                 "bg-blue-900 text-blue-300 border-blue-500";

  return (
    <div
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded border shadow-lg z-50 transition-opacity duration-300 ${
        isVisible ? "opacity-100" : "opacity-0"
      } ${bgColor}`}
    >
      {message}
      {type === "error" && <i className="fas fa-exclamation-triangle ml-2"></i>}
    </div>
  );
}