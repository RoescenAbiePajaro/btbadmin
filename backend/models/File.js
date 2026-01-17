//backend/models/File.js
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
  type: {
    type: String,
    enum: ['material', 'converted'],
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
  // Conversion tracking fields
  isConverted: {
    type: Boolean,
    default: false
  },
  originalConversionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ImageConversion'
  },
  conversionType: {
    type: String,
    enum: ['pdf', 'docx', 'pptx']
  },
  originalImageCount: {
    type: Number
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('File', fileSchema);