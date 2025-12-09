// backend/models/Activity.js
const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  // File-related activities
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File'
  },
  
  // User information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  userRole: {
    type: String,
    enum: ['student', 'educator', 'admin', 'guest']
  },
  userName: {
    type: String
  },
  userEmail: {
    type: String
  },
  
  // Activity details
  activityType: {
    type: String,
    enum: [
      'download',          // File download
      'submission',        // Assignment submission
      'view',              // File view
      'site_visit',        // Website visit
      'page_view',         // Specific page view
      'login',             // User login
      'registration',      // User registration
      'class_creation',    // Class creation
      'material_upload',   // Learning material upload
      'assignment_upload'  // Assignment upload
    ],
    required: true
  },
  
  // Page/Resource information
  page: {
    type: String,
    enum: [
      'home',              // Home page
      'login',             // Login page
      'register',          // Registration page
      'dashboard',         // Dashboard
      'class_management',  // Class management
      'file_sharing',      // File sharing
      'admin_dashboard',   // Admin dashboard
      'download_pc',       // PC download page
      'other'              // Other pages
    ]
  },
  resourceId: {
    type: String  // Can be classId, fileId, or other resource identifier
  },
  resourceType: {
    type: String,
    enum: ['file', 'class', 'user', 'assignment', 'material']
  },
  
  // Download tracking (specifically for PC downloads)
  downloadType: {
    type: String,
    enum: ['pc_app', 'file', 'material', 'assignment']
  },
  downloadUrl: {
    type: String
  },
  downloadSize: {
    type: Number  // In bytes
  },
  
  // Device and location information
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  deviceType: {
    type: String,
    enum: ['desktop', 'mobile', 'tablet', 'unknown']
  },
  browser: {
    type: String
  },
  operatingSystem: {
    type: String
  },
  
  // Session information
  sessionId: {
    type: String
  },
  
  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed  // Flexible field for additional data
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create indexes for faster queries
activitySchema.index({ userId: 1, createdAt: -1 });
activitySchema.index({ fileId: 1 });
activitySchema.index({ activityType: 1, createdAt: -1 });
activitySchema.index({ page: 1, createdAt: -1 });
activitySchema.index({ userRole: 1, createdAt: -1 });
activitySchema.index({ deviceType: 1, createdAt: -1 });
activitySchema.index({ createdAt: 1 }); // For time-based queries
activitySchema.index({ sessionId: 1 });

// Pre-save middleware to update timestamps
activitySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to track site visit
activitySchema.statics.trackSiteVisit = async function(data) {
  try {
    const activity = new this({
      activityType: 'site_visit',
      page: data.page || 'home',
      userId: data.userId,
      userRole: data.userRole || 'guest',
      userName: data.userName,
      userEmail: data.userEmail,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      deviceType: data.deviceType,
      browser: data.browser,
      operatingSystem: data.operatingSystem,
      sessionId: data.sessionId,
      metadata: data.metadata
    });
    
    await activity.save();
    return activity;
  } catch (error) {
    console.error('Error tracking site visit:', error);
    throw error;
  }
};

// Static method to track download
activitySchema.statics.trackDownload = async function(data) {
  try {
    const activity = new this({
      activityType: 'download',
      downloadType: data.downloadType,
      downloadUrl: data.downloadUrl,
      downloadSize: data.downloadSize,
      fileId: data.fileId,
      userId: data.userId,
      userRole: data.userRole,
      userName: data.userName,
      userEmail: data.userEmail,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      deviceType: data.deviceType,
      resourceId: data.resourceId,
      resourceType: data.resourceType,
      metadata: data.metadata
    });
    
    await activity.save();
    return activity;
  } catch (error) {
    console.error('Error tracking download:', error);
    throw error;
  }
};

// Static method to track page view
activitySchema.statics.trackPageView = async function(data) {
  try {
    const activity = new this({
      activityType: 'page_view',
      page: data.page,
      userId: data.userId,
      userRole: data.userRole,
      userName: data.userName,
      userEmail: data.userEmail,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      deviceType: data.deviceType,
      resourceId: data.resourceId,
      resourceType: data.resourceType,
      sessionId: data.sessionId,
      metadata: data.metadata
    });
    
    await activity.save();
    return activity;
  } catch (error) {
    console.error('Error tracking page view:', error);
    throw error;
  }
};

