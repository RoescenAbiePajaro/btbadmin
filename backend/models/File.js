// models/File.js - Updated
const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  classCode: {
    type: String,
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  isAssignment: {
    type: Boolean,
    default: false
  },
  assignmentTitle: {
    type: String,
    default: 'Assignment'
  },
  assignmentDescription: {
    type: String
  },
  submissionDeadline: {
    type: Date
  },
  submissionCount: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model('File', fileSchema);