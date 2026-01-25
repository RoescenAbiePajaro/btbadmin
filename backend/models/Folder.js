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
folderSchema.index({ path: 1 });

// Pre-save middleware to update path and level
folderSchema.pre('save', async function(next) {
  if (!this.isModified('parentId') && !this.isModified('name')) {
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

// Static method to get folder tree with files
folderSchema.statics.getFolderTreeWithFiles = async function(educatorId, classCode, parentId = null) {
  const folders = await this.find({
    educatorId,
    classCode,
    parentId,
    isDeleted: false
  }).sort({ name: 1 });

  const File = mongoose.model('File');
  const tree = [];
  
  for (const folder of folders) {
    // Get files in this folder
    const files = await File.find({
      folderId: folder._id,
      isDeleted: { $ne: true }
    }).sort({ createdAt: -1 });
    
    // Get subfolders recursively
    const children = await this.getFolderTreeWithFiles(educatorId, classCode, folder._id);
    
    tree.push({
      ...folder.toObject(),
      files: files || [],
      fileCount: files.length,
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

// Static method to get all folders with file counts
folderSchema.statics.getFoldersWithFileCounts = async function(educatorId, classCode) {
  const folders = await this.find({
    educatorId,
    classCode,
    isDeleted: false
  }).sort({ path: 1 });

  const File = mongoose.model('File');
  const foldersWithCounts = [];
  
  for (const folder of folders) {
    const fileCount = await File.countDocuments({
      folderId: folder._id,
      isDeleted: { $ne: true }
    });
    
    foldersWithCounts.push({
      ...folder.toObject(),
      fileCount
    });
  }
  
  return foldersWithCounts;
};

// Instance method to get full path with folder names
folderSchema.methods.getFullPath = function() {
  return this.path;
};

// Instance method to get breadcrumb path
folderSchema.methods.getBreadcrumb = async function() {
  const breadcrumb = [];
  let currentFolder = this;
  
  while (currentFolder) {
    breadcrumb.unshift({
      _id: currentFolder._id,
      name: currentFolder.name
    });
    
    if (currentFolder.parentId) {
      currentFolder = await this.constructor.findById(currentFolder.parentId);
    } else {
      break;
    }
  }
  
  return breadcrumb;
};

// Instance method to get all descendant folder IDs
folderSchema.methods.getDescendantIds = async function() {
  const descendantIds = [];
  
  const getChildrenIds = async (parentId) => {
    const children = await this.constructor.find({
      parentId,
      isDeleted: false
    });
    
    for (const child of children) {
      descendantIds.push(child._id);
      await getChildrenIds(child._id);
    }
  };
  
  await getChildrenIds(this._id);
  return descendantIds;
};

module.exports = mongoose.model('Folder', folderSchema);