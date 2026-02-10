const mongoose = require('mongoose');

const clickSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['login', 'download', 'view', 'registration']
  },
  location: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  userRole: {
    type: String,
    enum: ['student', 'educator', 'admin', 'guest']
  },
  userAgent: String,
  deviceType: {
    type: String,
    enum: ['Mobile', 'Tablet', 'Desktop', 'Laptop', 'Unknown']
  },
  browser: String,
  operatingSystem: String,
  ipAddress: String,
  metadata: mongoose.Schema.Types.Mixed,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  // Auto-create indexes
  autoIndex: true
});

// Define indexes for better query performance
clickSchema.index({ type: 1, createdAt: -1 });
clickSchema.index({ userId: 1, createdAt: -1 });
clickSchema.index({ location: 1, createdAt: -1 });
clickSchema.index({ userRole: 1 });
clickSchema.index({ deviceType: 1 });

module.exports = mongoose.model('Click', clickSchema);