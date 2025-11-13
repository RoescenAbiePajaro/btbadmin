import React from 'react';
import { FiChevronLeft, FiChevronRight, FiEye, FiTrash2 } from 'react-icons/fi';
import { getDeviceIcon, getOSIcon, formatOSName } from '../../utils/deviceUtils';

const GuestActivityTable = ({
  isLoading,
  clicks,
  total,
  totalPages,
  page,
  setPage,
  onViewDetails,
  onDeleteClick
}) => {
  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="p-8 flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-800">
            <tr>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">Button</th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">Page</th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">Device & OS</th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">Date & Time</th>
              <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 divide-y divide-gray-700">
            {clicks.length > 0 ? (
              clicks.map((click, idx) => (
                <tr key={click._id || idx} className="hover:bg-gray-750 transition-colors">
                  <td className="px-3 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-900 text-blue-200 max-w-[120px] truncate">
                      {click.button}
                    </span>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-200 max-w-[150px] truncate">{click.page}</td>
                  <td className="px-3 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getDeviceIcon(click.deviceType)}</span>
                      <span className="text-lg">{getOSIcon(click.operatingSystem)}</span>
                      <div className="text-sm">
                        <div className="text-gray-200">{click.deviceType || 'Unknown'}</div>
                        <div className="text-gray-400 text-xs">{formatOSName(click.operatingSystem)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-400">
                    {new Date(click.timestamp).toLocaleString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => onViewDetails(click)}
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-900 hover:bg-opacity-20 p-2 rounded-full transition-colors"
                        title="View details"
                      >
                        <FiEye size={16} />
                      </button>
                      <button
                        onClick={() => onDeleteClick(click._id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900 hover:bg-opacity-20 p-2 rounded-full transition-colors"
                        title="Delete this entry"
                        disabled={!click._id}
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {clicks.length > 0 && (
        <div className="px-4 sm:px-6 py-4 bg-gray-750 border-t border-gray-700 flex items-center justify-between">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 transition-colors"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-400">
                Showing <span className="font-medium text-white">{(page - 1) * 10 + 1}</span> to{' '}
                <span className="font-medium text-white">{Math.min(page * 10, total)}</span> of{' '}
                <span className="font-medium text-white">{total}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-600 bg-gray-700 text-sm font-medium text-gray-400 hover:bg-gray-600 disabled:opacity-50 transition-colors"
                >
                  <span className="sr-only">Previous</span>
                  <FiChevronLeft className="h-5 w-5" />
                </button>
                <span className="relative inline-flex items-center px-4 py-2 border border-gray-600 bg-gray-700 text-sm font-medium text-gray-300">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-600 bg-gray-700 text-sm font-medium text-gray-400 hover:bg-gray-600 disabled:opacity-50 transition-colors"
                >
                  <span className="sr-only">Next</span>
                  <FiChevronRight className="h-5 w-5" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuestActivityTable;