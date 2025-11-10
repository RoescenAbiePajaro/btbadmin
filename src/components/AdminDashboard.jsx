//src/components/AdminDashboard.jsx
import React, { useEffect, useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiTrash2, FiMenu, FiDownload, FiCalendar } from 'react-icons/fi';
import { Bar, Pie } from 'react-chartjs-2';
import Sidebar from './Sidebar';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import Toast from './Toast';
import AdminAccessCode from './AdminAccessCode';
import GuestClicksSection from './GuestClicksSection';
import clickCategories from '../config/clickCategories';
import ChartJS from '../config/chartConfig';
export default function AdminDashboard({ onLogout, userData }) {
  const [clicks, setClicks] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [activeNav, setActiveNav] = useState('analytics');
  const [showAccessCodes, setShowAccessCodes] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteMode, setDeleteMode] = useState(null);
  const [clickToDelete, setClickToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('info');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [allClicks, setAllClicks] = useState([]); // Store all clicks for analytics
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const limit = 10;

  const showToastMessage = (message, type = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  // Check screen size and handle responsiveness
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsSidebarOpen(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Prevent browser back button and direct access
  useEffect(() => {
    const handleBackButton = (e) => {
      window.history.pushState(null, null, window.location.href);
    };

    window.history.pushState(null, null, window.location.href);
    window.addEventListener('popstate', handleBackButton);

    return () => {
      window.removeEventListener('popstate', handleBackButton);
    };
  }, [onLogout]);

  // Additional protection on page load
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      showToastMessage('Session expired. Please log in again.', 'error');
      setTimeout(() => onLogout(), 2000);
      return;
    }
  }, [onLogout]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found in localStorage');
        showToastMessage('Your session has expired. Please log in again.', 'error');
        setTimeout(() => onLogout(), 2000);
        return;
      }

      let url = `https://btbsitess.onrender.com/api/clicks?page=${page}&limit=${limit}`;
      if (selectedCategory !== 'all') {
        const categoryButtons = clickCategories[selectedCategory]?.map(item => item.button) || [];
        url += `&buttons=${categoryButtons.join(',')}`;
      }
      
      if (timeFilter === 'custom' && startDate && endDate) {
        url += `&startDate=${new Date(startDate).toISOString()}&endDate=${new Date(endDate).toISOString()}`;
      }

      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error('Fetch error:', errorData);
        throw new Error(errorData.message || 'Failed to fetch data');
      }

      const data = await res.json();
      console.log('Fetched data:', data);
      setClicks(data.clicks || []);
      setTotal(data.total || 0);
      if (data.clicks?.length === 0) {
        showToastMessage('No data available', 'info');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setClicks([]);
      setTotal(0);
      showToastMessage(error.message || 'Failed to fetch click data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllClicksForAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found in localStorage');
        return;
      }

      let url = 'https://btbsitess.onrender.com/api/clicks?page=1&limit=10000';
      if (selectedCategory !== 'all') {
        const categoryButtons = clickCategories[selectedCategory]?.map(item => item.button) || [];
        url += `&buttons=${categoryButtons.join(',')}`;
      }
      
      if (timeFilter === 'custom' && startDate && endDate) {
        url += `&startDate=${new Date(startDate).toISOString()}&endDate=${new Date(endDate).toISOString()}`;
      }

      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error('Analytics fetch error:', errorData);
        throw new Error(errorData.message || 'Failed to fetch analytics data');
      }

      const data = await res.json();
      setAllClicks(data.clicks || []);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      setAllClicks([]);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, selectedCategory, timeFilter, startDate, endDate]);

  useEffect(() => {
    if (activeNav === 'analytics') {
      fetchAllClicksForAnalytics();
    }
  }, [activeNav, selectedCategory, timeFilter, startDate, endDate]);

  // Reset to first page when category or time filter changes
  useEffect(() => {
    if (page !== 1) {
      setPage(1);
    }
    
    if (timeFilter !== 'custom') {
      setStartDate('');
      setEndDate('');
    }
  }, [selectedCategory, timeFilter]);

  const filterByTime = (clicks) => {
    const normalizeDate = (date) => {
      const d = new Date(date);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    };

    const now = new Date();
    const today = normalizeDate(now);
    const firstDayOfWeek = new Date(today);
    firstDayOfWeek.setDate(today.getDate() - today.getDay());
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayOfYear = new Date(now.getFullYear(), 0, 1);

    return clicks.filter(click => {
      const clickDate = normalizeDate(click.timestamp);
      
      switch(timeFilter) {
        case 'today':
          return clickDate.getTime() === today.getTime();
        case 'week':
          return clickDate >= firstDayOfWeek && clickDate <= today;
        case 'month':
          return clickDate >= firstDayOfMonth && clickDate <= today;
        case 'year':
          return clickDate >= firstDayOfYear && clickDate <= today;
        case 'custom':
          if (!startDate || !endDate) return true;
          const start = normalizeDate(startDate);
          const end = normalizeDate(endDate);
          end.setHours(23, 59, 59, 999);
          return clickDate >= start && clickDate <= end;
        default:
          return true;
      }
    });
  };

  const getFilteredClicks = () => {
    let filtered = [...clicks];
    if (timeFilter !== 'all') {
      filtered = filterByTime(filtered);
    }
    return filtered;
  };

  const getAnalyticsData = () => {
    if (timeFilter === 'all') return allClicks;
    return filterByTime(allClicks);
  };

  const totalPages = Math.ceil(total / limit);

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToastMessage('Your session has expired. Please log in again.', 'error');
        setTimeout(() => onLogout(), 2000);
        return;
      }

      let url;
      if (deleteMode === 'single') {
        url = `https://btbsitess.onrender.com/api/clicks/${clickToDelete}`;
      } else {
        url = 'https://btbsitess.onrender.com/api/clicks';
      }

      console.log(`Deleting ${deleteMode} with URL:`, url);
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete data');
      }

      const successMessage = deleteMode === 'single' 
        ? 'Click data deleted successfully' 
        : 'All click data deleted successfully';
      showToastMessage(successMessage, 'success');
      
      await fetchData();
      if (activeNav === 'analytics') {
        await fetchAllClicksForAnalytics();
      }
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Error deleting data:', error);
      showToastMessage(error.message || 'Failed to delete data', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAll = () => {
    if (total === 0) {
      showToastMessage('No data available to delete', 'info');
      return;
    }
    setDeleteMode('all');
    setShowDeleteModal(true);
  };

  const handleDeleteClick = (id) => {
    setDeleteMode('single');
    setClickToDelete(id);
    setShowDeleteModal(true);
  };

  const handleNavClick = (nav) => {
    setActiveNav(nav);
    setShowAccessCodes(nav === 'access-codes');
    if (isMobile) {
      setIsSidebarOpen(false);
    }
    if (nav === 'analytics') {
      fetchAllClicksForAnalytics();
    }
  };

  const handleLogout = () => {
    onLogout();
  };

  const handleExportCSV = () => {
    const filteredClicks = getFilteredClicks();
    if (filteredClicks.length === 0) {
      showToastMessage('No data to export', 'info');
      return;
    }

    const headers = ['Button', 'Page', 'Timestamp', 'ID'];
    const csvContent = [
      headers.join(','),
      ...filteredClicks.map(click => [
        `"${click.button}"`,
        `"${click.page}"`,
        `"${new Date(click.timestamp).toISOString()}"`,
        `"${click._id}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')
    link.setAttribute('href', url);
    link.setAttribute('download', `click_data_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToastMessage('CSV export started', 'success');
  };

  // Analytics Component (Integrated back into AdminDashboard)
  const AnalyticsSection = () => {
    const analyticsData = getAnalyticsData();
    
    const getChartData = () => {
      const buttonCounts = analyticsData.reduce((acc, click) => {
        acc[click.button] = (acc[click.button] || 0) + 1;
        return acc;
      }, {});

      const colors = [
        'rgba(99, 102, 241, 0.6)',
        'rgba(220, 38, 38, 0.6)',
        'rgba(5, 150, 105, 0.6)',
        'rgba(202, 138, 4, 0.6)',
        'rgba(217, 70, 239, 0.6)',
        'rgba(20, 184, 166, 0.6)',
        'rgba(239, 68, 68, 0.6)',
      ];

      return {
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
    };

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

  return (
    <div className="min-h-screen bg-black text-gray-300 flex">
      <Sidebar 
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        activeNav={activeNav}
        handleNavClick={handleNavClick}
        userData={userData}
        handleLogout={handleLogout}
        isMobile={isMobile}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-black p-4 sm:p-6 md:p-8 min-h-screen">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between mb-6">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            <FiMenu size={20} className="text-white" />
          </button>
          <h1 className="text-xl font-bold text-white">
            {activeNav === 'analytics' ? 'Analytics' : activeNav === 'guests' ? 'Guest Activity' : 'Access Codes'}
          </h1>
          <div className="w-8"></div>
        </div>

        {activeNav === 'analytics' ? (
          <AnalyticsSection />
        ) : activeNav === 'guests' ? (
          <GuestClicksSection
            isLoading={isLoading}
            getFilteredClicks={getFilteredClicks}
            total={total}
            totalPages={totalPages}
            page={page}
            setPage={setPage}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            timeFilter={timeFilter}
            setTimeFilter={setTimeFilter}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            fetchData={fetchData}
            handleDeleteClick={handleDeleteClick}
            handleDeleteAll={handleDeleteAll}
            handleExportCSV={handleExportCSV}
            clicks={clicks}
          />
        ) : (
          <AdminAccessCode />
        )}

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          showModal={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setClickToDelete(null);
            setDeleteMode(null);
          }}
          onConfirm={handleDeleteConfirm}
          deleteMode={deleteMode}
          isDeleting={isDeleting}
        />

        {/* Toast Notification */}
        {showToast && (
          <Toast
            message={toastMessage}
            type={toastType}
            onClose={() => setShowToast(false)}
          />
        )}
      </main>
    </div>
  );
}