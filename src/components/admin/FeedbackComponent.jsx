// src/components/admin/FeedbackComponent.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FiMessageSquare,
  FiStar,
  FiSearch,
  FiSend,
  FiX,
  FiUsers,
  FiDownload
} from 'react-icons/fi';
import { ExportFeedback } from './ExportComponents.jsx';

export default function FeedbackComponent({
  feedbackStats: externalFeedbackStats,
  feedbackData: externalFeedbackData,
  feedbackLoading: externalFeedbackLoading,
  fetchFeedbackData,
  fetchFeedbackStats,
  fetchEducatorClassSummary,
  fetchAllClassCodes,
  fetchEducatorUsers,
  getSchoolName,
  educatorClassSummary,
  classCodes,
  educatorUsers,
  activeTab
}) {
  const [feedbackStats, setFeedbackStats] = useState(externalFeedbackStats);
  const [feedbackData, setFeedbackData] = useState(externalFeedbackData || []);
  const [feedbackLoading, setFeedbackLoading] = useState(externalFeedbackLoading || false);
  const [feedbackFilters, setFeedbackFilters] = useState({
    status: 'all',
    role: 'all',
    category: 'all',
    startDate: '',
    endDate: ''
  });
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [adminResponse, setAdminResponse] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [feedbackSearch, setFeedbackSearch] = useState('');
  const [feedbackCurrentPage, setFeedbackCurrentPage] = useState(1);
  const feedbackItemsPerPage = 10;

  // Get category color styling
  const getCategoryColor = (category) => {
    switch (category) {
      case 'bug':
        return 'bg-red-900 text-red-300';
      case 'feature':
        return 'bg-blue-900 text-blue-300';
      case 'suggestion':
      case 'improvement':
        return 'bg-green-900 text-green-300';
      case 'compliment':
        return 'bg-yellow-900 text-yellow-300';
      default:
        return 'bg-gray-700 text-gray-300';
    }
  };

  // Derive feedback school
  const deriveFeedbackSchool = (item) => {
    const raw = item?.school;
    if (raw) return getSchoolName(raw);
    if (item?.userRole === 'educator') {
      if (item.userId && educatorClassSummary?.[item.userId]?.school) {
        return getSchoolName(educatorClassSummary[item.userId].school);
      }
      if (item.userEmail) {
        const matchId = Object.keys(educatorUsers || {}).find(id => educatorUsers[id]?.email === item.userEmail);
        if (matchId && educatorUsers[matchId]?.school) {
          return getSchoolName(educatorUsers[matchId].school);
        }
      }
      const ecsEntry = Object.entries(educatorClassSummary || {}).find(([_, val]) => val?.email === item.userEmail || val?.fullName === item.userName);
      if (ecsEntry?.[1]?.school) {
        return getSchoolName(ecsEntry[1].school);
      }
      const clsMatch = classCodes.find(cls => cls.educator?.email === item.userEmail || cls.educator?.fullName === item.userName);
      if (clsMatch?.school) {
        return getSchoolName(clsMatch.school);
      }
    }
    return 'Not specified';
  };

  // Fetch feedback data
  const fetchFeedbackDataInternal = async () => {
    try {
      setFeedbackLoading(true);
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams();
      if (feedbackFilters.status !== 'all') params.append('status', feedbackFilters.status);
      if (feedbackFilters.role !== 'all') params.append('role', feedbackFilters.role);
      if (feedbackFilters.category !== 'all') params.append('category', feedbackFilters.category);
      if (feedbackFilters.startDate) params.append('startDate', feedbackFilters.startDate);
      if (feedbackFilters.endDate) params.append('endDate', feedbackFilters.endDate);
      
      const response = await axios.get(
        `https://btbtestservice.onrender.com/api/feedback/all?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data.success) {
        setFeedbackData(response.data.feedback);
      }
    } catch (error) {
      console.error('Error fetching feedback data:', error);
    } finally {
      setFeedbackLoading(false);
    }
  };

  // Fetch feedback statistics
  const fetchFeedbackStatsInternal = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        'https://btbtestservice.onrender.com/api/feedback/statistics',
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data.success) {
        setFeedbackStats(response.data.statistics);
      }
    } catch (error) {
      console.error('Error fetching feedback stats:', error);
    }
  };

  // Update feedback status
  const updateFeedbackStatus = async (feedbackId, status, adminResponse = '') => {
    try {
      setUpdatingStatus(true);
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `https://btbtestservice.onrender.com/api/feedback/${feedbackId}/status`,
        { 
          status, 
          adminResponse 
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data.success) {
        // Refresh feedback data
        fetchFeedbackDataInternal();
        fetchFeedbackStatsInternal();
        if (fetchFeedbackData) fetchFeedbackData();
        if (fetchFeedbackStats) fetchFeedbackStats();
      }
    } catch (error) {
      console.error('Error updating feedback status:', error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Pagination functions
  const getPaginatedFeedback = () => {
    const filteredFeedback = feedbackSearch ? feedbackData.filter(item => {
      const t = [
        item.userName,
        item.userEmail,
        item.userRole,
        item.category,
        item.message,
        item.status,
        item.classCode
      ].filter(Boolean).join(' ').toLowerCase();
      return t.includes(feedbackSearch.toLowerCase());
    }) : feedbackData;
    
    const startIndex = (feedbackCurrentPage - 1) * feedbackItemsPerPage;
    const endIndex = startIndex + feedbackItemsPerPage;
    return filteredFeedback.slice(startIndex, endIndex);
  };

  const getFeedbackTotalPages = () => {
    const filteredFeedback = feedbackSearch ? feedbackData.filter(item => {
      const t = [
        item.userName,
        item.userEmail,
        item.userRole,
        item.category,
        item.message,
        item.status,
        item.classCode
      ].filter(Boolean).join(' ').toLowerCase();
      return t.includes(feedbackSearch.toLowerCase());
    }) : feedbackData;
    
    return Math.ceil(filteredFeedback.length / feedbackItemsPerPage);
  };

  // Initialize data when component mounts or activeTab changes
  useEffect(() => {
    if (activeTab === 'feedback') {
      fetchFeedbackDataInternal();
      fetchFeedbackStatsInternal();
      if (fetchEducatorClassSummary) fetchEducatorClassSummary();
      if (fetchAllClassCodes) fetchAllClassCodes();
      if (fetchEducatorUsers) fetchEducatorUsers();
      setFeedbackCurrentPage(1);
    }
  }, [activeTab, feedbackFilters]);

  // Reset to page 1 when feedback data changes or search changes
  useEffect(() => {
    setFeedbackCurrentPage(1);
  }, [feedbackData, feedbackSearch]);

  return (
    <div className="space-y-8">
      {/* Search Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="relative w-full sm:w-96">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={feedbackSearch}
            onChange={(e) => setFeedbackSearch(e.target.value)}
            placeholder="Search feedback by user, email, message..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
      </div>

      {/* Feedback Statistics */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Feedback Overview</h3>
          <div className="flex items-center gap-4">
            <div className="flex flex-wrap gap-2">
              <select
                value={feedbackFilters.status}
                onChange={(e) => setFeedbackFilters(prev => ({ ...prev, status: e.target.value }))}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="reviewed">Reviewed</option>
                <option value="resolved">Resolved</option>
              </select>
              <select
                value={feedbackFilters.role}
                onChange={(e) => setFeedbackFilters(prev => ({ ...prev, role: e.target.value }))}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="all">All Roles</option>
                <option value="student">Student</option>
                <option value="educator">Educator</option>
              </select>
              <select
                value={feedbackFilters.category}
                onChange={(e) => setFeedbackFilters(prev => ({ ...prev, category: e.target.value }))}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="all">All Categories</option>
                <option value="general">General Feedback</option>
                <option value="bug">Bug Report</option>
                <option value="feature">Feature Request</option>
                <option value="improvement">Improvement Suggestion</option>
                <option value="compliment">Compliment</option>
                <option value="other">Other</option>
              </select>
              <button
                onClick={fetchFeedbackDataInternal}
                className="bg-violet-600 hover:bg-violet-700 px-3 py-2 rounded-lg text-sm"
              >
                Apply
              </button>
            </div>
            <ExportFeedback feedbackData={feedbackData} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 p-4 rounded-lg">
            <p className="text-gray-400 text-sm">Total Feedback</p>
            <p className="text-2xl font-bold text-white">
              {feedbackStats?.total || 0}
            </p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <p className="text-gray-400 text-sm">Avg. Rating</p>
            <p className="text-2xl font-bold text-white">
              {feedbackStats?.avgRating || 0}/5
            </p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <p className="text-gray-400 text-sm">Pending</p>
            <p className="text-2xl font-bold text-yellow-400">
              {feedbackStats?.byStatus?.find(s => s.status === 'pending')?.count || 0}
            </p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <p className="text-gray-400 text-sm">Students vs Educators</p>
            <p className="text-lg font-bold text-white">
              {feedbackStats?.byRole?.find(r => r.role === 'student')?.count || 0} : {feedbackStats?.byRole?.find(r => r.role === 'educator')?.count || 0}
            </p>
          </div>
        </div>

        {/* Feedback Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Rating</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Message</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {feedbackLoading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-violet-500"></div>
                    </div>
                  </td>
                </tr>
              ) : getPaginatedFeedback().length > 0 ? (
                getPaginatedFeedback().map((item) => (
                  <tr key={item._id} className="hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-white">{item.userName}</p>
                        <p className="text-gray-400 text-sm">{item.userEmail}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs ${
                        item.userRole === 'student'
                          ? 'bg-blue-500/20 text-blue-400'
                          : item.userRole === 'educator'
                            ? 'bg-pink-500/20 text-pink-400'
                            : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {item.userRole}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <FiStar
                            key={i}
                            className={`h-4 w-4 ${
                              i < item.rating
                                ? 'text-yellow-500 fill-yellow-500'
                                : 'text-gray-400'
                            }`}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded capitalize ${getCategoryColor(item.category)}`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-300 text-sm line-clamp-2">{item.message}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs ${
                        item.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        item.status === 'reviewed' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button 
                        onClick={() => {
                          setSelectedFeedback(item);
                          setAdminResponse(item.adminResponse?.message || '');
                          setShowFeedbackModal(true);
                        }}
                        className="text-violet-400 hover:text-violet-300 text-sm"
                      >
                        View & Respond
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-gray-400">
                    No feedback found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          
          {/* Pagination Controls */}
          {!feedbackLoading && getFeedbackTotalPages() > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6 border-t border-gray-700">
              <button
                onClick={() => setFeedbackCurrentPage(Math.max(1, feedbackCurrentPage - 1))}
                disabled={feedbackCurrentPage === 1}
                className="px-3 py-2 border border-gray-700 rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="flex gap-1">
                {Array.from({ length: getFeedbackTotalPages() }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setFeedbackCurrentPage(page)}
                    className={`px-3 py-2 rounded-lg transition duration-200 ${
                      feedbackCurrentPage === page
                        ? 'bg-violet-600 text-white'
                        : 'border border-gray-700 bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setFeedbackCurrentPage(Math.min(getFeedbackTotalPages(), feedbackCurrentPage + 1))}
                disabled={feedbackCurrentPage === getFeedbackTotalPages()}
                className="px-3 py-2 border border-gray-700 rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <span className="text-gray-400 text-sm ml-4">
                Page {feedbackCurrentPage} of {getFeedbackTotalPages()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && selectedFeedback && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-xl font-bold text-white">Feedback Details</h3>
                <button 
                  onClick={() => setShowFeedbackModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>

              {/* Feedback Info */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${
                    selectedFeedback.userRole === 'student' ? 'bg-blue-500/20' : selectedFeedback.userRole === 'educator' ? 'bg-pink-500/20' : 'bg-gray-500/20'
                  }`}>
                    <FiUsers className={`w-6 h-6 ${
                      selectedFeedback.userRole === 'student' ? 'text-blue-400' : selectedFeedback.userRole === 'educator' ? 'text-pink-400' : 'text-gray-400'
                    }`} />
                  </div>
                  <div>
                    <h4 className="text-white font-medium">{selectedFeedback.userName}</h4>
                    <p className="text-sm text-gray-400">{selectedFeedback.userEmail}</p>
                    <p className="text-xs text-gray-500 capitalize">{selectedFeedback.userRole} • {deriveFeedbackSchool(selectedFeedback)}</p>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs capitalize ${getCategoryColor(selectedFeedback.category)}`}>
                        {selectedFeedback.category}
                      </span>
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <FiStar
                            key={i}
                            className={`h-4 w-4 ${
                              i < selectedFeedback.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(selectedFeedback.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-gray-300 whitespace-pre-wrap">{selectedFeedback.message}</p>
                  {selectedFeedback.classCode && (
                    <p className="text-xs text-gray-500 mt-2">Class Code: {selectedFeedback.classCode}</p>
                  )}
                </div>
              </div>

              {/* Response Section */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">Admin Response</h4>
                <textarea
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  placeholder="Write your response here..."
                  className="w-full h-32 bg-gray-800 border border-gray-700 rounded-lg p-4 text-white focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-400">Status:</label>
                    <select 
                      value={selectedFeedback.status} 
                      onChange={(e) => {
                        setSelectedFeedback({...selectedFeedback, status: e.target.value});
                      }}
                      className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-sm text-white focus:outline-none"
                    >
                      <option value="pending">Pending</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowFeedbackModal(false)}
                      className="px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        const newStatus = selectedFeedback.status === 'pending' ? 'reviewed' : selectedFeedback.status;
                        await updateFeedbackStatus(selectedFeedback._id, newStatus, adminResponse);
                        setShowFeedbackModal(false);
                      }}
                      disabled={updatingStatus}
                      className="px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                      {updatingStatus ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                          Sending...
                        </>
                      ) : (
                        <>
                          <FiSend className="w-4 h-4" />
                          Send Response
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}