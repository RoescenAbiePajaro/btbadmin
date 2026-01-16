import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ExportClassesSummary, ExportClassDetails, ExportUsers } from './ExportComponents.jsx';
import FeedbackComponent from './FeedbackComponent.jsx';
import ChartComponent from './ChartComponent.jsx';
import ClassTabComponent from './ClassTabComponent.jsx';
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
    browser: ''
  });

  // Helper function to format file size
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Add this function near the top of your component
  const debugEducatorData = (educatorSharedFiles) => {
    console.log('=== DEBUG: Educator Shared Files ===');
    console.log('Total educators:', educatorSharedFiles.length);
    educatorSharedFiles.forEach((educator, index) => {
      console.log(`Educator ${index + 1}:`, {
        name: educator.educatorName,
        id: educator.educatorId,
        email: educator.educatorEmail,
        school: educator.educatorSchool,
        filesCount: educator.files?.length || 0,
        files: educator.files?.map(f => ({ name: f.name, classCode: f.classCode }))
      });
    });
    console.log('===================================');
  };

  // Fetch academic settings for educators
  const fetchAcademicSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch all academic settings in parallel
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
      
      // Process analytics response - THIS IS THE KEY FIX
      if (analyticsRes.data.success) {
        setAnalyticsData(analyticsRes.data.charts);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please check your connection.');
      
      // Set fallback data for both states
      setStatistics({
        users: { total: 0, byRole: [], active: 0 },
        classes: { total: 0, active: 0, inactive: 0, mostActive: [] },
        materials: { total: 0, byType: [], downloads: 0, views: 0 },
        activities: { 
          downloads: 0, 
          views: 0, 
          total: 0
        },
        schools: { total: 0 } // Make sure this exists
      });
      
      // Also set fallback for analyticsData
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
      // Analytics might not be implemented yet, that's OK
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
            includeSchool: true // Request school data
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
      // First try new endpoint
      const token = localStorage.getItem('token');
      
      // Test with multiple endpoints to see which one works
      const endpoints = [
        'https://btbtestservice.onrender.com/api/admin/all-files',
        'https://btbtestservice.onrender.com/api/files/list?all=true',
        'https://btbtestservice.onrender.com/api/files/list'
      ];
      
      let response = null;
      let lastError = null;
      
      for (const endpoint of endpoints) {
        try {
          console.log('Trying endpoint:', endpoint);
          response = await axios.get(endpoint, { 
            headers: { Authorization: `Bearer ${token}` }
          });
          if (response.data.success) {
            console.log('Success with endpoint:', endpoint, 'Files count:', response.data.files?.length);
            break;
          }
        } catch (err) {
          lastError = err;
          console.log('Failed with endpoint:', endpoint, err.message);
        }
      }
      
      if (!response || !response.data.success) {
        throw new Error('All endpoints failed: ' + (lastError?.message || 'Unknown error'));
      }
      
      // Process files
      const files = response.data.files || [];
      console.log('Total files found:', files.length);
      
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
            educatorSchool: file.uploadedBy?.school || null,
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
      console.log('Educators found:', educatorsArray.length);
      educatorsArray.forEach(educator => {
        console.log(`- ${educator.educatorName}: ${educator.files.length} files`);
      });
      
      setEducatorSharedFiles(educatorsArray);
      
    } catch (error) {
      console.error('Error in fetchEducatorSharedFiles:', error);
      
      // Create dummy data for testing
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
        },
        {
          educatorName: 'Educator 2',
          educatorId: 'edu2',
          educatorEmail: 'educator2@example.com',
          educatorSchool: 'Test School 2',
          files: [
            {
              id: '2',
              name: 'Science Notes.docx',
              originalName: 'Science Notes.docx',
              classCode: 'SCI201',
              uploadedAt: new Date().toISOString(),
              size: 512 * 1024,
              mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              url: '#',
              type: 'material'
            }
          ]
        }
      ];
      
      console.log('Using dummy data:', dummyEducators);
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
    if (educatorSharedFiles.length > 0) {
      debugEducatorData(educatorSharedFiles);
    }
  }, [educatorSharedFiles]);

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

          {activeTab === 'feedback' && (
            <FeedbackComponent
              feedbackStats={feedbackStats}
              feedbackData={[]} // Pass empty array, component will fetch its own
              feedbackLoading={false}
              fetchFeedbackData={() => {}} // Pass empty function, component will use its own
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
            <div className="space-y-8">
              <div className="flex items-center justify-between mb-4">
                <div className="relative w-full sm:w-96">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search users by name, email, role, school..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <ExportUsers filteredData={filteredData} filters={filters} deriveUserSchool={deriveUserSchool} />
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">User Management</h3>
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
                          (filters.role ? filteredData.data.filter(u => u.role === filters.role) : filteredData.data).filter(user => {
                            if (!userSearch) return true;
                            const searchText = userSearch.toLowerCase();
                            const searchableText = [
                              user.fullName || '',
                              user.email || '',
                              user.role || '',
                              deriveUserSchool(user),
                              user.isActive ? 'active' : 'inactive',
                              user.createdAt ? new Date(user.createdAt).toLocaleDateString() : ''
                            ].join(' ').toLowerCase();
                            return searchableText.includes(searchText);
                          }).map((user, index) => {
                            // Get school for educator from their classes
                            let userSchool = user.school;
                            
                            if (user.role === 'educator') {
                              // Try to get school from educatorClassSummary first
                              if (educatorClassSummary?.[user._id]?.school) {
                                userSchool = educatorClassSummary[user._id].school;
                              } 
                              // If not found, fetch from class codes
                              else if (classCodes.length > 0) {
                                // Find classes created by this educator
                                const educatorClasses = classCodes.filter(cls => 
                                  cls.educator?._id === user._id || 
                                  cls.educatorId === user._id
                                );
                                
                                if (educatorClasses.length > 0) {
                                  // Get the first class's school (assuming all classes belong to same school)
                                  userSchool = educatorClasses[0]?.school;
                                }
                              }
                            }
                            
                            return (
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
                                    user.role === 'educator' ? 'bg-pink-500/20 text-pink-400' :
                                    'bg-blue-500/20 text-blue-400'
                                  }`}>
                                    {user.role}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                  {userSchool ? getSchoolName(userSchool) : 'Not specified'}
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
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan="8" className="px-6 py-4 text-center text-gray-400">
                              No user data available
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-violet-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading user data...</p>
                  </div>
                )}
              </div>
            </div>
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
            <div className="space-y-8">
              <div className="flex items-center justify-between mb-4">
                <div className="relative w-full sm:w-96">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={materialSearch}
                    onChange={(e) => setMaterialSearch(e.target.value)}
                    placeholder="Search materials, educators, files..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>
              
              {/* Educator Summary Section - Unique Educators */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4 text-white">Educators Summary</h3>
                {educatorSharedFiles.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-800">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">#</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Educator Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">School</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Total Files Shared</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Total Classes</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Total Students</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {Object.entries(
                          (materialSearch ? educatorSharedFiles.filter(educator => {
                            const q = materialSearch.toLowerCase();
                            const nameEmail = [educator.educatorName, educator.educatorSchool].filter(Boolean).join(' ').toLowerCase();
                            const fileMatch = educator.files?.some(f => [f.name, f.originalName, f.classCode].filter(Boolean).join(' ').toLowerCase().includes(q));
                            return nameEmail.includes(q) || fileMatch;
                          }) : educatorSharedFiles).reduce((acc, educator, index) => {
                            const educatorId = educator.educatorId || 'unknown';
                            if (!acc[educatorId]) {
                              acc[educatorId] = {
                                index: index + 1,
                                educatorId: educatorId,
                                name: educator.educatorName || 'N/A',
                                school: educator.educatorSchool || educatorUsers[educatorId]?.school || educatorClassSummary?.[educatorId]?.school || null,
                                totalFiles: educator.files.length,
                                // Count unique classes for this educator
                                totalClasses: new Set(educator.files.map(f => f.classCode)).size,
                                files: educator.files,
                                // Get unique class codes
                                classCodes: [...new Set(educator.files.map(f => f.classCode))]
                              };
                            } else {
                              // Merge files from same educator if they appear multiple times
                              acc[educatorId].files = [...acc[educatorId].files, ...educator.files];
                              acc[educatorId].totalFiles += educator.files.length;
                              acc[educatorId].classCodes = [...new Set([...acc[educatorId].classCodes, ...educator.files.map(f => f.classCode)])];
                              acc[educatorId].totalClasses = acc[educatorId].classCodes.length;
                            }
                            return acc;
                          }, {})
                        ).map(([educatorId, data], idx) => (
                          <tr key={educatorId} className="hover:bg-gray-800">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {idx + 1}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              <div className="font-medium text-white">{data.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {data.school ? getSchoolName(data.school) : 'Not specified'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900 text-blue-200">
                                {data.totalFiles} files
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900 text-green-200">
                                {data.totalClasses} classes
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-900 text-purple-200">
                                {educatorClassSummary?.[educatorId]?.totalStudents || 0} students
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              <button
                                onClick={() => {
                                  // You can implement a modal or expandable view here
                                  const scrollToElement = document.getElementById(`educator-${educatorId}`);
                                  if (scrollToElement) {
                                    scrollToElement.scrollIntoView({ behavior: 'smooth' });
                                  }
                                }}
                                className="text-blue-400 hover:text-blue-300 transition-colors text-sm"
                              >
                                View Files
                              </button>
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

              {/* Educator Shared Files Section - Separated by Educator */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-6 text-white">Files Shared by Educator</h3>
                {educatorSharedFiles.length > 0 ? (
                  <div className="space-y-8">
                    {/* First, group educators by ID to avoid duplicates */}
                    {Object.entries(
                      educatorSharedFiles.reduce((acc, educator) => {
                        const educatorId = educator.educatorId || 'unknown';
                        if (!acc[educatorId]) {
                          acc[educatorId] = {
                            ...educator,
                            files: [...educator.files]
                          };
                        } else {
                          // Merge files from same educator
                          acc[educatorId].files = [...acc[educatorId].files, ...educator.files];
                        }
                        return acc;
                      }, {})
                    ).map(([educatorId, educator]) => {
                      // Filter files based on search if needed
                      const filteredFiles = materialSearch 
                        ? educator.files.filter(file => {
                            const q = materialSearch.toLowerCase();
                            const fileText = [
                              file.name, 
                              file.originalName, 
                              file.classCode,
                              file.type
                            ].filter(Boolean).join(' ').toLowerCase();
                            return fileText.includes(q);
                          })
                        : educator.files;

                      if (filteredFiles.length === 0 && materialSearch) return null;

                      return (
                        <div key={educatorId} id={`educator-${educatorId}`} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                          {/* Educator Header */}
                          <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-blue-500/20 rounded-lg">
                                <FiUsers className="w-6 h-6 text-blue-400" />
                              </div>
                              <div>
                                <h4 className="text-white font-semibold text-lg">{educator.educatorName}</h4>
                                <div className="flex flex-wrap items-center gap-3 mt-2">
                                  <span className="text-sm text-gray-300">
                                    School: {educator.educatorSchool || educatorUsers[educatorId]?.school || 'Not specified'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 mt-3">
                                  <span className="text-sm text-blue-300">
                                    {filteredFiles.length} files
                                  </span>
                                  <span className="text-sm text-green-300">
                                    {new Set(filteredFiles.map(f => f.classCode)).size} classes
                                  </span>
                                  <span className="text-sm text-purple-300">
                                    {educatorClassSummary?.[educatorId]?.totalStudents || 0} students
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Files List - View and Download only, no cards */}
                          {filteredFiles.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead className="bg-gray-900">
                                  <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">File Name</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Class</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Type</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Uploaded</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Size</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                  {filteredFiles.map((file) => {
                                    const classItem = classCodes.find(c => c.classCode === file.classCode);
                                    return (
                                      <tr key={file.id} className="hover:bg-gray-750">
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                                          <div className="flex items-center gap-3">
                                            {file.mimeType?.startsWith('image/') ? (
                                              <div className="p-2 bg-green-500/10 rounded">
                                                <FiFileText className="w-4 h-4 text-green-400" />
                                              </div>
                                            ) : file.mimeType === 'application/pdf' ? (
                                              <div className="p-2 bg-red-500/10 rounded">
                                                <FiFileText className="w-4 h-4 text-red-400" />
                                              </div>
                                            ) : (
                                              <div className="p-2 bg-gray-500/10 rounded">
                                                <FiFileText className="w-4 h-4 text-gray-400" />
                                              </div>
                                            )}
                                            <div className="truncate max-w-xs" title={file.name}>
                                              {file.name}
                                            </div>
                                          </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                                          <div className="flex flex-col">
                                            <span className="text-white">{classItem?.className || file.classCode}</span>
                                            {classItem?.description && (
                                              <span className="text-xs text-gray-400">{classItem.description}</span>
                                            )}
                                          </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                                          <span className={`px-2 py-1 rounded text-xs ${
                                            file.type === 'assignment' 
                                              ? 'bg-orange-500/20 text-orange-400' 
                                              : 'bg-blue-500/20 text-blue-400'
                                          }`}>
                                            {file.type || 'material'}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                                          {file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                                          {formatFileSize(file.size)}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                                          <div className="flex items-center gap-2">
                                            <button
                                              onClick={() => window.open(file.url, '_blank')}
                                              className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded transition-colors"
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
                                              className="p-1.5 text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded transition-colors"
                                              title="Download file"
                                            >
                                              <FiDownload className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="text-center py-6">
                              <p className="text-gray-400">No files found matching your search</p>
                            </div>
                          )}
                        </div>
                      );
                    }).filter(Boolean) /* Remove null entries */}
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
        </div>
      </div>
    </div>
  );
}