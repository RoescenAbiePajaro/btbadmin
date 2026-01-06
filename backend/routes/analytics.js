// backend/routes/analytics.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Class = require('../models/Class');
const File = require('../models/File');
const Click = require('../models/Click');
const FileActivity = require('../models/FileActivity');
const mongoose = require('mongoose');

// Helper function to get date range
const getDateRange = (period) => {
  const end = new Date();
  const start = new Date();
  
  switch(period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'yesterday':
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case '7d':
      start.setDate(start.getDate() - 7);
      break;
    case '30d':
      start.setDate(start.getDate() - 30);
      break;
    case '90d':
      start.setDate(start.getDate() - 90);
      break;
    case 'this_week':
      start.setDate(start.getDate() - start.getDay());
      start.setHours(0, 0, 0, 0);
      break;
    case 'this_month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'this_year':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      break;
    default:
      start.setDate(start.getDate() - 30);
  }
  
  return { start, end };
};

// Helper to format dates for grouping
const getGroupFormat = (period) => {
  switch(period) {
    case 'today':
      return '%Y-%m-%d %H:00';
    case '7d':
    case 'this_week':
      return '%Y-%m-%d';
    case '30d':
      return '%Y-%m-%d';
    case '90d':
      return '%Y-%U'; // Year-Week number
    case 'this_month':
      return '%Y-%m-%d';
    case 'this_year':
      return '%Y-%m';
    default:
      return '%Y-%m-%d';
  }
};

// Admin middleware
const requireAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      error: 'No token provided' 
    });
  }

  try {
    // Skip JWT verification for now - you should implement proper JWT verification
    // For demo, we'll just check if there's a token
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid token' 
    });
  }
};

