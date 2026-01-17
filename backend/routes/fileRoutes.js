// backend/routes/fileRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const supabase = require('../services/supabaseService');
const File = require('../models/File');
const User = require('../models/User');
const Class = require('../models/Class');
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
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'application/zip',
      'application/x-rar-compressed'
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
    // Check if Supabase is reachable
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

    const { classCode, title, description } = req.body;
    
    if (!classCode) {
      return res.status(400).json({
        success: false,
        error: 'Class code is required'
      });
    }

    const filePath = req.file.path;
    
    try {
      // Upload to Supabase
      const uploadResult = await supabase.uploadFile(filePath, req.file.originalname);
      
      // Clean up the temporary file
      fs.unlinkSync(filePath);
      
      // Get user info
      const user = await User.findById(req.user.id);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Save file metadata to database
      const fileRecord = new File({
        name: uploadResult.fileName,
        originalName: req.file.originalname,
        path: uploadResult.path,
        url: uploadResult.publicUrl,
        size: req.file.size,
        mimeType: req.file.mimetype,
        classCode: classCode.toUpperCase(),
        title: title,
        description: description,
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
      // Clean up the temporary file in case of error
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

// List files endpoint with role-based access control
router.get('/list', verifyToken, async (req, res) => {
  try {
    const { classCode } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let query = {};
    
    console.log('Files list request from:', { userId, userRole, classCode });
    
    // If user is admin, show all files
    if (userRole === 'admin') {
      // Admin can see all files
      if (classCode) {
        query.classCode = classCode.toUpperCase();
      }
      // No other filters for admin
    }
    // If user is student, they should only see files from their CURRENT enrolled class
    else if (userRole === 'student') {
      const user = await User.findById(userId);
      
      if (!user.enrolledClass) {
        return res.json({
          success: true,
          files: [],
          message: 'You are not enrolled in any class'
        });
      }
      
      // Get the current class
      const currentClass = await Class.findById(user.enrolledClass);
      if (!currentClass) {
        return res.json({
          success: true,
          files: [],
          message: 'Your current class was not found'
        });
      }
      
      // Always filter by student's CURRENT enrolled class
      query.classCode = currentClass.classCode;
      console.log('Student query:', query);
    }
    // If user is educator, show only their uploaded files
    else if (userRole === 'educator') {
      query.uploadedBy = userId;
      
      // If classCode is provided, also filter by it
      if (classCode) {
        query.classCode = classCode.toUpperCase();
      }
    }
    
    const files = await File.find(query)
      .sort({ createdAt: -1 })
      .populate('uploadedBy', 'username fullName email school');
    
    console.log(`Found ${files.length} files for query:`, query);
    
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

// Get files by class with access control
router.get('/class/:classCode', verifyToken, async (req, res) => {
  try {
    const { classCode } = req.params;
    const userId = req.user.id;
    
    // Verify user has access to this class
    if (req.user.role === 'educator') {
      const educatorClasses = await Class.find({ educator: userId });
      const hasAccess = educatorClasses.some(c => c.classCode === classCode);
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this class'
        });
      }
    } else if (req.user.role === 'student') {
      const user = await User.findById(userId);
      if (!user.enrolledClass || user.enrolledClass.classCode !== classCode) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this class'
        });
      }
    }
    
    const files = await File.find({ 
      classCode: classCode.toUpperCase()
    })
    .sort({ uploadedAt: -1 })
    .populate('uploadedBy', 'username fullName');
    
    res.json({ 
      success: true, 
      count: files.length,
      files: files 
    });
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Error fetching files' 
    });
  }
});

// Delete file endpoint with permission check
router.delete('/:fileId', verifyToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    
    // Find the file
    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    // Verify ownership (educator can only delete their own files)
    if (req.user.role === 'educator' && file.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You can only delete files you uploaded'
      });
    }
    
    // Delete from Supabase storage
    await supabase.deleteFile(file.path);
    
    // Delete from database
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

// Download file endpoint
router.get('/download/:filePath', async (req, res) => {
  try {
    const { filePath } = req.params;
    
    // In a real app, you would check permissions here
    
    // Get the file URL from Supabase
    const { data: { publicUrl } } = await supabase.getFileUrl(filePath);
    
    // Redirect to the public URL (let the browser handle the download)
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

// Get recent activities
router.get('/recent', async (req, res) => {
  try {
    res.json({
      success: true,
      activities: []
    });
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent activities',
      details: error.message
    });
  }
});

module.exports = router;