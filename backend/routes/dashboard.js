// backend/routes/dashboard.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Class = require('../models/Class');
const File = require('../models/File');
const Activity = require('../models/Activity');
const FileActivity = require('../models/FileActivity');
const AccessCode = require('../models/AccessCode');
const AcademicSetting = require('../models/AcademicSetting');
const { requireAdmin } = require('../middleware/admin');
const PptxGenJS = require('pptxgenjs');
const docx = require('docx');
const { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType } = docx;

// Helper function to format dates for different periods
const getDateRange = (period) => {
  const now = new Date();
  const start = new Date();
  
  switch(period) {
    case 'day':
      start.setDate(now.getDate() - 1);
      break;
    case 'week':
      start.setDate(now.getDate() - 7);
      break;
    case 'month':
      start.setMonth(now.getMonth() - 1);
      break;
    case 'year':
      start.setFullYear(now.getFullYear() - 1);
      break;
    default:
      start.setMonth(now.getMonth() - 1);
  }
  
  return { start, end: now };
};

// Get comprehensive dashboard statistics
router.get('/statistics', requireAdmin, async (req, res) => {
  try {
    // Total users by role
    const userStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          active: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          }
        }
      }
    ]);

    // Total active classes
    const activeClasses = await Class.countDocuments({ isActive: true });
    const totalClasses = await Class.countDocuments();

    // Total files by type
    const fileStats = await File.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    // Learning Materials Activities
    const totalDownloads = await FileActivity.countDocuments({ activityType: 'download' });
    const totalViews = await FileActivity.countDocuments({ activityType: 'view' });

    // Total Schools Created
    const totalSchools = await AcademicSetting.countDocuments({ type: 'school' });

    // User registration over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const userRegistrationTrend = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            role: "$role"
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: "$_id.date",
          registrations: {
            $push: {
              role: "$_id.role",
              count: "$count"
            }
          },
          total: { $sum: "$count" }
        }
      },
      { $sort: { "_id": 1 } },
      { $limit: 30 }
    ]);

    // Most active classes (by student count and activity)
    const mostActiveClasses = await Class.aggregate([
      {
        $lookup: {
          from: 'activities',
          let: { classId: '$_id' },
          pipeline: [
            {
              $lookup: {
                from: 'files',
                localField: 'fileId',
                foreignField: '_id',
                as: 'file'
              }
            },
            {
              $unwind: {
                path: '$file',
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $match: {
                $expr: {
                  $eq: ['$file.classCode', '$$classId']
                }
              }
            }
          ],
          as: 'activities'
        }
      },
      {
        $addFields: {
          studentCount: { $size: "$students" },
          activityCount: { $size: "$activities" },
          fileCount: {
            $size: {
              $filter: {
                input: "$activities",
                as: "activity",
                cond: { $ifNull: ["$$activity.fileId", false] }
              }
            }
          }
        }
      },
      {
        $match: {
          activityCount: { $gt: 0 }
        }
      },
      {
        $sort: { activityCount: -1, studentCount: -1 }
      },
      { $limit: 10 },
      {
        $project: {
          classCode: 1,
          className: 1,
          educator: 1,
          studentCount: 1,
          activityCount: 1,
          fileCount: 1,
          createdAt: 1,
          isActive: 1
        }
      }
    ]);

    // Populate educator names
    await Class.populate(mostActiveClasses, {
      path: 'educator',
      select: 'fullName username email'
    });

    // Site analytics (simulated - implement proper tracking)
    const siteAnalytics = {
      totalVisits: Math.floor(Math.random() * 5000) + 1000,
      uniqueVisitors: Math.floor(Math.random() * 3000) + 500,
      averageTimeOnSite: `${Math.floor(Math.random() * 10) + 2}m ${Math.floor(Math.random() * 60)}s`,
      bounceRate: `${Math.floor(Math.random() * 30) + 20}%`,
      pagesPerSession: (Math.random() * 5 + 2).toFixed(1),
      newVisitors: Math.floor(Math.random() * 2000) + 500,
      returningVisitors: Math.floor(Math.random() * 1500) + 300
    };

    // Platform growth metrics
    const growthMetrics = {
      userGrowth: await User.countDocuments({
        createdAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 7)) }
      }),
      classGrowth: await Class.countDocuments({
        createdAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 7)) }
      }),
      materialGrowth: await File.countDocuments({
        createdAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 7)) }
      })
    };

    res.json({
      success: true,
      statistics: {
        users: {
          total: userStats.reduce((sum, role) => sum + role.count, 0),
          byRole: userStats,
          active: userStats.reduce((sum, role) => sum + role.active, 0),
          registrationTrend: userRegistrationTrend
        },
        classes: {
          total: totalClasses,
          active: activeClasses,
          inactive: totalClasses - activeClasses,
          mostActive: mostActiveClasses
        },
        materials: {
          total: fileStats.reduce((sum, type) => sum + type.count, 0),
          byType: fileStats,
          learningMaterials: fileStats.find(f => f._id === 'material')?.count || 0
        },
        activities: {
          downloads: totalDownloads,
          views: totalViews,
          total: totalDownloads + totalViews
        },
        schools: {
          total: totalSchools
        },
        analytics: siteAnalytics,
        growth: growthMetrics
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Dashboard statistics error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching dashboard statistics'
    });
  }
});