// ==================== DASHBOARD OVERVIEW ====================
router.get('/overview', requireAdmin, async (req, res) => {
  try {
    const { period = '30d', startDate, endDate } = req.query;
    
    let dateRange;
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate),
        end: new Date(endDate)
      };
    } else {
      dateRange = getDateRange(period);
    }
    
    const groupFormat = getGroupFormat(period);
    
    // Parallel data fetching
    const [
      userStats,
      loginStats,
      downloadStats,
      fileActivityStats,
      deviceStats,
      browserStats,
      osStats,
      hourlyActivity,
      classActivity,
      topFiles,
      userGrowth,
      registrationStats,
      platformEngagement
    ] = await Promise.all([
      // 1. User Statistics
      User.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 },
            activeLast7d: {
              $sum: {
                $cond: [
                  { 
                    $and: [
                      { $ne: ['$lastLogin', null] },
                      { $gte: ['$lastLogin', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      
      // 2. Login Statistics
      Click.aggregate([
        {
          $match: {
            type: 'login',
            createdAt: { $gte: dateRange.start, $lte: dateRange.end }
          }
        },
        {
          $group: {
            _id: {
              period: { $dateToString: { format: groupFormat, date: "$createdAt" } }
            },
            count: { $sum: 1 },
            uniqueUsers: { $addToSet: "$userId" }
          }
        },
        {
          $addFields: {
            uniqueCount: { $size: "$uniqueUsers" }
          }
        },
        { $sort: { "_id.period": 1 } }
      ]),
      
      // 3. Download Statistics (PC App)
      Click.aggregate([
        {
          $match: {
            type: 'download',
            location: 'homepage_pc_app',
            createdAt: { $gte: dateRange.start, $lte: dateRange.end }
          }
        },
        {
          $group: {
            _id: {
              period: { $dateToString: { format: groupFormat, date: "$createdAt" } }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { "_id.period": 1 } }
      ]),
      
      // 4. File Activity Statistics
      FileActivity.aggregate([
        {
          $match: {
            createdAt: { $gte: dateRange.start, $lte: dateRange.end }
          }
        },
        {
          $group: {
            _id: {
              period: { $dateToString: { format: groupFormat, date: "$createdAt" } },
              type: "$activityType"
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { "_id.period": 1, "_id.type": 1 } }
      ]),
      
      // 5. Device Statistics
      Click.aggregate([
        {
          $match: {
            createdAt: { $gte: dateRange.start, $lte: dateRange.end }
          }
        },
        {
          $group: {
            _id: '$deviceType',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]),
      
      // 6. Browser Statistics
      Click.aggregate([
        {
          $match: {
            createdAt: { $gte: dateRange.start, $lte: dateRange.end },
            browser: { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: '$browser',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      
      // 7. OS Statistics
      Click.aggregate([
        {
          $match: {
            createdAt: { $gte: dateRange.start, $lte: dateRange.end },
            operatingSystem: { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: '$operatingSystem',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      
      // 8. Hourly Activity Pattern
      Click.aggregate([
        {
          $match: {
            createdAt: { $gte: dateRange.start, $lte: dateRange.end }
          }
        },
        {
          $group: {
            _id: { hour: { $hour: "$createdAt" } },
            count: { $sum: 1 }
          }
        },
        { $sort: { "_id.hour": 1 } }
      ]),
      
      // 9. Class Activity Statistics
      FileActivity.aggregate([
        {
          $match: {
            createdAt: { $gte: dateRange.start, $lte: dateRange.end },
            classCode: { $exists: true, $ne: null }
          }
        },
        {
          $lookup: {
            from: 'classes',
            localField: 'classCode',
            foreignField: 'classCode',
            as: 'classInfo'
          }
        },
        {
          $unwind: {
            path: '$classInfo',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $group: {
            _id: '$classCode',
            className: { $first: '$classInfo.className' },
            educatorId: { $first: '$classInfo.educator' },
            views: {
              $sum: { $cond: [{ $eq: ["$activityType", "view"] }, 1, 0] }
            },
            downloads: {
              $sum: { $cond: [{ $eq: ["$activityType", "download"] }, 1, 0] }
            },
            uniqueStudents: { $addToSet: "$studentId" }
          }
        },
        {
          $addFields: {
            totalActivity: { $add: ["$views", "$downloads"] },
            uniqueStudentCount: { $size: "$uniqueStudents" },
            engagementRate: {
              $cond: [
                { $gt: ["$uniqueStudentCount", 0] },
                { $divide: ["$totalActivity", "$uniqueStudentCount"] },
                0
              ]
            }
          }
        },
        { $sort: { totalActivity: -1 } },
        { $limit: 15 }
      ]),
      
      // 10. Top Files by Activity
      FileActivity.aggregate([
        {
          $match: {
            createdAt: { $gte: dateRange.start, $lte: dateRange.end }
          }
        },
        {
          $group: {
            _id: '$fileName',
            views: {
              $sum: { $cond: [{ $eq: ["$activityType", "view"] }, 1, 0] }
            },
            downloads: {
              $sum: { $cond: [{ $eq: ["$activityType", "download"] }, 1, 0] }
            },
            classCodes: { $addToSet: "$classCode" }
          }
        },
        {
          $addFields: {
            totalActivity: { $add: ["$views", "$downloads"] },
            classCount: { $size: "$classCodes" }
          }
        },
        { $sort: { totalActivity: -1 } },
        { $limit: 15 }
      ]),
      
      // 11. User Growth
      User.aggregate([
        {
          $match: {
            createdAt: { $gte: dateRange.start, $lte: dateRange.end }
          }
        },
        {
          $group: {
            _id: {
              period: { $dateToString: { format: groupFormat, date: "$createdAt" } },
              role: "$role"
            },
            count: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: "$_id.period",
            students: {
              $sum: { $cond: [{ $eq: ["$_id.role", "student"] }, "$count", 0] }
            },
            educators: {
              $sum: { $cond: [{ $eq: ["$_id.role", "educator"] }, "$count", 0] }
            },
            admins: {
              $sum: { $cond: [{ $eq: ["$_id.role", "admin"] }, "$count", 0] }
            },
            total: { $sum: "$count" }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      
      // 12. Registration Statistics
      Click.aggregate([
        {
          $match: {
            type: 'registration',
            createdAt: { $gte: dateRange.start, $lte: dateRange.end }
          }
        },
        {
          $group: {
            _id: {
              period: { $dateToString: { format: groupFormat, date: "$createdAt" } },
              role: "$userRole"
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { "_id.period": 1 } }
      ]),
      
      // 13. Platform Engagement (session duration, etc.)
      Click.aggregate([
        {
          $match: {
            createdAt: { $gte: dateRange.start, $lte: dateRange.end },
            type: { $in: ['login', 'view', 'download'] }
          }
        },
        {
          $group: {
            _id: '$userId',
            sessions: { $sum: 1 },
            lastActivity: { $max: "$createdAt" },
            firstActivity: { $min: "$createdAt" }
          }
        },
        {
          $addFields: {
            sessionDuration: {
              $cond: [
                { $gt: ["$sessions", 1] },
                {
                  $divide: [
                    { $subtract: ["$lastActivity", "$firstActivity"] },
                    { $max: [1, { $subtract: ["$sessions", 1] }] }
                  ]
                },
                0
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            avgSessionDuration: { $avg: "$sessionDuration" },
            totalSessions: { $sum: "$sessions" },
            uniqueUsers: { $sum: 1 }
          }
        }
      ])
    ]);
    const pageVisitStats = await Click.aggregate([
      {
        $match: {
          type: 'page_visit',
          createdAt: { $gte: dateRange.start, $lte: dateRange.end }
        }
      },
      {
        $group: {
          _id: {
            period: { $dateToString: { format: groupFormat, date: "$createdAt" } }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.period": 1 } }
    ]);
    
    // Format data for different types of charts
    const formattedData = {
      // 1. BAR CHARTS
      barCharts: {
        userRoleDistribution: {
          title: 'User Role Distribution',
          type: 'vertical-bar',
          data: userStats.map(stat => ({
            role: stat._id,
            total: stat.count,
            active: stat.activeLast7d
          })),
          xKey: 'role',
          yKeys: ['total', 'active'],
          colors: ['#3B82F6', '#10B981']
        },
        
        deviceDistribution: {
          title: 'Device Usage',
          type: 'horizontal-bar',
          data: deviceStats.map(stat => ({
            device: stat._id || 'Unknown',
            count: stat.count
          })),
          xKey: 'device',
          yKey: 'count',
          color: '#8B5CF6'
        },
        
        browserUsage: {
          title: 'Browser Usage',
          type: 'vertical-bar',
          data: browserStats.map(stat => ({
            browser: stat._id,
            count: stat.count
          })),
          xKey: 'browser',
          yKey: 'count',
          color: '#F59E0B'
        },
        
        topActiveClasses: {
          title: 'Top Active Classes',
          type: 'horizontal-bar',
          data: classActivity.slice(0, 10).map(cls => ({
            class: cls.className || cls._id,
            activity: cls.totalActivity,
            students: cls.uniqueStudentCount
          })),
          xKey: 'class',
          yKey: 'activity',
          color: '#EC4899'
        }
      },
      
      // 2. LINE CHARTS
      lineCharts: {
        loginTrends: {
          title: 'Login Trends Over Time',
          type: 'line',
          data: loginStats.map(stat => ({
            date: stat._id.period,
            total: stat.count,
            unique: stat.uniqueCount
          })),
          lines: [
            { key: 'total', name: 'Total Logins', color: '#3B82F6' },
            { key: 'unique', name: 'Unique Users', color: '#10B981' }
          ]
        },
        
        downloadTrends: {
          title: 'PC App Downloads',
          type: 'line',
          data: downloadStats.map(stat => ({
            date: stat._id.period,
            downloads: stat.count
          })),
          lines: [
            { key: 'downloads', name: 'Downloads', color: '#F59E0B' }
          ]
        },
        pageVisitTrends: {
          title: 'Page Visits',
          type: 'line',
          data: pageVisitStats.map(stat => ({
            date: stat._id.period,
            visits: stat.count
          })),
          lines: [
            { key: 'visits', name: 'Visits', color: '#22C55E' }
          ]
        },
        
        userGrowthTrend: {
          title: 'User Growth Over Time',
          type: 'line',
          data: userGrowth.map(stat => ({
            date: stat._id,
            students: stat.students,
            educators: stat.educators,
            admins: stat.admins,
            total: stat.total
          })),
          lines: [
            { key: 'students', name: 'Students', color: '#3B82F6' },
            { key: 'educators', name: 'Educators', color: '#10B981' },
            { key: 'admins', name: 'Admins', color: '#8B5CF6' },
            { key: 'total', name: 'Total', color: '#F59E0B' }
          ]
        }
      },
      
      // 3. AREA CHARTS
      areaCharts: {
        fileActivityTrends: {
          title: 'File Activity Trends',
          type: 'area',
          data: fileActivityStats.reduce((acc, stat) => {
            const period = stat._id.period;
            let existing = acc.find(item => item.date === period);
            if (!existing) {
              existing = { date: period, views: 0, downloads: 0 };
              acc.push(existing);
            }
            if (stat._id.type === 'view') existing.views = stat.count;
            if (stat._id.type === 'download') existing.downloads = stat.count;
            return acc;
          }, []).sort((a, b) => a.date.localeCompare(b.date)),
          areas: [
            { key: 'views', name: 'Views', color: '#8B5CF6' },
            { key: 'downloads', name: 'Downloads', color: '#EC4899' }
          ]
        },
        
        registrationTrends: {
          title: 'Registration Trends',
          type: 'area',
          data: registrationStats.reduce((acc, stat) => {
            const period = stat._id.period;
            const role = stat._id.role;
            let existing = acc.find(item => item.date === period);
            if (!existing) {
              existing = { date: period, students: 0, educators: 0, admins: 0 };
              acc.push(existing);
            }
            if (role === 'student') existing.students = stat.count;
            if (role === 'educator') existing.educators = stat.count;
            if (role === 'admin') existing.admins = stat.count;
            return acc;
          }, []).sort((a, b) => a.date.localeCompare(b.date)),
          areas: [
            { key: 'students', name: 'Students', color: '#3B82F6' },
            { key: 'educators', name: 'Educators', color: '#10B981' },
            { key: 'admins', name: 'Admins', color: '#8B5CF6' }
          ]
        }
      },
      
      // 4. PIE/DOUGHNUT CHARTS
      pieCharts: {
        osDistribution: {
          title: 'Operating System Distribution',
          type: 'pie',
          data: osStats.map(stat => ({
            name: stat._id,
            value: stat.count
          })),
          colors: ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#EF4444']
        },
        
        activityTypeDistribution: {
          title: 'File Activity Types',
          type: 'doughnut',
          data: [
            {
              name: 'Views',
              value: fileActivityStats
                .filter(s => s._id.type === 'view')
                .reduce((sum, s) => sum + s.count, 0)
            },
            {
              name: 'Downloads',
              value: fileActivityStats
                .filter(s => s._id.type === 'download')
                .reduce((sum, s) => sum + s.count, 0)
            }
          ],
          colors: ['#8B5CF6', '#EC4899']
        }
      },
      
      // 5. RADAR CHART
      radarChart: {
        title: 'Platform Performance Metrics',
        type: 'radar',
        data: [
          {
            metric: 'User Growth',
            value: userGrowth.reduce((sum, day) => sum + day.total, 0) || 0,
            fullMark: Math.max(100, userGrowth.reduce((sum, day) => sum + day.total, 0) * 1.5)
          },
          {
            metric: 'Engagement',
            value: platformEngagement[0]?.avgSessionDuration 
              ? platformEngagement[0].avgSessionDuration / (60 * 1000) // Convert to minutes
              : 0,
            fullMark: 30 // 30 minutes max
          },
          {
            metric: 'Activity',
            value: fileActivityStats.reduce((sum, s) => sum + s.count, 0) || 0,
            fullMark: Math.max(100, fileActivityStats.reduce((sum, s) => sum + s.count, 0) * 1.5)
          },
          {
            metric: 'Retention',
            value: userStats.reduce((sum, stat) => sum + stat.activeLast7d, 0) / 
                   Math.max(1, userStats.reduce((sum, stat) => sum + stat.count, 0)) * 100,
            fullMark: 100
          },
          {
            metric: 'Downloads',
            value: downloadStats.reduce((sum, stat) => sum + stat.count, 0) || 0,
            fullMark: Math.max(100, downloadStats.reduce((sum, stat) => sum + stat.count, 0) * 1.5)
          }
        ]
      },
      
      // 6. SCATTER PLOT
      scatterPlot: {
        title: 'Class Engagement Analysis',
        type: 'scatter',
        data: classActivity.map(cls => ({
          x: cls.uniqueStudentCount,
          y: cls.totalActivity,
          z: cls.engagementRate * 100,
          classCode: cls._id,
          className: cls.className
        })),
        xLabel: 'Number of Students',
        yLabel: 'Learning Materials Activities',
        zLabel: 'Engagement Rate (%)'
      },
      
      // 7. HEATMAP (Hourly Activity)
      heatmap: {
        title: 'Hourly Activity Pattern',
        type: 'heatmap',
        data: Array.from({length: 24}, (_, hour) => ({
          hour: `${hour}:00`,
          activity: hourlyActivity.find(h => h._id.hour === hour)?.count || 0
        }))
      },
      
      // 8. STACKED BAR CHART
      stackedBar: {
        title: 'Weekly Activity Breakdown',
        type: 'stacked-bar',
        data: fileActivityStats.reduce((acc, stat) => {
          const period = stat._id.period;
          let existing = acc.find(item => item.period === period);
          if (!existing) {
            existing = { period, views: 0, downloads: 0 };
            acc.push(existing);
          }
          if (stat._id.type === 'view') existing.views = stat.count;
          if (stat._id.type === 'download') existing.downloads = stat.count;
          return acc;
        }, []).slice(-7), // Last 7 periods
        stacks: [
          { key: 'views', name: 'Views', color: '#8B5CF6' },
          { key: 'downloads', name: 'Downloads', color: '#EC4899' }
        ]
      },
      
      // 9. COMBO CHART (Bar + Line)
      comboChart: {
        title: 'Platform Growth & Engagement',
        type: 'combo',
        data: userGrowth.map((growth, index) => ({
          date: growth._id,
          newUsers: growth.total,
          activeUsers: loginStats[index]?.uniqueCount || 0,
          engagement: platformEngagement[0]?.avgSessionDuration 
            ? platformEngagement[0].avgSessionDuration / (60 * 1000)
            : 0
        })).slice(-15), // Last 15 periods
        bars: [
          { key: 'newUsers', name: 'New Users', color: '#3B82F6' },
          { key: 'activeUsers', name: 'Active Users', color: '#10B981' }
        ],
        lines: [
          { key: 'engagement', name: 'Avg Session (min)', color: '#F59E0B' }
        ]
      },
      
      // 10. WATERFALL CHART
      waterfallChart: {
        title: 'User Growth Contribution',
        type: 'waterfall',
        data: userStats.map((stat, index) => ({
          role: stat._id,
          value: stat.count,
          isTotal: index === userStats.length - 1
        }))
      },
      
      // Raw data for tables
      rawData: {
        topFiles: topFiles.map(file => ({
          fileName: file._id,
          views: file.views,
          downloads: file.downloads,
          totalActivity: file.totalActivity,
          classCount: file.classCount
        })),
        
        classActivity: classActivity.map(cls => ({
          classCode: cls._id,
          className: cls.className,
          views: cls.views,
          downloads: cls.downloads,
          totalActivity: cls.totalActivity,
          uniqueStudents: cls.uniqueStudentCount,
          engagementRate: cls.engagementRate.toFixed(2)
        })),
        
        platformMetrics: {
          totalUsers: userStats.reduce((sum, stat) => sum + stat.count, 0),
          activeUsers: userStats.reduce((sum, stat) => sum + stat.activeLast7d, 0),
          totalLogins: loginStats.reduce((sum, stat) => sum + stat.count, 0),
          uniqueLogins: loginStats.reduce((sum, stat) => sum + stat.uniqueCount, 0),
          totalDownloads: downloadStats.reduce((sum, stat) => sum + stat.count, 0),
          pageVisits: pageVisitStats.reduce((sum, stat) => sum + stat.count, 0),
          fileActivities: fileActivityStats.reduce((sum, stat) => sum + stat.count, 0),
          avgSessionDuration: platformEngagement[0]?.avgSessionDuration 
            ? (platformEngagement[0].avgSessionDuration / (60 * 1000)).toFixed(1) + ' min'
            : '0 min',
          sessionsPerUser: platformEngagement[0] 
            ? (platformEngagement[0].totalSessions / platformEngagement[0].uniqueUsers).toFixed(1)
            : '0'
        }
      }
    };
    
    res.json({
      success: true,
      period,
      dateRange: {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString()
      },
      charts: formattedData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics data',
      details: error.message
    });
  }
});

// ==================== FILTERED DATA ENDPOINT ====================
router.get('/filter', requireAdmin, async (req, res) => {
  try {
    const { 
      type, 
      startDate, 
      endDate, 
      role, 
      classCode,
      activityType,
      deviceType,
      browser,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    
    // Build filter object
    const filter = {};
    
    // Date filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    let data;
    let total;
    let model;
    
    switch(type) {
      case 'logins':
        model = Click;
        filter.type = 'login';
        if (role) filter.userRole = role;
        if (deviceType) filter.deviceType = deviceType;
        if (browser) filter.browser = browser;
        break;
        
      case 'downloads':
        model = Click;
        filter.type = 'download';
        filter.location = 'homepage_pc_app';
        if (deviceType) filter.deviceType = deviceType;
        if (browser) filter.browser = browser;
        break;
        
      case 'file-activities':
        model = FileActivity;
        if (activityType) filter.activityType = activityType;
        if (classCode) filter.classCode = classCode;
        if (role) {
          // Need to look up user role
          const users = await User.find({ role }).select('_id');
          filter.studentId = { $in: users.map(u => u._id) };
        }
        break;
        
      case 'registrations':
        model = Click;
        filter.type = 'registration';
        if (role) filter.userRole = role;
        break;
        
      case 'users':
        model = User;
        if (role) filter.role = role;
        break;
        
      case 'classes':
        model = Class;
        if (classCode) filter.classCode = classCode;
        break;
        
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid data type specified'
        });
    }
    
    // Count total documents
    total = await model.countDocuments(filter);
    
    // Fetch data with pagination
    let query = model.find(filter).sort(sort).skip(skip).limit(parseInt(limit));
    
    // Add population based on model
    switch(type) {
      case 'logins':
      case 'downloads':
      case 'registrations':
        query = query.populate('userId', 'fullName email role');
        break;
        
      case 'file-activities':
        query = query
          .populate('studentId', 'fullName email role')
          .populate('fileId', 'name originalName size')
          .populate('educatorId', 'fullName email');
        break;
        
      case 'users':
        query = query.select('-password').populate('enrolledClass', 'classCode className');
        break;
        
      case 'classes':
        query = query
          .populate('educator', 'fullName email')
          .populate('students', 'fullName email');
        break;
    }
    
    data = await query.lean();
    
    // Calculate summary stats
    const summary = {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit))
    };
    
    res.json({
      success: true,
      data,
      summary,
      filters: {
        type,
        startDate,
        endDate,
        role,
        classCode,
        activityType,
        deviceType,
        browser
      }
    });
    
  } catch (error) {
    console.error('Filter error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to filter data',
      details: error.message
    });
  }
});

// ==================== EXPORT DATA ====================
router.get('/export', requireAdmin, async (req, res) => {
  try {
    const { 
      type, 
      format = 'csv',
      ...filters 
    } = req.query;
    
    // Use the filter endpoint to get data
    const filterResponse = await axios.get(`https://btbtestservice.onrender.com/api/analytics/filter`, {
      params: { ...filters, type, limit: 10000 },
      headers: req.headers
    });
    
    if (!filterResponse.data.success) {
      throw new Error(filterResponse.data.error);
    }
    
    const data = filterResponse.data.data;
    
    if (format === 'csv') {
      if (data.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No data found for the specified filters'
        });
      }
      
      // Convert to CSV
      const headers = Object.keys(data[0] || {});
      const csvRows = [
        headers.join(','),
        ...data.map(row => {
          return headers.map(header => {
            const value = row[header];
            if (value === null || value === undefined) return '';
            if (typeof value === 'object') return JSON.stringify(value);
            return `"${String(value).replace(/"/g, '""')}"`;
          }).join(',');
        })
      ];
      
      const filename = `${type}_export_${Date.now()}.csv`;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csvRows.join('\n'));
    }
    
    res.json(filterResponse.data);
    
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export data',
      details: error.message
    });
  }
});

// ==================== REAL-TIME STATS ====================
router.get('/realtime', requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const [
      activeUsersNow,
      recentLogins,
      recentDownloads,
      recentFileActivities,
      todayStats,
      systemHealth
    ] = await Promise.all([
      // Active users in last 15 minutes
      User.countDocuments({
        lastLogin: { $gte: new Date(now.getTime() - 15 * 60 * 1000) }
      }),
      
      // Recent logins
      Click.find({
        type: 'login',
        createdAt: { $gte: oneHourAgo }
      })
      .populate('userId', 'fullName email role')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
      
      // Recent downloads
      Click.find({
        type: 'download',
        location: 'homepage_pc_app',
        createdAt: { $gte: oneHourAgo }
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
      
      // Recent file activities
      FileActivity.find({
        createdAt: { $gte: oneHourAgo }
      })
      .populate('studentId', 'fullName email')
      .populate('fileId', 'name originalName')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
      
      // Today's stats
      {
        logins: await Click.countDocuments({
          type: 'login',
          createdAt: { $gte: todayStart }
        }),
        downloads: await Click.countDocuments({
          type: 'download',
          location: 'homepage_pc_app',
          createdAt: { $gte: todayStart }
        }),
        fileActivities: await FileActivity.countDocuments({
          createdAt: { $gte: todayStart }
        }),
        newUsers: await User.countDocuments({
          createdAt: { $gte: todayStart }
        })
      },
      
      // System health
      {
        database: 'connected',
        api: 'online',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: now.toISOString()
      }
    ]);
    
    res.json({
      success: true,
      timestamp: now.toISOString(),
      activeUsers: activeUsersNow,
      recent: {
        logins: recentLogins,
        downloads: recentDownloads,
        fileActivities: recentFileActivities
      },
      today: todayStats,
      system: systemHealth
    });
    
  } catch (error) {
    console.error('Realtime error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch realtime data'
    });
  }
});

// ==================== TEST ENDPOINT ====================
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Analytics API is working',
    endpoints: [
      'GET /api/analytics/overview',
      'GET /api/analytics/filter',
      'GET /api/analytics/export',
      'GET /api/analytics/realtime'
    ]
  });
});

router.post('/download-homepage', async (req, res) => {
  try {
    const userAgent = req.headers['user-agent'] || req.body.userAgent || '';
    const click = new Click({
      type: 'download',
      location: 'homepage_pc_app',
      userAgent,
      deviceType: req.body.deviceType || 'Unknown',
      browser: req.body.browser || undefined,
      operatingSystem: req.body.operatingSystem || undefined,
      ipAddress: req.ip,
      metadata: req.body.metadata || {}
    });
    await click.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to track download' });
  }
});

router.post('/page-visit', async (req, res) => {
  try {
    const userAgent = req.headers['user-agent'] || req.body.userAgent || '';
    const click = new Click({
      type: 'page_visit',
      location: req.body.location || 'home_page',
      userAgent,
      deviceType: req.body.deviceType || 'Unknown',
      browser: req.body.browser || undefined,
      operatingSystem: req.body.operatingSystem || undefined,
      ipAddress: req.ip,
      metadata: req.body.metadata || {}
    });
    await click.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to track page visit' });
  }
});

module.exports = router;