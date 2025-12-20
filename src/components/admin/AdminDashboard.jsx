// src/components/admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell
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
  const [analyticsData, setAnalyticsData] = useState(null);
  const [filteredData, setFilteredData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('30d');
  const [schoolTrends, setSchoolTrends] = useState(null);
  const [schoolTrendPeriod, setSchoolTrendPeriod] = useState('month');
  const [error, setError] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [educatorFileSummary, setEducatorFileSummary] = useState(null);
  const [educatorClassSummary, setEducatorClassSummary] = useState(null);
  const [educatorUsers, setEducatorUsers] = useState({});
  const [educatorSharedFiles, setEducatorSharedFiles] = useState([]);
  const [classCodes, setClassCodes] = useState([]);
  const [academicSettings, setAcademicSettings] = useState({
    schools: [],
    courses: [],
    years: [],
    blocks: []
  });

  // Filter states
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    role: '',
    classCode: '',
    activityType: '',
    deviceType: '',
    browser: ''
  });

  // Helper function to get activity counts
  const getActivityCounts = () => {
    return { views: 0, downloads: 0 };
  };

  // Fetch academic settings for educators
  const fetchAcademicSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch all academic settings in parallel
      const [schoolsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/academic-settings/school', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setAcademicSettings(prev => ({
        ...prev,
        schools: Array.isArray(schoolsRes.data) ? schoolsRes.data.filter(item => item.isActive) : []
      }));
    } catch (error) {
      console.error('Error fetching academic settings:', error);
    }
  };

  // Get school name by ID
  const getSchoolName = (identifier) => {
    if (!identifier) return 'Not specified';
    const school = academicSettings.schools.find(s => s._id === identifier);
    return school ? school.name : identifier;
  };

  // Fetch dashboard statistics
  const fetchDashboardData = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, analyticsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/dashboard/statistics', { headers }),
        axios.get('http://localhost:5000/api/analytics/overview?period=30d', { headers })
      ]);

      if (statsRes.data.success) setStatistics(statsRes.data.statistics);
      
      if (analyticsRes.data.success) {
        const { views, downloads } = getActivityCounts();
        
        // Update statistics with activity data
        setStatistics(prev => ({
          ...prev,
          activities: {
            ...prev.activities,
            total: 0,
            views: views,
            downloads: downloads
          }
        }));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please check your connection.');
      
      setStatistics({
        users: { total: 0, byRole: [], active: 0 },
        classes: { total: 0, active: 0, inactive: 0, mostActive: [] },
        materials: { total: 0, byType: [], downloads: 0, views: 0 },
        activities: { 
          downloads: 0, 
          views: 0, 
          total: 0
        }
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch analytics data
  const fetchAnalyticsData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/analytics/overview?period=${timeRange}`,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache'
          }
        }
      );
      
      if (response.data.success) {
        setAnalyticsData(response.data.charts);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      // Analytics might not be implemented yet, that's OK
    }
  };

  // Fetch filtered data
  const fetchFilteredData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        'http://localhost:5000/api/analytics/filter',
        {
          params: {
            type: activeTab,
            ...filters,
            page: 1,
            limit: 50
          },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data.success) {
        setFilteredData(response.data);
      }
    } catch (error) {
      console.error('Error fetching filtered data:', error);
    }
  };
  
  const fetchEducatorFileSummary = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        'http://localhost:5000/api/files/list',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        const summary = Object.values(
          (response.data.files || []).reduce((acc, file) => {
            const key = file.uploadedBy || 'unknown';
            if (!acc[key]) {
              acc[key] = { educatorId: key, name: file.uploaderName || 'Unknown', total: 0 };
            }
            acc[key].total += 1;
            return acc;
          }, {})
        ).sort((a, b) => b.total - a.total);
        setEducatorFileSummary(summary);
      } else {
        setEducatorFileSummary([]);
      }
    } catch (error) {
      console.error('Error fetching educator file summary:', error);
      setEducatorFileSummary([]);
    }
  };
  
  const fetchEducatorClassSummary = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        'http://localhost:5000/api/analytics/filter',
        {
          params: { type: 'classes', page: 1, limit: 200 },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (response.data.success) {
        const summaryMap = (response.data.data || []).reduce((acc, cls) => {
          const key = cls.educator?._id || 'unknown';
          if (!acc[key]) {
            acc[key] = {
              email: cls.educator?.email || 'N/A',
              fullName: cls.educator?.fullName || 'Unknown',
              totalStudents: 0,
              school: cls.school || null
            };
          }
          acc[key].totalStudents += cls.students?.length || 0;
          if (!acc[key].school && cls.school) acc[key].school = cls.school;
          return acc;
        }, {});
        setEducatorClassSummary(summaryMap);
      } else {
        setEducatorClassSummary({});
      }
    } catch (error) {
      console.error('Error fetching educator class summary:', error);
      setEducatorClassSummary({});
    }
  };

  const fetchEducatorUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        'http://localhost:5000/api/analytics/filter',
        {
          params: { type: 'users', role: 'educator', page: 1, limit: 1000 },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (response.data.success) {
        const map = (response.data.data || []).reduce((acc, user) => {
          acc[user._id] = { email: user.email || 'N/A', school: user.school || null };
          return acc;
        }, {});
        setEducatorUsers(map);
      } else {
        setEducatorUsers({});
      }
    } catch (error) {
      console.error('Error fetching educator users:', error);
      setEducatorUsers({});
    }
  };

  // Fetch all class codes for admin view
  const fetchAllClassCodes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        'http://localhost:5000/api/classes/all',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setClassCodes(response.data.classes || []);
      } else {
        console.warn('Failed to fetch class codes:', response.data.error);
        setClassCodes([]);
      }
    } catch (error) {
      console.error('Error fetching all class codes:', error);
      setClassCodes([]);
    }
  };

  // Fetch all shared files from educators
  const fetchEducatorSharedFiles = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        'http://localhost:5000/api/files/list',
        { 
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (response.data.success) {
        // Group files by educator with their details
        const filesByEducator = (response.data.files || []).reduce((acc, file) => {
          if (file.uploadedBy && file.uploaderName) {
            if (!acc[file.uploadedBy]) {
              acc[file.uploadedBy] = {
                educatorName: file.uploaderName,
                educatorId: file.uploadedBy,
                files: []
              };
            }
            acc[file.uploadedBy].files.push({
              id: file._id,
              name: file.name || file.originalName,
              originalName: file.originalName,
              classCode: file.classCode,
              uploadedAt: file.uploadedAt || file.createdAt,
              size: file.size,
              mimeType: file.mimeType,
              url: file.url,
              type: file.type || 'material'
            });
          }
          return acc;
        }, {});
        
        setEducatorSharedFiles(Object.values(filesByEducator));
      } else {
        setEducatorSharedFiles([]);
      }
    } catch (error) {
      console.error('Error fetching educator shared files:', error);
      setEducatorSharedFiles([]);
    }
  };

  // Fetch school trends
  const fetchSchoolTrends = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/dashboard/school-trends?period=${schoolTrendPeriod}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data.success) {
        setSchoolTrends(response.data.trends);
      }
    } catch (error) {
      console.error('Error fetching school trends:', error);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchAcademicSettings();
  }, []);

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  useEffect(() => {
    fetchSchoolTrends();
  }, [schoolTrendPeriod]);

  useEffect(() => {
    if (activeTab !== 'overview' && activeTab !== 'export') {
      fetchFilteredData();
    }
  }, [activeTab, filters]);
  
  useEffect(() => {
    if (activeTab === 'activities') {
      fetchEducatorFileSummary();
      fetchEducatorClassSummary();
      fetchEducatorUsers();
      fetchEducatorSharedFiles();
      fetchAllClassCodes();
    }
  }, [activeTab]);
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      role: '',
      classCode: '',
      activityType: '',
      deviceType: '',
      browser: ''
    });
  };

  const handleTimeRangeChange = (range) => {
    setTimeRange(range);
  };

  // Chart colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  if (loading && !statistics) {
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
                onClick={() => {
                  fetchDashboardData();
                  fetchAnalyticsData();
                  fetchSchoolTrends();
                }}
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

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
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
                <p className="text-gray-400 text-sm">Classes</p>
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
                <div className="text-gray-400 text-sm mt-2 space-y-1">
                  <div>Views: {statistics?.activities?.views || 0}</div>
                  <div>Downloads: {statistics?.activities?.downloads || 0}</div>
                </div>
              </div>
              <FiFileText className="w-8 h-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total of School Created</p>
                <p className="text-3xl font-bold mt-2">
                  {statistics?.schools?.total || 0}
                </p>
              </div>
              <FiHome className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Page Visits</p>
                <p className="text-3xl font-bold mt-2">
                  {analyticsData?.rawData?.platformMetrics?.pageVisits || 0}
                </p>
              </div>
              <FiEye className="w-8 h-8 text-teal-500" />
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">PC App Downloads</p>
                <p className="text-3xl font-bold mt-2">
                  {analyticsData?.rawData?.platformMetrics?.totalDownloads || 0}
                </p>
              </div>
              <FiDownload className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="mb-8">
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition duration-200 mb-4"
          >
            <FiFilter /> {filterOpen ? 'Hide Filters' : 'Show Filters'}
          </button>
          
          {filterOpen && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-2">End Date</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-2">User Role</label>
                  <select
                    value={filters.role}
                    onChange={(e) => handleFilterChange('role', e.target.value)}
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
                      onClick={fetchFilteredData}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg transition duration-200"
                    >
                      Apply Filters
                    </button>
                    <button
                      onClick={resetFilters}
                      className="flex-1 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition duration-200"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-800">
          <div className="flex space-x-4 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: <FiHome /> },
              { id: 'users', label: 'Users', icon: <FiUsers /> },
              { id: 'classes', label: 'Classes', icon: <FiBook /> },
              { id: 'activities', label: 'Learning Materials', icon: <FiActivity /> },
              { id: 'charts', label: 'Charts', icon: <FiBarChart2 /> },
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
              {/* Platform Metrics */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4 text-white">Platform Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="p-4 bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/20 rounded-lg">
                        <FiUsers className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">User Growth</p>
                        <p className="text-xl font-bold text-white">
                          {statistics?.users?.total || 0} Users
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/20 rounded-lg">
                        <FiBook className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Class Engagement</p>
                        <p className="text-xl font-bold text-white">
                          {statistics?.classes?.active || 0} Active Classes
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500/20 rounded-lg">
                        <FiHome className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Schools Created</p>
                        <p className="text-xl font-bold text-white">
                          {statistics?.schools?.total || 0} Schools
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

             
               
             
            </div>
          )}

          {activeTab === 'charts' && (
            <div className="space-y-8">
              {/* School Trends Chart */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">School Created Trends</h3>
                  <div className="flex gap-2">
                    {['week', 'month', 'year'].map((period) => (
                      <button
                        key={period}
                        onClick={() => setSchoolTrendPeriod(period)}
                        className={`px-3 py-1 rounded-lg text-sm capitalize ${
                          schoolTrendPeriod === period
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={schoolTrends || []}>
                      <defs>
                        <linearGradient id="colorSchools" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="_id" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#8884d8" 
                        fillOpacity={1} 
                        fill="url(#colorSchools)" 
                        name="Schools Created"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* User Role Distribution Chart */}
              {statistics?.users?.byRole && statistics.users.byRole.length > 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-bold mb-4 text-white">User Role Distribution</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statistics.users.byRole.map(role => ({
                            name: role._id,
                            value: role.count
                          }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {statistics.users.byRole.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Activity Distribution Chart */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4 text-white">Learning Materials Distribution</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: 'Views', value: statistics?.activities?.views || 0 },
                        { name: 'Downloads', value: statistics?.activities?.downloads || 0 },
                        { name: 'Total Files', value: statistics?.materials?.total || 0 }
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="name" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }}
                      />
                      <Bar dataKey="value" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Line Chart Example */}
              {analyticsData?.lineCharts?.loginTrends && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-bold mb-4 text-white">Login Trends</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analyticsData.lineCharts.loginTrends.data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" stroke="#9CA3AF" />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }}
                          labelStyle={{ color: '#9CA3AF' }}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="total" 
                          name="Total Logins" 
                          stroke="#3B82F6" 
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="unique" 
                          name="Unique Users" 
                          stroke="#10B981" 
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {analyticsData?.lineCharts?.downloadTrends && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-bold mb-4 text-white">PC App Downloads</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analyticsData.lineCharts.downloadTrends.data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" stroke="#9CA3AF" />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }} />
                        <Legend />
                        <Line type="monotone" dataKey="downloads" name="Downloads" stroke="#F59E0B" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {analyticsData?.lineCharts?.pageVisitTrends && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-bold mb-4 text-white">Page Visits</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analyticsData.lineCharts.pageVisitTrends.data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" stroke="#9CA3AF" />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }} />
                        <Legend />
                        <Line type="monotone" dataKey="visits" name="Visits" stroke="#22C55E" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-8">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4 text-white">User Management</h3>
                {filteredData ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-800">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Role
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            School
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Joined
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {filteredData.data && filteredData.data.length > 0 ? (
                          filteredData.data.map((user, index) => (
                            <tr key={user._id || index} className="hover:bg-gray-800">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                {user.fullName || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                {user.email}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                                  user.role === 'educator' ? 'bg-green-500/20 text-green-400' :
                                  'bg-blue-500/20 text-blue-400'
                                }`}>
                                  {user.role}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                {user.school ? getSchoolName(user.school) : 'Not specified'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  user.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                }`}>
                                  {user.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" className="px-6 py-4 text-center text-gray-400">
                              No user data available
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading user data...</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'classes' && (
            <div className="space-y-8">
              

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4 text-white">Educator Classes Summary</h3>
                {filteredData ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-800">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Educator
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Total Classes
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Active Classes
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Total Students
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            School
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {Object.entries(
                          filteredData.data.reduce((acc, cls) => {
                            const educatorId = cls.educator?._id || 'unknown';
                            if (!acc[educatorId]) {
                              acc[educatorId] = {
                                name: cls.educator?.fullName || 'N/A',
                                email: cls.educator?.email || 'N/A',
                                school: cls.school?.name || 'N/A',
                                totalClasses: 0,
                                activeClasses: 0,
                                totalStudents: 0,
                                classes: []
                              };
                            }
                            acc[educatorId].totalClasses += 1;
                            if (cls.isActive) {
                              acc[educatorId].activeClasses += 1;
                            }
                            acc[educatorId].totalStudents += cls.students?.length || 0;
                            acc[educatorId].classes.push(cls);
                            return acc;
                          }, {})
                        ).map(([educatorId, data]) => (
                          <tr key={educatorId} className="hover:bg-gray-800">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {data.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {data.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {data.totalClasses}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              <span className="px-2 py-1 rounded text-xs bg-green-500/20 text-green-400">
                                {data.activeClasses} Active
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {data.totalStudents}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {data.classes[0]?.school ? getSchoolName(data.classes[0].school) : 'Not specified'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-400">No class data available</p>
                )}
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4 text-white">Class Details</h3>
                {filteredData ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-800">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Class Code
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Class Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Educator
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Students
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {filteredData.data.map((cls, index) => (
                          <tr key={index} className="hover:bg-gray-800">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {cls.classCode}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {cls.className}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {cls.educator?.fullName || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {cls.students?.length || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              <span className={`px-2 py-1 rounded text-xs ${
                                cls.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                              }`}>
                                {cls.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-400">Use filters above to view class data</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'activities' && (
            <div className="space-y-8">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4 text-white">Learning Material Logs</h3>
                {filteredData ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-800">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Educator</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">School</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Total Files Shared</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Total Students</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {Object.entries(
                          (filteredData.data || []).reduce((acc, file) => {
                            const educatorId = file.uploadedBy || file.educator?._id || 'unknown';
                            if (!acc[educatorId]) {
                              acc[educatorId] = {
                                name: file.educator?.fullName || file.uploaderName || 'N/A',
                                email: file.educator?.email || 'N/A',
                                school: file.school || file.educator?.school || null,
                                totalFiles: 0,
                                totalStudents: 0,
                                files: []
                              };
                            }
                            acc[educatorId].totalFiles += 1;
                            acc[educatorId].files.push(file);
                            
                            // Get total students from educatorClassSummary if available
                            if (educatorClassSummary?.[educatorId]?.totalStudents) {
                              acc[educatorId].totalStudents = educatorClassSummary[educatorId].totalStudents;
                            }
                            
                            return acc;
                          }, {})
                        ).map(([educatorId, data]) => (
                          <tr key={educatorId} className="hover:bg-gray-800">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {data.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {data.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {data.school ? getSchoolName(data.school) : 'Not specified'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {data.totalFiles}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {data.totalStudents || 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-400">No learning material data available</p>
                )}
              </div>

              {/* Educator Shared Files Section */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4 text-white">Educator Shared Files</h3>
                {educatorSharedFiles.length > 0 ? (
                  <div className="space-y-6">
                    {educatorSharedFiles.map((educator) => (
                      <div key={educator.educatorId} className="bg-gray-800 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-blue-500/20 rounded-lg">
                            <FiUsers className="w-5 h-5 text-blue-400" />
                          </div>
                          <div>
                            <h4 className="text-white font-semibold">{educator.educatorName}</h4>
                            <p className="text-gray-400 text-sm">{educator.files.length} files shared</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {educator.files.map((file) => (
                            <div key={file.id} className="bg-gray-700 rounded-lg p-3 hover:bg-gray-600 transition-colors">
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0">
                                  {file.mimeType?.startsWith('image/') ? (
                                    <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                                      <FiFileText className="w-5 h-5 text-green-400" />
                                    </div>
                                  ) : file.mimeType === 'application/pdf' ? (
                                    <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                                      <FiFileText className="w-5 h-5 text-red-400" />
                                    </div>
                                  ) : (
                                    <div className="w-10 h-10 bg-gray-500/20 rounded-lg flex items-center justify-center">
                                      <FiFileText className="w-5 h-5 text-gray-400" />
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <h5 className="text-white font-medium text-sm truncate" title={file.name}>
                                    {file.name}
                                  </h5>
                                  <div className="flex flex-wrap items-center gap-2 mt-1">
                                    {(() => {
                                      const classItem = classCodes.find(c => c.classCode === file.classCode);
                                      return (
                                        <>
                                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-900 text-pink-200">
                                            {classItem?.className || file.classCode}
                                          </span>
                                          {classItem?.description && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900 text-blue-200">
                                              {classItem.description}
                                            </span>
                                          )}
                                        </>
                                      );
                                    })()}
                                    <span className="text-xs text-gray-400">
                                      {file.type === 'assignment' ? 'Assignment' : 'Material'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-400 mt-1">
                                    {new Date(file.uploadedAt).toLocaleDateString()}
                                  </p>
                                </div>
                                
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => window.open(file.url, '_blank')}
                                    className="p-1 text-blue-400 hover:text-blue-300 transition-colors"
                                    title="View file"
                                  >
                                    <FiEye className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      const link = document.createElement('a');
                                      link.href = file.url;
                                      link.download = file.originalName || file.name;
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                    }}
                                    className="p-1 text-green-400 hover:text-green-300 transition-colors"
                                    title="Download file"
                                  >
                                    <FiDownload className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="p-4 bg-gray-800 rounded-lg inline-block mb-4">
                      <FiFileText className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-400">No shared files from educators found</p>
                    <p className="text-gray-500 text-sm mt-1">Files shared by educators will appear here</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-8">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <button
                    onClick={() => {
                      setActiveTab('users');
                      setTimeout(() => {
                        alert('Export functionality would be implemented here');
                      }, 100);
                    }}
                    className="bg-blue-500 hover:bg-blue-600 p-6 rounded-lg flex flex-col items-center justify-center transition duration-200"
                  >
                    <FiUsers className="w-10 h-10 mb-3" />
                    <span className="font-bold">Export Users</span>
                    <span className="text-sm text-gray-300 mt-1">CSV Format</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setActiveTab('classes');
                      setTimeout(() => {
                        alert('Export functionality would be implemented here');
                      }, 100);
                    }}
                    className="bg-green-500 hover:bg-green-600 p-6 rounded-lg flex flex-col items-center justify-center transition duration-200"
                  >
                    <FiBook className="w-10 h-10 mb-3" />
                    <span className="font-bold">Export Classes</span>
                    <span className="text-sm text-gray-300 mt-1">CSV Format</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setActiveTab('activities');
                      setTimeout(() => {
                        alert('Export functionality would be implemented here');
                      }, 100);
                    }}
                    className="bg-purple-500 hover:bg-purple-600 p-6 rounded-lg flex flex-col items-center justify-center transition duration-200"
                  >
                    <FiActivity className="w-10 h-10 mb-3" />
                    <span className="font-bold">Export Activities</span>
                    <span className="text-sm text-gray-300 mt-1">CSV Format</span>
                  </button>
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