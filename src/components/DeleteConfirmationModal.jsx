import React from 'react';

const DeleteConfirmationModal = ({
  showModal,
  onClose,
  onConfirm,
  deleteMode,
  isDeleting
}) => {
  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 border border-gray-700">
        <h3 className="text-lg font-medium text-white mb-4">
          {deleteMode === 'all' ? 'Delete All Records' : 'Delete Click Record'}
        </h3>
        <p className="text-gray-400 mb-6">
          {deleteMode === 'all'
            ? 'Are you sure you want to delete ALL click records? This action cannot be undone.'
            : 'Are you sure you want to delete this click record? This action cannot be undone.'}
        </p>
        <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-gray-300 hover:bg-gray-700 transition-colors order-2 sm:order-1"
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 focus:ring-offset-gray-900 disabled:opacity-50 transition-colors order-1 sm:order-2"
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
