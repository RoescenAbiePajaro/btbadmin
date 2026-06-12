const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const supabase = require('../services/supabaseService');
const File = require('../models/File');
const User = require('../models/User');
const Class = require('../models/Class');
const Folder = require('../models/Folder');
const { verifyToken } = require('../middleware/auth');

// Ensure temp-uploads directory exists
const tempUploadDir = 'temp-uploads';
if (!fs.existsSync(tempUploadDir)) {
  fs.mkdirSync(tempUploadDir, { recursive: true });
}

// Configure multer for temporary file storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempUploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, documents, and archives are allowed.'));
    }
  }
});

// Health check for file routes
router.get('/health', async (req, res) => {
  try {
    const { data: buckets, error } = await supabase.listFiles();
    
    if (error) {
      throw error;
    }
    
    res.json({ 
      status: 'healthy', 
      message: 'File routes and Supabase storage are working',
      bucketCount: Array.isArray(buckets) ? buckets.length : 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      message: 'File service is not available',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Upload file endpoint
router.post('/upload', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded' 
      });
    }

    const { classCode, folderId, title, description } = req.body;
    
    if (!classCode) {
      return res.status(400).json({
        success: false,
        error: 'Class code is required'
      });
    }

    if (!folderId) {
      return res.status(400).json({
        success: false,
        error: 'Folder is required. Please select a folder for the upload.'
      });
    }

    const folder = await Folder.findOne({
      _id: folderId,
      educatorId: req.user.id,
      classCode: classCode.toUpperCase(),
      isDeleted: false
    });

    if (!folder) {
      return res.status(400).json({
        success: false,
        error: 'Invalid folder selected'
      });
    }

    const filePath = req.file.path;
    
    try {
      const uploadResult = await supabase.uploadFile(filePath, req.file.originalname);
      
      fs.unlinkSync(filePath);
      
      const user = await User.findById(req.user.id);
      if (!user) {
        throw new Error('User not found');
      }
      
      const fileRecord = new File({
        name: uploadResult.fileName,
        originalName: req.file.originalname,
        path: uploadResult.path,
        url: uploadResult.publicUrl,
        size: req.file.size,
        mimeType: req.file.mimetype,
        classCode: classCode.toUpperCase(),
        folderId: folderId,
        title: title || '',
        description: description || '',
        type: 'material',
        uploadedBy: req.user.id,
        uploaderName: user.fullName || user.username,
        supabaseId: uploadResult.supabaseId
      });

      await fileRecord.save();

      res.status(200).json({
        success: true,
        message: 'File uploaded successfully',
        file: fileRecord
      });
    } catch (uploadError) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw uploadError;
    }
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Error uploading file' 
    });
  }
});

// List files endpoint
router.get('/list', verifyToken, async (req, res) => {
  try {
    const { classCode } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let query = {};
    
    console.log('Files list request from:', { userId, userRole, classCode });
    
    if (userRole === 'admin') {
      if (classCode) {
        query.classCode = classCode.toUpperCase();
      }
    } else if (userRole === 'student') {
      const user = await User.findById(userId);
      
      if (!user.enrolledClass) {
        return res.json({
          success: true,
          files: [],
          message: 'You are not enrolled in any class'
        });
      }
      
      const currentClass = await Class.findById(user.enrolledClass);
      if (!currentClass) {
        return res.json({
          success: true,
          files: [],
          message: 'Your current class was not found'
        });
      }
      
      query.classCode = currentClass.classCode;
    } else if (userRole === 'educator') {
      query.uploadedBy = userId;
      
      if (classCode) {
        query.classCode = classCode.toUpperCase();
      }
    }
    
    const files = await File.find(query)
      .select('name originalName path url size mimeType classCode folderId title description type uploadedBy uploaderName createdAt updatedAt')
      .sort({ createdAt: -1 })
      .populate('uploadedBy', 'username fullName email school');
    
    res.status(200).json({
      success: true,
      count: files.length,
      files: files
    });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({
      success: false,
      error: 'Error listing files',
      details: error.message
    });
  }
});

