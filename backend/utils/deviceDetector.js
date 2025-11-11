// backend/utils/deviceDetector.js
const UAParser = require('ua-parser-js');

class DeviceDetector {
  static detectDeviceInfo(req) {
    const parser = new UAParser(req.headers['user-agent']);
    const result = parser.getResult();
    
    return {
      userAgent: req.headers['user-agent'] || '',
      browser: result.browser.name || 'Unknown',
      browserVersion: result.browser.version || 'Unknown',
      os: result.os.name || 'Unknown',
      osVersion: result.os.version || 'Unknown',
      device: result.device.model || 'Unknown',
      deviceType: this.getDeviceType(result),
      screenResolution: req.headers['sec-ch-ua-width'] && req.headers['sec-ch-ua-height'] 
        ? `${req.headers['sec-ch-ua-width']}x${req.headers['sec-ch-ua-height']}`
        : 'Unknown',
      language: req.headers['accept-language'] || 'Unknown',
      timezone: req.headers['timezone'] || 'Unknown'
    };
  }

  static getDeviceType(uaResult) {
    if (uaResult.device.type === 'mobile') return 'mobile';
    if (uaResult.device.type === 'tablet') return 'tablet';
    return 'desktop';
  }

  static getLocationInfo(req) {
    // For geolocation, you might want to use a service like ipapi.co
    // This is a basic implementation
    return {
      ipAddress: req.ip || req.connection.remoteAddress,
      country: req.headers['cf-ipcountry'] || 'Unknown',
      region: req.headers['region'] || 'Unknown',
      city: req.headers['city'] || 'Unknown'
    };
  }
}

module.exports = DeviceDetector;