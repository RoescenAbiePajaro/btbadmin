import React, { useEffect, useState } from 'react';
import { FiLogOut, FiUsers, FiBarChart2, FiChevronLeft, FiChevronRight, FiTrash2, FiMenu, FiX, FiDownload, FiKey } from 'react-icons/fi';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import Toast from './Toast';
import AdminAccessCode from './AdminAccessCode';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

// Click categories
const clickCategories = {
  'Home Page': [
    { button: 'download', page: 'home_page' },
    { button: 'visit_link', page: 'home_page' }
  ],
  'Beyond The Brush Lite': [
    { button: 'btblite_enter', page: 'page_menu' },
    { button: 'btblite_exit', page: 'page_menu' },
    { button: 'btblite_download_image', page: 'toolbar_save' }
  ],
  'Beyond The Brush': [
    { button: 'btb_enter', page: 'beyondthebrush_app' },
    { button: 'btb_exit', page: 'beyondthebrush_app' },
    { button: 'save_canvas', page: 'virtual_painter' }
  ]
};

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
    // Set access flag when dashboard loads properly
    sessionStorage.setItem('dashboardAccess', 'true');
    
    // Prevent back button navigation
    const handleBackButton = (e) => {
      // Prevent the default back behavior
      window.history.pushState(null, null, window.location.href);
    };

    // Push current state to history to prevent back navigation
    window.history.pushState(null, null, window.location.href);
    window.addEventListener('popstate', handleBackButton);

    // Check if this is a direct access (new tab or direct URL)
    const checkDirectAccess = () => {
      const navigationEntry = performance.getEntriesByType('navigation')[0];
      const hasReferrer = document.referrer && document.referrer !== '';
      const isSameOriginReferrer = document.referrer.includes(window.location.origin);
      
      // If no referrer or referrer is not from same origin, it's direct access
      if ((!hasReferrer || !isSameOriginReferrer) && !sessionStorage.getItem('dashboardAccess')) {
        showToastMessage('Please access the dashboard through proper login', 'error');
        setTimeout(() => {
          onLogout();
        }, 2000);
      }
    };

    // Check access after a short delay to ensure component is mounted
    setTimeout(checkDirectAccess, 100);

    return () => {
      window.removeEventListener('popstate', handleBackButton);
      // Don't remove sessionStorage here to allow page refresh
    };
  }, [onLogout]);

  // Additional protection on page load
  useEffect(() => {
    // Check if user has proper access rights
    const token = localStorage.getItem('token');
    if (!token) {
      showToastMessage('Session expired. Please log in again.', 'error');
      setTimeout(() => onLogout(), 2000);
      return;
    }

    // Double-check access rights
    const dashboardAccess = sessionStorage.getItem('dashboardAccess');
    if (!dashboardAccess) {
      showToastMessage('Invalid access. Redirecting...', 'error');
      setTimeout(() => onLogout(), 2000);
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

      let url = `https://beyondthebrush.onrender.com/api/clicks?page=${page}&limit=${limit}`;
      if (selectedCategory !== 'all') {
        const categoryButtons = clickCategories[selectedCategory].map(item => item.button);
        url += `&buttons=${categoryButtons.join(',')}`;
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
        showToastMessage('No click data available', 'info');
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

      // Fetch all clicks without pagination for analytics
      let url = 'https://beyondthebrush.onrender.com/api/clicks?page=1&limit=10000'; // Large limit to get all
      if (selectedCategory !== 'all') {
        const categoryButtons = clickCategories[selectedCategory].map(item => item.button);
        url += `&buttons=${categoryButtons.join(',')}`;
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
  }, [page, selectedCategory]);

  useEffect(() => {
    if (activeNav === 'analytics') {
      fetchAllClicksForAnalytics();
    }
  }, [activeNav, selectedCategory]);

  // Reset to first page when category changes
  useEffect(() => {
    if (page !== 1) {
      setPage(1);
    }
  }, [selectedCategory]);

  const getFilteredClicks = () => {
    // Backend now handles filtering, so we just return the clicks as received
    return clicks;
  };

  const getAnalyticsData = () => {
    // Use allClicks for analytics calculations
    return allClicks;
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
        url = `https://beyondthebrush.onrender.com/api/clicks/${clickToDelete}`;
      } else {
        url = 'https://beyondthebrush.onrender.com/api/clicks';
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

      // Show success message
      const successMessage = deleteMode === 'single' 
        ? 'Click data deleted successfully' 
        : 'All click data deleted successfully';
      showToastMessage(successMessage, 'success');
      
      // Refresh data
      await fetchData();
      // Also refresh analytics data if we're on analytics page
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
      showToastMessage('No click data available to delete', 'info');
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

  const getChartData = () => {
    const analyticsData = getAnalyticsData();
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

  const handleNavClick = (nav) => {
    setActiveNav(nav);
    setShowAccessCodes(nav === 'access-codes');
    if (isMobile) {
      setIsSidebarOpen(false);
    }
    // Refresh data when switching to analytics
    if (nav === 'analytics') {
      fetchAllClicksForAnalytics();
    }
  };

  // Handle logout with cleanup
  const handleLogout = () => {
    // Clear session storage on logout
    sessionStorage.removeItem('dashboardAccess');
    onLogout();
  };

  const handleExportCSV = () => {
    if (clicks.length === 0) {
      showToastMessage('No data to export', 'info');
      return;
    }

    // Define CSV headers
    const headers = ['Button', 'Page', 'Timestamp', 'ID'];
    
    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...getFilteredClicks().map(click => [
        `"${click.button}"`,
        `"${click.page}"`,
        `"${new Date(click.timestamp).toISOString()}"`,
        `"${click._id}"`
      ].join(','))
    ].join('\n');

    // Create download link
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

  // Analytics Component
  const AnalyticsSection = () => (
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
              disabled={isLoading || analyticsLoading}
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
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="bg-gray-800 p-3 sm:p-4 rounded-lg border border-gray-700 min-w-[120px]">
            <p className="text-sm text-gray-200">Filtered Clicks</p>
            <p className="text-xl font-semibold text-white">{getAnalyticsData().length}</p>
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
      ) : getAnalyticsData().length > 0 ? (
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
          <p className="text-gray-200">No data available for analytics{selectedCategory !== 'all' ? ` in ${selectedCategory}` : ''}</p>
        </div>
      )}
    </div>
  );

  // Guest Clicks Component
  const GuestClicksSection = () => {
    const filteredClicks = getFilteredClicks();

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
            
            <div className="w-full max-w-xs">
              <label htmlFor="guest-category-filter" className="block text-sm font-medium text-gray-300 mb-2">
                Filter by Category:
              </label>
              <select
                id="guest-category-filter"
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
          </div>
          <div className="flex flex-col xs:flex-row gap-3">
            <button
              onClick={handleExportCSV}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white font-semibold text-sm hover:bg-green-700 rounded-lg transition-colors w-full xs:w-auto min-w-[120px]"
              disabled={getFilteredClicks().length === 0}
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
                    {getFilteredClicks().length > 0 ? (
                      getFilteredClicks().map((click, idx) => (
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
                          No click data available{selectedCategory !== 'all' ? ` for ${selectedCategory}` : ''}
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
                      Showing <span className="font-medium text-white">{getFilteredClicks().length > 0 ? (page - 1) * limit + 1 : 0}</span> to{' '}
                      <span className="font-medium text-white">{Math.min(page * limit, total)}</span> of{' '}
                      <span className="font-medium text-white">{total}</span> results
                      {selectedCategory !== 'all' && (
                        <span className="text-gray-500 ml-2">(filtered by {selectedCategory})</span>
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

  return (
    <div className="min-h-screen bg-black text-gray-300 flex">
      {/* Mobile Overlay */}
      {isSidebarOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        w-64 bg-gray-900 shadow-lg flex flex-col border-r border-gray-800
        transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden text-gray-400 hover:text-white"
          >
            <FiX size={24} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 pt-6 md:pt-4">
          <button 
            onClick={() => handleNavClick('analytics')}
            className={`flex items-center w-full p-3 rounded-lg transition-colors ${
              activeNav === 'analytics' 
                ? 'bg-blue-900 bg-opacity-50 text-blue-300 border border-blue-700' 
                : 'hover:bg-gray-800 text-gray-400 hover:text-gray-300'
            }`}
          >
            <FiBarChart2 className="mr-3" />
            <span>Analytics</span>
          </button>
          <button 
            onClick={() => handleNavClick('guests')}
            className={`flex items-center w-full p-3 rounded-lg transition-colors ${
              activeNav === 'guests' 
                ? 'bg-blue-900 bg-opacity-50 text-blue-300 border border-blue-700' 
                : 'hover:bg-gray-800 text-gray-400 hover:text-gray-300'
            }`}
          >
            <FiUsers className="mr-3" />
            <span>Guest Activity</span>
          </button>
          <button 
            onClick={() => handleNavClick('access-codes')}
            className={`flex items-center w-full p-3 rounded-lg transition-colors ${
              activeNav === 'access-codes' 
                ? 'bg-blue-900 bg-opacity-50 text-blue-300 border border-blue-700' 
                : 'hover:bg-gray-800 text-gray-400 hover:text-gray-300'
            }`}
          >
            <FiKey className="mr-3" />
            <span>Access Codes</span>
          </button>
        </nav>
        
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center p-3 bg-gray-800 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-blue-900 bg-opacity-50 flex items-center justify-center text-blue-300 font-semibold border border-blue-700">
              {userData?.username?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="ml-3 flex flex-col">
              <p className="text-sm font-medium text-white">{userData?.username || 'Admin'}</p>
              <p className="text-xs text-gray-500 mt-0.5">Administrator</p>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white py-2 px-6 rounded-lg font-semibold text-sm mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 hover:bg-red-700 rounded-lg transition-colors"
          >
            <FiLogOut size={16} />
            Log out
          </button>
        </div>
      </aside>

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
          <div className="w-8"></div> {/* Spacer for balance */}
        </div>

        {activeNav === 'analytics' ? (
          <AnalyticsSection />
        ) : activeNav === 'guests' ? (
          <GuestClicksSection />
        ) : (
          <AdminAccessCode />
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
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
                  onClick={() => {
                    setShowDeleteModal(false);
                    setClickToDelete(null);
                    setDeleteMode(null);
                  }}
                  className="px-4 py-2 rounded-md text-gray-300 hover:bg-gray-700 transition-colors order-2 sm:order-1"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 focus:ring-offset-gray-900 disabled:opacity-50 transition-colors order-1 sm:order-2"
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

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