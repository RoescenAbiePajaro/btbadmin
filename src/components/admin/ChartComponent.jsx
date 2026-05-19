// src/components/admin/ChartComponent.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, ComposedChart, Scatter
} from 'recharts';
import { FiTrendingUp, FiCalendar, FiDownload, FiEye, FiUsers, FiBook, FiPieChart, FiBarChart2 } from 'react-icons/fi';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#F472B6', '#8B5CF6'];

// Role color mapping
const ROLE_COLORS = {
  admin: '#8B5CF6',
  educator: '#F472B6',
  student: '#0088FE'
};

export default function ChartComponent({
  statistics,
  analyticsData,
  timeRange,
  handleTimeRangeChange,
  classStatusData,
  classTrendsData
}) {
  const [dateFilters, setDateFilters] = useState({
    startDate: '',
    endDate: ''
  });
  const [bucket, setBucket] = useState('month');
  const [classTrendsLocal, setClassTrendsLocal] = useState(null);
  const [schoolTrendsLocal, setSchoolTrendsLocal] = useState(null);
  const [loadingTrends, setLoadingTrends] = useState(false);

  // Filter data based on date range
  const filterDataByDateRange = (data) => {
    if (!data || (!dateFilters.startDate && !dateFilters.endDate)) {
      return data;
    }

    return data.filter(item => {
      const itemDate = new Date(item.date || item.label || item._id);
      const startDate = dateFilters.startDate ? new Date(dateFilters.startDate) : null;
      const endDate = dateFilters.endDate ? new Date(dateFilters.endDate) : null;
      
      if (startDate && itemDate < startDate) return false;
      if (endDate && itemDate > endDate) return false;
      return true;
    });
  };

  // Fetch class trends and school trends
  useEffect(() => {
    const fetchTrends = async () => {
      setLoadingTrends(true);
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        const params = {
          bucket,
          ...(dateFilters.startDate ? { startDate: dateFilters.startDate } : {}),
          ...(dateFilters.endDate ? { endDate: dateFilters.endDate } : {})
        };

        const [classRes, schoolRes] = await Promise.all([
          axios.get('https://btbtestservice.onrender.com/api/analytics/classes/active-inactive-trends', { headers, params }),
          axios.get('https://btbtestservice.onrender.com/api/analytics/schools/created-trends', { headers, params })
        ]);

        if (classRes.data?.success) {
          setClassTrendsLocal(classRes.data);
        }
        if (schoolRes.data?.success) {
          setSchoolTrendsLocal(schoolRes.data);
        }
      } catch (error) {
        console.error('Error fetching trends:', error);
        setClassTrendsLocal(null);
        setSchoolTrendsLocal(null);
      } finally {
        setLoadingTrends(false);
      }
    };

    fetchTrends();
  }, [bucket, dateFilters.startDate, dateFilters.endDate]);

  // Use passed data or fetched local data
  const resolvedClassTrends = classTrendsData?.data?.length ? classTrendsData : classTrendsLocal;
  const resolvedSchoolTrends = schoolTrendsLocal;

  // Prepare role data for pie chart
  const rolesData = statistics?.users?.byRole?.map(role => ({ 
    name: role._id, 
    value: role.count,
    color: ROLE_COLORS[role._id] || COLORS[0]
  })) || [];

  // Prepare activity data
  const activityData = [
    { name: 'Views', value: statistics?.activities?.views || 0, color: '#0088FE' },
    { name: 'Downloads', value: statistics?.activities?.downloads || 0, color: '#00C49F' },
    { name: 'Files', value: statistics?.materials?.total || 0, color: '#F472B6' }
  ];

  // Class status summary for pie chart
  const classStatusPieData = [
    { name: 'Active Classes', value: statistics?.classes?.active || 0, color: '#10B981' },
    { name: 'Inactive Classes', value: statistics?.classes?.inactive || 0, color: '#EF4444' }
  ];

  // Custom tooltip for school trends
  const SchoolTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;
    const row = payload[0]?.payload;
    const schools = Array.isArray(row?.schools) ? row.schools : [];
    return (
      <div style={{ backgroundColor: '#1F2937', border: '1px solid #374151', padding: 12, borderRadius: 8, maxWidth: 300 }}>
        <div style={{ color: '#E5E7EB', fontWeight: 600, marginBottom: 6 }}>{label}</div>
        <div style={{ color: '#9CA3AF', marginBottom: 8 }}>
          New Schools: {row?.count ?? 0}<br />
          Total Schools: {row?.cumulative ?? 0}
        </div>
        {schools.length > 0 && (
          <div>
            <div style={{ color: '#9CA3AF', marginBottom: 4 }}>Schools Created:</div>
            <div style={{ color: '#E5E7EB', fontSize: 12, whiteSpace: 'normal' }}>
              {schools.join(', ')}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Custom tooltip for class status
  const ClassTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;
    return (
      <div style={{ backgroundColor: '#1F2937', border: '1px solid #374151', padding: 12, borderRadius: 8 }}>
        <div style={{ color: '#E5E7EB', fontWeight: 600, marginBottom: 6 }}>{label}</div>
        {payload.map((p, idx) => (
          <div key={idx} style={{ color: p.color, marginBottom: 4 }}>
            {p.name}: {p.value}
          </div>
        ))}
        <div style={{ color: '#9CA3AF', marginTop: 6 }}>
          Total: {(payload[0]?.payload?.active || 0) + (payload[0]?.payload?.inactive || 0)}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Filter Controls */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FiCalendar /> Chart Filters
          </h3>
          <div className="flex items-center gap-3">
            <select
              value={timeRange}
              onChange={(e) => handleTimeRangeChange(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="this_year">This Year</option>
            </select>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <select
            value={bucket}
            onChange={(e) => setBucket(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="year">Yearly</option>
            <option value="month">Monthly</option>
            <option value="day">Daily</option>
          </select>
          <input
            type="date"
            value={dateFilters.startDate}
            onChange={(e) => setDateFilters(prev => ({ ...prev, startDate: e.target.value }))}
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <input
            type="date"
            value={dateFilters.endDate}
            onChange={(e) => setDateFilters(prev => ({ ...prev, endDate: e.target.value }))}
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <button
            onClick={() => setDateFilters({ startDate: '', endDate: '' })}
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-white transition"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* ACTIVE / INACTIVE CLASS TRENDS - Stacked Bar Chart (at overview) */}
      {resolvedClassTrends?.data?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FiBook className="text-violet-400" /> Active vs Inactive Classes Over Time
            </h3>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                Active Classes
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                Inactive Classes
              </span>
            </div>
          </div>
          
          {loadingTrends ? (
            <div className="h-80 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-violet-500"></div>
            </div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={filterDataByDateRange(resolvedClassTrends.data)}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="label" 
                    stroke="#9CA3AF" 
                    tick={{ fontSize: 11 }}
                    interval={bucket === 'day' ? 6 : 0}
                    angle={-35}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip content={<ClassTooltip />} />
                  <Legend />
                  <Bar 
                    dataKey="active" 
                    name="Active Classes" 
                    fill="#10B981" 
                    stackId="stack"
                    radius={[4, 0, 0, 4]}
                  />
                  <Bar 
                    dataKey="inactive" 
                    name="Inactive Classes" 
                    fill="#EF4444" 
                    stackId="stack"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          
          {/* Summary Stats */}
          {resolvedClassTrends.summary && (
            <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-gray-800">
              <div className="text-center">
                <p className="text-gray-400 text-sm">Total Active</p>
                <p className="text-xl font-bold text-green-400">{resolvedClassTrends.summary.totalActive}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-sm">Total Inactive</p>
                <p className="text-xl font-bold text-red-400">{resolvedClassTrends.summary.totalInactive}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-sm">Total Classes</p>
                <p className="text-xl font-bold text-white">{resolvedClassTrends.summary.totalClasses}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Class Status Distribution - Pie Chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
          <FiPieChart className="text-violet-400" /> Current Class Status Distribution
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={classStatusPieData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                innerRadius={60}
                dataKey="value"
              >
                {classStatusPieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }}
                formatter={(value, name) => [value, name]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Schools Created Over Time - Area Chart */}
      {resolvedSchoolTrends?.data?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
            <FiTrendingUp className="text-violet-400" /> Schools Created Over Time
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={filterDataByDateRange(resolvedSchoolTrends.data)} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" stroke="#9CA3AF" />
                <YAxis yAxisId="right" orientation="right" stroke="#F59E0B" />
                <Tooltip content={<SchoolTooltip />} />
                <Legend />
                <Area 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="count" 
                  name="New Schools" 
                  stroke="#A855F7" 
                  fill="#A855F7" 
                  fillOpacity={0.25} 
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="cumulative" 
                  name="Total Schools (Cumulative)" 
                  stroke="#F59E0B" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* School Names List */}
          {resolvedSchoolTrends.data.slice(-5).some(item => item.schools?.length > 0) && (
            <div className="mt-4 bg-gray-800 rounded-lg p-4">
              <div className="text-sm text-gray-300 font-medium mb-2">Recently Created Schools</div>
              <div className="space-y-2">
                {resolvedSchoolTrends.data.slice(-5).reverse().map((row) => (
                  row.schools && row.schools.length > 0 && (
                    <div key={row.date} className="text-sm">
                      <span className="text-gray-400">{row.date}:</span>{' '}
                      <span className="text-gray-300">{row.schools.slice(0, 3).join(', ')}</span>
                      {row.schools.length > 3 && (
                        <span className="text-gray-500"> +{row.schools.length - 3} more</span>
                      )}
                    </div>
                  )
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* User Role Distribution - Pie Chart */}
      {rolesData.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
            <FiUsers className="text-violet-400" /> User Role Distribution
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={rolesData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  dataKey="value"
                >
                  {rolesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }}
                  formatter={(value, name) => [value, name]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-gray-800">
            {rolesData.map(role => (
              <div key={role.name} className="text-center">
                <p className="text-gray-400 text-sm capitalize">{role.name}s</p>
                <p className="text-xl font-bold" style={{ color: role.color }}>{role.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Learning Materials Activity - Bar Chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
          <FiEye className="text-violet-400" /> Learning Materials Analytics
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activityData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }}
                formatter={(value) => [value.toLocaleString(), 'Count']}
              />
              <Legend />
              <Bar dataKey="value" name="Count" radius={[8, 8, 0, 0]}>
                {activityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-gray-800">
          <div className="text-center">
            <p className="text-gray-400 text-sm">Total Views</p>
            <p className="text-xl font-bold text-blue-400">{statistics?.activities?.views?.toLocaleString() || 0}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-400 text-sm">Total Downloads</p>
            <p className="text-xl font-bold text-green-400">{statistics?.activities?.downloads?.toLocaleString() || 0}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-400 text-sm">Total Files</p>
            <p className="text-xl font-bold text-pink-400">{statistics?.materials?.total?.toLocaleString() || 0}</p>
          </div>
        </div>
      </div>
      

      {/* Login Trends (if available from analyticsData) */}
      {analyticsData?.lineCharts?.loginTrends?.data?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
            <FiTrendingUp className="text-violet-400" /> Login Trends Over Time
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filterDataByDateRange(analyticsData.lineCharts.loginTrends.data)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }} />
                <Legend />
                <Line type="monotone" dataKey="total" name="Total Logins" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="unique" name="Unique Users" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* PC App Downloads Trend */}
      {analyticsData?.lineCharts?.downloadTrends?.data?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
            <FiDownload className="text-orange-400" /> PC App Downloads Over Time
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filterDataByDateRange(analyticsData.lineCharts.downloadTrends.data)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }} />
                <Area type="monotone" dataKey="downloads" name="Downloads" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}