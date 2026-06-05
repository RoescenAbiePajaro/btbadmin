// backend/models/User.js - Add profile picture fields
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['student', 'educator', 'admin'],
    default: 'student'
  },
  // Profile picture fields
  profilePicture: {
    url: { type: String, default: '' },
    publicId: { type: String, default: '' },
    updatedAt: { type: Date, default: null }
  },
  // Educator additional fields
  homeAddress: {
    type: String,
    default: ''
  },
  cellphoneNumber: {
    type: String,
    default: ''
  },
  school: {
    type: String,
    default: ''
  },
  course: {
    type: String,
    default: ''
  },
  year: {
    type: String,
    default: ''
  },
  block: {
    type: String,
    default: ''
  },
  enrolledClass: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  },
  classCodes: [{
    type: String
  }],
  classes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  }],
  lastLogin: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  adminRegistration: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove sensitive data when converting to JSON
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.__v;
  return user;
};

module.exports = mongoose.model('User', userSchema);