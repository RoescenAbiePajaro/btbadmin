import React from 'react';
import { FiX, FiFile, FiDownload } from 'react-icons/fi';

export default function ExportModal({ isOpen, onClose, onExport, title = 'Export Data' }) {
  if (!isOpen) return null;

  const exportFormats = [
    { 
      id: 'excel', 
      label: 'Excel', 
      description: 'Export as Excel (.xlsx)',
      icon: '📊',
      color: 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
    },
    { 
      id: 'pdf', 
      label: 'PDF', 
      description: 'Export as PDF with listed data',
      icon: '📄',
      color: 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
    },
    { 
      id: 'pptx', 
      label: 'PowerPoint', 
      description: 'Export as PowerPoint (.pptx)',
      icon: '📊',
      color: 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-400'
    },
    { 
      id: 'docx', 
      label: 'Word', 
      description: 'Export as Word (.docx)',
      icon: '📝',
      color: 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400'
    }
  ];

  const handleFormatClick = (format) => {
    if (onExport) {
      onExport(format);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-500/20 rounded-lg">
                <FiDownload className="w-6 h-6 text-violet-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{title}</h3>
                <p className="text-sm text-gray-400">Choose export format</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          {/* Format Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {exportFormats.map((format) => (
              <button
                key={format.id}
                onClick={() => handleFormatClick(format.id)}
                className={`${format.color} p-4 rounded-lg border border-gray-700 hover:border-gray-600 transition-all duration-200 text-left group`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{format.icon}</span>
                  <div className="flex-1">
                    <div className="font-semibold text-white mb-1">{format.label}</div>
                    <div className="text-xs text-gray-400">{format.description}</div>
                  </div>
                  <FiFile className="w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-colors" />
                </div>
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-800">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
