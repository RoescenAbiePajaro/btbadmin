// src/components/AdminDashboard.jsx
import React, { useEffect, useState } from 'react';
import { FiMenu } from 'react-icons/fi';
import Sidebar from './Sidebar';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import Toast from './Toast';
import AdminAccessCode from './AdminAccessCode';
import GuestClicksSection from './GuestClicksSection';
import AnalyticsSection from './AnalyticsSection';
import clickCategories from '../config/clickCategories';

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
    console.log('Delete confirm called with:', { deleteMode, clickToDelete });
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('token');
      console.log('Token exists:', !!token);
      
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

      console.log('Making DELETE request to:', url);
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Delete error response:', errorData);
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
      setClickToDelete(null);
      setDeleteMode(null);
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
    if (!id) {
      showToastMessage('Invalid click ID', 'error');
      return;
    }
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

  const handleExportCSV = async () => {
    try {
      showToastMessage('Preparing CSV export...', 'info');
      
      const token = localStorage.getItem('token');
      if (!token) {
        showToastMessage('Your session has expired. Please log in again.', 'error');
        setTimeout(() => onLogout(), 2000);
        return;
      }

      // Fetch all data with current filters
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
        throw new Error(errorData.message || 'Failed to fetch data for export');
      }

      const data = await res.json();
      let allClicksData = data.clicks || [];

      // Apply time filter client-side if needed (for today, week, month, year)
      if (timeFilter !== 'all' && timeFilter !== 'custom') {
        allClicksData = filterByTime(allClicksData);
      }

      if (allClicksData.length === 0) {
        showToastMessage('No data to export', 'info');
        return;
      }

      // Export with all available fields
      const headers = [
        'Button',
        'Page',
        'Device Type',
        'Browser',
        'IP Address',
        'Timestamp',
        'Date & Time',
        'User Agent',
        'ID'
      ];

      const csvContent = [
        headers.join(','),
        ...allClicksData.map(click => [
          `"${(click.button || '').replace(/"/g, '""')}"`,
          `"${(click.page || '').replace(/"/g, '""')}"`,
          `"${(click.deviceType || 'Unknown').replace(/"/g, '""')}"`,
          `"${(click.browser || 'Unknown').replace(/"/g, '""')}"`,
          `"${(click.ipAddress || 'Not available').replace(/"/g, '""')}"`,
          `"${new Date(click.timestamp).toISOString()}"`,
          `"${new Date(click.timestamp).toLocaleString()}"`,
          `"${(click.userAgent || 'Not available').replace(/"/g, '""')}"`,
          `"${click._id || ''}"`
        ].join(','))
      ].join('\n');

      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
      const filename = `guest_activity_data_${timestamp}.csv`;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

      if (window.navigator && typeof window.navigator.msSaveOrOpenBlob === 'function') {
        // Fallback for legacy browsers (IE, old Edge)
        window.navigator.msSaveOrOpenBlob(blob, filename);
      } else {
        const urlBlob = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = urlBlob;
        link.download = filename;
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(urlBlob);
      }
      
      showToastMessage(`CSV exported successfully with ${allClicksData.length} records`, 'success');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      showToastMessage(error.message || 'Failed to export CSV', 'error');
    }
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
          <AnalyticsSection
            analyticsLoading={analyticsLoading}
            getAnalyticsData={getAnalyticsData}
            total={total}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            timeFilter={timeFilter}
            setTimeFilter={setTimeFilter}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            fetchData={fetchData}
            fetchAllClicksForAnalytics={fetchAllClicksForAnalytics}
            allClicks={allClicks}
          />
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