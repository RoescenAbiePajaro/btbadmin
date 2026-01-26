// src/components/admin/ChartComponent.jsx
import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { FiTrendingUp, FiCalendar } from 'react-icons/fi';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function ChartComponent({
  statistics,
  analyticsData,
  timeRange,
  handleTimeRangeChange,
  classStatusData,
  classTrendsData,
  feedbackData
}) {
  const [dateFilters, setDateFilters] = useState({
    startDate: '',
    endDate: ''
  });

  // Filter data based on date range
  const filterDataByDateRange = (data) => {
    if (!data || (!dateFilters.startDate && !dateFilters.endDate)) {
      return data;
    }

    return data.filter(item => {
      const itemDate = new Date(item.date || item._id);
      const startDate = dateFilters.startDate ? new Date(dateFilters.startDate) : null;
      const endDate = dateFilters.endDate ? new Date(dateFilters.endDate) : null;
      
      if (startDate && itemDate < startDate) return false;
      if (endDate && itemDate > endDate) return false;
      return true;
    });
  };

  return (
    <div className="space-y-8">
      {/* Date Range Filters */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FiCalendar /> Chart Filters
          </h3>
        </div>
        <div className="flex flex-wrap gap-4">
          <input
            type="date"
            value={dateFilters.startDate}
            onChange={(e) => setDateFilters(prev => ({ ...prev, startDate: e.target.value }))}
            placeholder="Start Date"
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <input
            type="date"
            value={dateFilters.endDate}
            onChange={(e) => setDateFilters(prev => ({ ...prev, endDate: e.target.value }))}
            placeholder="End Date"
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <button
            onClick={() => setDateFilters({ startDate: '', endDate: '' })}
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-white"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Active / Inactive Class Trends – stacked bar (green=active, red=inactive), x-axis: year, month, day */}
      {classTrendsData?.data?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
            <FiTrendingUp /> Active / Inactive Class Trends
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={filterDataByDateRange(classTrendsData.data)}
                margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="label"
                  stroke="#9CA3AF"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={-35}
                  textAnchor="end"
                  height={60}
                />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }}
                  labelStyle={{ color: '#9CA3AF' }}
                />
                <Legend />
                <Bar dataKey="active" name="Active" fill="#10B981" stackId="stack" radius={[0, 0, 0, 0]} />
                <Bar dataKey="inactive" name="Inactive" fill="#EF4444" stackId="stack" radius={[0, 0, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

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

      {/* Active/Inactive Classes Status Distribution */}
      {classStatusData?.data?.statusDistribution && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4 text-white">Class Status Distribution</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={classStatusData.data.statusDistribution.data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {classStatusData.data.statusDistribution.data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={classStatusData.data.statusDistribution.colors[index]} />
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

      {/* Class Status Trends */}
      {classStatusData?.data?.statusTrends && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4 text-white">Class Status Trends Over Time</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filterDataByDateRange(classStatusData.data.statusTrends.data)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }}
                  labelStyle={{ color: '#9CA3AF' }}
                />
                <Legend />
                {classStatusData.data.statusTrends.lines.map((line, index) => (
                  <Line 
                    key={line.key}
                    type="monotone" 
                    dataKey={line.key} 
                    name={line.name}
                    stroke={line.color} 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Class Status by School */}
      {classStatusData?.data?.statusBySchool && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4 text-white">Class Status by School</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classStatusData.data.statusBySchool.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }}
                />
                <Legend />
                {classStatusData.data.statusBySchool.groups.map((group, index) => (
                  <Bar 
                    key={group.key}
                    dataKey={group.key} 
                    name={group.name}
                    fill={['#10B981', '#EF4444'][index]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Login Trends - Clustered Bar Chart */}
      {analyticsData?.lineCharts?.loginTrends && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4 text-white">Login Trends by User Role</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filterDataByDateRange(analyticsData.lineCharts.loginTrends.data)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }}
                  labelStyle={{ color: '#9CA3AF' }}
                />
                <Legend />
                <Bar 
                  dataKey="total" 
                  name="Total Logins" 
                  fill="#3B82F6" 
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="unique" 
                  name="Unique Users" 
                  fill="#10B981" 
                  radius={[4, 4, 0, 0]}
                />
                {analyticsData.lineCharts.loginTrends.data[0]?.students && (
                  <Bar 
                    dataKey="students" 
                    name="Student Logins" 
                    fill="#F59E0B" 
                    radius={[4, 4, 0, 0]}
                  />
                )}
                {analyticsData.lineCharts.loginTrends.data[0]?.educators && (
                  <Bar 
                    dataKey="educators" 
                    name="Educator Logins" 
                    fill="#EF4444" 
                    radius={[4, 4, 0, 0]}
                  />
                )}
                {analyticsData.lineCharts.loginTrends.data[0]?.admins && (
                  <Bar 
                    dataKey="admins" 
                    name="Admin Logins" 
                    fill="#8B5CF6" 
                    radius={[4, 4, 0, 0]}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {analyticsData?.lineCharts?.downloadTrends && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4 text-white">PC App Downloads</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filterDataByDateRange(analyticsData.lineCharts.downloadTrends.data)}>
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
              <LineChart data={filterDataByDateRange(analyticsData.lineCharts.pageVisitTrends.data)}>
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

      {/* Feedback Summary */}
      {feedbackData?.data?.summary && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4 text-white">Feedback Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Total Feedback</p>
              <p className="text-2xl font-bold text-white">{feedbackData.data.summary.total}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Average Rating</p>
              <p className="text-2xl font-bold text-white">{feedbackData.data.summary.avgRating.toFixed(1)}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Pending</p>
              <p className="text-2xl font-bold text-yellow-400">{feedbackData.data.summary.pending}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Responded</p>
              <p className="text-2xl font-bold text-green-400">{feedbackData.data.summary.responded}</p>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Trends */}
      {feedbackData?.data?.feedbackTrends && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4 text-white">Feedback Trends Over Time</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filterDataByDateRange(feedbackData.data.feedbackTrends.data)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }}
                  labelStyle={{ color: '#9CA3AF' }}
                />
                <Legend />
                {feedbackData.data.feedbackTrends.lines.map((line, index) => (
                  <Line 
                    key={line.key}
                    type="monotone" 
                    dataKey={line.key} 
                    name={line.name}
                    stroke={line.color} 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Feedback by Category */}
      {feedbackData?.data?.feedbackByCategory && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4 text-white">Feedback by Category</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={feedbackData.data.feedbackByCategory.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="category" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }}
                />
                <Bar dataKey="count" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Feedback Rating Distribution */}
      {feedbackData?.data?.ratingDistribution && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4 text-white">Rating Distribution</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={feedbackData.data.ratingDistribution.data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {feedbackData.data.ratingDistribution.data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={feedbackData.data.ratingDistribution.colors[index]} />
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

      {/* Feedback Status Distribution */}
      {feedbackData?.data?.statusDistribution && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4 text-white">Feedback Status Distribution</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={feedbackData.data.statusDistribution.data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {feedbackData.data.statusDistribution.data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={feedbackData.data.statusDistribution.colors[index]} />
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

      {/* Feedback by User Role */}
      {feedbackData?.data?.feedbackByRole && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4 text-white">Feedback by User Role</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={feedbackData.data.feedbackByRole.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }}
                />
                <Legend />
                {feedbackData.data.feedbackByRole.groups.map((group, index) => (
                  <Bar 
                    key={group.key}
                    dataKey={group.key} 
                    name={group.name}
                    fill={['#3B82F6', '#EF4444', '#10B981'][index]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

    </div>
  );
}