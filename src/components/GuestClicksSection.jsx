import React, { useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiTrash2, FiDownload, FiCalendar, FiEye, FiX } from 'react-icons/fi';
import clickCategories from '../config/clickCategories';

const GuestActivitySection = ({
  isLoading,
  getFilteredClicks,
  total,
  totalPages,
  page,
  setPage,
  selectedCategory,
  setSelectedCategory,
  timeFilter,
  setTimeFilter,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  fetchData,
  handleDeleteClick,
  handleDeleteAll,
  handleExportCSV,
  clicks
}) => {
  const [selectedClick, setSelectedClick] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const filteredClicks = getFilteredClicks ? getFilteredClicks() : [];

  const openDetails = (click) => {
    setSelectedClick(click);
    setShowModal(true);
  };

  const closeDetails = () => {
    setShowModal(false);
    setSelectedClick(null);
  };

  const getDeviceIcon = (deviceType) => {
    switch (deviceType?.toLowerCase()) {
      case 'mobile': return '📱';
      case 'tablet': return '📟';
      case 'desktop': return '💻';
      default: return '❓';
    }
  };

  const getOSIcon = (os) => {
    switch (os?.toLowerCase()) {
      case 'windows': return '🪟';
      case 'macos': return '🍎';
      case 'linux': return '🐧';
      case 'ubuntu': return '🐧';
      case 'android': return '🤖';
      case 'ios': return '📱';
      default: return '💻';
    }
  };

  return (
    <div className="space-y-6">
      {/* Modal for detailed view */}
      {showModal && selectedClick && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-700">
              <h3 className="text-xl font-bold text-white">Guest Activity Details</h3>
              <button
                onClick={closeDetails}
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
                          {selectedClick.isDesktop && ' (Desktop)'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getOSIcon(selectedClick.operatingSystem)}</span>
                      <div>
                        <span className="text-gray-400 text-sm">OS:</span>
                        <p className="text-white">{selectedClick.operatingSystem || 'Unknown'}</p>
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
                onClick={closeDetails}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rest of the existing component */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 gap-2 mb-4">
            <h2 className="text-2xl font-bold text-white">Guest Activity</h2>
            <button 
              onClick={fetchData}
              className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded-full transition-colors self-start sm:self-center"
              title="Refresh Activity"
              disabled={isLoading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          <p className="text-gray-200 mb-4">Detailed log of all guest interactions with device information</p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-2xl">
            <div className="w-full sm:w-1/2">
              <label htmlFor="category-filter" className="block text-sm font-medium text-gray-300 mb-2">
                Filter by Category:
              </label>
              <select
                id="category-filter"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none cursor-pointer"
              >
                <option value="all">All Categories</option>
                {Object.keys(clickCategories).map(category => (
                  <option key={`guest-${category}`} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-full sm:w-1/2">
              <label htmlFor="time-filter" className="block text-sm font-medium text-gray-300 mb-2">
                Filter by Time:
              </label>
              <div className="relative">
                <select
                  id="time-filter"
                  value={timeFilter}
                  onChange={(e) => {
                    setTimeFilter(e.target.value);
                    if (e.target.value !== 'custom') {
                      setStartDate('');
                      setEndDate('');
                    }
                  }}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg pl-3 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none cursor-pointer"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="year">This Year</option>
                  <option value="custom">Custom Range</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <FiCalendar className="h-5 w-5 text-gray-400" />
                </div>
              </div>
              {timeFilter === 'custom' && (
                <div className="mt-3 p-4 bg-gray-800 border border-gray-700 rounded-lg">
                  <div className="space-y-3">
                    <div>
                      <label htmlFor="guest-start-date" className="block text-sm font-medium text-gray-300 mb-1">
                        From Date
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          id="guest-start-date"
                          value={startDate}
                          onChange={(e) => {
                            setStartDate(e.target.value || '');
                            if (e.target.value && endDate && new Date(e.target.value) > new Date(endDate)) {
                              setEndDate('');
                            }
                          }}
                          className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          max={endDate || new Date().toISOString().split('T')[0]}
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="guest-end-date" className="block text-sm font-medium text-gray-300 mb-1">
                        To Date
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          id="guest-end-date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value || '')}
                          className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          min={startDate}
                          max={new Date().toISOString().split('T')[0]}
                          disabled={!startDate}
                        />
                      </div>
                    </div>
                    {startDate && endDate && new Date(startDate) > new Date(endDate) && (
                      <p className="text-red-400 text-xs mt-1">End date must be after start date</p>
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-700 flex justify-end space-x-2">
                    <button
                      onClick={() => {
                        setTimeFilter('all');
                        setStartDate('');
                        setEndDate('');
                      }}
                      className="px-3 py-1.5 text-sm text-gray-300 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (startDate && endDate && new Date(startDate) <= new Date(endDate)) {
                          fetchData();
                        }
                      }}
                      className={`px-3 py-1.5 text-sm rounded-md ${
                        !startDate || !endDate || new Date(startDate) > new Date(endDate)
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                      disabled={!startDate || !endDate || new Date(startDate) > new Date(endDate)}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col xs:flex-row gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white font-semibold text-sm hover:bg-green-700 rounded-lg transition-colors w-full xs:w-auto min-w-[120px]"
            disabled={filteredClicks.length === 0}
            title="Export to CSV"
          >
            <FiDownload size={16} />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleDeleteAll}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white font-semibold text-sm hover:bg-red-700 rounded-lg transition-colors w-full xs:w-auto min-w-[120px]"
            disabled={total === 0}
            title="Delete all records"
          >
            <FiTrash2 size={16} />
            <span>Delete All</span>
          </button>
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-800">
                  <tr>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">Button</th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">Page</th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">Device & OS</th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">Date & Time</th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap hidden sm:table-cell">Location</th>
                    <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  {filteredClicks.length > 0 ? (
                    filteredClicks.map((click, idx) => (
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
                              <div className="text-gray-400 text-xs">{click.operatingSystem || 'Unknown OS'}</div>
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
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-300 hidden sm:table-cell">
                          {click.location?.country || 'Unknown'}
                          {click.location?.city ? `, ${click.location.city}` : ''}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openDetails(click)}
                              className="text-blue-400 hover:text-blue-300 hover:bg-blue-900 hover:bg-opacity-20 p-2 rounded-full transition-colors"
                              title="View details"
                            >
                              <FiEye size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(click._id)}
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
                      <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                        No data available{selectedCategory !== 'all' ? ` for ${selectedCategory}` : ''}{timeFilter !== 'all' ? ` for this ${timeFilter}` : ''}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
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
                    Showing <span className="font-medium text-white">{filteredClicks.length > 0 ? (page - 1) * 10 + 1 : 0}</span> to{' '}
                    <span className="font-medium text-white">{Math.min(page * 10, total)}</span> of{' '}
                    <span className="font-medium text-white">{total}</span> results
                    {(selectedCategory !== 'all' || timeFilter !== 'all') && (
                      <span className="text-gray-500 ml-2">(filtered by 
                        {selectedCategory !== 'all' ? ` ${selectedCategory}` : ''}
                        {selectedCategory !== 'all' && timeFilter !== 'all' ? ' and ' : ''}
                        {timeFilter !== 'all' ? ` this ${timeFilter}` : ''}
                        )</span>
                    )}
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
          </>
        )}
      </div>
    </div>
  );
};

export default GuestActivitySection;