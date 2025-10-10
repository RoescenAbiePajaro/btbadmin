import React, { useEffect, useState } from 'react';
import { FiLogOut, FiUsers, FiBarChart2, FiChevronLeft, FiChevronRight, FiTrash2, FiMenu, FiX } from 'react-icons/fi';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function AdminDashboard({ onLogout, userData }) {
  const [clicks, setClicks] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [activeNav, setActiveNav] = useState('analytics');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteMode, setDeleteMode] = useState(null);
  const [clickToDelete, setClickToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const limit = 10;

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

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found in localStorage');
        alert('Please log in again');
        onLogout();
        return;
      }

      const res = await fetch(`http://localhost:5000/api/clicks?page=${page}&limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error('Fetch error:', errorData);
        throw new Error(`Failed to fetch data: ${errorData.message || res.statusText}`);
      }

      const data = await res.json();
      console.log('Fetched data:', data);
      setClicks(data.clicks || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Error fetching data:', error);
      setClicks([]);
      setTotal(0);
      alert('Failed to fetch click data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page]);

  const totalPages = Math.ceil(total / limit);

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in again');
        onLogout();
        return;
      }

      let url;
      if (deleteMode === 'single') {
        url = `http://localhost:5000/api/clicks/${clickToDelete}`;
      } else {
        url = 'http://localhost:5000/api/clicks';
      }

      console.log(`Deleting ${deleteMode} with URL:`, url);

      const res = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const responseData = await res.json();
      console.log('Delete response:', responseData);

      if (!res.ok) {
        throw new Error(responseData.message || `Failed to delete ${deleteMode === 'single' ? 'click' : 'all clicks'}`);
      }

      alert(responseData.message || `${deleteMode === 'single' ? 'Click' : 'All clicks'} deleted successfully`);
      
      await fetchData();
      setShowDeleteModal(false);
      setClickToDelete(null);
      setDeleteMode(null);
      
    } catch (error) {
      console.error(`Error deleting ${deleteMode === 'single' ? 'click' : 'all clicks'}:`, error);
      alert(error.message || `Failed to delete ${deleteMode === 'single' ? 'click' : 'all clicks'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAll = () => {
    if (total === 0) {
      alert('No clicks to delete');
      return;
    }
    setDeleteMode('all');
    setShowDeleteModal(true);
  };

  const handleDeleteClick = (clickId) => {
    console.log('Attempting to delete click with ID:', clickId);
    if (!clickId) {
      alert('Invalid click ID');
      return;
    }
    setDeleteMode('single');
    setClickToDelete(clickId);
    setShowDeleteModal(true);
  };

  const getChartData = () => {
    const buttonCounts = clicks.reduce((acc, click) => {
      acc[click.button] = (acc[click.button] || 0) + 1;
      return acc;
    }, {});

    return {
      labels: Object.keys(buttonCounts),
      datasets: [
        {
          label: 'Clicks per Button',
          data: Object.values(buttonCounts),
          backgroundColor: 'rgba(99, 102, 241, 0.6)',
          borderColor: 'rgba(99, 102, 241, 1)',
          borderWidth: 1
        }
      ]
    };
  };

  const handleNavClick = (nav) => {
    setActiveNav(nav);
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  // Analytics Component
  const AnalyticsSection = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
          <p className="text-gray-200">Visual insights into guest interactions</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <p className="text-sm text-gray-200">Total Clicks</p>
            <p className="text-xl font-semibold text-white">{total}</p>
          </div>
        </div>
      </div>

      {clicks.length > 0 ? (
        <div className="bg-gray-800 p-4 sm:p-6 rounded-xl border border-gray-700">
          <h2 className="text-lg font-medium text-white mb-4">Engagements</h2>
          <div className="bg-gray-800 p-3 sm:p-4 rounded-lg">
            <Bar
              data={getChartData()}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { 
                    position: 'top',
                    labels: { color: 'white' }
                  },
                  title: { 
                    display: true, 
                    text: 'Clicks per Button',
                    color: 'white'
                  }
                },
                scales: {
                  y: { 
                    beginAtZero: true, 
                    title: { 
                      display: true, 
                      text: 'Number of Clicks',
                      color: 'white'
                    },
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                  },
                  x: { 
                    title: { 
                      display: true, 
                      text: 'Button',
                      color: 'white'
                    },
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                  }
                }
              }}
              height={300}
            />
          </div>
        </div>
      ) : (
        <div className="bg-gray-800 p-6 sm:p-8 rounded-xl border border-gray-700 text-center">
          <p className="text-gray-200">No data available for analytics</p>
        </div>
      )}
    </div>
  );

  // Guest Clicks Component
  const GuestClicksSection = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Guest Click Activity</h1>
          <p className="text-gray-200">Detailed view of all guest interactions</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <p className="text-sm text-gray-200">Total Clicks</p>
            <p className="text-xl font-semibold text-white">{total}</p>
          </div>
          <button
            onClick={handleDeleteAll}
            className="flex items-center space-x-2 px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-900 hover:bg-opacity-20 transition-colors"
            disabled={total === 0 || isLoading}
          >
            <FiTrash2 size={16} />
            <span className="hidden sm:inline">Delete All</span>
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
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Button</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Page</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date & Time</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider hidden sm:table-cell">ID</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  {clicks.length > 0 ? (
                    clicks.map((click, idx) => (
                      <tr key={click._id || idx} className="hover:bg-gray-750 transition-colors">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-900 text-blue-200">
                            {click.button}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-200">{click.page}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-400">
                          {new Date(click.timestamp).toLocaleString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300 hidden sm:table-cell">
                          {click._id ? click._id.substring(0, 8) + '...' : 'No ID'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
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
                        No click data available
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
                    Showing <span className="font-medium text-white">{(page - 1) * limit + 1}</span> to{' '}
                    <span className="font-medium text-white">{Math.min(page * limit, total)}</span> of{' '}
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
          </>
        )}
      </div>
    </div>
  );

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
        </nav>
        
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center p-3 bg-gray-800 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-blue-900 bg-opacity-50 flex items-center justify-center text-blue-300 font-semibold border border-blue-700">
              {userData?.username?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-white">{userData?.username || 'Admin'}</p>
              <p className="text-xs text-gray-500">Administrator</p>
            </div>
          </div>
          
          <button
            onClick={onLogout}
            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-900 hover:bg-opacity-20 rounded-lg transition-colors border border-red-800 hover:border-red-700"
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
            {activeNav === 'analytics' ? 'Analytics' : 'Guest Activity'}
          </h1>
          <div className="w-8"></div> {/* Spacer for balance */}
        </div>

        {activeNav === 'analytics' ? <AnalyticsSection /> : <GuestClicksSection />}

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
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setClickToDelete(null);
                    setDeleteMode(null);
                  }}
                  className="px-4 py-2 border border-gray-600 rounded-md text-gray-300 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-900 transition-colors"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 focus:ring-offset-gray-900 disabled:opacity-50 transition-colors"
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}