const express = require('express');
const router = express.Router();
const multer = require('multer');
const File = require('../models/File');
const auth = require('../middleware/auth');

// Temporary middleware until auth is created
const tempAuth = (req, res, next) => {
  // For now, just pass through
  req.user = { id: 'temp-user', role: 'student' };
  next();
};

// Configure multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'temp-uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

// Health check for file routes
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    message: 'File routes are working',
    timestamp: new Date().toISOString()
  });
});

// Simple upload endpoint
router.post('/upload-simple', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded' 
      });
    }

    const { classCode } = req.body;
    
    // Create simple file record
    const file = new File({
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileUrl: `/temp/${req.file.filename}`,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      uploadedBy: req.body.userId || 'temp-user',
      classCode: classCode || 'default-class'
    });

    await file.save();

    res.json({ 
      success: true, 
      message: 'File uploaded successfully (local)',
      file: {
        id: file._id,
        fileName: file.fileName,
        fileSize: file.fileSize,
        fileUrl: file.fileUrl,
        uploadedAt: file.uploadedAt
      }
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Error uploading file' 
    });
  }
});

// Get files by class
router.get('/class/:classCode', async (req, res) => {
  try {
    const { classCode } = req.params;
    
    const files = await File.find({ 
      classCode: classCode.toUpperCase()
    }).sort({ uploadedAt: -1 });
    
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

module.exports = router;