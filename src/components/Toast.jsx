// src/components/Toast.jsx
import React, { useEffect } from 'react';
import { FiCheckCircle, FiAlertCircle, FiInfo, FiXCircle, FiX } from 'react-icons/fi';

export default function Toast({ message, type = 'info', onClose, duration = 5000 }) {
  useEffect(() => {
    if (duration) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);
  
  const getTypeStyles = () => {
    switch(type) {
      case 'success':
        return {
          bg: 'bg-green-900/90',
          border: 'border-green-700',
          icon: <FiCheckCircle className="text-green-400" />,
          text: 'text-green-200'
        };
      case 'error':
        return {
          bg: 'bg-red-900/90',
          border: 'border-red-700',
          icon: <FiXCircle className="text-red-400" />,
          text: 'text-red-200'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-900/90',
          border: 'border-yellow-700',
          icon: <FiAlertCircle className="text-yellow-400" />,
          text: 'text-yellow-200'
        };
      default:
        return {
          bg: 'bg-blue-900/90',
          border: 'border-blue-700',
          icon: <FiInfo className="text-blue-400" />,
          text: 'text-blue-200'
        };
    }
  };
  
  const styles = getTypeStyles();
  
  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div className={`${styles.bg} border ${styles.border} rounded-lg shadow-xl max-w-sm`}>
        <div className="flex items-start p-4">
          <div className="flex-shrink-0 mt-0.5">
            {styles.icon}
          </div>
          <div className="ml-3 flex-1">
            <p className={`text-sm font-medium ${styles.text}`}>
              {message}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 flex-shrink-0 text-gray-400 hover:text-white transition-colors"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}