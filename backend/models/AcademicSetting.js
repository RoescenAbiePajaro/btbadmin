// backend/models/AcademicSettings.js
const mongoose = require('mongoose');

const academicSettingSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['school','course', 'year', 'block'],
    required: true
  },
  code: {
    type: String,
    trim: true,
    uppercase: true
  },
  description: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  educator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true // Add index for faster queries
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Add compound index for unique names per educator per type
academicSettingSchema.index({ name: 1, type: 1, educator: 1 }, { unique: true });

module.exports = mongoose.model('AcademicSetting', academicSettingSchema);