import React from 'react';
import { FiCalendar } from 'react-icons/fi';
import clickCategories from '../../../../config/clickCategories';
import { useFilters } from '../../hooks/useFilters';

const AnalyticsFilters = () => {
  const {
    selectedCategory,
    setSelectedCategory,
    timeFilter,
    setTimeFilter,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    fetchData,
    fetchAllClicksForAnalytics
  } = useFilters();

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-4">
      <div className="w-full sm:w-64">
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
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>
      
      <div className="w-full sm:w-64">
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
                <label htmlFor="analytics-start-date" className="block text-sm font-medium text-gray-300 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  id="analytics-start-date"
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
              <div>
                <label htmlFor="analytics-end-date" className="block text-sm font-medium text-gray-300 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  id="analytics-end-date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value || '')}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  min={startDate}
                  max={new Date().toISOString().split('T')[0]}
                  disabled={!startDate}
                />
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
                    fetchAllClicksForAnalytics();
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
  );
};

export default AnalyticsFilters;