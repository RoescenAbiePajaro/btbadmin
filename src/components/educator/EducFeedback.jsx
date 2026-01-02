// src/components/educator/EducFeedback.jsx
import React, { useState, useEffect } from 'react';
import { FiSend, FiStar, FiMessageSquare, FiClock, FiCheck, FiAlertCircle, FiUsers } from 'react-icons/fi';
import axios from 'axios';

export default function EducFeedback({ educator }) {
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(5);
  const [category, setCategory] = useState('general');
  const [submitting, setSubmitting] = useState(false);
  const [myFeedback, setMyFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('submit'); // 'submit' or 'history'

  useEffect(() => {
    fetchMyFeedback();
  }, []);

  const fetchMyFeedback = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/feedback/my-feedback', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setMyFeedback(response.data.feedback);
      }
    } catch (error) {
      console.error('Error fetching feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!feedback.trim() || feedback.length < 10) {
      alert('Please provide feedback with at least 10 characters');
      return;
    }

    setSubmitting(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:5000/api/feedback/submit', 
        {
          message: feedback,
          rating,
          category
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.toast?.type === 'success') {
        setFeedback('');
        setRating(5);
        setCategory('general');
        fetchMyFeedback(); // Refresh history
        alert('Thank you for your feedback!');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-500';
      case 'reviewed': return 'text-blue-500';
      case 'resolved': return 'text-green-500';
      case 'closed': return 'text-gray-500';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <FiClock className="inline mr-1" />;
      case 'reviewed': return <FiMessageSquare className="inline mr-1" />;
      case 'resolved': return <FiCheck className="inline mr-1" />;
      case 'closed': return <FiCheck className="inline mr-1" />;
      default: return null;
    }
  };

  const getCategoryColor = (cat) => {
    switch (cat) {
      case 'bug': return 'bg-red-100 text-red-800';
      case 'feature': return 'bg-blue-100 text-blue-800';
      case 'suggestion': return 'bg-green-100 text-green-800';
      case 'compliment': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-green-800 px-8 py-6">
            <div className="flex items-center gap-3">
              <FiUsers className="h-8 w-8 text-white" />
              <div>
                <h1 className="text-2xl font-bold text-white">Educator Feedback Center</h1>
                <p className="text-green-100 mt-2">Help us improve the platform for all educators</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('submit')}
                className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'submit'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FiSend className="inline mr-2" />
                Submit Feedback
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'history'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FiMessageSquare className="inline mr-2" />
                My Feedback History
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'submit' ? (
              <div className="max-w-2xl mx-auto">
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">Educator Feedback</h2>
                  <p className="text-gray-600">
                    Share your experiences, challenges, and suggestions as an educator. Your feedback helps us create better tools for teaching.
                  </p>
                </div>

                <form onSubmit={handleSubmit}>
                  {/* Rating */}
                  <div className="mb-6">
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Platform Rating (as an Educator)
                    </label>
                    <div className="flex items-center space-x-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className="text-2xl focus:outline-none"
                        >
                          <FiStar
                            className={`${
                              star <= rating
                                ? 'text-yellow-500 fill-yellow-500'
                                : 'text-gray-300'
                            }`}
                          />
                        </button>
                      ))}
                      <span className="ml-2 text-gray-600">
                        {rating} star{rating !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Category */}
                  <div className="mb-6">
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="general">General Feedback</option>
                      <option value="bug">Bug Report</option>
                      <option value="feature">Feature Request</option>
                      <option value="suggestion">Improvement Suggestion</option>
                      <option value="compliment">Compliment</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Message */}
                  <div className="mb-6">
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Your Feedback Message
                      <span className="text-red-500 ml-1">*</span>
                      <span className="text-xs text-gray-500 ml-2">
                        (Minimum 10 characters, Maximum 2000 characters)
                      </span>
                    </label>
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      rows={6}
                      className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                      placeholder="Share your experience as an educator: class management features, student interactions, file sharing, analytics, or any platform improvements needed..."
                      minLength={10}
                      maxLength={2000}
                      required
                    />
                    <div className="mt-1 text-xs text-gray-500 text-right">
                      {feedback.length}/2000 characters
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submitting || feedback.length < 10}
                      className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-8 rounded-lg transition duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Submitting...
                        </>
                      ) : (
                        <>
                          <FiSend />
                          Submit Educator Feedback
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Educator-specific Guidelines */}
                <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <h3 className="font-medium text-gray-800 mb-2 flex items-center">
                    <FiAlertCircle className="mr-2 text-green-500" />
                    Educator Feedback Guidelines
                  </h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Focus on class management and teaching experience</li>
                    <li>• Share insights about student engagement and analytics</li>
                    <li>• Suggest improvements for file sharing and assignment features</li>
                    <li>• Report any technical issues with creating/managing classes</li>
                    <li>• Include specific examples from your teaching experience</li>
                    <li>• Your feedback helps shape educator-focused features</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">My Feedback History</h2>
                  <p className="text-gray-600">
                    Track all feedback you've submitted as an educator
                  </p>
                </div>

                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto"></div>
                    <p className="mt-4 text-gray-500">Loading your feedback...</p>
                  </div>
                ) : myFeedback.length === 0 ? (
                  <div className="text-center py-12">
                    <FiMessageSquare className="mx-auto text-gray-400 h-12 w-12 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No feedback submitted yet</h3>
                    <p className="text-gray-500 mb-6">Your educator feedback history will appear here.</p>
                    <button
                      onClick={() => setActiveTab('submit')}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none"
                    >
                      <FiSend className="mr-2" />
                      Submit Educator Feedback
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myFeedback.map((item) => (
                      <div
                        key={item._id}
                        className="border border-gray-200 rounded-lg p-5 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <span className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(item.category)}`}>
                                {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                              </span>
                              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                Educator
                              </span>
                              <div className="flex items-center">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <FiStar
                                    key={star}
                                    className={`h-4 w-4 ${
                                      star <= item.rating
                                        ? 'text-yellow-500 fill-yellow-500'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            <span className={`text-sm font-medium ${getStatusColor(item.status)}`}>
                              {getStatusIcon(item.status)}
                              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500">
                            {formatDate(item.createdAt)}
                          </span>
                        </div>

                        <p className="text-gray-700 mb-4 whitespace-pre-wrap">{item.message}</p>

                        {item.adminResponse && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                <FiCheck className="h-4 w-4 text-green-600" />
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-sm font-medium text-green-600">Admin Response</span>
                                  <span className="text-xs text-gray-500">
                                    {new Date(item.adminResponse.respondedAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700">{item.adminResponse.message}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}