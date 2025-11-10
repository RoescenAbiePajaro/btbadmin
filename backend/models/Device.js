//backend/models/Device.js
import mongoose from "mongoose";
const deviceSchema = new mongoose.Schema({
  // Unique device identifier
  deviceId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  
  // User agent string
  userAgent: { 
    type: String, 
    required: true 
  },
  
  // Browser information
  browser: {
    name: { type: String, required: true },
    version: String,
    major: String
  },
  
  // Engine information
  engine: {
    name: String,
    version: String
  },
  
  // Operating System
  os: {
    name: { type: String, required: true },
    version: String,
    platform: String
  },
  
  // Device information
  device: {
    vendor: String,
    model: String,
    type: { 
      type: String, 
      enum: ['mobile', 'tablet', 'desktop', 'smarttv', 'wearable', 'unknown'],
      default: 'desktop'
    }
  },
  
  // CPU architecture
  cpu: {
    architecture: String
  },
  
  // Screen information
  screen: {
    width: Number,
    height: Number,
    colorDepth: Number,
    pixelDepth: Number,
    orientation: String
  },
  
  // Platform
  platform: String,
  
  // Language and timezone
  language: String,
  timezone: String,
  
  // Geolocation (if available)
  location: {
    country: String,
    region: String,
    city: String,
    latitude: Number,
    longitude: Number,
    accuracy: Number
  },
  
  // Network information
  connection: {
    effectiveType: { 
      type: String, 
      enum: ['slow-2g', '2g', '3g', '4g', 'wifi', 'ethernet', 'unknown'],
      default: 'unknown'
    },
    downlink: Number,
    rtt: Number,
    saveData: Boolean
  },
  
  // Additional capabilities
  capabilities: {
    cookies: { type: Boolean, default: false },
    javascript: { type: Boolean, default: true },
    localStorage: { type: Boolean, default: false },
    sessionStorage: { type: Boolean, default: false },
    touchSupport: { type: Boolean, default: false },
    webGL: { type: Boolean, default: false },
    webRTC: { type: Boolean, default: false },
    serviceWorker: { type: Boolean, default: false }
  },
  
  // Tracking metadata
  firstSeen: { 
    type: Date, 
    default: Date.now 
  },
  lastSeen: { 
    type: Date, 
    default: Date.now 
  },
  sessionCount: { 
    type: Number, 
    default: 1 
  },
  totalClicks: {
    type: Number,
    default: 0
  },
  
  // Reference to clicks
  clicks: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Click' 
  }],

  // Privacy and compliance
  consentGiven: {
    type: Boolean,
    default: false
  },
  
  doNotTrack: {
    type: Boolean,
    default: false
  }

}, {
  timestamps: true
});

// Indexes
deviceSchema.index({ lastSeen: -1 });
deviceSchema.index({ "device.type": 1 });
deviceSchema.index({ "browser.name": 1 });
deviceSchema.index({ "os.name": 1 });
deviceSchema.index({ "location.country": 1 });

// Update lastSeen and increment sessionCount
deviceSchema.methods.updateSession = function() {
  this.lastSeen = new Date();
  this.sessionCount += 1;
  return this.save();
};

// Increment click count
deviceSchema.methods.incrementClickCount = function() {
  this.totalClicks += 1;
  this.lastSeen = new Date();
  return this.save();
};

// Get device summary
deviceSchema.methods.getSummary = function() {
  return {
    deviceId: this.deviceId,
    deviceType: this.device.type,
    browser: this.browser.name,
    os: this.os.name,
    firstSeen: this.firstSeen,
    lastSeen: this.lastSeen,
    sessionCount: this.sessionCount,
    totalClicks: this.totalClicks,
    location: this.location.country
  };
};

// Static method to find or create device
deviceSchema.statics.findOrCreate = async function(deviceInfo) {
  let device = await this.findOne({ deviceId: deviceInfo.deviceId });
  
  if (!device) {
    device = new this(deviceInfo);
    await device.save();
  } else {
    await device.updateSession();
  }
  
  return device;
};

// Static method to get device statistics
deviceSchema.statics.getDeviceStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalDevices: { $sum: 1 },
        activeToday: {
          $sum: {
            $cond: [
              { $gte: ['$lastSeen', new Date(Date.now() - 24 * 60 * 60 * 1000)] },
              1,
              0
            ]
          }
        },
        byType: {
          $push: {
            type: '$device.type',
            browser: '$browser.name',
            os: '$os.name'
          }
        }
      }
    }
  ]);
};

// Static method to get popular devices
deviceSchema.statics.getPopularDevices = function(limit = 10) {
  return this.aggregate([
    {
      $group: {
        _id: {
          deviceType: '$device.type',
          browser: '$browser.name',
          os: '$os.name'
        },
        count: { $sum: 1 },
        avgSessions: { $avg: '$sessionCount' },
        avgClicks: { $avg: '$totalClicks' }
      }
    },
    { $sort: { count: -1 } },
    { $limit: limit }
  ]);
};

export default mongoose.model("Device", deviceSchema);