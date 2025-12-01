const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  classCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  className: {
    type: String,
    required: true
  },
  description: String,
  educator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Class', classSchema);