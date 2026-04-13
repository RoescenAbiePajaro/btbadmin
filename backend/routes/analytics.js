// backend/routes/analytics.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Class = require('../models/Class');
const AcademicSetting = require('../models/AcademicSetting');
const File = require('../models/File');
const Click = require('../models/Click');
const FileActivity = require('../models/FileActivity');
const Feedback = require('../models/Feedback');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken'); // ADDED - For proper token verification

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
      return '%Y-%U';
    case 'this_month':
      return '%Y-%m-%d';
    case 'this_year':
      return '%Y-%m';
    default:
      return '%Y-%m-%d';
  }
};

// Helper to format dates for class/school grouping
const getGroupFormatForBucket = (bucket) => {
  switch (bucket) {
    case 'year':
      return '%Y';
    case 'month':
      return '%Y-%m';
    case 'day':
    default:
      return '%Y-%m-%d';
  }
};

// FIXED: Admin middleware with proper JWT verification
const requireAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      error: 'No token provided' 
    });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-this');
    
    if (decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
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
    
    // Wrap each aggregation in try-catch to handle missing data gracefully
    let userStats = [];
    let loginStats = [];
    let downloadStats = [];
    let fileActivityStats = [];
    let deviceStats = [];
    let browserStats = [];
    let osStats = [];
    let hourlyActivity = [];
    let classActivity = [];
    let topFiles = [];
    let userGrowth = [];
    let registrationStats = [];
    let platformEngagement = [];

    try {
      userStats = await User.aggregate([
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
      ]);
    } catch (err) {
      console.error('User stats error:', err);
      userStats = [];
    }

    try {
      loginStats = await Click.aggregate([
        {
          $match: {
            type: 'login',
            location: { $in: ['login_success', 'homepage_login_button'] },
            createdAt: { $gte: dateRange.start, $lte: dateRange.end }
          }
        },
        {
          $group: {
            _id: {
              period: { $dateToString: { format: groupFormat, date: "$createdAt" } },
              location: "$location"
            },
            count: { $sum: 1 },
            uniqueUsers: { $addToSet: "$userId" }
          }
        },
        {
          $group: {
            _id: "$_id.period",
            count: { $sum: "$count" },
            uniqueCount: { $size: { $ifNull: ["$uniqueUsers", []] } },
            locations: {
              $push: {
                location: "$_id.location",
                count: "$count"
              }
            }
          }
        },
        { $sort: { "_id": 1 } }
      ]);
    } catch (err) {
      console.error('Login stats error:', err);
      loginStats = [];
    }

    try {
      downloadStats = await Click.aggregate([
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
      ]);
    } catch (err) {
      console.error('Download stats error:', err);
      downloadStats = [];
    }

    try {
      fileActivityStats = await FileActivity.aggregate([
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
      ]);
    } catch (err) {
      console.error('File activity stats error:', err);
      fileActivityStats = [];
    }

    try {
      deviceStats = await Click.aggregate([
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
      ]);
    } catch (err) {
      console.error('Device stats error:', err);
      deviceStats = [];
    }

    try {
      browserStats = await Click.aggregate([
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
      ]);
    } catch (err) {
      console.error('Browser stats error:', err);
      browserStats = [];
    }

    try {
      osStats = await Click.aggregate([
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
      ]);
    } catch (err) {
      console.error('OS stats error:', err);
      osStats = [];
    }

    try {
      hourlyActivity = await Click.aggregate([
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
      ]);
    } catch (err) {
      console.error('Hourly activity error:', err);
      hourlyActivity = [];
    }

    try {
      classActivity = await FileActivity.aggregate([
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
      ]);
    } catch (err) {
      console.error('Class activity error:', err);
      classActivity = [];
    }

    try {
      topFiles = await FileActivity.aggregate([
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
      ]);
    } catch (err) {
      console.error('Top files error:', err);
      topFiles = [];
    }

    try {
      userGrowth = await User.aggregate([
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
      ]);
    } catch (err) {
      console.error('User growth error:', err);
      userGrowth = [];
    }

    try {
      registrationStats = await Click.aggregate([
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
      ]);
    } catch (err) {
      console.error('Registration stats error:', err);
      registrationStats = [];
    }

    try {
      platformEngagement = await Click.aggregate([
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
      ]);
    } catch (err) {
      console.error('Platform engagement error:', err);
      platformEngagement = [];
    }
    
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
            date: stat._id,
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
              ? platformEngagement[0].avgSessionDuration / (60 * 1000)
              : 0,
            fullMark: 30
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
        }, []).slice(-7),
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
        })).slice(-15),
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
    
    total = await model.countDocuments(filter);
    
    let query = model.find(filter).sort(sort).skip(skip).limit(parseInt(limit));
    
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
      error: 'Failed to fetch filtered data',
      details: error.message
    });
  }
});

