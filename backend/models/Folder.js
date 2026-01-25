// backend/models/Folder.js
const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  educatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  classCode: {
    type: String,
    required: true
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null
  },
  path: {
    type: String,
    default: ''
  },
  level: {
    type: Number,
    default: 0
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient queries
folderSchema.index({ educatorId: 1, classCode: 1, isDeleted: 1 });
folderSchema.index({ parentId: 1 });

// Pre-save middleware to update path and level
folderSchema.pre('save', async function(next) {
  if (!this.isModified('parentId')) {
    return next();
  }

  if (!this.parentId) {
    // Root level folder
    this.path = this.name;
    this.level = 0;
  } else {
    // Child folder - get parent path
    try {
      const parent = await this.constructor.findById(this.parentId);
      if (parent) {
        this.path = `${parent.path}/${this.name}`;
        this.level = parent.level + 1;
      } else {
        this.path = this.name;
        this.level = 0;
      }
    } catch (error) {
      return next(error);
    }
  }
  
  next();
});

// Static method to get folder tree
folderSchema.statics.getFolderTree = async function(educatorId, classCode, parentId = null) {
  const folders = await this.find({
    educatorId,
    classCode,
    parentId,
    isDeleted: false
  }).sort({ name: 1 });

  const tree = [];
  for (const folder of folders) {
    const children = await this.getFolderTree(educatorId, classCode, folder._id);
    tree.push({
      ...folder.toObject(),
      children
    });
  }
  return tree;
};

// Static method to get all folders in flat structure
folderSchema.statics.getFlatFolders = async function(educatorId, classCode) {
  return await this.find({
    educatorId,
    classCode,
    isDeleted: false
  }).sort({ path: 1 });
};

// Instance method to get full path with folder names
folderSchema.methods.getFullPath = function() {
  return this.path;
};

module.exports = mongoose.model('Folder', folderSchema);
