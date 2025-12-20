// backend/models/academicSettingSchema.js
const mongoose = require('mongoose');

const academicSettingSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['school', 'course', 'year', 'block']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  educator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true  // Add this to automatically manage createdAt and updatedAt
});

// Create compound index for unique settings per educator
academicSettingSchema.index({ name: 1, type: 1, educator: 1 }, { unique: true });

module.exports = mongoose.model('AcademicSetting', academicSettingSchema);