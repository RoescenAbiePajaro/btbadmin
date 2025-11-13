import { useState, useEffect, useCallback } from 'react';
import { exportToCSV } from '../utils/exportUtils';
import clickCategories from '../../config/clickCategories';

export const useClicksData = ({ showToastMessage, activeNav }) => {
  const [clicks, setClicks] = useState([]);
  const [allClicks, setAllClicks] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteMode, setDeleteMode] = useState(null);
  const [clickToDelete, setClickToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const limit = 10;

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToastMessage('Your session has expired. Please log in again.', 'error');
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
        throw new Error(errorData.message || 'Failed to fetch data');
      }

      const data = await res.json();
      setClicks(data.clicks || []);
      setTotal(data.total || 0);
    } catch (error) {
      showToastMessage(error.message || 'Failed to fetch click data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [page, selectedCategory, timeFilter, startDate, endDate, showToastMessage]);

  const fetchAllClicksForAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

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

      if (!res.ok) throw new Error('Failed to fetch analytics data');
      
      const data = await res.json();
      setAllClicks(data.clicks || []);
    } catch (error) {
      showToastMessage(error.message, 'error');
    } finally {
      setAnalyticsLoading(false);
    }
  }, [selectedCategory, timeFilter, startDate, endDate, showToastMessage]);

  const handleDeleteClick = (id) => {
    setDeleteMode('single');
    setClickToDelete(id);
    setShowDeleteModal(true);
  };

  const handleDeleteAll = () => {
    if (total === 0) {
      showToastMessage('No data available to delete', 'info');
      return;
    }
    setDeleteMode('all');
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Session expired');

      let url;
      if (deleteMode === 'single') {
        url = `https://btbsitess.onrender.com/api/clicks/${clickToDelete}`;
      } else {
        url = 'https://btbsitess.onrender.com/api/clicks';
      }

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to delete data');

      const successMessage = deleteMode === 'single' 
        ? 'Click data deleted successfully' 
        : 'All click data deleted successfully';
      
      showToastMessage(successMessage, 'success');
      await fetchData();
      if (activeNav === 'analytics') await fetchAllClicksForAnalytics();
    } catch (error) {
      showToastMessage(error.message, 'error');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      await exportToCSV({ selectedCategory, timeFilter, startDate, endDate, showToastMessage });
    } catch (error) {
      showToastMessage(error.message, 'error');
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (activeNav === 'analytics') {
      fetchAllClicksForAnalytics();
    }
  }, [activeNav, fetchAllClicksForAnalytics]);

  return {
    clicksData: {
      clicks,
      total,
      totalPages: Math.ceil(total / limit),
      page,
      setPage,
      selectedCategory,
      setSelectedCategory,
      timeFilter,
      setTimeFilter,
      startDate,
      setStartDate,
      endDate,
      setEndDate
    },
    analyticsData: allClicks,
    isLoading,
    analyticsLoading,
    fetchData,
    fetchAllClicksForAnalytics,
    handleDeleteClick,
    handleDeleteAll,
    handleExportCSV,
    showDeleteModal,
    setShowDeleteModal,
    deleteMode,
    isDeleting,
    handleDeleteConfirm
  };
};