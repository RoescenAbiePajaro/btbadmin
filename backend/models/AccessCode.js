const mongoose = require('mongoose');

const accessCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  description: String,
  maxUses: {
    type: Number,
    default: 1,
    min: 1
  },
  currentUses: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Increment usage method
accessCodeSchema.methods.incrementUsage = async function() {
  this.currentUses += 1;
  await this.save();
};

module.exports = mongoose.model('AccessCode', accessCodeSchema);