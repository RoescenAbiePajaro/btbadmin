import React from 'react';
import { FiX } from 'react-icons/fi';
import { getDeviceIcon, getOSIcon, formatOSName } from '../../utils/deviceUtils';

const GuestActivityModal = ({ selectedClick, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h3 className="text-xl font-bold text-white">Guest Activity Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-700 transition-colors"
          >
            <FiX size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-750 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-400 mb-2">Basic Information</h4>
              <div className="space-y-2">
                <div>
                  <span className="text-gray-400 text-sm">Button:</span>
                  <p className="text-white font-medium">{selectedClick.button}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">Page:</span>
                  <p className="text-white">{selectedClick.page}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">Date & Time:</span>
                  <p className="text-white">
                    {new Date(selectedClick.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Device Information */}
            <div className="bg-gray-750 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-400 mb-2">Device Information</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getDeviceIcon(selectedClick.deviceType)}</span>
                  <div>
                    <span className="text-gray-400 text-sm">Device:</span>
                    <p className="text-white font-medium">
                      {selectedClick.deviceType || 'Unknown'}
                      {selectedClick.isMobile && ' (Mobile)'}
                      {selectedClick.isTablet && ' (Tablet)'}
                      {selectedClick.isLaptop && ' (Laptop)'}
                      {selectedClick.isDesktop && !selectedClick.isLaptop && ' (Desktop)'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getOSIcon(selectedClick.operatingSystem)}</span>
                  <div>
                    <span className="text-gray-400 text-sm">OS:</span>
                    <p className="text-white">{formatOSName(selectedClick.operatingSystem)}</p>
                  </div>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">Browser:</span>
                  <p className="text-white">{selectedClick.browser || 'Unknown'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Network Information */}
          <div className="bg-gray-750 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-400 mb-2">Network Information</h4>
            <div>
              <span className="text-gray-400 text-sm">IP Address:</span>
              <p className="text-white font-mono text-sm">{selectedClick.ipAddress || 'Not available'}</p>
            </div>
          </div>

          {/* Raw User Agent */}
          <div className="bg-gray-750 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-400 mb-2">Raw User Agent</h4>
            <div className="bg-gray-900 p-3 rounded border border-gray-700">
              <code className="text-xs text-gray-300 break-all">
                {selectedClick.userAgent || 'No user agent data available'}
              </code>
            </div>
          </div>
        </div>

        <div className="flex justify-end p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuestActivityModal;