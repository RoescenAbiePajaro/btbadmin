// backend/models/ImageConversion.js
const mongoose = require('mongoose');

const imageConversionSchema = new mongoose.Schema({
  educator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  originalImages: [{
    name: String,
    size: Number,
    mimeType: String,
    originalName: String
  }],
  convertedFile: {
    name: String,
    originalName: String,
    path: String,
    url: String,
    size: Number,
    mimeType: String,
    supabaseId: String
  },
  conversionType: {
    type: String,
    enum: ['pdf', 'docx', 'pptx'],
    required: true
  },
  classCode: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  metadata: {
    pageCount: Number,
    imageCount: Number,
    quality: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'high'
    }
  },
  processingTime: Number, // in milliseconds
  error: String
}, {
  timestamps: true
});

module.exports = mongoose.model('ImageConversion', imageConversionSchema);