// ==================== FEEDBACK ANALYTICS ====================
router.get('/feedback', requireAdmin, async (req, res) => {
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
    
    let feedbackStats = [];
    let feedbackTrends = [];
    let feedbackByCategory = [];
    let feedbackByRating = [];
    let feedbackByRole = [];
    let feedbackByStatus = [];
    let feedbackBySchool = [];

    try {
      feedbackStats = await Feedback.aggregate([
        {
          $match: {
            createdAt: { $gte: dateRange.start, $lte: dateRange.end }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            avgRating: { $avg: '$rating' },
            pending: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            responded: {
              $sum: { $cond: [{ $eq: ['$status', 'responded'] }, 1, 0] }
            }
          }
        }
      ]);
    } catch (err) {
      console.error('Feedback stats error:', err);
      feedbackStats = [];
    }

    try {
      feedbackTrends = await Feedback.aggregate([
        {
          $match: {
            createdAt: { $gte: dateRange.start, $lte: dateRange.end }
          }
        },
        {
          $group: {
            _id: {
              period: { $dateToString: { format: groupFormat, date: "$createdAt" } }
            },
            count: { $sum: 1 },
            avgRating: { $avg: '$rating' },
            pending: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            responded: {
              $sum: { $cond: [{ $eq: ['$status', 'responded'] }, 1, 0] }
            }
          }
        },
        { $sort: { "_id.period": 1 } }
      ]);
    } catch (err) {
      console.error('Feedback trends error:', err);
      feedbackTrends = [];
    }

    try {
      feedbackByCategory = await Feedback.aggregate([
        {
          $match: {
            createdAt: { $gte: dateRange.start, $lte: dateRange.end }
          }
        },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            avgRating: { $avg: '$rating' },
            pending: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            responded: {
              $sum: { $cond: [{ $eq: ['$status', 'responded'] }, 1, 0] }
            }
          }
        },
        { $sort: { count: -1 } }
      ]);
    } catch (err) {
      console.error('Feedback by category error:', err);
      feedbackByCategory = [];
    }

    try {
      feedbackByRating = await Feedback.aggregate([
        {
          $match: {
            createdAt: { $gte: dateRange.start, $lte: dateRange.end }
          }
        },
        {
          $group: {
            _id: '$rating',
            count: { $sum: 1 },
            pending: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            responded: {
              $sum: { $cond: [{ $eq: ['$status', 'responded'] }, 1, 0] }
            }
          }
        },
        { $sort: { "_id": 1 } }
      ]);
    } catch (err) {
      console.error('Feedback by rating error:', err);
      feedbackByRating = [];
    }

    try {
      feedbackByRole = await Feedback.aggregate([
        {
          $match: {
            createdAt: { $gte: dateRange.start, $lte: dateRange.end }
          }
        },
        {
          $group: {
            _id: '$userRole',
            count: { $sum: 1 },
            avgRating: { $avg: '$rating' },
            pending: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            responded: {
              $sum: { $cond: [{ $eq: ['$status', 'responded'] }, 1, 0] }
            }
          }
        },
        { $sort: { count: -1 } }
      ]);
    } catch (err) {
      console.error('Feedback by role error:', err);
      feedbackByRole = [];
    }

    try {
      feedbackByStatus = await Feedback.aggregate([
        {
          $match: {
            createdAt: { $gte: dateRange.start, $lte: dateRange.end }
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgRating: { $avg: '$rating' }
          }
        },
        { $sort: { count: -1 } }
      ]);
    } catch (err) {
      console.error('Feedback by status error:', err);
      feedbackByStatus = [];
    }

    try {
      feedbackBySchool = await Feedback.aggregate([
        {
          $match: {
            createdAt: { $gte: dateRange.start, $lte: dateRange.end }
          }
        },
        {
          $group: {
            _id: '$school',
            count: { $sum: 1 },
            avgRating: { $avg: '$rating' },
            pending: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            responded: {
              $sum: { $cond: [{ $eq: ['$status', 'responded'] }, 1, 0] }
            }
          }
        },
        { $sort: { count: -1 } }
      ]);
    } catch (err) {
      console.error('Feedback by school error:', err);
      feedbackBySchool = [];
    }
    
    const formattedData = {
      summary: feedbackStats[0] || {
        total: 0,
        avgRating: 0,
        pending: 0,
        responded: 0
      },
      
      feedbackTrends: {
        title: 'Feedback Trends Over Time',
        type: 'line',
        data: feedbackTrends.map(trend => ({
          date: trend._id,
          count: trend.count,
          avgRating: parseFloat(trend.avgRating || 0).toFixed(1),
          pending: trend.pending,
          responded: trend.responded
        })),
        lines: [
          { key: 'count', name: 'Total Feedback', color: '#3B82F6' },
          { key: 'avgRating', name: 'Average Rating', color: '#F59E0B' },
          { key: 'pending', name: 'Pending', color: '#EF4444' },
          { key: 'responded', name: 'Responded', color: '#10B981' }
        ]
      },
      
      feedbackByCategory: {
        title: 'Feedback by Category',
        type: 'vertical-bar',
        data: feedbackByCategory.map(cat => ({
          category: cat._id,
          count: cat.count,
          avgRating: parseFloat(cat.avgRating || 0).toFixed(1),
          pending: cat.pending,
          responded: cat.responded
        })),
        xKey: 'category',
        yKeys: ['count'],
        colors: ['#3B82F6']
      },
      
      ratingDistribution: {
        title: 'Rating Distribution',
        type: 'pie',
        data: feedbackByRating.map(rating => ({
          name: `${rating._id} Star${rating._id > 1 ? 's' : ''}`,
          value: rating.count,
          pending: rating.pending,
          responded: rating.responded
        })),
        colors: ['#EF4444', '#F59E0B', '#FCD34D', '#10B981', '#059669']
      },
      
      feedbackByRole: {
        title: 'Feedback by User Role',
        type: 'grouped-bar',
        data: feedbackByRole.map(role => ({
          name: role._id,
          count: role.count,
          avgRating: parseFloat(role.avgRating || 0).toFixed(1),
          pending: role.pending,
          responded: role.responded
        })),
        groups: [
          { key: 'count', name: 'Total Feedback' },
          { key: 'pending', name: 'Pending' },
          { key: 'responded', name: 'Responded' }
        ]
      },
      
      statusDistribution: {
        title: 'Feedback Status Distribution',
        type: 'pie',
        data: feedbackByStatus.map(status => ({
          name: status._id.charAt(0).toUpperCase() + status._id.slice(1),
          value: status.count,
          avgRating: parseFloat(status.avgRating || 0).toFixed(1)
        })),
        colors: ['#F59E0B', '#10B981']
      },
      
      rawData: {
        byCategory: feedbackByCategory,
        byRating: feedbackByRating,
        byRole: feedbackByRole,
        byStatus: feedbackByStatus,
        bySchool: feedbackBySchool
      }
    };
    
    res.json({
      success: true,
      period,
      dateRange: {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString()
      },
      data: formattedData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Feedback analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch feedback analytics',
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
    
    // Build filter object
    const filter = {};
    if (filters.startDate) filter.createdAt = { $gte: new Date(filters.startDate) };
    if (filters.endDate) filter.createdAt = { ...filter.createdAt, $lte: new Date(filters.endDate) };
    if (filters.role) filter.userRole = filters.role;
    if (filters.deviceType) filter.deviceType = filters.deviceType;
    if (filters.browser) filter.browser = filters.browser;
    
    let data = [];
    let model;
    
    switch(type) {
      case 'logins':
        model = Click;
        filter.type = 'login';
        break;
      case 'downloads':
        model = Click;
        filter.type = 'download';
        filter.location = 'homepage_pc_app';
        break;
      case 'file-activities':
        model = FileActivity;
        if (filters.activityType) filter.activityType = filters.activityType;
        if (filters.classCode) filter.classCode = filters.classCode;
        break;
      case 'registrations':
        model = Click;
        filter.type = 'registration';
        break;
      case 'users':
        model = User;
        if (filters.role) filter.role = filters.role;
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid export type'
        });
    }
    
    data = await model.find(filter).limit(10000).lean();
    
    if (format === 'csv') {
      if (data.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No data found for the specified filters'
        });
      }
      
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
    
    res.json({
      success: true,
      data,
      count: data.length
    });
    
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
    
    let activeUsersNow = 0;
    let recentLogins = [];
    let recentDownloads = [];
    let recentFileActivities = [];
    let todayStats = { logins: 0, downloads: 0, fileActivities: 0, newUsers: 0 };
    let systemHealth = { database: 'connected', api: 'online', uptime: process.uptime(), memory: process.memoryUsage(), timestamp: now.toISOString() };

    try {
      activeUsersNow = await User.countDocuments({
        lastLogin: { $gte: new Date(now.getTime() - 15 * 60 * 1000) }
      });
    } catch (err) {
      console.error('Active users error:', err);
    }

    try {
      recentLogins = await Click.find({
        type: 'login',
        createdAt: { $gte: oneHourAgo }
      })
      .populate('userId', 'fullName email role')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    } catch (err) {
      console.error('Recent logins error:', err);
    }

    try {
      recentDownloads = await Click.find({
        type: 'download',
        location: 'homepage_pc_app',
        createdAt: { $gte: oneHourAgo }
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    } catch (err) {
      console.error('Recent downloads error:', err);
    }

    try {
      recentFileActivities = await FileActivity.find({
        createdAt: { $gte: oneHourAgo }
      })
      .populate('studentId', 'fullName email')
      .populate('fileId', 'name originalName')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    } catch (err) {
      console.error('Recent file activities error:', err);
    }

    try {
      todayStats = {
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
      };
    } catch (err) {
      console.error('Today stats error:', err);
    }
    
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
      'GET /api/analytics/realtime',
      'GET /api/analytics/feedback'
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
    console.error('Download tracking error:', error);
    res.status(500).json({ success: false, error: 'Failed to track download' });
  }
});

module.exports = router;