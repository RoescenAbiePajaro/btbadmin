// src/components/admin/AdminDashboard.jsx - CORRECTED VERSION
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  FiUsers, FiBook, FiFileText, FiDownload, 
  FiTrendingUp, FiCalendar, FiFilter, FiDownload as FiDownloadIcon,
  FiLogOut, FiHome, FiBarChart2, FiActivity, FiEye, FiUpload,
  FiClock, FiGlobe, FiMonitor, FiUserCheck, FiDatabase,
  FiAlertCircle, FiCheckCircle, FiRefreshCw, FiSearch,
  FiChevronUp, FiChevronDown, FiMoreVertical
} from 'react-icons/fi';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState(null);
  const [userTrends, setUserTrends] = useState([]);
  const [classTrends, setClassTrends] = useState([]);
  const [activityTrends, setActivityTrends] = useState([]);
  const [filter, setFilter] = useState({
    startDate: '',
    endDate: '',
    department: '',
    role: ''
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('month');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  const fetchDashboardData = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [
        statsRes, 
        userTrendsRes, 
        classTrendsRes, 
        activityTrendsRes
      ] = await Promise.all([
        axios.get('http://localhost:5000/api/dashboard/statistics', { headers }),
        axios.get(`http://localhost:5000/api/dashboard/user-trends?period=${timeRange}`, { headers }),
        axios.get(`http://localhost:5000/api/dashboard/class-trends?period=${timeRange}`, { headers }),
        axios.get(`http://localhost:5000/api/dashboard/activity-trends?period=${timeRange}`, { headers })
      ]);

      if (statsRes.data.success) setStatistics(statsRes.data.statistics);
      if (userTrendsRes.data.success) setUserTrends(userTrendsRes.data.trends || []);
      if (classTrendsRes.data.success) setClassTrends(classTrendsRes.data.creationTrends || []);
      if (activityTrendsRes.data.success) setActivityTrends(activityTrendsRes.data.trends || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please check your connection.');
      
      // Set empty/default data instead of fake data
      setStatistics({
        users: { total: 0, byRole: [], active: 0 },
        classes: { total: 0, active: 0, inactive: 0, mostActive: [] },
        materials: { total: 0, byType: [], downloads: 0 },
        activities: { downloads: 0, views: 0, submissions: 0, total: 0 }
      });
      setUserTrends([]);
      setClassTrends([]);
      setActivityTrends([]);
    } finally {
      setLoading(false);
    }
  };

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

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

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
            {['week', 'month', 'year'].map((range) => (
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
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
            <div className="flex items-center gap-2">
              <FiAlertCircle className="text-red-400" />
              <p className="text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Stats Overview - REAL DATA ONLY */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Users</p>
                <p className="text-3xl font-bold mt-2">
                  {statistics?.users?.total || 0}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {statistics?.users?.byRole?.map(role => (
                    <span key={role._id} className="text-xs px-2 py-1 bg-gray-800 rounded">
                      {role._id}: {role.count}
                    </span>
                  )) || (
                    <span className="text-gray-500 text-sm">No role data</span>
                  )}
                </div>
              </div>
              <FiUsers className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active Classes</p>
                <p className="text-3xl font-bold mt-2">
                  {statistics?.classes?.active || 0}
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Total: {statistics?.classes?.total || 0}
                </p>
              </div>
              <FiBook className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Learning Materials</p>
                <p className="text-3xl font-bold mt-2">
                  {statistics?.materials?.total || 0}
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Downloads: {statistics?.materials?.downloads || 0}
                </p>
              </div>
              <FiFileText className="w-8 h-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Activities</p>
                <p className="text-3xl font-bold mt-2">
                  {statistics?.activities?.total || 0}
                </p>
                <div className="text-gray-400 text-sm mt-2 space-y-1">
                  <div>Views: {statistics?.activities?.views || 0}</div>
                  <div>Downloads: {statistics?.activities?.downloads || 0}</div>
                  <div>Submissions: {statistics?.activities?.submissions || 0}</div>
                </div>
              </div>
              <FiActivity className="w-8 h-8 text-purple-500" />
            </div>
          </div>
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
              <label className="block text-sm text-gray-400 mb-2">Actions</label>
              <div className="flex gap-2">
                <button
                  onClick={handleFilter}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg transition duration-200"
                >
                  Apply Filter
                </button>
                <button
                  onClick={() => setFilter({
                    startDate: '',
                    endDate: '',
                    department: '',
                    role: '',
                    status: ''
                  })}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition duration-200"
                >
                  Clear
                </button>
              </div>
            </div>
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
              { id: 'export', label: 'Export', icon: <FiDownloadIcon /> }
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
              {/* User Registration Chart - REAL DATA */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4">User Registration Trends</h3>
                {userTrends.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={userTrends}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="_id" stroke="#9CA3AF" />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }}
                          labelStyle={{ color: '#9CA3AF' }}
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
                ) : (
                  <div className="h-80 flex items-center justify-center">
                    <p className="text-gray-500">No registration data available for the selected period</p>
                  </div>
                )}
              </div>

              {/* Activity Distribution - REAL DATA */}
              {statistics?.activities?.total > 0 && (
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
                            ].filter(item => item.value > 0)}
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

                  {/* Most Active Classes - REAL DATA */}
                  {statistics?.classes?.mostActive?.length > 0 && (
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                      <h3 className="text-lg font-bold mb-4">Most Active Classes</h3>
                      <div className="space-y-3">
                        {statistics.classes.mostActive.slice(0, 5).map((cls, index) => (
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
                  )}
                </div>
              )}

              {/* No Data Message */}
              {(!statistics?.activities?.total || statistics.activities.total === 0) && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
                  <FiActivity className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-bold mb-2">No Activity Data Yet</h3>
                  <p className="text-gray-500">
                    Activity data will appear here once users start using the platform.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-8">
              {/* User Role Distribution - REAL DATA */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4">User Role Distribution</h3>
                {statistics?.users?.byRole?.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={statistics.users.byRole}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="_id" stroke="#9CA3AF" />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }}
                        />
                        <Bar dataKey="count" name="Users" fill="#3B82F6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-80 flex items-center justify-center">
                    <p className="text-gray-500">No user data available</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'classes' && (
            <div className="space-y-8">
              {/* Class Creation Trends - REAL DATA */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4">Class Creation Trends</h3>
                {classTrends.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={classTrends}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="_id" stroke="#9CA3AF" />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="total" 
                          name="Classes Created" 
                          stroke="#10B981" 
                          strokeWidth={2} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-80 flex items-center justify-center">
                    <p className="text-gray-500">No class creation data available</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'activities' && (
            <div className="space-y-8">
              {/* Activity Timeline - REAL DATA */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4">Activity Timeline</h3>
                {activityTrends.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={activityTrends}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="_id" stroke="#9CA3AF" />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }}
                        />
                        <Bar dataKey="total" name="Total Activities" fill="#8B5CF6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-80 flex items-center justify-center">
                    <p className="text-gray-500">No activity data available for the selected period</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-8">
              {/* Export Section */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2 className="text-lg font-bold mb-4">Export Reports</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => handleExport('users')}
                    disabled={exporting || !statistics?.users?.total}
                    className="bg-blue-500 hover:bg-blue-600 p-6 rounded-lg flex flex-col items-center justify-center transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiUsers className="w-10 h-10 mb-3" />
                    <span className="font-bold">Export Users</span>
                    <span className="text-sm text-gray-300 mt-1">CSV Format</span>
                    <span className="text-xs text-gray-400 mt-2">
                      {statistics?.users?.total || 0} records
                    </span>
                  </button>
                  
                  <button
                    onClick={() => handleExport('classes')}
                    disabled={exporting || !statistics?.classes?.total}
                    className="bg-green-500 hover:bg-green-600 p-6 rounded-lg flex flex-col items-center justify-center transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiBook className="w-10 h-10 mb-3" />
                    <span className="font-bold">Export Classes</span>
                    <span className="text-sm text-gray-300 mt-1">CSV Format</span>
                    <span className="text-xs text-gray-400 mt-2">
                      {statistics?.classes?.total || 0} records
                    </span>
                  </button>
                  
                  <button
                    onClick={() => handleExport('activities')}
                    disabled={exporting || !statistics?.activities?.total}
                    className="bg-purple-500 hover:bg-purple-600 p-6 rounded-lg flex flex-col items-center justify-center transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiActivity className="w-10 h-10 mb-3" />
                    <span className="font-bold">Export Activities</span>
                    <span className="text-sm text-gray-300 mt-1">CSV Format</span>
                    <span className="text-xs text-gray-400 mt-2">
                      {statistics?.activities?.total || 0} records
                    </span>
                  </button>
                </div>
                
                <div className="mt-6 p-4 bg-gray-800 rounded-lg">
                  <h3 className="font-bold mb-2">Export Instructions</h3>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• Apply filters above to export specific data ranges</li>
                    <li>• Exports include all available fields for each record</li>
                    <li>• Files are downloaded as CSV format</li>
                    <li>• Large exports may take a moment to process</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-500">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <FiDatabase className="w-4 h-4" />
              <span>Data last updated: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <FiUserCheck className="w-4 h-4" />
              <span>Total records: {statistics?.users?.total || 0} users</span>
            </div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <FiBook className="w-4 h-4" />
              <span>Active classes: {statistics?.classes?.active || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}