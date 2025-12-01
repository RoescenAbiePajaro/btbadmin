const mongoose = require('mongoose');

const clickSchema = new mongoose.Schema({
  button: {
    type: String,
    required: true
  },
  page: {
    type: String,
    required: true
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  },
  userAgent: String,
  deviceType: String,
  operatingSystem: String,
  browser: String,
  ipAddress: String,
  location: {
    country: String,
    region: String,
    city: String,
    timezone: String
  },
  isMobile: Boolean,
  isTablet: Boolean,
  isDesktop: Boolean,
  isLaptop: Boolean
}, {
  timestamps: true
});

// Indexes for faster queries
clickSchema.index({ timestamp: -1 });
clickSchema.index({ button: 1 });
clickSchema.index({ page: 1 });
clickSchema.index({ deviceType: 1 });

const Click = mongoose.model('Click', clickSchema);

module.exports = Click;