const mongoose = require('mongoose');

const savedImageSchema = new mongoose.Schema({
  // Core fields from your Python MongoDB structure
  user_email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  user_role: {
    type: String,
    enum: ['student', 'educator'],
    default: 'student'
  },
  full_name: {
    type: String,
    default: ''
  },
  
  // File information
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
  
  // Image data
  image_data: {
    type: String, // base64 encoded
    required: true
  },
  
  // Image type (from your Supabase structure)
  image_type: {
    type: String,
    enum: ['template', 'transparent'],
    default: 'template'
  },
  
  // URL from Supabase storage
  image_url: {
    type: String,
    default: ''
  },
  storage_path: {
    type: String,
    default: ''
  },
  
  // Timestamps
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
    default: () => Math.floor(Date.now() / 1000)
  },
  
  // App info
  app_version: {
    type: String,
    default: '1.0.0'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
savedImageSchema.index({ user_email: 1, created_at: -1 });
savedImageSchema.index({ user_role: 1 });
savedImageSchema.index({ image_type: 1 });

// Method to get public URL (if using Supabase)
savedImageSchema.methods.getPublicUrl = function() {
  if (this.image_url) {
    return this.image_url;
  }
  // Fallback to reconstruct URL from storage path
  const supabaseUrl = process.env.SUPABASE_URL || 'https://your-supabase-url.supabase.co';
  return `${supabaseUrl}/storage/v1/object/public/${process.env.SUPABASE_BUCKET || 'class-files'}/${this.storage_path}`;
};

// Method to get basic info for API response
savedImageSchema.methods.toResponse = function() {
  return {
    id: this._id,
    user_email: this.user_email,
    user_role: this.user_role,
    file_name: this.file_name,
    file_size: this.file_size,
    image_type: this.image_type,
    image_url: this.image_url || this.getPublicUrl(),
    created_at: this.created_at,
    updated_at: this.updatedAt
  };
};

const SavedImage = mongoose.model('SavedImage', savedImageSchema);

module.exports = SavedImage;