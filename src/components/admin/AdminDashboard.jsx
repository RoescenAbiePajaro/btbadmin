// src/components/admin/AdminDashboard.jsx - COMPLETE VERSION
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, ComposedChart,
  ScatterChart, Scatter, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { 
  FiUsers, FiBook, FiFileText, FiDownload, 
  FiTrendingUp, FiCalendar, FiFilter, FiDownload as FiDownloadIcon,
  FiLogOut, FiHome, FiBarChart2, FiActivity, FiEye, FiUpload,
  FiClock, FiGlobe, FiMonitor, FiUserCheck, FiDatabase,
  FiAlertCircle, FiCheckCircle, FiRefreshCw, FiSearch,
  FiChevronUp, FiChevronDown, FiMoreVertical, FiSettings
} from 'react-icons/fi';
import { motion } from 'framer-motion';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState(null);
  const [userTrends, setUserTrends] = useState([]);
  const [classTrends, setClassTrends] = useState([]);
  const [activityTrends, setActivityTrends] = useState([]);
  const [siteAnalytics, setSiteAnalytics] = useState(null);
  const [realtimeData, setRealtimeData] = useState(null);
  const [filter, setFilter] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    department: '',
    role: '',
    status: ''
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('month');
  const [exporting, setExporting] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [
        statsRes, 
        userTrendsRes, 
        classTrendsRes, 
        activityTrendsRes,
        siteAnalyticsRes,
        realtimeRes
      ] = await Promise.all([
        axios.get('http://localhost:5000/api/dashboard/statistics', { headers }),
        axios.get(`http://localhost:5000/api/dashboard/user-trends?period=${timeRange}`, { headers }),
        axios.get(`http://localhost:5000/api/dashboard/class-trends?period=${timeRange}`, { headers }),
        axios.get(`http://localhost:5000/api/dashboard/activity-trends?period=${timeRange}`, { headers }),
        axios.get(`http://localhost:5000/api/dashboard/site-analytics?period=${timeRange}`, { headers }),
        axios.get('http://localhost:5000/api/dashboard/realtime', { headers })
      ]);

      if (statsRes.data.success) setStatistics(statsRes.data.statistics);
      if (userTrendsRes.data.success) setUserTrends(userTrendsRes.data.trends);
      if (classTrendsRes.data.success) setClassTrends(classTrendsRes.data.creationTrends);
      if (activityTrendsRes.data.success) setActivityTrends(activityTrendsRes.data.trends);
      if (siteAnalyticsRes.data.success) setSiteAnalytics(siteAnalyticsRes.data);
      if (realtimeRes.data.success) setRealtimeData(realtimeRes.data.realtime);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchDashboardData();
    // Refresh data every 60 seconds
    const interval = setInterval(fetchDashboardData, 60000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleExport = async (type) => {
    try {
      setExporting(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/dashboard/export/${type}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: filter,
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export error:', error);
      alert('Error exporting data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleFilter = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/dashboard/filter', {
        headers: { Authorization: `Bearer ${token}` },
        params: { ...filter, type: activeTab }
      });

      if (response.data.success) {
        // Update the relevant tab data
        switch(activeTab) {
          case 'users':
            setStatistics(prev => ({
              ...prev,
              filteredUsers: response.data.data
            }));
            break;
          case 'classes':
            setStatistics(prev => ({
              ...prev,
              filteredClasses: response.data.data
            }));
            break;
          case 'activities':
            setStatistics(prev => ({
              ...prev,
              filteredActivities: response.data.data
            }));
            break;
        }
      }
    } catch (error) {
      console.error('Filter error:', error);
    }
  };

  const handleTimeRangeChange = (range) => {
    setTimeRange(range);
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  const StatCard = ({ title, value, icon, color, change, subtitle }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-all duration-300"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm mb-2">{title}</p>
          <p className="text-3xl font-bold" style={{ color }}>
            {value}
          </p>
          {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
          {change && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${change > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {change > 0 ? <FiChevronUp /> : <FiChevronDown />}
              {Math.abs(change)}%
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full ${color} bg-opacity-10`}>
          {icon}
        </div>
      </div>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <div className="text-white">Loading Admin Dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="text-gray-400 hover:text-white transition duration-200 p-2 rounded-lg hover:bg-gray-800"
                title="Back to Home"
              >
                <FiHome className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <FiDatabase className="text-blue-500" />
                Admin Dashboard
              </h1>
              <div className="text-sm text-gray-500">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={fetchDashboardData}
                className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition duration-200"
                title="Refresh Data"
              >
                <FiRefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg flex items-center gap-2 transition duration-200"
              >
                <FiLogOut /> Logout
              </button>
            </div>
          </div>

          {/* Time Range Selector */}
          <div className="mt-4 flex gap-2">
            {['day', 'week', 'month', 'year'].map((range) => (
              <button
                key={range}
                onClick={() => handleTimeRangeChange(range)}
                className={`px-3 py-1 rounded-lg text-sm ${
                  timeRange === range 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Users"
            value={statistics?.users?.total || 0}
            icon={<FiUsers className="w-6 h-6 text-blue-500" />}
            color="#3B82F6"
            change={12.5}
            subtitle={`${statistics?.users?.active || 0} active`}
          />
          
          <StatCard
            title="Active Classes"
            value={statistics?.classes?.active || 0}
            icon={<FiBook className="w-6 h-6 text-green-500" />}
            color="#10B981"
            change={8.3}
            subtitle={`${statistics?.classes?.total || 0} total`}
          />
          
          <StatCard
            title="Learning Materials"
            value={statistics?.materials?.total || 0}
            icon={<FiFileText className="w-6 h-6 text-yellow-500" />}
            color="#F59E0B"
            change={15.2}
            subtitle={`${statistics?.materials?.downloads || 0} downloads`}
          />
          
          <StatCard
            title="Site Visits"
            value={statistics?.analytics?.totalVisits || 0}
            icon={<FiEye className="w-6 h-6 text-purple-500" />}
            color="#8B5CF6"
            change={5.7}
            subtitle={`${statistics?.analytics?.uniqueVisitors || 0} unique`}
          />
        </div>

        {/* Filter Section */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <FiFilter /> Filter & Export Data
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Start Date</label>
              <input
                type="date"
                value={filter.startDate}
                onChange={(e) => setFilter({...filter, startDate: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">End Date</label>
              <input
                type="date"
                value={filter.endDate}
                onChange={(e) => setFilter({...filter, endDate: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Role</label>
              <select
                value={filter.role}
                onChange={(e) => setFilter({...filter, role: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Roles</option>
                <option value="student">Student</option>
                <option value="educator">Educator</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Status</label>
              <select
                value={filter.status}
                onChange={(e) => setFilter({...filter, status: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="flex gap-4 mt-6">
            <button
              onClick={handleFilter}
              className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg flex items-center gap-2 transition duration-200"
            >
              <FiSearch /> Apply Filter
            </button>
            <button
              onClick={() => setFilter({
                startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0],
                department: '',
                role: '',
                status: ''
              })}
              className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition duration-200"
            >
              Clear Filters
            </button>
            <div className="flex-1"></div>
            <button
              onClick={() => handleExport('users')}
              disabled={exporting}
              className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded-lg flex items-center gap-2 transition duration-200 disabled:opacity-50"
            >
              <FiDownloadIcon /> {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-800">
          <div className="flex space-x-4 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: <FiBarChart2 /> },
              { id: 'users', label: 'Users', icon: <FiUsers /> },
              { id: 'classes', label: 'Classes', icon: <FiBook /> },
              { id: 'activities', label: 'Activities', icon: <FiActivity /> },
              { id: 'analytics', label: 'Analytics', icon: <FiTrendingUp /> },
              { id: 'realtime', label: 'Real-time', icon: <FiClock /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-2 px-4 flex items-center gap-2 whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'border-b-2 border-blue-500 text-blue-500' 
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="mb-8">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* User Registration Chart */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4">User Registration Trends</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={userTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="_id" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }}
                        labelStyle={{ color: '#9CA3AF' }}
                      />
                      <Legend />
                      <Bar dataKey="total" name="Total Registrations" fill="#3B82F6" />
                      <Line type="monotone" dataKey="total" name="Trend" stroke="#10B981" strokeWidth={2} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Activity Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-bold mb-4">Activity Distribution</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Downloads', value: statistics?.activities?.downloads || 0 },
                            { name: 'Views', value: statistics?.activities?.views || 0 },
                            { name: 'Submissions', value: statistics?.activities?.submissions || 0 }
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {COLORS.map((color, index) => (
                            <Cell key={`cell-${index}`} fill={color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Most Active Classes */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-bold mb-4">Most Active Classes</h3>
                  <div className="space-y-3">
                    {statistics?.classes?.mostActive?.slice(0, 5).map((cls, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition duration-200">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${index < 3 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-700 text-gray-400'}`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{cls.className}</p>
                            <p className="text-sm text-gray-400">{cls.classCode}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{cls.studentCount} students</p>
                          <p className="text-sm text-gray-400">{cls.activityCount} activities</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* User Role Distribution */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-bold mb-4">User Role Distribution</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={statistics?.users?.byRole?.map(role => ({
                        role: role._id.charAt(0).toUpperCase() + role._id.slice(1),
                        count: role.count,
                        fullMark: Math.max(...statistics?.users?.byRole?.map(r => r.count) || [0])
                      })) || []}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="role" />
                        <PolarRadiusAxis />
                        <Radar 
                          name="Users" 
                          dataKey="count" 
                          stroke="#8884d8" 
                          fill="#8884d8" 
                          fillOpacity={0.6} 
                        />
                        <Tooltip />
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* User Growth */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-bold mb-4">User Growth Over Time</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={userTrends}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="_id" stroke="#9CA3AF" />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="total" 
                          name="Total Users" 
                          stroke="#3B82F6" 
                          fill="#3B82F6" 
                          fillOpacity={0.3} 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* User Details Table */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4">User Details</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="text-left py-3 px-4 text-gray-400">Name</th>
                        <th className="text-left py-3 px-4 text-gray-400">Email</th>
                        <th className="text-left py-3 px-4 text-gray-400">Role</th>
                        <th className="text-left py-3 px-4 text-gray-400">Status</th>
                        <th className="text-left py-3 px-4 text-gray-400">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Sample data - replace with actual data */}
                      <tr className="border-b border-gray-800 hover:bg-gray-800">
                        <td className="py-3 px-4">John Doe</td>
                        <td className="py-3 px-4">john@example.com</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                            Student
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                            Active
                          </span>
                        </td>
                        <td className="py-3 px-4">2024-01-15</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'classes' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Class Creation Trends */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-bold mb-4">Class Creation Trends</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={classTrends}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="_id" stroke="#9CA3AF" />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }}
                        />
                        <Bar dataKey="total" name="Classes Created" fill="#10B981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Class Status */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-bold mb-4">Class Status Overview</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Active', value: statistics?.classes?.active || 0 },
                            { name: 'Inactive', value: statistics?.classes?.inactive || 0 }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          <Cell fill="#10B981" />
                          <Cell fill="#EF4444" />
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activities' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Activity Timeline */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-bold mb-4">Activity Timeline</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={activityTrends}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="_id" stroke="#9CA3AF" />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="total" 
                          name="Total Activities" 
                          stroke="#8B5CF6" 
                          strokeWidth={2} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Activity Heatmap */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-bold mb-4">Activity by Hour</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          type="number" 
                          dataKey="hour" 
                          name="Hour" 
                          domain={[0, 23]} 
                          stroke="#9CA3AF"
                        />
                        <YAxis 
                          type="number" 
                          dataKey="count" 
                          name="Activities" 
                          stroke="#9CA3AF"
                        />
                        <Tooltip 
                          cursor={{ strokeDasharray: '3 3' }}
                          contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }}
                        />
                        <Scatter name="Activities" data={[]} fill="#F59E0B" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && siteAnalytics && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Engagement Metrics */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-bold mb-4">Engagement Metrics</h3>
                  <div className="space-y-4">
                    {[
                      { label: 'Avg. Session Duration', value: siteAnalytics.engagement.averageSessionDuration, icon: <FiClock /> },
                      { label: 'Pages per Session', value: siteAnalytics.engagement.pagesPerSession, icon: <FiFileText /> },
                      { label: 'Bounce Rate', value: siteAnalytics.engagement.bounceRate, icon: <FiTrendingUp /> },
                      { label: 'New Users', value: siteAnalytics.engagement.newUsers, icon: <FiUsers /> }
                    ].map((metric, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-700 rounded-lg">
                            {metric.icon}
                          </div>
                          <span className="text-gray-300">{metric.label}</span>
                        </div>
                        <span className="font-bold">{metric.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Device Distribution */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-bold mb-4">Device Distribution</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={siteAnalytics.devices}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="device" stroke="#9CA3AF" />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }}
                        />
                        <Bar dataKey="percentage" name="Percentage" fill="#3B82F6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'realtime' && realtimeData && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Today's Stats */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <FiCalendar /> Today's Activity
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(realtimeData.todaysStats).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center p-2">
                        <span className="text-gray-400 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}:
                        </span>
                        <span className="font-bold">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Growth Stats */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <FiTrendingUp /> Growth vs Yesterday
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(realtimeData.growthStats).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center p-2">
                        <span className="text-gray-400 capitalize">{key}:</span>
                        <span className={`font-bold ${parseFloat(value) > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {value}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* System Status */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <FiDatabase /> System Status
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(realtimeData.systemStatus).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center p-2">
                        <span className="text-gray-400 capitalize">{key}:</span>
                        <span className={`font-bold ${
                          value === 'online' || value === '99.9%' ? 'text-green-500' : 'text-yellow-500'
                        }`}>
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Activities */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4">Recent Activities (Last Hour)</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {realtimeData.recentActivities.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-750">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded ${
                          activity.activityType === 'download' ? 'bg-blue-500/20' :
                          activity.activityType === 'view' ? 'bg-green-500/20' :
                          'bg-yellow-500/20'
                        }`}>
                          {activity.activityType === 'download' ? <FiDownload /> :
                           activity.activityType === 'view' ? <FiEye /> :
                           <FiUpload />}
                        </div>
                        <div>
                          <p className="font-medium">
                            {activity.studentId?.fullName || 'Unknown User'}
                          </p>
                          <p className="text-sm text-gray-400">
                            {activity.activityType} • {activity.fileId?.name || 'File'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-400">
                          {new Date(activity.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Export Section */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-bold mb-4">Export Reports</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button
              onClick={() => handleExport('users')}
              disabled={exporting}
              className="bg-blue-500 hover:bg-blue-600 p-4 rounded-lg flex flex-col items-center justify-center transition duration-200 disabled:opacity-50"
            >
              <FiUsers className="w-8 h-8 mb-2" />
              <span>Export Users</span>
              <span className="text-sm text-gray-300">CSV Format</span>
            </button>
            
            <button
              onClick={() => handleExport('classes')}
              disabled={exporting}
              className="bg-green-500 hover:bg-green-600 p-4 rounded-lg flex flex-col items-center justify-center transition duration-200 disabled:opacity-50"
            >
              <FiBook className="w-8 h-8 mb-2" />
              <span>Export Classes</span>
              <span className="text-sm text-gray-300">CSV Format</span>
            </button>
            
            <button
              onClick={() => handleExport('activities')}
              disabled={exporting}
              className="bg-purple-500 hover:bg-purple-600 p-4 rounded-lg flex flex-col items-center justify-center transition duration-200 disabled:opacity-50"
            >
              <FiActivity className="w-8 h-8 mb-2" />
              <span>Export Activities</span>
              <span className="text-sm text-gray-300">CSV Format</span>
            </button>
            
            <button
              onClick={() => handleExport('files')}
              disabled={exporting}
              className="bg-yellow-500 hover:bg-yellow-600 p-4 rounded-lg flex flex-col items-center justify-center transition duration-200 disabled:opacity-50"
            >
              <FiFileText className="w-8 h-8 mb-2" />
              <span>Export Files</span>
              <span className="text-sm text-gray-300">CSV Format</span>
            </button>
          </div>
        </div>

        {/* Footer Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-500">
          <div className="text-center">
            Data last updated: {new Date().toLocaleString()}
          </div>
          <div className="text-center">
            Total records processed: {
              (statistics?.users?.total || 0) + 
              (statistics?.classes?.total || 0) + 
              (statistics?.activities?.total || 0)
            }
          </div>
          <div className="text-center">
            System uptime: {realtimeData?.systemStatus?.uptime || '99.9%'}
          </div>
        </div>
      </div>
    </div>
  );
}