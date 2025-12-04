const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: [
      'upload', 
      'student_upload', 
      'submission', 
      'download', 
      'delete', 
      'share_toggle',
      'assignment_upload'
    ]
  },
  fileName: {
    type: String,
    required: true
  },
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File'
  },
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File'
  },
  educatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  studentName: {
    type: String
  },
  userName: {
    type: String
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  classCode: {
    type: String
  },
  newStatus: {
    type: Boolean
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create indexes for better query performance
activitySchema.index({ educatorId: 1, timestamp: -1 });
activitySchema.index({ studentId: 1, timestamp: -1 });
activitySchema.index({ classCode: 1, timestamp: -1 });

module.exports = mongoose.model('Activity', activitySchema);