// Get single file by ID
router.get('/:fileId', verifyToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const file = await File.findById(fileId)
      .populate('uploadedBy', 'username fullName email school')
      .populate('folderId', 'name path');
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    if (userRole === 'educator' && file.uploadedBy._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this file'
      });
    } else if (userRole === 'student') {
      const user = await User.findById(userId);
      if (!user.enrolledClass) {
        return res.status(403).json({
          success: false,
          error: 'You are not enrolled in any class'
        });
      }
      
      const currentClass = await Class.findById(user.enrolledClass);
      if (!currentClass || currentClass.classCode !== file.classCode) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this file'
        });
      }
    }
    
    res.status(200).json({
      success: true,
      file: file
    });
  } catch (error) {
    console.error('Error fetching file:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching file',
      details: error.message
    });
  }
});

// Update file metadata
router.put('/:fileId', verifyToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    const { title, description } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    if (userRole === 'educator' && file.uploadedBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You can only update files you uploaded'
      });
    }
    
    if (title !== undefined) file.title = title;
    if (description !== undefined) file.description = description;
    
    await file.save();
    
    res.status(200).json({
      success: true,
      message: 'File updated successfully',
      file: file
    });
  } catch (error) {
    console.error('Error updating file:', error);
    res.status(500).json({
      success: false,
      error: 'Error updating file',
      details: error.message
    });
  }
});

// Delete file
router.delete('/:fileId', verifyToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    
    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    if (req.user.role === 'educator' && file.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You can only delete files you uploaded'
      });
    }
    
    await supabase.deleteFile(file.path);
    await File.findByIdAndDelete(fileId);
    
    res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      success: false,
      error: 'Error deleting file',
      details: error.message
    });
  }
});

// Download file
router.get('/download/:fileId', verifyToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    if (userRole === 'educator' && file.uploadedBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this file'
      });
    } else if (userRole === 'student') {
      const user = await User.findById(userId);
      if (!user.enrolledClass) {
        return res.status(403).json({
          success: false,
          error: 'You are not enrolled in any class'
        });
      }
      
      const currentClass = await Class.findById(user.enrolledClass);
      if (!currentClass || currentClass.classCode !== file.classCode) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this file'
        });
      }
    }
    
    const { data: { publicUrl } } = await supabase.getFileUrl(file.path);
    res.redirect(publicUrl);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({
      success: false,
      error: 'Error downloading file',
      details: error.message
    });
  }
});

// Get files by folder
router.get('/folder/:folderId', verifyToken, async (req, res) => {
  try {
    const { folderId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const folder = await Folder.findById(folderId);
    if (!folder) {
      return res.status(404).json({
        success: false,
        error: 'Folder not found'
      });
    }
    
    if (userRole === 'educator' && folder.educatorId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this folder'
      });
    } else if (userRole === 'student') {
      const user = await User.findById(userId);
      if (!user.enrolledClass) {
        return res.status(403).json({
          success: false,
          error: 'You are not enrolled in any class'
        });
      }
      
      const currentClass = await Class.findById(user.enrolledClass);
      if (!currentClass || currentClass.classCode !== folder.classCode) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this folder'
        });
      }
    }
    
    const files = await File.find({
      folderId: folderId,
      classCode: folder.classCode
    })
    .sort({ createdAt: -1 })
    .populate('uploadedBy', 'username fullName email');
    
    res.status(200).json({
      success: true,
      count: files.length,
      files: files,
      folder: folder
    });
  } catch (error) {
    console.error('Error fetching files by folder:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching files',
      details: error.message
    });
  }
});

