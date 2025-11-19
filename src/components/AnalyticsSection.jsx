// src/components/AnalyticsSection.jsx
import React from 'react';
import { FiCalendar, FiRefreshCw } from 'react-icons/fi';
import { Bar, Pie, Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import clickCategories from '../config/clickCategories';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

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
  allClicks
}) => {
  const analyticsData = getAnalyticsData ? getAnalyticsData() : [];

  // Chart color schemes
  const chartColors = {
    primary: [
      'rgba(99, 102, 241, 0.8)',
      'rgba(220, 38, 38, 0.8)',
      'rgba(5, 150, 105, 0.8)',
      'rgba(202, 138, 4, 0.8)',
      'rgba(217, 70, 239, 0.8)',
      'rgba(20, 184, 166, 0.8)',
      'rgba(239, 68, 68, 0.8)',
      'rgba(124, 58, 237, 0.8)',
      'rgba(14, 165, 233, 0.8)',
      'rgba(34, 197, 94, 0.8)',
    ],
    light: [
      'rgba(99, 102, 241, 0.6)',
      'rgba(220, 38, 38, 0.6)',
      'rgba(5, 150, 105, 0.6)',
      'rgba(202, 138, 4, 0.6)',
      'rgba(217, 70, 239, 0.6)',
      'rgba(20, 184, 166, 0.6)',
      'rgba(239, 68, 68, 0.6)',
    ]
  };

  // Device Distribution Chart
  const DeviceDistributionChart = () => {
    const deviceData = analyticsData.reduce((acc, click) => {
      const deviceType = click.deviceType || 'Unknown';
      let deviceCategory = 'Unknown';
      
      if (deviceType.toLowerCase().includes('mobile')) deviceCategory = 'Mobile';
      else if (deviceType.toLowerCase().includes('tablet')) deviceCategory = 'Tablet';
      else if (deviceType.toLowerCase().includes('laptop') || deviceType.toLowerCase().includes('desktop')) deviceCategory = 'Desktop/Laptop';
      else deviceCategory = deviceType;
      
      acc[deviceCategory] = (acc[deviceCategory] || 0) + 1;
      return acc;
    }, {});

    const data = {
      labels: Object.keys(deviceData),
      datasets: [
        {
          data: Object.values(deviceData),
          backgroundColor: chartColors.primary.slice(0, Object.keys(deviceData).length),
          borderColor: chartColors.primary.map(color => color.replace('0.8', '1')),
          borderWidth: 2
        }
      ]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: 'white',
            font: { size: 11 }
          }
        }
      }
    };

    return (
      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
        <h3 className="text-lg font-medium text-white mb-4">Device Distribution</h3>
        <div className="h-64">
          <Pie data={data} options={options} />
        </div>
      </div>
    );
  };

  // User Engagement Chart (Clicks over time)
  const UserEngagementChart = () => {
    const engagementData = analyticsData.reduce((acc, click) => {
      const date = new Date(click.timestamp).toLocaleDateString();
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    const sortedDates = Object.keys(engagementData).sort((a, b) => new Date(a) - new Date(b));

    const data = {
      labels: sortedDates,
      datasets: [
        {
          label: 'Daily Clicks',
          data: sortedDates.map(date => engagementData[date]),
          borderColor: 'rgba(99, 102, 241, 1)',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          tension: 0.4,
          fill: true
        }
      ]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: 'white' }
        }
      },
      scales: {
        x: {
          ticks: { color: 'white' },
          grid: { color: 'rgba(255,255,255,0.1)' }
        },
        y: {
          ticks: { color: 'white' },
          grid: { color: 'rgba(255,255,255,0.1)' }
        }
      }
    };

    return (
      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
        <h3 className="text-lg font-medium text-white mb-4">User Engagement Over Time</h3>
        <div className="h-64">
          <Line data={data} options={options} />
        </div>
      </div>
    );
  };

  // Hourly Activity Chart
  const HourlyActivityChart = () => {
    const hourlyData = analyticsData.reduce((acc, click) => {
      const hour = new Date(click.timestamp).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {});

    // Fill in missing hours
    const completeHourlyData = Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour}:00`,
      count: hourlyData[hour] || 0
    }));

    const data = {
      labels: completeHourlyData.map(item => item.hour),
      datasets: [
        {
          label: 'Clicks per Hour',
          data: completeHourlyData.map(item => item.count),
          backgroundColor: 'rgba(20, 184, 166, 0.8)',
          borderColor: 'rgba(20, 184, 166, 1)',
          borderWidth: 1
        }
      ]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: 'white' }
        }
      },
      scales: {
        x: {
          ticks: { 
            color: 'white',
            maxRotation: 45
          },
          grid: { color: 'rgba(255,255,255,0.1)' }
        },
        y: {
          ticks: { color: 'white' },
          grid: { color: 'rgba(255,255,255,0.1)' }
        }
      }
    };

    return (
      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
        <h3 className="text-lg font-medium text-white mb-4">Hourly Activity</h3>
        <div className="h-64">
          <Bar data={data} options={options} />
        </div>
      </div>
    );
  };

  // Daily Activity Chart
  const DailyActivityChart = () => {
    const dailyData = analyticsData.reduce((acc, click) => {
      const day = new Date(click.timestamp).toLocaleDateString('en-US', { weekday: 'long' });
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {});

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const completeDailyData = days.map(day => ({
      day,
      count: dailyData[day] || 0
    }));

    const data = {
      labels: completeDailyData.map(item => item.day),
      datasets: [
        {
          label: 'Clicks per Day',
          data: completeDailyData.map(item => item.count),
          backgroundColor: 'rgba(217, 70, 239, 0.8)',
          borderColor: 'rgba(217, 70, 239, 1)',
          borderWidth: 1
        }
      ]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: 'white' }
        }
      },
      scales: {
        x: {
          ticks: { 
            color: 'white',
            maxRotation: 45
          },
          grid: { color: 'rgba(255,255,255,0.1)' }
        },
        y: {
          ticks: { color: 'white' },
          grid: { color: 'rgba(255,255,255,0.1)' }
        }
      }
    };

    return (
      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
        <h3 className="text-lg font-medium text-white mb-4">Daily Activity</h3>
        <div className="h-64">
          <Bar data={data} options={options} />
        </div>
      </div>
    );
  };

  // Category Performance Chart
  const CategoryPerformanceChart = () => {
    const categoryData = analyticsData.reduce((acc, click) => {
      // Find which category this button belongs to
      let categoryName = 'Others';
      Object.entries(clickCategories).forEach(([category, buttons]) => {
        if (buttons.some(btn => btn.button === click.button)) {
          categoryName = category;
        }
      });
      acc[categoryName] = (acc[categoryName] || 0) + 1;
      return acc;
    }, {});

    const data = {
      labels: Object.keys(categoryData),
      datasets: [
        {
          label: 'Clicks per Category',
          data: Object.values(categoryData),
          backgroundColor: chartColors.light,
          borderColor: chartColors.light.map(color => color.replace('0.6', '1')),
          borderWidth: 1
        }
      ]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: 'white' }
        }
      },
      scales: {
        x: {
          ticks: { 
            color: 'white',
            maxRotation: 45
          },
          grid: { color: 'rgba(255,255,255,0.1)' }
        },
        y: {
          ticks: { color: 'white' },
          grid: { color: 'rgba(255,255,255,0.1)' }
        }
      }
    };

    return (
      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
        <h3 className="text-lg font-medium text-white mb-4">Category Performance</h3>
        <div className="h-64">
          <Bar data={data} options={options} />
        </div>
      </div>
    );
  };

  ////////////////////////////////////////////////////////////////////////

  // Button Engagement Chart
  const ButtonEngagementChart = () => {
    const buttonData = analyticsData.reduce((acc, click) => {
      acc[click.button] = (acc[click.button] || 0) + 1;
      return acc;
    }, {});

    // Sort buttons by engagement and take top 10
    const sortedButtons = Object.entries(buttonData)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    const data = {
      labels: sortedButtons.map(([button]) => button),
      datasets: [
        {
          label: 'Top 10 Buttons',
          data: sortedButtons.map(([,count]) => count),
          backgroundColor: chartColors.primary,
          borderColor: chartColors.primary.map(color => color.replace('0.8', '1')),
          borderWidth: 1
        }
      ]
    };

    const options = {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: 'white' }
        }
      },
      scales: {
        x: {
          ticks: { color: 'white' },
          grid: { color: 'rgba(255,255,255,0.1)' }
        },
        y: {
          ticks: { color: 'white' },
          grid: { color: 'rgba(255,255,255,0.1)' }
        }
      }
    };

    return (
      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
        <h3 className="text-lg font-medium text-white mb-4">Top Button Engagement</h3>
        <div className="h-64">
          <Bar data={data} options={options} />
        </div>
      </div>
    );
  };

  const handleRefresh = () => {
    fetchData();
    if (fetchAllClicksForAnalytics) {
      fetchAllClicksForAnalytics();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 gap-2 mb-4">
            <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
            <button 
              onClick={handleRefresh}
              className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded-full transition-colors self-start sm:self-center"
              title="Refresh Analytics"
              disabled={analyticsLoading}
            >
              <FiRefreshCw className={`h-5 w-5 ${analyticsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <p className="text-gray-200 mb-4">Visual insights into guest interactions</p>
          
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
                          handleRefresh();
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
          {/* Overview Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DeviceDistributionChart />
            <UserEngagementChart />
          </div>

          {/* Time-based Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <HourlyActivityChart />
            <DailyActivityChart />
          </div>

          {/* Performance Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CategoryPerformanceChart />
            <ButtonEngagementChart />
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