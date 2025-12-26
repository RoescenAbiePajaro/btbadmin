// backend/models/User.js
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
  school: {
    type: String
  },
  course: {
    type: String
  },
  year: {
    type: String
  },
  block: {
    type: String
  },
  // CURRENT class (last joined or selected)
  enrolledClass: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    default: []  // Initialize as empty array
  },
  // All class codes student has joined
  classCodes: [{
    type: String
  }],
  // All classes student is enrolled in
  classes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    default: []  // Initialize as empty array
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
  // For admin registration without access code
  adminRegistration: {
    type: Boolean,
    default: false
  }
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

// Initialize arrays for new students
userSchema.pre('save', function(next) {
  if (this.isNew && this.role === 'student') {
    if (!this.classes) this.classes = [];
    if (!this.classCodes) this.classCodes = [];
    if (!this.enrolledClass) this.enrolledClass = null;
  }
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if student is in a specific class
userSchema.methods.isInClass = function(classId) {
  return this.classes.some(clsId => 
    clsId && clsId.toString() === classId.toString()
  );
};

// Join a new class
userSchema.methods.joinClass = async function(classId, classCode) {
  // Check if already in this class
  if (this.isInClass(classId)) {
    throw new Error('Already enrolled in this class');
  }
  
  // Add to classes array
  this.classes.push(classId);
  
  // Add to classCodes if not already there
  if (!this.classCodes.includes(classCode)) {
    this.classCodes.push(classCode);
  }
  
  // Set as current enrolled class
  this.enrolledClass = classId;
  
  await this.save();
  return this;
};

// Leave a class
userSchema.methods.leaveClass = async function(classId, classCode) {
  // Remove from classes array
  this.classes = this.classes.filter(clsId => 
    clsId.toString() !== classId.toString()
  );
  
  // Remove from classCodes array
  this.classCodes = this.classCodes.filter(code => code !== classCode);
  
  // If leaving current class, set enrolledClass to another class or null
  if (this.enrolledClass && this.enrolledClass.toString() === classId.toString()) {
    this.enrolledClass = this.classes.length > 0 ? this.classes[0] : null;
  }
  
  await this.save();
  return this;
};

// Switch current class
userSchema.methods.switchClass = async function(classId) {
  if (!this.isInClass(classId)) {
    throw new Error('Not enrolled in this class');
  }
  
  this.enrolledClass = classId;
  await this.save();
  return this;
};

// Remove sensitive data when converting to JSON
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.__v;
  return user;
};

module.exports = mongoose.model('User', userSchema);