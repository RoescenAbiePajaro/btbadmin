// src/components/charts/ChartComponent.jsx
import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter, ZAxis,
  ComposedChart, Treemap, FunnelChart, Funnel, LabelList,
  Heatmap
} from 'recharts';

// 1. VERTICAL BAR CHART
export const VerticalBarChart = ({ data, xKey, yKeys = [], colors = [], title }) => {
  const chartData = Array.isArray(data) ? data : [];
  
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 md:p-6">
      {title && <h3 className="text-lg font-bold mb-4 text-white">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey={xKey} stroke="#9CA3AF" />
          <YAxis stroke="#9CA3AF" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1F2937', 
              borderColor: '#374151',
              color: '#fff'
            }}
            labelStyle={{ color: '#9CA3AF' }}
          />
          <Legend />
          {yKeys.map((key, index) => (
            <Bar 
              key={key}
              dataKey={key} 
              name={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              fill={colors[index] || `hsl(${index * 60}, 70%, 60%)`}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// 2. HORIZONTAL BAR CHART
export const HorizontalBarChart = ({ data, xKey, yKey, color = '#3B82F6', title }) => {
  const chartData = Array.isArray(data) ? data : [];
  
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 md:p-6">
      {title && <h3 className="text-lg font-bold mb-4 text-white">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart layout="vertical" data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis type="number" stroke="#9CA3AF" />
          <YAxis type="category" dataKey={xKey} stroke="#9CA3AF" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1F2937', 
              borderColor: '#374151',
              color: '#fff'
            }}
          />
          <Bar dataKey={yKey} fill={color} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// 3. GROUPED BAR CHART
export const GroupedBarChart = ({ data, groups, title }) => {
  const chartData = Array.isArray(data) ? data : [];
  const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#EF4444'];
  
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 md:p-6">
      {title && <h3 className="text-lg font-bold mb-4 text-white">{title}</h3>}
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="name" stroke="#9CA3AF" />
          <YAxis stroke="#9CA3AF" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1F2937', 
              borderColor: '#374151',
              color: '#fff'
            }}
          />
          <Legend />
          {groups.map((group, index) => (
            <Bar 
              key={group.key}
              dataKey={group.key} 
              name={group.name} 
              fill={colors[index % colors.length]} 
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// 4. STACKED BAR CHART
export const StackedBarChart = ({ data, stacks, title }) => {
  const chartData = Array.isArray(data) ? data : [];
  const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#EF4444'];
  
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 md:p-6">
      {title && <h3 className="text-lg font-bold mb-4 text-white">{title}</h3>}
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="period" stroke="#9CA3AF" />
          <YAxis stroke="#9CA3AF" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1F2937', 
              borderColor: '#374151',
              color: '#fff'
            }}
          />
          <Legend />
          {stacks.map((stack, index) => (
            <Bar 
              key={stack.key}
              dataKey={stack.key} 
              name={stack.name} 
              stackId="a"
              fill={colors[index % colors.length]} 
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// 5. LINE CHART
export const LineChartComponent = ({ data, lines, xKey = 'date', title }) => {
  const chartData = Array.isArray(data) ? data : [];
  const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#EF4444'];
  
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 md:p-6">
      {title && <h3 className="text-lg font-bold mb-4 text-white">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey={xKey} stroke="#9CA3AF" />
          <YAxis stroke="#9CA3AF" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1F2937', 
              borderColor: '#374151',
              color: '#fff'
            }}
          />
          <Legend />
          {lines.map((line, index) => (
            <Line 
              key={line.key}
              type="monotone" 
              dataKey={line.key} 
              name={line.name}
              stroke={colors[index % colors.length]} 
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// 6. AREA CHART
export const AreaChartComponent = ({ data, areas, title }) => {
  const chartData = Array.isArray(data) ? data : [];
  const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#EF4444'];
  
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 md:p-6">
      {title && <h3 className="text-lg font-bold mb-4 text-white">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="date" stroke="#9CA3AF" />
          <YAxis stroke="#9CA3AF" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1F2937', 
              borderColor: '#374151',
              color: '#fff'
            }}
          />
          <Legend />
          {areas.map((area, index) => (
            <Area 
              key={area.key}
              type="monotone" 
              dataKey={area.key} 
              name={area.name}
              stroke={colors[index % colors.length]} 
              fill={`${colors[index % colors.length]}20`}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// 7. PIE CHART
export const PieChartComponent = ({ data, dataKey = 'value', nameKey = 'name', colors = [], title }) => {
  const chartData = Array.isArray(data) ? data : [];
  const defaultColors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#EF4444'];
  const chartColors = colors.length > 0 ? colors : defaultColors;
  
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 md:p-6">
      {title && <h3 className="text-lg font-bold mb-4 text-white">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey={dataKey}
            nameKey={nameKey}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1F2937', 
              borderColor: '#374151',
              color: '#fff'
            }}
            formatter={(value) => [value, 'Count']}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// 8. RADAR CHART
export const RadarChartComponent = ({ data, title }) => {
  const chartData = Array.isArray(data) ? data : [];
  
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 md:p-6">
      {title && <h3 className="text-lg font-bold mb-4 text-white">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
          <PolarGrid />
          <PolarAngleAxis dataKey="metric" stroke="#9CA3AF" />
          <PolarRadiusAxis stroke="#9CA3AF" />
          <Radar
            name="Performance"
            dataKey="value"
            stroke="#3B82F6"
            fill="#3B82F6"
            fillOpacity={0.6}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1F2937', 
              borderColor: '#374151',
              color: '#fff'
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

// 9. SCATTER PLOT
export const ScatterPlot = ({ data, xLabel, yLabel, zLabel, title }) => {
  const chartData = Array.isArray(data) ? data : [];
  
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 md:p-6">
      {title && <h3 className="text-lg font-bold mb-4 text-white">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            type="number" 
            dataKey="x" 
            name={xLabel} 
            stroke="#9CA3AF"
            label={{ value: xLabel, position: 'insideBottom', offset: -5 }}
          />
          <YAxis 
            type="number" 
            dataKey="y" 
            name={yLabel} 
            stroke="#9CA3AF"
            label={{ value: yLabel, angle: -90, position: 'insideLeft' }}
          />
          <ZAxis type="number" dataKey="z" range={[50, 400]} name={zLabel} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1F2937', 
              borderColor: '#374151',
              color: '#fff'
            }}
            formatter={(value, name, props) => {
              if (name === 'x') return [value, xLabel];
              if (name === 'y') return [value, yLabel];
              if (name === 'z') return [value, zLabel];
              return [value, name];
            }}
          />
          <Scatter name="Classes" data={chartData} fill="#3B82F6" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

// 10. COMBO CHART (Bar + Line)
export const ComboChart = ({ data, bars, lines, xKey = 'date', title }) => {
  const chartData = Array.isArray(data) ? data : [];
  const barColors = ['#3B82F6', '#10B981', '#8B5CF6'];
  const lineColors = ['#F59E0B', '#EC4899', '#EF4444'];
  
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 md:p-6">
      {title && <h3 className="text-lg font-bold mb-4 text-white">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey={xKey} stroke="#9CA3AF" />
          <YAxis stroke="#9CA3AF" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1F2937', 
              borderColor: '#374151',
              color: '#fff'
            }}
          />
          <Legend />
          {bars.map((bar, index) => (
            <Bar 
              key={bar.key}
              dataKey={bar.key} 
              name={bar.name} 
              fill={barColors[index % barColors.length]} 
              barSize={20}
            />
          ))}
          {lines.map((line, index) => (
            <Line 
              key={line.key}
              type="monotone" 
              dataKey={line.key} 
              name={line.name}
              stroke={lineColors[index % lineColors.length]} 
              strokeWidth={2}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

// 11. HEATMAP (Custom implementation)
export const HeatMapComponent = ({ data, title }) => {
  const chartData = Array.isArray(data) ? data : [];
  const maxActivity = Math.max(...chartData.map(d => d.activity || 0));
  
  const getColor = (value) => {
    const percentage = value / maxActivity;
    if (percentage < 0.25) return 'bg-blue-900';
    if (percentage < 0.5) return 'bg-blue-700';
    if (percentage < 0.75) return 'bg-blue-500';
    return 'bg-blue-300';
  };
  
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 md:p-6">
      {title && <h3 className="text-lg font-bold mb-4 text-white">{title}</h3>}
      <div className="grid grid-cols-6 md:grid-cols-12 gap-1">
        {chartData.map((hourData, index) => (
          <div key={index} className="relative group">
            <div 
              className={`h-12 ${getColor(hourData.activity)} rounded transition-all duration-200 hover:scale-105`}
              title={`${hourData.hour}: ${hourData.activity} activities`}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-medium text-white opacity-80">
                  {hourData.hour.split(':')[0]}
                </span>
              </div>
            </div>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
              {hourData.hour}: {hourData.activity} activities
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center mt-4 text-sm text-gray-400">
        <span>Low Activity</span>
        <div className="flex items-center gap-1">
          {[0, 0.25, 0.5, 0.75, 1].map((percent, i) => (
            <div
              key={i}
              className={`w-6 h-3 ${getColor(percent * maxActivity)}`}
              title={`${Math.round(percent * 100)}% activity`}
            />
          ))}
        </div>
        <span>High Activity</span>
      </div>
    </div>
  );
};

// 12. METRIC CARDS
export const MetricCard = ({ title, value, change, icon, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    yellow: 'bg-yellow-500',
    pink: 'bg-pink-500',
    red: 'bg-red-500'
  };
  
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">{title}</p>
          <p className="text-2xl font-bold text-white mt-2">{value}</p>
          {change && (
            <div className={`flex items-center gap-1 mt-1 text-sm ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {change >= 0 ? '↗' : '↘'} {Math.abs(change)}%
              <span className="text-gray-500 ml-1">from previous period</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]} bg-opacity-20`}>
          {icon}
        </div>
      </div>
    </div>
  );
};