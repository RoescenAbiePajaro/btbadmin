// backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: function() {
      // Only required for students and educators, not for admin during initial creation
      return this.role !== 'admin';
    },
    trim: true,
    default: 'Administrator' // Default for admin users
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: props => `${props.value} is not a valid email address!`
    }
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    default: function() {
      // Generate username from email for admin
      if (this.role === 'admin') {
        return this.email.split('@')[0];
      }
    }
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['student', 'educator', 'admin'],
    default: 'student',
    required: true
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
  isFirstLogin: {
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
});

// Update timestamp on save
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it's modified or new
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Special pre-save for admin users to ensure they're created properly
userSchema.pre('save', async function(next) {
  if (this.role === 'admin' && this.isNew) {
    console.log(`Creating admin user: ${this.email}`);
    
    // Ensure admin has proper fields
    if (!this.fullName) {
      this.fullName = 'System Administrator';
    }
    
    if (!this.username && this.email) {
      this.username = this.email.split('@')[0] || 'admin';
    }
    
    // Set first login flag
    this.isFirstLogin = true;
  }
  next();
});

// Compare password method with improved error handling
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
};

// Method to check if user is admin
userSchema.methods.isAdmin = function() {
  return this.role === 'admin';
};

// Method to check if user is educator
userSchema.methods.isEducator = function() {
  return this.role === 'educator';
};

// Method to check if user is student
userSchema.methods.isStudent = function() {
  return this.role === 'student';
};

// Method to get user's display name
userSchema.methods.getDisplayName = function() {
  return this.fullName || this.username || this.email;
};

// Remove sensitive data when converting to JSON
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  
  // Remove sensitive fields
  delete user.password;
  delete user.__v;
  
  // For admin users, also remove unnecessary student fields
  if (this.role === 'admin') {
    delete user.school;
    delete user.course;
    delete user.year;
    delete user.block;
    delete user.enrolledClass;
    delete user.classCodes;
  }
  
  return user;
};

// Static method to find or create admin user
userSchema.statics.findOrCreateAdmin = async function(email, password) {
  try {
    // Try to find existing admin
    let adminUser = await this.findOne({ email, role: 'admin' });
    
    if (!adminUser) {
      console.log('Creating new admin user...');
      
      // Create new admin user
      adminUser = new this({
        email,
        password, // Will be hashed by pre-save hook
        role: 'admin',
        fullName: 'System Administrator',
        username: email.split('@')[0] || 'admin',
        isFirstLogin: true
      });
      
      await adminUser.save();
      console.log('Admin user created successfully');
    } else {
      console.log('Admin user already exists');
    }
    
    return adminUser;
  } catch (error) {
    console.error('Error in findOrCreateAdmin:', error);
    throw error;
  }
};

// Static method to validate admin credentials
userSchema.statics.validateAdminCredentials = async function(email, password) {
  try {
    // Find admin user
    const adminUser = await this.findOne({ 
      email: email.toLowerCase(), 
      role: 'admin' 
    });
    
    if (!adminUser) {
      console.log('No admin user found with email:', email);
      return { isValid: false, user: null };
    }
    
    // Check password
    const isPasswordValid = await adminUser.comparePassword(password);
    
    if (!isPasswordValid) {
      console.log('Invalid password for admin:', email);
      return { isValid: false, user: adminUser };
    }
    
    // Update last login
    adminUser.lastLogin = new Date();
    adminUser.isFirstLogin = false;
    await adminUser.save();
    
    console.log('Admin login successful for:', email);
    return { isValid: true, user: adminUser };
    
  } catch (error) {
    console.error('Error validating admin credentials:', error);
    return { isValid: false, user: null, error: error.message };
  }
};

// Indexes for better query performance
userSchema.index({ email: 1, role: 1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ username: 1 });
userSchema.index({ createdAt: -1 });

// Virtual for formatted date
userSchema.virtual('formattedCreatedAt').get(function() {
  return this.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Virtual for last login formatted
userSchema.virtual('formattedLastLogin').get(function() {
  if (!this.lastLogin) return 'Never';
  return this.lastLogin.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

module.exports = mongoose.model('User', userSchema);