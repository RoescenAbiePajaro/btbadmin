const Activity = require('../models/Activity');
const crypto = require('crypto');

// Generate session ID
const generateSessionId = (req) => {
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'] || '';
  const now = new Date();
  const dateString = now.toDateString();
  
  const hash = crypto.createHash('md5')
    .update(ip + userAgent + dateString)
    .digest('hex');
    
  return hash;
};

// Activity tracking middleware
const trackActivity = async (req, res, next) => {
  try {
    // Skip tracking for certain routes
    const skipRoutes = ['/api/health', '/favicon.ico'];
    if (skipRoutes.includes(req.path)) {
      return next();
    }
    
    const user = req.user || null;
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';
    const sessionId = generateSessionId(req);
    
    // Parse user agent info
    const deviceInfo = Activity.parseUserAgent(userAgent);
    
    // Determine page type
    let page = 'other';
    if (req.path === '/') page = 'home';
    else if (req.path.includes('/login')) page = 'login';
    else if (req.path.includes('/register')) page = 'register';
    else if (req.path.includes('/dashboard')) page = 'dashboard';
    else if (req.path.includes('/admin')) page = 'admin_dashboard';
    
    // Track the activity
    const activityData = {
      userId: user ? user.id : null,
      userRole: user ? user.role : 'guest',
      userName: user ? user.username : 'Guest',
      userEmail: user ? user.email : null,
      page,
      ipAddress: ip,
      userAgent,
      deviceType: deviceInfo.deviceType,
      browser: deviceInfo.browser,
      operatingSystem: deviceInfo.operatingSystem,
      sessionId,
      metadata: {
        method: req.method,
        path: req.path,
        query: req.query,
        params: req.params
      }
    };
    
    // Use non-blocking tracking
    Activity.trackSiteVisit(activityData).catch(err => {
      console.error('Background activity tracking error:', err);
    });
    
  } catch (error) {
    console.error('Activity tracking middleware error:', error);
    // Don't block the request if tracking fails
  }
  
  next();
};

// Track download middleware
const trackDownload = async (req, res, next) => {
  try {
    const user = req.user || null;
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';
    
    const deviceInfo = Activity.parseUserAgent(userAgent);
    
    const downloadData = {
      downloadType: req.body.downloadType || 'file',
      downloadUrl: req.body.downloadUrl || req.originalUrl,
      downloadSize: req.body.size || 0,
      fileId: req.body.fileId || req.params.fileId,
      userId: user ? user.id : null,
      userRole: user ? user.role : 'guest',
      userName: user ? user.username : 'Guest',
      userEmail: user ? user.email : null,
      ipAddress: ip,
      userAgent,
      deviceType: deviceInfo.deviceType,
      resourceId: req.body.resourceId,
      resourceType: req.body.resourceType,
      metadata: {
        method: req.method,
        path: req.path,
        referer: req.headers.referer
      }
    };
    
    // Track the download
    await Activity.trackDownload(downloadData);
    
  } catch (error) {
    console.error('Download tracking error:', error);
    // Don't block the download if tracking fails
  }
  
  next();
};

module.exports = {
  trackActivity,
  trackDownload,
  generateSessionId
};