import React from 'react';
import { FiCalendar } from 'react-icons/fi';
import { Bar, Pie } from 'react-chartjs-2';
import clickCategories from '../config/clickCategories';

const AnalyticsSection = ({
  analyticsLoading,
  getAnalyticsData,
  total,
  selectedCategory,
  setSelectedCategory,
  timeFilter,
  setTimeFilter,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  fetchData,
  fetchAllClicksForAnalytics,
  allClicks // Add this prop
}) => {
  console.log('AnalyticsSection - allClicks:', allClicks);
  console.log('AnalyticsSection - getAnalyticsData():', getAnalyticsData ? getAnalyticsData() : 'getAnalyticsData not defined');

  const getChartData = () => {
    const analyticsData = getAnalyticsData ? getAnalyticsData() : [];
    console.log('Chart data - analyticsData:', analyticsData);
    
    const buttonCounts = analyticsData.reduce((acc, click) => {
      acc[click.button] = (acc[click.button] || 0) + 1;
      return acc;
    }, {});

    console.log('Chart data - buttonCounts:', buttonCounts);

    const colors = [
      'rgba(99, 102, 241, 0.6)',
      'rgba(220, 38, 38, 0.6)',
      'rgba(5, 150, 105, 0.6)',
      'rgba(202, 138, 4, 0.6)',
      'rgba(217, 70, 239, 0.6)',
      'rgba(20, 184, 166, 0.6)',
      'rgba(239, 68, 68, 0.6)',
    ];

    const chartData = {
      labels: Object.keys(buttonCounts),
      datasets: [
        {
          label: 'Clicks per Button',
          data: Object.values(buttonCounts),
          backgroundColor: colors.slice(0, Object.keys(buttonCounts).length),
          borderColor: colors.map(color => color.replace('0.6', '1')),
          borderWidth: 1
        }
      ]
    };

    console.log('Chart data - final:', chartData);
    return chartData;
  };

  const analyticsData = getAnalyticsData ? getAnalyticsData() : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 gap-2 mb-4">
            <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
            <button 
              onClick={() => {
                fetchData();
                fetchAllClicksForAnalytics();
              }}
              className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded-full transition-colors self-start sm:self-center"
              title="Refresh Analytics"
              disabled={analyticsLoading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          <p className="text-gray-200 mb-4">Visual insights into guest interactions</p>
          
          <div className="w-full max-w-xs">
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
          <div className="w-full max-w-xs">
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
                    <div className="relative">
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
                  </div>
                  <div>
                    <label htmlFor="analytics-end-date" className="block text-sm font-medium text-gray-300 mb-1">
                      To Date
                    </label>
                    <div className="relative">
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
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="bg-gray-800 p-3 sm:p-4 rounded-lg border border-gray-700 min-w-[120px]">
            <p className="text-sm text-gray-200">Filtered Clicks</p>
            <p className="text-xl font-semibold text-white">{analyticsData.length}</p>
          </div>
          <div className="bg-gray-800 p-3 sm:p-4 rounded-lg border border-gray-700 min-w-[120px]">
            <p className="text-sm text-gray-200">Total Clicks</p>
            <p className="text-xl font-semibold text-white">{total}</p>
          </div>
        </div>
      </div>

      {analyticsLoading ? (
        <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-200">Loading analytics data...</p>
        </div>
      ) : analyticsData.length > 0 ? (
        <div className="space-y-6">
          <div className="bg-gray-800 p-4 sm:p-6 rounded-xl border border-gray-700">
            <h2 className="text-lg font-medium text-white mb-4">Engagements - Bar Chart</h2>
            <div className="bg-gray-800 p-3 sm:p-4 rounded-lg h-64 sm:h-80">
              <Bar
                data={getChartData()}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { 
                      position: 'top',
                      labels: { 
                        color: 'white',
                        font: {
                          size: window.innerWidth < 640 ? 10 : 12
                        }
                      }
                    },
                    title: { 
                      display: true, 
                      text: 'Clicks per Button',
                      color: 'white',
                      font: {
                        size: window.innerWidth < 640 ? 14 : 16
                      }
                    }
                  },
                  scales: {
                    y: { 
                      beginAtZero: true, 
                      title: { 
                        display: true, 
                        text: 'Number of Clicks',
                        color: 'white',
                        font: {
                          size: window.innerWidth < 640 ? 10 : 12
                        }
                      },
                      ticks: { 
                        color: 'white',
                        font: {
                          size: window.innerWidth < 640 ? 10 : 12
                        }
                      },
                      grid: { color: 'rgba(255,255,255,0.1)' }
                    },
                    x: { 
                      title: { 
                        display: true, 
                        text: 'Button',
                        color: 'white',
                        font: {
                          size: window.innerWidth < 640 ? 10 : 12
                        }
                      },
                      ticks: { 
                        color: 'white',
                        font: {
                          size: window.innerWidth < 640 ? 10 : 12
                        },
                        maxRotation: 45,
                        minRotation: 45
                      },
                      grid: { color: 'rgba(255,255,255,0.1)' }
                    }
                  }
                }}
                height={300}
              />
            </div>
          </div>

          <div className="bg-gray-800 p-4 sm:p-6 rounded-xl border border-gray-700">
            <h2 className="text-lg font-medium text-white mb-4">Click Distribution - Pie Chart</h2>
            <div className="bg-gray-800 p-3 sm:p-4 rounded-lg h-64 sm:h-80">
              <Pie
                data={getChartData()}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { 
                      position: window.innerWidth < 640 ? 'bottom' : 'right',
                      labels: { 
                        color: 'white',
                        padding: 15,
                        boxWidth: 12,
                        font: {
                          size: window.innerWidth < 640 ? 10 : 12
                        }
                      }
                    },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          const label = context.label || '';
                          const value = context.raw || 0;
                          const total = context.dataset.data.reduce((a, b) => a + b, 0);
                          const percentage = Math.round((value / total) * 100);
                          return `${label}: ${value} (${percentage}%)`;
                        }
                      }
                    }
                  }
                }}
                height={300}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-800 p-6 sm:p-8 rounded-xl border border-gray-700 text-center">
          <p className="text-gray-200">No data available for analytics{selectedCategory !== 'all' ? ` in ${selectedCategory}` : ''}{timeFilter !== 'all' ? ` for this ${timeFilter}` : ''}</p>
          <p className="text-gray-400 text-sm mt-2">Total clicks in system: {total}</p>
        </div>
      )}
    </div>
  );
};

export default AnalyticsSection;