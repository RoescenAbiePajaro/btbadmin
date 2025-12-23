// backend/models/Class.js
const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  classCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  className: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  educator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // ADD THESE FIELDS
  school: {
    type: String,
    trim: true
  },
  course: {
    type: String,
    trim: true
  },
  year: {
    type: String,
    trim: true
  },
  block: {
    type: String,
    trim: true
  },
  // END OF ADDED FIELDS
  isActive: {
    type: Boolean,
    default: true
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
  timestamps: true
});

// Create index for faster lookups
classSchema.index({ classCode: 1 });
classSchema.index({ educator: 1 });
classSchema.index({ isActive: 1 });

module.exports = mongoose.model('Class', classSchema);