//src/components/GuestClicksSection.jsx
import React from 'react';
import { FiChevronLeft, FiChevronRight, FiTrash2, FiDownload, FiCalendar } from 'react-icons/fi';
import clickCategories from '../config/clickCategories';

const GuestClicksSection = ({
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
  clicks // Add this prop
}) => {
  const filteredClicks = getFilteredClicks ? getFilteredClicks() : [];

  return (
    <div className="space-y-6">
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
          <p className="text-gray-200 mb-4">Detailed log of all guest interactions</p>
          
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
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">Date & Time</th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap hidden sm:table-cell">ID</th>
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
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-400">
                          {new Date(click.timestamp).toLocaleString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-300 hidden sm:table-cell max-w-[100px] truncate">
                          {click._id ? click._id.substring(0, 8) + '...' : 'No ID'}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleDeleteClick(click._id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-900 hover:bg-opacity-20 p-2 rounded-full transition-colors"
                            title="Delete this entry"
                            disabled={!click._id}
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
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

export default GuestClicksSection;