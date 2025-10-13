const mongoose = require('mongoose');

const accessCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Access code is required'],
    unique: true,
    trim: true,
    uppercase: true,
    minlength: [1, 'Access code must be at least 1 character long']
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  maxUses: {
    type: Number,
    default: 1,
    min: [1, 'Max uses must be at least 1']
  },
  currentUses: {
    type: Number,
    default: 0,
    min: [0, 'Current uses cannot be negative']
  }
}, {
  timestamps: true
});

// Add index for faster querying
accessCodeSchema.index({ code: 1 }, { unique: true });
accessCodeSchema.index({ isActive: 1 });
accessCodeSchema.index({ createdAt: -1 });

// Pre-save hook to ensure code is uppercase and trimmed
accessCodeSchema.pre('save', function(next) {
  if (this.isModified('code')) {
    this.code = this.code.trim().toUpperCase();
  }
  
  // Ensure currentUses doesn't exceed maxUses
  if (this.currentUses > this.maxUses && this.maxUses > 0) {
    this.currentUses = this.maxUses;
  }
  
  next();
});

// Method to check if the access code can be used
accessCodeSchema.methods.canBeUsed = function() {
  return this.isActive && (this.currentUses < this.maxUses || this.maxUses === 0);
};

// Method to increment the usage count
accessCodeSchema.methods.incrementUsage = async function() {
  if (this.canBeUsed()) {
    this.currentUses += 1;
    
    // Auto-deactivate if max uses reached
    if (this.currentUses >= this.maxUses && this.maxUses > 0) {
      this.isActive = false;
    }
    
    return this.save();
  }
  throw new Error('Access code cannot be used');
};

// Static method to find active code
accessCodeSchema.statics.findActiveByCode = function(code) {
  return this.findOne({
    code: code.trim().toUpperCase(),
    isActive: true
  });
};

const AccessCode = mongoose.model('AccessCode', accessCodeSchema);

module.exports = AccessCode;