// Static method to get site statistics
activitySchema.statics.getSiteStatistics = async function(timeRange = 'week') {
  try {
    const now = new Date();
    let startDate = new Date();
    
    switch(timeRange) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }
    
    // Get total site visits
    const totalVisits = await this.countDocuments({
      activityType: { $in: ['site_visit', 'page_view'] },
      createdAt: { $gte: startDate }
    });
    
    // Get unique visitors (by IP or session)
    const uniqueVisitors = await this.distinct('ipAddress', {
      activityType: { $in: ['site_visit', 'page_view'] },
      createdAt: { $gte: startDate }
    });
    
    // Get page views breakdown
    const pageViews = await this.aggregate([
      {
        $match: {
          activityType: 'page_view',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$page',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    // Get download statistics
    const downloads = await this.aggregate([
      {
        $match: {
          activityType: 'download',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$downloadType',
          count: { $sum: 1 },
          totalSize: { $sum: '$downloadSize' }
        }
      }
    ]);
    
    // Get device statistics
    const deviceStats = await this.aggregate([
      {
        $match: {
          activityType: { $in: ['site_visit', 'page_view'] },
          createdAt: { $gte: startDate },
          deviceType: { $exists: true }
        }
      },
      {
        $group: {
          _id: '$deviceType',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    // Get user role distribution for visits
    const userRoleStats = await this.aggregate([
      {
        $match: {
          activityType: { $in: ['site_visit', 'page_view'] },
          createdAt: { $gte: startDate },
          userRole: { $exists: true }
        }
      },
      {
        $group: {
          _id: '$userRole',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Get hourly/daily trends
    const timeFormat = timeRange === 'day' ? '%H:00' : '%Y-%m-%d';
    const timeTrends = await this.aggregate([
      {
        $match: {
          activityType: { $in: ['site_visit', 'page_view'] },
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: timeFormat, date: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    return {
      totalVisits,
      uniqueVisitors: uniqueVisitors.length,
      pageViews,
      downloads,
      deviceStats,
      userRoleStats,
      timeTrends,
      timeRange,
      period: {
        start: startDate,
        end: now
      }
    };
    
  } catch (error) {
    console.error('Error getting site statistics:', error);
    throw error;
  }
};

// Static method to get user activity summary
activitySchema.statics.getUserActivitySummary = async function(userId, limit = 50) {
  try {
    const activities = await this.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('fileId', 'name originalName url')
      .lean();
    
    return activities;
  } catch (error) {
    console.error('Error getting user activity summary:', error);
    throw error;
  }
};

// Helper method to parse user agent
activitySchema.statics.parseUserAgent = function(userAgent) {
  if (!userAgent) return {};
  
  const isMobile = /mobile/i.test(userAgent);
  const isTablet = /tablet/i.test(userAgent);
  const isDesktop = !isMobile && !isTablet;
  
  let deviceType = 'unknown';
  if (isMobile) deviceType = 'mobile';
  else if (isTablet) deviceType = 'tablet';
  else if (isDesktop) deviceType = 'desktop';
  
  // Parse browser
  let browser = 'Unknown';
  if (/chrome/i.test(userAgent)) browser = 'Chrome';
  else if (/firefox/i.test(userAgent)) browser = 'Firefox';
  else if (/safari/i.test(userAgent)) browser = 'Safari';
  else if (/edge/i.test(userAgent)) browser = 'Edge';
  else if (/opera/i.test(userAgent)) browser = 'Opera';
  
  // Parse OS
  let os = 'Unknown';
  if (/windows/i.test(userAgent)) os = 'Windows';
  else if (/macintosh/i.test(userAgent)) os = 'macOS';
  else if (/linux/i.test(userAgent)) os = 'Linux';
  else if (/android/i.test(userAgent)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(userAgent)) os = 'iOS';
  
  return {
    deviceType,
    browser,
    operatingSystem: os,
    isMobile,
    isTablet,
    isDesktop
  };
};

module.exports = mongoose.model('Activity', activitySchema);