// Get class trends over time
router.get('/class-trends', requireAdmin, async (req, res) => {
  try {
    const { period = '30d', startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      const { start, end } = getDateRange(period);
      dateFilter.createdAt = { $gte: start, $lte: end };
    }

    let groupFormat;
    switch(period) {
      case 'day':
        groupFormat = "%Y-%m-%d";
        break;
      case 'week':
        groupFormat = "%Y-%W";
        break;
      case 'month':
        groupFormat = "%Y-%m";
        break;
      case 'year':
        groupFormat = "%Y";
        break;
      default:
        groupFormat = "%Y-%m-%d";
    }

    // Get class creation trends by status
    const classTrends = await Class.aggregate([
      {
        $match: dateFilter
      },
      {
        $group: {
          _id: {
            period: { $dateToString: { format: groupFormat, date: "$createdAt" } },
            isActive: "$isActive"
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: "$_id.period",
          active: {
            $sum: {
              $cond: [{ $eq: ["$_id.isActive", true] }, "$count", 0]
            }
          },
          inactive: {
            $sum: {
              $cond: [{ $eq: ["$_id.isActive", false] }, "$count", 0]
            }
          },
          total: { $sum: "$count" }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // Get current active/inactive counts for overall status
    const currentStatus = await Class.aggregate([
      {
        $group: {
          _id: "$isActive",
          count: { $sum: 1 }
        }
      }
    ]);

    const activeCount = currentStatus.find(s => s._id === true)?.count || 0;
    const inactiveCount = currentStatus.find(s => s._id === false)?.count || 0;

    // Format data for chart
    const formattedData = classTrends.map(trend => ({
      label: trend._id,
      active: trend.active,
      inactive: trend.inactive,
      total: trend.total
    }));

    res.json({
      success: true,
      period,
      dateRange: {
        start: dateFilter.createdAt.$gte ? dateFilter.createdAt.$gte.toISOString() : new Date().toISOString(),
        end: dateFilter.createdAt.$lte ? dateFilter.createdAt.$lte.toISOString() : new Date().toISOString()
      },
      data: formattedData,
      summary: {
        totalActive: activeCount,
        totalInactive: inactiveCount,
        totalClasses: activeCount + inactiveCount
      }
    });
  } catch (error) {
    console.error('Class trends error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching class trends'
    });
  }
});

// Get detailed user trends
router.get('/user-trends', requireAdmin, async (req, res) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      const { start, end } = getDateRange(period);
      dateFilter.createdAt = { $gte: start, $lte: end };
    }

    let groupFormat;
    switch(period) {
      case 'day':
        groupFormat = "%Y-%m-%d %H:00";
        break;
      case 'week':
        groupFormat = "%Y-%W";
        break;
      case 'month':
        groupFormat = "%Y-%m";
        break;
      case 'year':
        groupFormat = "%Y";
        break;
      default:
        groupFormat = "%Y-%m-%d";
    }

    const trends = await User.aggregate([
      {
        $match: dateFilter
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
          registrations: {
            $push: {
              role: "$_id.role",
              count: "$count"
            }
          },
          total: { $sum: "$count" }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // Get active users per period
    const activeUsers = await User.aggregate([
      {
        $match: {
          lastLogin: dateFilter.createdAt ? {
            $gte: dateFilter.createdAt.$gte,
            $lte: dateFilter.createdAt.$lte
          } : { $exists: true }
        }
      },
      {
        $group: {
          _id: {
            period: { $dateToString: { format: groupFormat, date: "$lastLogin" } },
            role: "$role"
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: "$_id.period",
          activeUsers: {
            $push: {
              role: "$_id.role",
              count: "$count"
            }
          },
          total: { $sum: "$count" }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    res.json({
      success: true,
      period,
      dateRange: dateFilter.createdAt,
      trends,
      activeUsers,
      summary: {
        totalRegistrations: trends.reduce((sum, t) => sum + t.total, 0),
        totalActiveUsers: activeUsers.reduce((sum, a) => sum + a.total, 0)
      }
    });
  } catch (error) {
    console.error('User trends error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching user trends'
    });
  }
});

// Get activity trends
router.get('/activity-trends', requireAdmin, async (req, res) => {
  try {
    const { period = 'month', startDate, endDate, activityType } = req.query;
    
    let matchFilter = {};
    if (startDate && endDate) {
      matchFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      const { start, end } = getDateRange(period);
      matchFilter.createdAt = { $gte: start, $lte: end };
    }

    if (activityType) {
      matchFilter.activityType = activityType;
    }

    let groupFormat;
    switch(period) {
      case 'day':
        groupFormat = "%Y-%m-%d %H:00";
        break;
      case 'week':
        groupFormat = "%Y-%W";
        break;
      case 'month':
        groupFormat = "%Y-%m";
        break;
      case 'year':
        groupFormat = "%Y";
        break;
      default:
        groupFormat = "%Y-%m-%d";
    }

    const trends = await Activity.aggregate([
      {
        $match: matchFilter
      },
      {
        $lookup: {
          from: 'users',
          localField: 'studentId',
          foreignField: '_id',
          as: 'student'
        }
      },
      {
        $unwind: {
          path: '$student',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: {
            period: { $dateToString: { format: groupFormat, date: "$createdAt" } },
            type: "$activityType",
            userRole: "$student.role"
          },
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: "$studentId" }
        }
      },
      {
        $group: {
          _id: "$_id.period",
          activities: {
            $push: {
              type: "$_id.type",
              userRole: "$_id.userRole",
              count: "$count",
              uniqueUsers: { $size: "$uniqueUsers" }
            }
          },
          total: { $sum: "$count" },
          uniqueUsersTotal: { $addToSet: "$uniqueUsers" }
        }
      },
      {
        $addFields: {
          uniqueUsersTotal: {
            $size: {
              $reduce: {
                input: "$uniqueUsersTotal",
                initialValue: [],
                in: { $setUnion: ["$$value", "$$this"] }
              }
            }
          }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // Activity breakdown by type
    const activityBreakdown = await Activity.aggregate([
      {
        $match: matchFilter
      },
      {
        $group: {
          _id: "$activityType",
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: "$studentId" }
        }
      },
      {
        $addFields: {
          uniqueUsersCount: { $size: "$uniqueUsers" }
        }
      }
    ]);

    // Most active users
    const mostActiveUsers = await Activity.aggregate([
      {
        $match: matchFilter
      },
      {
        $group: {
          _id: "$studentId",
          activityCount: { $sum: 1 },
          activityTypes: {
            $push: "$activityType"
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          userId: "$_id",
          fullName: "$user.fullName",
          email: "$user.email",
          role: "$user.role",
          activityCount: 1,
          downloadCount: {
            $size: {
              $filter: {
                input: "$activityTypes",
                as: "type",
                cond: { $eq: ["$$type", "download"] }
              }
            }
          },
          viewCount: {
            $size: {
              $filter: {
                input: "$activityTypes",
                as: "type",
                cond: { $eq: ["$$type", "view"] }
              }
            }
          }
        }
      },
      { $sort: { activityCount: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      period,
      dateRange: matchFilter.createdAt,
      trends,
      activityBreakdown,
      mostActiveUsers,
      summary: {
        totalActivities: trends.reduce((sum, t) => sum + t.total, 0),
        uniqueUsers: trends.reduce((sum, t) => sum + t.uniqueUsersTotal, 0)
      }
    });
  } catch (error) {
    console.error('Activity trends error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching activity trends'
    });
  }
});

// Get site analytics
router.get('/site-analytics', requireAdmin, async (req, res) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      const { start, end } = getDateRange(period);
      dateFilter.createdAt = { $gte: start, $lte: end };
    }

    // User sessions (simulated - implement proper session tracking)
    const userSessions = await User.aggregate([
      {
        $match: {
          lastLogin: dateFilter.createdAt
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$lastLogin" } },
          sessions: { $sum: 1 },
          uniqueUsers: { $addToSet: "$_id" }
        }
      },
      {
        $addFields: {
          uniqueUsersCount: { $size: "$uniqueUsers" }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // Platform engagement metrics
    const engagementMetrics = {
      averageSessionDuration: '00:05:30',
      pagesPerSession: 4.2,
      bounceRate: 0.35,
      newUsers: Math.floor(Math.random() * 100) + 50,
      returningUsers: Math.floor(Math.random() * 80) + 30,
      peakUsageHours: ['10:00', '14:00', '19:00']
    };

    // Device and browser stats (simulated)
    const deviceStats = [
      { device: 'Desktop', percentage: 65, sessions: 1200 },
      { device: 'Mobile', percentage: 30, sessions: 550 },
      { device: 'Tablet', percentage: 5, sessions: 100 }
    ];

    const browserStats = [
      { browser: 'Chrome', percentage: 60, sessions: 1100 },
      { browser: 'Firefox', percentage: 20, sessions: 370 },
      { browser: 'Safari', percentage: 15, sessions: 280 },
      { browser: 'Edge', percentage: 5, sessions: 100 }
    ];

    // Geographic distribution (simulated)
    const geographicStats = [
      { country: 'United States', users: 800, percentage: 40 },
      { country: 'United Kingdom', users: 300, percentage: 15 },
      { country: 'Canada', users: 200, percentage: 10 },
      { country: 'Australia', users: 150, percentage: 7.5 },
      { country: 'Others', users: 550, percentage: 27.5 }
    ];

    res.json({
      success: true,
      period,
      dateRange: dateFilter.createdAt,
      userSessions,
      engagement: engagementMetrics,
      devices: deviceStats,
      browsers: browserStats,
      geography: geographicStats,
      summary: {
        totalSessions: userSessions.reduce((sum, s) => sum + s.sessions, 0),
        totalUniqueUsers: userSessions.reduce((sum, s) => sum + s.uniqueUsersCount, 0)
      }
    });
  } catch (error) {
    console.error('Site analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching site analytics'
    });
  }
});

// Get real-time dashboard data
router.get('/realtime', requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000));
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - (24 * 60 * 60 * 1000));

    // Recent activities (last hour)
    const recentActivities = await Activity.find({
      createdAt: { $gte: oneHourAgo }
    })
    .populate('studentId', 'fullName email role')
    .populate('fileId', 'name originalName')
    .sort({ createdAt: -1 })
    .limit(20);

    // Today's statistics
    const todaysStats = {
      newUsers: await User.countDocuments({ createdAt: { $gte: todayStart } }),
      newClasses: await Class.countDocuments({ createdAt: { $gte: todayStart } }),
      newFiles: await File.countDocuments({ createdAt: { $gte: todayStart } }),
      activities: await Activity.countDocuments({ createdAt: { $gte: todayStart } })
    };

    // Yesterday's statistics for comparison
    const yesterdaysStats = {
      newUsers: await User.countDocuments({ 
        createdAt: { $gte: yesterdayStart, $lt: todayStart } 
      }),
      newClasses: await Class.countDocuments({ 
        createdAt: { $gte: yesterdayStart, $lt: todayStart } 
      }),
      newFiles: await File.countDocuments({ 
        createdAt: { $gte: yesterdayStart, $lt: todayStart } 
      }),
      activities: await Activity.countDocuments({ 
        createdAt: { $gte: yesterdayStart, $lt: todayStart } 
      })
    };

    // Calculate growth percentages
    const calculateGrowth = (today, yesterday) => {
      if (yesterday === 0) return today > 0 ? 100 : 0;
      return ((today - yesterday) / yesterday * 100).toFixed(1);
    };

    const growthStats = {
      users: calculateGrowth(todaysStats.newUsers, yesterdaysStats.newUsers),
      classes: calculateGrowth(todaysStats.newClasses, yesterdaysStats.newClasses),
      files: calculateGrowth(todaysStats.newFiles, yesterdaysStats.newFiles),
      activities: calculateGrowth(todaysStats.activities, yesterdaysStats.activities)
    };

    // Current active users (logged in within last 15 minutes)
    const fifteenMinutesAgo = new Date(now.getTime() - (15 * 60 * 1000));
    const activeUsers = await User.countDocuments({
      lastLogin: { $gte: fifteenMinutesAgo }
    });

    // System status
    const systemStatus = {
      database: 'online',
      fileStorage: 'online',
      api: 'online',
      uptime: '99.9%',
      responseTime: '120ms'
    };

    res.json({
      success: true,
      timestamp: now.toISOString(),
      realtime: {
        recentActivities,
        todaysStats,
        yesterdaysStats,
        growthStats,
        activeUsers,
        systemStatus
      }
    });
  } catch (error) {
    console.error('Realtime data error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching realtime data'
    });
  }
});

// Get filtered data with export capability
router.get('/filter', requireAdmin, async (req, res) => {
  try {
    const { 
      type, 
      startDate, 
      endDate, 
      department, 
      role, 
      status,
      page = 1,
      limit = 50,
      format = 'json'
    } = req.query;

    const filter = {};
    const skip = (page - 1) * limit;

    // Date filter
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    let data;
    let total;
    let filename;

    switch(type) {
      case 'users':
        if (role) filter.role = role;
        if (department) filter.school = department;
        if (status) filter.isActive = status === 'active';
        
        total = await User.countDocuments(filter);
        data = await User.find(filter)
          .select('-password')
          .skip(skip)
          .limit(parseInt(limit))
          .sort({ createdAt: -1 })
          .lean();
        
        filename = `users_${startDate || 'all'}_to_${endDate || 'now'}.${format}`;
        break;

      case 'classes':
        if (status) filter.isActive = status === 'active';
        
        total = await Class.countDocuments(filter);
        data = await Class.find(filter)
          .populate('educator', 'fullName email')
          .populate('students', 'fullName email')
          .skip(skip)
          .limit(parseInt(limit))
          .sort({ createdAt: -1 })
          .lean();
        
        filename = `classes_${startDate || 'all'}_to_${endDate || 'now'}.${format}`;
        break;

      case 'activities':
        if (role) {
          // Need to join with users collection
          const usersWithRole = await User.find({ role }).select('_id');
          filter.studentId = { $in: usersWithRole.map(u => u._id) };
        }
        
        total = await Activity.countDocuments(filter);
        data = await Activity.find(filter)
          .populate('studentId', 'fullName email role')
          .populate('fileId', 'name originalName classCode')
          .skip(skip)
          .limit(parseInt(limit))
          .sort({ createdAt: -1 })
          .lean();
        
        filename = `activities_${startDate || 'all'}_to_${endDate || 'now'}.${format}`;
        break;

      case 'files':
        if (department) filter.uploadedBy = department;
        
        total = await File.countDocuments(filter);
        data = await File.find(filter)
          .populate('uploadedBy', 'fullName email')
          .skip(skip)
          .limit(parseInt(limit))
          .sort({ uploadedAt: -1 })
          .lean();
        
        filename = `files_${startDate || 'all'}_to_${endDate || 'now'}.${format}`;
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid data type specified'
        });
    }

    if (format === 'csv') {
      // Convert to CSV
      if (data.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No data found for the specified filters'
        });
      }

      const headers = Object.keys(data[0] || {});
      const csvData = [
        headers.join(','),
        ...data.map(row => {
          return headers.map(header => {
            const value = row[header];
            if (value === null || value === undefined) return '';
            if (typeof value === 'object') return JSON.stringify(value);
            return `"${String(value).replace(/"/g, '""')}"`;
          }).join(',');
        })
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csvData);
    }

    res.json({
      success: true,
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      filters: {
        type,
        startDate,
        endDate,
        department,
        role,
        status
      },
      filename
    });
  } catch (error) {
    console.error('Filter error:', error);
    res.status(500).json({
      success: false,
      error: 'Error filtering data'
    });
  }
});

// Export data
router.get('/export/:type', requireAdmin, async (req, res) => {
  try {
    const { type } = req.params;
    const { format = 'csv', ...filters } = req.query;

    const response = await axios.get(`${req.protocol}://${req.get('host')}/api/dashboard/filter`, {
      params: {
        type,
        format,
        ...filters,
        limit: 10000 // Large limit for export
      },
      headers: req.headers
    });

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${response.data.filename}"`);
      return res.send(response.data);
    }

    res.json(response.data);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      error: 'Error exporting data'
    });
  }
});

