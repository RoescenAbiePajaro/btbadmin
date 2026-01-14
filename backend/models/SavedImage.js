// models/SavedImage.js
const mongoose = require('mongoose');

const savedImageSchema = new mongoose.Schema({
  user_email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  user_role: {
    type: String,
    required: true,
    enum: ['student', 'educator', 'admin']
  },
  full_name: {
    type: String,
    default: ''
  },
  file_name: {
    type: String,
    required: true
  },
  file_path: {
    type: String,
    default: ''
  },
  file_size: {
    type: Number,
    required: true
  },
  image_data: {
    type: String, // base64 encoded
    default: ''
  },
  image_type: {
    type: String,
    required: true,
    enum: ['template', 'transparent']
  },
  image_url: {
    type: String,
    default: '' // Supabase URL
  },
  storage_path: {
    type: String,
    default: '' // Supabase storage path
  },
  upload_date: {
    type: Date,
    default: Date.now
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  timestamp: {
    type: Number,
    required: true
  },
  app_version: {
    type: String,
    default: '1.0.0'
  },
  // Supabase specific fields
  supabase_record_id: {
    type: String,
    default: ''
  },
  supabase_bucket: {
    type: String,
    default: 'class-files'
  },
  is_synced: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for faster queries
savedImageSchema.index({ user_email: 1, created_at: -1 });
savedImageSchema.index({ user_role: 1, created_at: -1 });
savedImageSchema.index({ timestamp: -1 });

const SavedImage = mongoose.model('SavedImage', savedImageSchema);

module.exports = SavedImage;