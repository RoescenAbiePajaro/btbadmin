// backend/models/Activity.js
const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File'
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  studentName: {
    type: String
  },
  activityType: {
    type: String,
    enum: ['download', 'submission', 'view'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create indexes for faster queries
activitySchema.index({ studentId: 1, createdAt: -1 });
activitySchema.index({ fileId: 1 });

module.exports = mongoose.model('Activity', activitySchema);