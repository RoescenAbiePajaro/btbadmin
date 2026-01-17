import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ExportClassesSummary, ExportClassDetails, ExportUsers } from './ExportComponents.jsx';
import FeedbackComponent from './FeedbackComponent.jsx';
import ChartComponent from './ChartComponent.jsx';
import ClassTabComponent from './ClassTabComponent.jsx';
import LearningMaterialsComponent from './LearningMaterialsComponent.jsx';
import OverviewTabComponent from './OverviewTabComponent.jsx';
import UsersTabComponent from './UsersTabComponent.jsx';
import {
  FiUsers, FiBook, FiFileText, FiDownload, 
  FiTrendingUp, FiCalendar, FiFilter,
  FiLogOut, FiHome, FiBarChart2, FiActivity, FiEye, FiUpload,
  FiClock, FiGlobe, FiMonitor, FiUserCheck, FiDatabase,
  FiAlertCircle, FiCheckCircle, FiRefreshCw, FiSearch,
  FiChevronUp, FiChevronDown, FiMoreVertical, FiMessageSquare, FiStar, FiSend, FiX
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
  const [educatorClassSummary, setEducatorClassSummary] = useState({});
  const [educatorUsers, setEducatorUsers] = useState({});
  const [educatorSharedFiles, setEducatorSharedFiles] = useState([]);
  const [classCodes, setClassCodes] = useState([]);
  const [academicSettings, setAcademicSettings] = useState({
    schools: [],
    courses: [],
    years: [],
    blocks: []
  });
  const [feedbackStats, setFeedbackStats] = useState(null);
  const [classSearch, setClassSearch] = useState('');
  const [materialSearch, setMaterialSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [classTrends, setClassTrends] = useState(null);
  const [classTrendPeriod, setClassTrendPeriod] = useState('month');

  // Filter states
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    role: '',
    classCode: '',
    activityType: '',
    deviceType: '',
    browser: '',
    sortOrder: 'newest' // Added sortOrder to filters
  });

  // Helper function to format file size
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Fetch academic settings for educators
  const fetchAcademicSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const [schoolsRes] = await Promise.all([
        axios.get('https://btbtestservice.onrender.com/api/academic-settings/school', {
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

  const deriveUserSchool = (user) => {
    let userSchool = user.school;
    if (user.role === 'educator') {
      if (educatorClassSummary?.[user._id]?.school) {
        userSchool = educatorClassSummary[user._id].school;
      } else if (classCodes.length > 0) {
        const educatorClasses = classCodes.filter(cls => cls.educator?._id === user._id || cls.educatorId === user._id);
        if (educatorClasses.length > 0) {
          userSchool = educatorClasses[0]?.school;
        }
      }
    }
    return userSchool ? getSchoolName(userSchool) : 'Not specified';
  };

  // Fetch dashboard statistics
  const fetchDashboardData = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, analyticsRes] = await Promise.all([
        axios.get('https://btbtestservice.onrender.com/api/dashboard/statistics', { headers }),
        axios.get('https://btbtestservice.onrender.com/api/analytics/overview?period=30d', { headers })
      ]);

      if (statsRes.data.success) {
        setStatistics(statsRes.data.statistics);
      }
      
      if (analyticsRes.data.success) {
        setAnalyticsData(analyticsRes.data.charts);
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
        },
        schools: { total: 0 }
      });
      
      setAnalyticsData({
        rawData: {
          platformMetrics: {
            pageVisits: 0,
            totalDownloads: 0
          }
        },
        lineCharts: {
          downloadTrends: { data: [] },
          pageVisitTrends: { data: [] }
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
        `https://btbtestservice.onrender.com/api/analytics/overview?period=${timeRange}`,
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
    }
  };

  // Fetch filtered data
  const fetchFilteredData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        'https://btbtestservice.onrender.com/api/analytics/filter',
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
        'https://btbtestservice.onrender.com/api/files/list',
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
        'https://btbtestservice.onrender.com/api/analytics/filter',
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
        'https://btbtestservice.onrender.com/api/analytics/filter',
        {
          params: { 
            type: 'users', 
            role: 'educator', 
            page: 1, 
            limit: 1000,
            includeSchool: true
          },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (response.data.success) {
        const map = (response.data.data || []).reduce((acc, user) => {
          acc[user._id] = { 
            email: user.email || 'N/A', 
            school: user.school || null 
          };
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
        'https://btbtestservice.onrender.com/api/classes/all',
        { 
          headers: { Authorization: `Bearer ${token}` },
          params: { includeSchool: true, includeEducator: true } 
        }
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

  const fetchEducatorSharedFiles = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const endpoints = [
        'https://btbtestservice.onrender.com/api/admin/all-files',
        'https://btbtestservice.onrender.com/api/files/list?all=true',
        'https://btbtestservice.onrender.com/api/files/list'
      ];
      
      let response = null;
      let lastError = null;
      
      for (const endpoint of endpoints) {
        try {
          response = await axios.get(endpoint, { 
            headers: { Authorization: `Bearer ${token}` }
          });
          if (response.data.success) {
            break;
          }
        } catch (err) {
          lastError = err;
        }
      }
      
      if (!response || !response.data.success) {
        throw new Error('All endpoints failed: ' + (lastError?.message || 'Unknown error'));
      }
      
      const files = response.data.files || [];
      
      // Group by educator
      const filesByEducator = {};
      
      files.forEach(file => {
        const educatorId = file.uploadedBy?._id || file.uploadedBy || 'unknown_' + Math.random();
        const educatorName = file.uploaderName || file.uploadedBy?.fullName || 'Unknown Educator';
        
        if (!filesByEducator[educatorId]) {
          filesByEducator[educatorId] = {
            educatorName: educatorName,
            educatorId: educatorId,
            educatorEmail: file.uploadedBy?.email || 'N/A',
            educatorSchool: file.uploadedBy?.school || educatorUsers[educatorId]?.school || null,
            files: []
          };
        }
        
        filesByEducator[educatorId].files.push({
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
      });
      
      const educatorsArray = Object.values(filesByEducator);
      setEducatorSharedFiles(educatorsArray);
      
    } catch (error) {
      console.error('Error in fetchEducatorSharedFiles:', error);
      
      const dummyEducators = [
        {
          educatorName: 'Educator 1',
          educatorId: 'edu1',
          educatorEmail: 'educator1@example.com',
          educatorSchool: 'Test School 1',
          files: [
            {
              id: '1',
              name: 'Math Lesson.pdf',
              originalName: 'Math Lesson.pdf',
              classCode: 'MATH101',
              uploadedAt: new Date().toISOString(),
              size: 1024 * 1024,
              mimeType: 'application/pdf',
              url: '#',
              type: 'material'
            }
          ]
        }
      ];
      
      setEducatorSharedFiles(dummyEducators);
    }
  };

  // Fetch school trends
  const fetchSchoolTrends = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `https://btbtestservice.onrender.com/api/dashboard/school-trends?period=${schoolTrendPeriod}`,
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

  // Fetch class trends
  const fetchClassTrends = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `https://btbtestservice.onrender.com/api/dashboard/class-trends?period=${classTrendPeriod}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data.success) {
        setClassTrends(response.data);
      }
    } catch (error) {
      console.error('Error fetching class trends:', error);
    }
  };

  // Fetch feedback statistics only for the overview card
  const fetchFeedbackStats = async () => {
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

  useEffect(() => {
    fetchDashboardData();
    fetchAcademicSettings();
    fetchFeedbackStats();
  }, []);

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  useEffect(() => {
    fetchSchoolTrends();
  }, [schoolTrendPeriod]);

  useEffect(() => {
    fetchClassTrends();
  }, [classTrendPeriod]);

  useEffect(() => {
    if (activeTab !== 'overview') {
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

  useEffect(() => {
    if (activeTab === 'users') {
      fetchEducatorClassSummary();
      fetchAllClassCodes();
      fetchEducatorUsers();
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
      browser: '',
      sortOrder: 'newest'
    });
  };

  const handleTimeRangeChange = (range) => {
    setTimeRange(range);
  };

  if (loading && !statistics) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500 mb-4"></div>
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-4">
              <h1 className="text-base sm:text-xl font-bold flex items-center gap-2">
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
                  fetchClassTrends();
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
                <p className="text-gray-400 text-sm">Total Feedback</p>
                <p className="text-3xl font-bold mt-2">
                  {feedbackStats?.total || 0}
                </p>
              </div>
              <FiMessageSquare className="w-8 h-8 text-indigo-500" />
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

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-800">
          <div className="flex space-x-4 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: <FiHome /> },
              { id: 'users', label: 'Users', icon: <FiUsers /> },
              { id: 'classes', label: 'Classes', icon: <FiBook /> },
              { id: 'activities', label: 'Learning Materials', icon: <FiActivity /> },
              { id: 'feedback', label: 'Feedback', icon: <FiMessageSquare /> },
              { id: 'charts', label: 'Charts', icon: <FiBarChart2 /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-2 px-4 flex items-center gap-2 whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'border-b-2 border-violet-500 text-violet-500' 
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
            <OverviewTabComponent statistics={statistics} />
          )}

          {activeTab === 'feedback' && (
            <FeedbackComponent
              feedbackStats={feedbackStats}
              feedbackData={[]}
              feedbackLoading={false}
              fetchFeedbackData={() => {}}
              fetchFeedbackStats={fetchFeedbackStats}
              fetchEducatorClassSummary={fetchEducatorClassSummary}
              fetchAllClassCodes={fetchAllClassCodes}
              fetchEducatorUsers={fetchEducatorUsers}
              getSchoolName={getSchoolName}
              educatorClassSummary={educatorClassSummary}
              classCodes={classCodes}
              educatorUsers={educatorUsers}
              activeTab={activeTab}
            />
          )}

          {activeTab === 'charts' && (
            <ChartComponent
              statistics={statistics}
              analyticsData={analyticsData}
              schoolTrends={schoolTrends}
              schoolTrendPeriod={schoolTrendPeriod}
              setSchoolTrendPeriod={setSchoolTrendPeriod}
              classTrends={classTrends}
              classTrendPeriod={classTrendPeriod}
              setClassTrendPeriod={setClassTrendPeriod}
              timeRange={timeRange}
              handleTimeRangeChange={handleTimeRangeChange}
            />
          )}

          {activeTab === 'users' && (
            <UsersTabComponent
              filteredData={filteredData}
              userSearch={userSearch}
              setUserSearch={setUserSearch}
              filters={filters}
              handleFilterChange={handleFilterChange}
              resetFilters={resetFilters}
              deriveUserSchool={deriveUserSchool}
              getSchoolName={getSchoolName}
              educatorClassSummary={educatorClassSummary}
              classCodes={classCodes}
            />
          )}

          {activeTab === 'classes' && (
            <ClassTabComponent
              filteredData={filteredData}
              classSearch={classSearch}
              setClassSearch={setClassSearch}
              getSchoolName={getSchoolName}
              educatorClassSummary={educatorClassSummary}
              classCodes={classCodes}
              fetchAllClassCodes={fetchAllClassCodes}
              fetchEducatorClassSummary={fetchEducatorClassSummary}
              fetchEducatorUsers={fetchEducatorUsers}
              activeTab={activeTab}
            />
          )}

          {activeTab === 'activities' && (
            <LearningMaterialsComponent
              materialSearch={materialSearch}
              setMaterialSearch={setMaterialSearch}
              educatorSharedFiles={educatorSharedFiles}
              educatorClassSummary={educatorClassSummary}
              educatorUsers={educatorUsers}
              classCodes={classCodes}
              getSchoolName={getSchoolName}
              formatFileSize={formatFileSize}
            />
          )}
        </div>
      </div>
    </div>
  );
}