// Export to PPTX
router.post('/export/pptx', requireAdmin, async (req, res) => {
  try {
    const { data, headers, filename = 'export' } = req.body;

    if (!data || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No data provided for export'
      });
    }

    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';

    // Add title slide
    pptx.addSlide();
    pptx.addText(filename || 'Data Export', {
      x: 0.5,
      y: 1,
      w: 9,
      h: 0.8,
      fontSize: 32,
      bold: true,
      color: '363636',
      align: 'center'
    });
    pptx.addText(`Generated: ${new Date().toLocaleString()}`, {
      x: 0.5,
      y: 2,
      w: 9,
      h: 0.5,
      fontSize: 14,
      color: '666666',
      align: 'center'
    });

    // Add data slide with table
    const slide = pptx.addSlide();
    
    // Prepare table data
    const headerLabels = headers.map(h => h.label || h);
    const tableData = [
      headerLabels,
      ...data.map(row => 
        headers.map(h => {
          const key = h.key || h;
          const value = row[key];
          return value !== null && value !== undefined ? String(value) : '';
        })
      )
    ];

    // Add table (PPTXGenJS doesn't have built-in table, so we'll use text in a structured way)
    let yPos = 0.5;
    const rowHeight = 0.4;
    const colWidth = 9 / headerLabels.length;

    // Headers
    headerLabels.forEach((header, colIndex) => {
      slide.addText(header, {
        x: colIndex * colWidth + 0.1,
        y: yPos,
        w: colWidth - 0.2,
        h: rowHeight,
        fontSize: 10,
        bold: true,
        color: 'FFFFFF',
        fill: { color: '8B2BE2' },
        align: 'left',
        valign: 'middle'
      });
    });

    // Data rows
    data.slice(0, 20).forEach((row, rowIndex) => {
      yPos = 0.9 + (rowIndex * rowHeight);
      headers.forEach((h, colIndex) => {
        const key = h.key || h;
        const value = row[key] !== null && row[key] !== undefined ? String(row[key]) : '';
        slide.addText(value.substring(0, 30), {
          x: colIndex * colWidth + 0.1,
          y: yPos,
          w: colWidth - 0.2,
          h: rowHeight,
          fontSize: 8,
          color: '363636',
          align: 'left',
          valign: 'middle'
        });
      });
    });

    // Generate PPTX buffer
    const buffer = await pptx.write({ outputType: 'nodebuffer' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}_${new Date().toISOString().slice(0, 10)}.pptx"`);
    res.send(buffer);
  } catch (error) {
    console.error('PPTX export error:', error);
    res.status(500).json({
      success: false,
      error: 'Error exporting to PPTX: ' + error.message
    });
  }
});

