// backend/routes/folderRoutes.js
const express = require('express');
const router = express.Router();
const Folder = require('../models/Folder');
const File = require('../models/File');
const { verifyToken } = require('../middleware/auth');

// Get all folders for an educator's class
router.get('/', verifyToken, async (req, res) => {
  try {
    const { classCode } = req.query;
    const educatorId = req.user.id;

    if (!classCode) {
      return res.status(400).json({
        success: false,
        error: 'Class code is required'
      });
    }

    const folders = await Folder.getFlatFolders(educatorId, classCode.toUpperCase());
    
    res.status(200).json({
      success: true,
      folders: folders
    });
  } catch (error) {
    console.error('Error fetching folders:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching folders',
      details: error.message
    });
  }
});

// Get folder tree structure
router.get('/tree', verifyToken, async (req, res) => {
  try {
    const { classCode, parentId } = req.query;
    const educatorId = req.user.id;

    if (!classCode) {
      return res.status(400).json({
        success: false,
        error: 'Class code is required'
      });
    }

    const tree = await Folder.getFolderTree(educatorId, classCode.toUpperCase(), parentId);
    
    res.status(200).json({
      success: true,
      tree: tree
    });
  } catch (error) {
    console.error('Error fetching folder tree:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching folder tree',
      details: error.message
    });
  }
});

// Get full folder structure with files
router.get('/structure-with-files', verifyToken, async (req, res) => {
  try {
    const { classCode } = req.query;
    const educatorId = req.user.id;

    if (!classCode) {
      return res.status(400).json({
        success: false,
        error: 'Class code is required'
      });
    }

    // Get all folders
    const folders = await Folder.find({
      educatorId,
      classCode: classCode.toUpperCase(),
      isDeleted: false
    }).sort({ path: 1 });

    // Get all files
    const files = await File.find({
      classCode: classCode.toUpperCase(),
      uploadedBy: educatorId,
      isDeleted: { $ne: true }
    }).populate('uploadedBy', 'username fullName email school');

    // Build folder structure
    const folderMap = {};
    const rootFolders = [];

    // Create folder map
    folders.forEach(folder => {
      folderMap[folder._id] = {
        ...folder.toObject(),
        files: [],
        subfolders: []
      };
    });

    // Build hierarchy
    folders.forEach(folder => {
      const folderId = folder._id;
      const folderData = folderMap[folderId];
      
      if (folder.parentId && folderMap[folder.parentId]) {
        folderMap[folder.parentId].subfolders.push(folderData);
      } else {
        rootFolders.push(folderData);
      }
    });

    // Assign files to folders
    files.forEach(file => {
      if (file.folderId && folderMap[file.folderId]) {
        folderMap[file.folderId].files.push(file);
      }
    });

    // Get unassigned files
    const unassignedFiles = files.filter(file => !file.folderId);

    res.status(200).json({
      success: true,
      folderStructure: rootFolders,
      unassignedFiles,
      totalFolders: folders.length,
      totalFiles: files.length
    });
  } catch (error) {
    console.error('Error fetching folder structure with files:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching folder structure',
      details: error.message
    });
  }
});

// Create new folder
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, classCode, parentId } = req.body;
    const educatorId = req.user.id;

    if (!name || !classCode) {
      return res.status(400).json({
        success: false,
        error: 'Folder name and class code are required'
      });
    }

    // Check if folder with same name already exists in the same parent
    const existingFolder = await Folder.findOne({
      name: name.trim(),
      classCode: classCode.toUpperCase(),
      parentId: parentId || null,
      educatorId,
      isDeleted: false
    });

    if (existingFolder) {
      return res.status(400).json({
        success: false,
        error: 'A folder with this name already exists in this location'
      });
    }

    const folder = new Folder({
      name: name.trim(),
      classCode: classCode.toUpperCase(),
      parentId: parentId || null,
      educatorId
    });

    await folder.save();

    res.status(201).json({
      success: true,
      message: 'Folder created successfully',
      folder: folder
    });
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({
      success: false,
      error: 'Error creating folder',
      details: error.message
    });
  }
});

