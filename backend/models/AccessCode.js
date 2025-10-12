const mongoose = require('mongoose');

const accessCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  maxUses: {
    type: Number,
    default: 1,
    min: 1
  },
  currentUses: {
    type: Number,
    default: 0,
    min: 0
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

// Add index for faster querying
accessCodeSchema.index({ code: 1 }, { unique: true });

// Pre-save hook to ensure code is uppercase and trimmed
accessCodeSchema.pre('save', function(next) {
  if (this.isModified('code')) {
    this.code = this.code.trim().toUpperCase();
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
    if (this.currentUses >= this.maxUses && this.maxUses > 0) {
      this.isActive = false;
    }
    return this.save();
  }
  throw new Error('Access code cannot be used');
};

const AccessCode = mongoose.model('AccessCode', accessCodeSchema);

module.exports = AccessCode;