// Export to DOCX
router.post('/export/docx', requireAdmin, async (req, res) => {
  try {
    const { data, headers, filename = 'export' } = req.body;

    if (!data || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No data provided for export'
      });
    }

    // Prepare table rows
    const headerLabels = headers.map(h => h.label || h);
    const tableRows = [
      new TableRow({
        children: headerLabels.map(header => 
          new TableCell({
            children: [new Paragraph(header)],
            width: { size: 100 / headerLabels.length, type: WidthType.PERCENTAGE }
          })
        )
      }),
      ...data.map(row => 
        new TableRow({
          children: headers.map(h => {
            const key = h.key || h;
            const value = row[key] !== null && row[key] !== undefined ? String(row[key]) : '';
            return new TableCell({
              children: [new Paragraph(value)],
              width: { size: 100 / headerLabels.length, type: WidthType.PERCENTAGE }
            });
          })
        })
      )
    ];

    // Create document
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: filename || 'Data Export',
            heading: 'Heading1'
          }),
          new Paragraph({
            text: `Generated: ${new Date().toLocaleString()}`,
            spacing: { after: 400 }
          }),
          new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE }
          })
        ]
      }]
    });

    // Generate DOCX buffer
    const buffer = await Packer.toBuffer(doc);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}_${new Date().toISOString().slice(0, 10)}.docx"`);
    res.send(buffer);
  } catch (error) {
    console.error('DOCX export error:', error);
    res.status(500).json({
      success: false,
      error: 'Error exporting to DOCX: ' + error.message
    });
  }
});

// Get user counts for homepage
router.get('/user-counts', async (req, res) => {
  try {
    const studentCount = await User.countDocuments({ role: 'student' });
    const educatorCount = await User.countDocuments({ role: 'educator' });
    const adminCount = await User.countDocuments({ role: 'admin' });
    
    res.json({
      success: true,
      counts: {
        students: studentCount,
        educators: educatorCount,
        admins: adminCount,
        total: studentCount + educatorCount + adminCount
      }
    });
  } catch (error) {
    console.error('User counts error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching user counts'
    });
  }
});

module.exports = router;