// Update folder
router.put('/:folderId', verifyToken, async (req, res) => {
  try {
    const { folderId } = req.params;
    const { name } = req.body;
    const educatorId = req.user.id;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Folder name is required'
      });
    }

    const folder = await Folder.findOne({
      _id: folderId,
      educatorId,
      isDeleted: false
    });

    if (!folder) {
      return res.status(404).json({
        success: false,
        error: 'Folder not found'
      });
    }

    // Check if folder with same name already exists in the same parent
    const existingFolder = await Folder.findOne({
      name: name.trim(),
      classCode: folder.classCode,
      parentId: folder.parentId,
      educatorId,
      isDeleted: false,
      _id: { $ne: folderId }
    });

    if (existingFolder) {
      return res.status(400).json({
        success: false,
        error: 'A folder with this name already exists in this location'
      });
    }

    folder.name = name.trim();
    await folder.save();

    // Update path for all child folders
    await updateChildPaths(folder);

    res.status(200).json({
      success: true,
      message: 'Folder updated successfully',
      folder: folder
    });
  } catch (error) {
    console.error('Error updating folder:', error);
    res.status(500).json({
      success: false,
      error: 'Error updating folder',
      details: error.message
    });
  }
});

// Delete folder (soft delete)
router.delete('/:folderId', verifyToken, async (req, res) => {
  try {
    const { folderId } = req.params;
    const educatorId = req.user.id;

    const folder = await Folder.findOne({
      _id: folderId,
      educatorId,
      isDeleted: false
    });

    if (!folder) {
      return res.status(404).json({
        success: false,
        error: 'Folder not found'
      });
    }

    // Check if folder contains files
    const filesCount = await File.countDocuments({
      folderId: folderId,
      isDeleted: { $ne: true }
    });

    if (filesCount > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete folder containing files. Please move or delete the files first.'
      });
    }

    // Check if folder has subfolders
    const subFoldersCount = await Folder.countDocuments({
      parentId: folderId,
      isDeleted: false
    });

    if (subFoldersCount > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete folder containing subfolders. Please delete subfolders first.'
      });
    }

    // Soft delete the folder
    folder.isDeleted = true;
    await folder.save();

    res.status(200).json({
      success: true,
      message: 'Folder deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({
      success: false,
      error: 'Error deleting folder',
      details: error.message
    });
  }
});

// Get folder details
router.get('/:folderId', verifyToken, async (req, res) => {
  try {
    const { folderId } = req.params;
    const educatorId = req.user.id;

    const folder = await Folder.findOne({
      _id: folderId,
      educatorId,
      isDeleted: false
    });

    if (!folder) {
      return res.status(404).json({
        success: false,
        error: 'Folder not found'
      });
    }

    // Get files in this folder
    const files = await File.find({
      folderId: folderId,
      isDeleted: { $ne: true }
    }).populate('uploadedBy', 'username fullName email school');

    res.status(200).json({
      success: true,
      folder: {
        ...folder.toObject(),
        files: files,
        fileCount: files.length
      }
    });
  } catch (error) {
    console.error('Error fetching folder details:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching folder details',
      details: error.message
    });
  }
});

// Get folder tree with files
router.get('/:folderId/tree-with-files', verifyToken, async (req, res) => {
  try {
    const { folderId } = req.params;
    const educatorId = req.user.id;

    const folder = await Folder.findOne({
      _id: folderId,
      educatorId,
      isDeleted: false
    });

    if (!folder) {
      return res.status(404).json({
        success: false,
        error: 'Folder not found'
      });
    }

    // Get folder tree starting from this folder
    const tree = await Folder.getFolderTreeWithFiles(educatorId, folder.classCode, folderId);

    res.status(200).json({
      success: true,
      tree: tree
    });
  } catch (error) {
    console.error('Error fetching folder tree with files:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching folder tree',
      details: error.message
    });
  }
});

// Helper function to update child paths when parent is renamed
async function updateChildPaths(parentFolder) {
  const children = await Folder.find({
    parentId: parentFolder._id,
    isDeleted: false
  });

  for (const child of children) {
    child.path = `${parentFolder.path}/${child.name}`;
    await child.save();
    await updateChildPaths(child); // Recursively update grandchildren
  }
}

module.exports = router;