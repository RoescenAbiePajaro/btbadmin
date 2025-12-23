// backend/models/FileActivity.js
const mongoose = require('mongoose');

const fileActivitySchema = new mongoose.Schema({
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File',
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  studentName: String,
  activityType: {
    type: String,
    enum: ['download', 'view'],
    required: true
  },
  classCode: String,
  educatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  metadata: {
    userAgent: String,
    ipAddress: String,
    deviceType: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  // Auto-create indexes
  autoIndex: true
});

// Define indexes
fileActivitySchema.index({ fileId: 1, activityType: 1 });
fileActivitySchema.index({ studentId: 1, createdAt: -1 });
fileActivitySchema.index({ classCode: 1, createdAt: -1 });
fileActivitySchema.index({ educatorId: 1, createdAt: -1 });
fileActivitySchema.index({ createdAt: -1 });
fileActivitySchema.index({ activityType: 1 });

module.exports = mongoose.model('FileActivity', fileActivitySchema);