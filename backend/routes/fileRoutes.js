// backend/routes/fileRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const supabase = require('../services/supabaseService');

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
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded' 
      });
    }

    const { classCode, title, description, submissionDeadline } = req.body;
    const filePath = req.file.path;
    
    try {
      // Upload to Supabase
      const uploadResult = await supabase.uploadFile(filePath);
      
      // Clean up the temporary file
      fs.unlinkSync(filePath);
      
      // Here you would typically save file metadata to your database
      // For example:
      // const fileRecord = await File.create({
      //   name: req.file.originalname,
      //   path: uploadResult.path,
      //   url: uploadResult.publicUrl,
      //   size: req.file.size,
      //   mimeType: req.file.mimetype,
      //   classCode,
      //   title,
      //   description,
      //   submissionDeadline: submissionDeadline || null,
      //   uploadedBy: req.user.id,
      //   type: submissionDeadline ? 'assignment' : 'material'
      // });

      // For now, we'll return the file info directly
      const fileInfo = {
        _id: uploadResult.path, // Using path as a temporary ID
        name: req.file.originalname,
        path: uploadResult.path,
        url: uploadResult.publicUrl,
        size: req.file.size,
        mimeType: req.file.mimetype,
        classCode,
        assignmentTitle: title,
        assignmentDescription: description,
        submissionDeadline: submissionDeadline || null,
        uploadedAt: new Date().toISOString(),
        type: submissionDeadline ? 'assignment' : 'material'
      };

      res.status(200).json({
        success: true,
        message: 'File uploaded successfully',
        file: fileInfo
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

// List files endpoint
router.get('/list', async (req, res) => {
  try {
    const { classCode } = req.query;
    
    // In a real app, you would fetch files from your database with proper filtering
    // For now, we'll list all files from the bucket
    const files = await supabase.listFiles();
    
    // Format files with public URLs
    const formattedFiles = await Promise.all(files.map(async (file) => {
      const { data: { publicUrl } } = await supabase.getFileUrl(file.name);
      return {
        _id: file.name, // Using name as ID for now
        name: file.name,
        size: file.metadata?.size,
        mimeType: file.metadata?.mimetype,
        lastModified: file.metadata?.lastModified,
        url: publicUrl,
        path: file.name
      };
    }));
    
    // Filter by class code if provided
    const filteredFiles = classCode 
      ? formattedFiles.filter(file => file.classCode === classCode)
      : formattedFiles;
    
    res.status(200).json({
      success: true,
      files: filteredFiles
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

// Get files for educator
router.get('/educator', async (req, res) => {
  try {
    // In a real app, you would fetch files for the logged-in educator
    // For now, we'll return all files
    const response = await axios.get('http://localhost:5000/api/files/list');
    res.json({
      success: true,
      files: response.data.files || []
    });
  } catch (error) {
    console.error('Error fetching educator files:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch files',
      details: error.message
    });
  }
});

// Get recent activities
router.get('/recent', async (req, res) => {
  try {
    // In a real app, you would fetch recent activities from your database
    // For now, we'll return a mock response
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

// Delete file endpoint
router.delete('/:filePath', async (req, res) => {
  try {
    const { filePath } = req.params;
    
    // In a real app, you would check permissions here
    // For example: verify the user has rights to delete this file
    
    const result = await supabase.deleteFile(filePath);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete file');
    }
    
    // Also delete the file record from your database
    // await File.deleteOne({ path: filePath });
    
    res.status(200).json({
      success: true,
      message: 'File deleted successfully',
      data: result.data
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

// Download submission endpoint
router.get('/download-submission/:submissionId', async (req, res) => {
  try {
    const { submissionId } = req.params;
    
    // In a real app, you would:
    // 1. Verify the user has permission to download this submission
    // 2. Get the file path from your database
    // 3. Generate a signed URL or serve the file directly
    
    // For now, we'll just return a 404
    res.status(404).json({
      success: false,
      error: 'Not implemented'
    });
  } catch (error) {
    console.error('Error downloading submission:', error);
    res.status(500).json({
      success: false,
      error: 'Error downloading submission',
      details: error.message
    });
  }
});

// Get assignment submissions
router.get('/assignment-submissions/:assignmentId', async (req, res) => {
  try {
    const { assignmentId } = req.params;
    
    // In a real app, you would fetch submissions for this assignment from your database
    // For now, we'll return an empty array
    
    res.json({
      success: true,
      submissions: []
    });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch submissions',
      details: error.message
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