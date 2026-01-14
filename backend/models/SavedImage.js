// backend/models/SavedImage.js
const mongoose = require('mongoose');

const SavedImageSchema = new mongoose.Schema({
  user_email: {
    type: String,
    required: true,
    index: true
  },
  user_role: {
    type: String,
    required: true,
    enum: ['student', 'educator']
  },
  file_name: {
    type: String,
    required: true
  },
  image_type: {
    type: String,
    enum: ['template', 'transparent'],
    default: 'template'
  },
  image_url: {
    type: String
  },
  image_data: {
    type: String // Base64 encoded image data
  },
  file_size: {
    type: Number
  },
  storage_path: {
    type: String
  },
  bucket_name: {
    type: String,
    default: 'class-files'
  },
  supabase_record_id: {
    type: String
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
SavedImageSchema.index({ user_email: 1, user_role: 1, created_at: -1 });
SavedImageSchema.index({ supabase_record_id: 1 });

module.exports = mongoose.model('SavedImage', SavedImageSchema);
