// backend/models/AcademicSetting.js
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
  educator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdBy: {
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
  }
}, {
  timestamps: true
});

// Add index for faster queries
academicSettingSchema.index({ educator: 1, type: 1, isActive: 1 });
academicSettingSchema.index({ type: 1, educator: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('AcademicSetting', academicSettingSchema);