// Get folder structure with files
router.get('/folder-structure', verifyToken, async (req, res) => {
  try {
    const { classCode } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let folderQuery = { isDeleted: false };
    
    if (userRole === 'admin') {
      if (classCode) {
        folderQuery.classCode = classCode.toUpperCase();
      }
    } else if (userRole === 'student') {
      const user = await User.findById(userId);
      if (!user.enrolledClass) {
        return res.json({
          success: true,
          folderStructure: [],
          unassignedFiles: []
        });
      }
      
      const currentClass = await Class.findById(user.enrolledClass);
      if (!currentClass) {
        return res.json({
          success: true,
          folderStructure: [],
          unassignedFiles: []
        });
      }
      
      folderQuery.classCode = currentClass.classCode;
    } else if (userRole === 'educator') {
      folderQuery.educatorId = userId;
      if (classCode) {
        folderQuery.classCode = classCode.toUpperCase();
      }
    }
    
    const folders = await Folder.find(folderQuery).sort({ path: 1 });
    
    let fileQuery = {};
    if (userRole === 'admin') {
      if (classCode) fileQuery.classCode = classCode.toUpperCase();
    } else if (userRole === 'student') {
      if (folderQuery.classCode) fileQuery.classCode = folderQuery.classCode;
    } else if (userRole === 'educator') {
      fileQuery.uploadedBy = userId;
      if (classCode) fileQuery.classCode = classCode.toUpperCase();
    }
    
    const files = await File.find(fileQuery)
      .sort({ createdAt: -1 })
      .populate('uploadedBy', 'username fullName email school');
    
    const folderMap = new Map();
    const rootFolders = [];
    
    folders.forEach(folder => {
      folderMap.set(folder._id.toString(), {
        ...folder.toObject(),
        files: [],
        subfolders: []
      });
    });
    
    folders.forEach(folder => {
      const folderId = folder._id.toString();
      const folderData = folderMap.get(folderId);
      
      if (folder.parentId && folderMap.get(folder.parentId.toString())) {
        folderMap.get(folder.parentId.toString()).subfolders.push(folderData);
      } else {
        rootFolders.push(folderData);
      }
    });
    
    files.forEach(file => {
      if (file.folderId && folderMap.has(file.folderId.toString())) {
        folderMap.get(file.folderId.toString()).files.push(file);
      }
    });
    
    const unassignedFiles = files.filter(file => !file.folderId);
    
    res.status(200).json({
      success: true,
      folderStructure: rootFolders,
      unassignedFiles: unassignedFiles,
      totalFiles: files.length,
      totalFolders: folders.length
    });
  } catch (error) {
    console.error('Error fetching folder structure:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching folder structure',
      details: error.message
    });
  }
});

// Search files
router.get('/search/:query', verifyToken, async (req, res) => {
  try {
    const { query } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters'
      });
    }
    
    let searchQuery = {};
    
    if (userRole === 'educator') {
      searchQuery.uploadedBy = userId;
      searchQuery.$or = [
        { name: { $regex: query, $options: 'i' } },
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { originalName: { $regex: query, $options: 'i' } }
      ];
    } else if (userRole === 'student') {
      const user = await User.findById(userId);
      if (user.enrolledClass) {
        const currentClass = await Class.findById(user.enrolledClass);
        if (currentClass) {
          searchQuery.classCode = currentClass.classCode;
          searchQuery.$or = [
            { name: { $regex: query, $options: 'i' } },
            { title: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } },
            { originalName: { $regex: query, $options: 'i' } }
          ];
        }
      }
    } else if (userRole === 'admin') {
      searchQuery.$or = [
        { name: { $regex: query, $options: 'i' } },
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { originalName: { $regex: query, $options: 'i' } }
      ];
    }
    
    const files = await File.find(searchQuery)
      .sort({ createdAt: -1 })
      .populate('uploadedBy', 'username fullName email');
    
    res.status(200).json({
      success: true,
      count: files.length,
      files: files,
      searchTerm: query
    });
  } catch (error) {
    console.error('Error searching files:', error);
    res.status(500).json({
      success: false,
      error: 'Error searching files',
      details: error.message
    });
  }
});

module.exports = router;