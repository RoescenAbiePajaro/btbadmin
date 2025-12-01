const mongoose = require('mongoose');

const academicSettingSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['school', 'department', 'year', 'block'],
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
  isActive: {
    type: Boolean,
    default: true
  },
  // Additional metadata for school
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String
  },
  contact: {
    email: String,
    phone: String,
    website: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AcademicSetting', academicSettingSchema);