// backend/models/File.js
const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
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
    type: String,
    default: ''
  },
  assignmentDescription: {
    type: String,
    default: ''
  },
  submissionDeadline: {
    type: Date
  },
  type: {
    type: String,
    enum: ['assignment', 'material'],
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
  supabaseId: {
    type: String
  },
  // Add submission tracking
  submissionCount: {
    type: Number,
    default: 0
  },
  submissions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Submission'
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('File', fileSchema);