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
    required: true,
    index: true
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
    type: String,
    unique: true,
    sparse: true // Add sparse index to allow multiple null values
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Add compound index for better querying
fileSchema.index({ classCode: 1, uploadedAt: -1 });
fileSchema.index({ uploadedBy: 1, uploadedAt: -1 });

module.exports = mongoose.model('File', fileSchema);