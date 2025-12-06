// models/File.js
const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  classCode: {
    type: String,
    required: true
  },
  assignmentTitle: {
    type: String
  },
  assignmentDescription: {
    type: String
  },
  submissionDeadline: {
    type: Date
  },
  type: {
    type: String,
    enum: ['material', 'assignment'],
    default: 'material'
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  uploaderName: {
    type: String,
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
FileSchema.index({ classCode: 1, uploadedAt: -1 });
FileSchema.index({ uploadedBy: 1 });
FileSchema.index({ type: 1 });

module.exports = mongoose.model('File', FileSchema);