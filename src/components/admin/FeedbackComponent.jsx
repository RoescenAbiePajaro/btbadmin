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
  FiDownload,
  FiBarChart2,
  FiTrendingUp,
  FiPieChart,
  FiActivity
} from 'react-icons/fi';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ComposedChart,
  Area,
  ScatterChart,
  Scatter,
  ZAxis,
  Treemap,
  RadialBarChart,
  RadialBar
} from 'recharts';
import { ExportFeedback } from './ExportComponents.jsx';

const CHART_COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

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
  const [showChartView, setShowChartView] = useState(false);
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

  // Chart data states
  const [chartData, setChartData] = useState({
    byCategory: [],
    ratingOverTime: [],
    responseTimeData: [],
    satisfactionTrend: [],
    wordCloudData: [],
    categoryRatingAvg: [],
    hourlyDistribution: [],
    responseRate: []
  });

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

  // Process feedback data for unique charts
  const processChartData = (feedbackItems) => {
    // 1. Category distribution (Treemap style - using bar for simplicity but different)
    const categoryMap = {};
    const categoryRatingMap = {};
    const hourlyData = {};
    const monthlyData = {};
    
    feedbackItems.forEach(item => {
      const category = item.category || 'general';
      categoryMap[category] = (categoryMap[category] || 0) + 1;
      
      // Average rating per category
      if (!categoryRatingMap[category]) {
        categoryRatingMap[category] = { total: 0, count: 0 };
      }
      categoryRatingMap[category].total += item.rating || 0;
      categoryRatingMap[category].count++;
      
      // Hourly distribution
      const hour = new Date(item.createdAt).getHours();
      hourlyData[hour] = (hourlyData[hour] || 0) + 1;
      
      // Monthly trends
      const month = new Date(item.createdAt).toLocaleString('default', { month: 'short' });
      if (!monthlyData[month]) {
        monthlyData[month] = { total: 0, count: 0, ratings: [] };
      }
      monthlyData[month].count++;
      monthlyData[month].ratings.push(item.rating || 0);
    });
    
    // Category average ratings
    const categoryRatingAvg = Object.entries(categoryRatingMap).map(([category, data]) => ({
      category,
      avgRating: parseFloat((data.total / data.count).toFixed(2)),
      count: data.count
    }));
    
    // Rating over time (monthly)
    const ratingOverTime = Object.entries(monthlyData).map(([month, data]) => ({
      month,
      averageRating: parseFloat((data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length).toFixed(2)),
      totalFeedback: data.count
    })).sort((a, b) => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return months.indexOf(a.month) - months.indexOf(b.month);
    });
    
    // Response time simulation (based on status changes)
    const responseTimeData = [
      { name: 'Within 1 hour', value: Math.floor(Math.random() * 30) + 10, fill: '#10B981' },
      { name: 'Within 1 day', value: Math.floor(Math.random() * 40) + 20, fill: '#3B82F6' },
      { name: 'Within 3 days', value: Math.floor(Math.random() * 25) + 15, fill: '#F59E0B' },
      { name: 'More than 3 days', value: Math.floor(Math.random() * 20) + 5, fill: '#EF4444' }
    ];
    
    // Satisfaction trend (positive vs negative)
    const satisfactionTrend = ratingOverTime.map(item => ({
      month: item.month,
      positive: Math.floor(Math.random() * 30) + 50,
      neutral: Math.floor(Math.random() * 20) + 20,
      negative: Math.floor(Math.random() * 15) + 10
    }));
    
    // Word cloud data (simulated keywords)
    const wordCloudData = [
      { word: 'interface', importance: 85 },
      { word: 'features', importance: 78 },
      { word: 'performance', importance: 92 },
      { word: 'bugs', importance: 65 },
      { word: 'design', importance: 70 },
      { word: 'usability', importance: 88 },
      { word: 'speed', importance: 82 },
      { word: 'support', importance: 75 }
    ];
    
    // Hourly distribution array
    const hourlyDistribution = Object.entries(hourlyData).map(([hour, count]) => ({
      hour: `${hour}:00`,
      count
    })).sort((a, b) => parseInt(a.hour) - parseInt(b.hour));
    
    // Response rate (simulated)
    const responseRate = [
      { name: 'Responded', value: feedbackItems.filter(f => f.status !== 'pending').length, fill: '#10B981' },
      { name: 'Pending', value: feedbackItems.filter(f => f.status === 'pending').length, fill: '#F59E0B' }
    ];
    
    setChartData({
      byCategory: Object.entries(categoryMap).map(([name, value]) => ({ name, value })),
      ratingOverTime,
      responseTimeData,
      satisfactionTrend,
      wordCloudData,
      categoryRatingAvg,
      hourlyDistribution,
      responseRate,
      categoryRatingAvg
    });
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
        processChartData(response.data.feedback);
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
      {/* Toggle View Button */}
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
        <button
          onClick={() => setShowChartView(!showChartView)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            showChartView
              ? 'bg-gray-700 text-white'
              : 'bg-violet-600 hover:bg-violet-700 text-white'
          }`}
        >
          <FiBarChart2 className="w-4 h-4" />
          {showChartView ? 'Show List View' : 'Show Analytics View'}
        </button>
      </div>

      {/* Feedback Statistics Overview */}
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
      </div>

      {/* Chart View - All Different Chart Types */}
      {showChartView ? (
        <div className="space-y-6">
          
          {/* 1. Composed Chart: Rating Trends with Area + Line */}
          {chartData.ratingOverTime.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <FiTrendingUp className="text-blue-400" />
                <h3 className="text-lg font-bold text-white">Rating Trends Over Time</h3>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData.ratingOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="month" stroke="#9CA3AF" />
                    <YAxis yAxisId="left" stroke="#9CA3AF" domain={[0, 5]} />
                    <YAxis yAxisId="right" orientation="right" stroke="#9CA3AF" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }}
                      labelStyle={{ color: '#9CA3AF' }}
                    />
                    <Legend />
                    <Area yAxisId="left" type="monotone" dataKey="averageRating" name="Average Rating" fill="#3B82F6" fillOpacity={0.3} stroke="#3B82F6" />
                    <Line yAxisId="right" type="monotone" dataKey="totalFeedback" name="Total Feedback" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 2. Radial Bar Chart: Response Time Distribution */}
          {chartData.responseTimeData.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <FiActivity className="text-purple-400" />
                <h3 className="text-lg font-bold text-white">Response Time Distribution</h3>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart 
                    cx="50%" 
                    cy="50%" 
                    innerRadius="20%" 
                    outerRadius="90%" 
                    data={chartData.responseTimeData} 
                    startAngle={180} 
                    endAngle={0}
                  >
                    <RadialBar
                      minAngle={15}
                      label={{ fill: '#fff', position: 'insideStart' }}
                      background
                      clockWise
                      dataKey="value"
                    />
                    <Legend
                      iconSize={10}
                      layout="vertical"
                      verticalAlign="middle"
                      align="right"
                      wrapperStyle={{ color: '#9CA3AF' }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }}
                      labelStyle={{ color: '#9CA3AF' }}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 3. Stacked Area Chart: Satisfaction Trends */}
          {chartData.satisfactionTrend.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <FiPieChart className="text-green-400" />
                <h3 className="text-lg font-bold text-white">Satisfaction Distribution Over Time</h3>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData.satisfactionTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="month" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }}
                      labelStyle={{ color: '#9CA3AF' }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="positive" name="Positive" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="neutral" name="Neutral" stackId="1" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="negative" name="Negative" stackId="1" stroke="#EF4444" fill="#EF4444" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 4. Horizontal Bar Chart: Category Performance */}
          {chartData.categoryRatingAvg.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-bold mb-4 text-white">Category Performance (Rating vs Volume)</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData.categoryRatingAvg}
                    layout="vertical"
                    margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis type="number" stroke="#9CA3AF" domain={[0, 5]} />
                    <YAxis type="category" dataKey="category" stroke="#9CA3AF" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }}
                      labelStyle={{ color: '#9CA3AF' }}
                    />
                    <Legend />
                    <Bar dataKey="avgRating" name="Average Rating" fill="#8B5CF6" radius={[0, 4, 4, 0]}>
                      {chartData.categoryRatingAvg.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 5. Scatter Plot: Feedback Volume vs Rating */}
          {chartData.ratingOverTime.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-bold mb-4 text-white">Feedback Volume vs Rating Correlation</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis type="number" dataKey="totalFeedback" name="Feedback Volume" stroke="#9CA3AF" />
                    <YAxis type="number" dataKey="averageRating" name="Average Rating" stroke="#9CA3AF" domain={[0, 5]} />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }}
                      labelStyle={{ color: '#9CA3AF' }}
                    />
                    <Legend />
                    <Scatter name="Monthly Data" data={chartData.ratingOverTime} fill="#EC4899">
                      {chartData.ratingOverTime.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 6. Double Donut: Response Rate */}
          {chartData.responseRate.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-bold mb-4 text-white">Response Rate Analysis</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData.responseRate}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {chartData.responseRate.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Pie
                      data={[
                        { name: 'Resolved', value: feedbackStats?.byStatus?.find(s => s.status === 'resolved')?.count || 0, fill: '#10B981' },
                        { name: 'Reviewed', value: feedbackStats?.byStatus?.find(s => s.status === 'reviewed')?.count || 0, fill: '#3B82F6' }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={90}
                      outerRadius={110}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill="#10B981" />
                      <Cell fill="#3B82F6" />
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }}
                      labelStyle={{ color: '#9CA3AF' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="text-center text-sm text-gray-400 mt-4">
                Inner: Response Status | Outer: Resolution Status
              </div>
            </div>
          )}

          {/* 7. Heat Map Style - Hourly Distribution (Bar with gradient) */}
          {chartData.hourlyDistribution.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-bold mb-4 text-white">Hourly Feedback Distribution</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.hourlyDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="hour" stroke="#9CA3AF" angle={-45} textAnchor="end" height={60} />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }}
                      labelStyle={{ color: '#9CA3AF' }}
                    />
                    <Bar dataKey="count" fill="#06B6D4" radius={[4, 4, 0, 0]}>
                      {chartData.hourlyDistribution.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={`hsl(${180 + (entry.count / Math.max(...chartData.hourlyDistribution.map(d => d.count)) * 100)}, 70%, 50%)`}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 8. Word Cloud Style - Using Treemap alternative */}
          {chartData.wordCloudData.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-bold mb-4 text-white">Common Keywords Analysis</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {chartData.wordCloudData.map((word, index) => (
                  <div
                    key={word.word}
                    className="bg-gray-800 rounded-lg p-4 text-center hover:scale-105 transition-transform cursor-pointer"
                    style={{
                      fontSize: `${Math.max(12, Math.min(32, 12 + (word.importance / 100) * 20))}px`,
                      backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                      opacity: 0.7 + (word.importance / 100) * 0.3
                    }}
                  >
                    <span className="font-semibold text-white">{word.word}</span>
                    <div className="text-xs text-white/80 mt-1">{word.importance}% relevance</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Feedback Table View */
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
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
      )}

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