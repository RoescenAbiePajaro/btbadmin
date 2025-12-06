// backend/routes/fileRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const supabase = require('../services/supabaseService');
const File = require('../models/File');
const User = require('../models/User');
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

    const { classCode, title, description, submissionDeadline } = req.body;
    
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
        assignmentTitle: title,
        assignmentDescription: description,
        submissionDeadline: submissionDeadline || null,
        type: submissionDeadline ? 'assignment' : 'material',
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
    
    if (classCode) {
      query.classCode = classCode.toUpperCase();
    }
    
    // If user is educator, show only their uploaded files
    if (userRole === 'educator') {
      query.uploadedBy = userId;
    }
    // If user is student, show files from their enrolled class
    else if (userRole === 'student') {
      const user = await User.findById(userId).populate('enrolledClass');
      if (user.enrolledClass) {
        query.classCode = user.enrolledClass.classCode;
      } else {
        return res.json({
          success: true,
          files: [],
          message: 'You are not enrolled in any class'
        });
      }
    }
    
    const files = await File.find(query)
      .sort({ uploadedAt: -1 })
      .populate('uploadedBy', 'username fullName');
    
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

// ===============================
// SUBMISSION ROUTES
// ===============================

// Submit assignment
router.post('/submit-assignment', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded' 
      });
    }

    const { assignmentId, studentId, studentName, studentEmail, classCode } = req.body;
    
    if (!assignmentId) {
      return res.status(400).json({
        success: false,
        error: 'Assignment ID is required'
      });
    }

    // Get the assignment
    const assignment = await File.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found'
      });
    }

    // Check if assignment is actually an assignment
    if (assignment.type !== 'assignment') {
      return res.status(400).json({
        success: false,
        error: 'This is not an assignment'
      });
    }

    // Check if deadline has passed
    if (assignment.submissionDeadline && new Date(assignment.submissionDeadline) < new Date()) {
      // Still allow submission but mark as late
      console.log('Late submission detected');
    }

    const filePath = req.file.path;
    
    try {
      // Upload to Supabase
      const uploadResult = await supabase.uploadFile(filePath, req.file.originalname);
      
      // Clean up the temporary file
      fs.unlinkSync(filePath);
      
      // Create submission record
      const Submission = require('../models/Submission');
      
      const submission = new Submission({
        assignmentId: assignmentId,
        studentId: studentId || req.user.id,
        studentName: studentName || req.user.fullName,
        studentEmail: studentEmail || req.user.email,
        fileName: uploadResult.fileName,
        originalName: req.file.originalname,
        filePath: uploadResult.path,
        fileUrl: uploadResult.publicUrl,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        classCode: assignment.classCode,
        submittedAt: new Date(),
        status: assignment.submissionDeadline && new Date() > new Date(assignment.submissionDeadline) ? 'late' : 'submitted'
      });

      await submission.save();

      // Update assignment submission count and add submission reference
      assignment.submissionCount = (assignment.submissionCount || 0) + 1;
      assignment.submissions = assignment.submissions || [];
      assignment.submissions.push(submission._id);
      await assignment.save();

      // Create activity log
      const Activity = require('../models/Activity');
      const activity = new Activity({
        fileId: assignmentId,
        studentId: studentId || req.user.id,
        studentName: studentName || req.user.fullName,
        activityType: 'submission',
        createdAt: new Date()
      });
      await activity.save();

      res.status(200).json({
        success: true,
        message: 'Assignment submitted successfully',
        submission: submission
      });
    } catch (uploadError) {
      // Clean up the temporary file in case of error
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw uploadError;
    }
  } catch (error) {
    console.error('Submission error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Error submitting assignment' 
    });
  }
});

// Get student's submissions
router.get('/my-submissions', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const Submission = require('../models/Submission');
    const submissions = await Submission.find({ 
      studentId: userId 
    })
    .sort({ submittedAt: -1 })
    .populate('assignmentId', 'assignmentTitle submissionDeadline classCode');
    
    res.json({
      success: true,
      count: submissions.length,
      submissions: submissions
    });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching submissions',
      details: error.message
    });
  }
});

// Get assignment submissions (for educator)
router.get('/assignment-submissions/:assignmentId', verifyToken, async (req, res) => {
  try {
    const { assignmentId } = req.params;
    
    // Verify the user is the educator who uploaded this assignment
    const assignment = await File.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found'
      });
    }

    if (assignment.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'You can only view submissions for your own assignments'
      });
    }

    const Submission = require('../models/Submission');
    const submissions = await Submission.find({ 
      assignmentId: assignmentId 
    })
    .sort({ submittedAt: 1 })
    .populate('studentId', 'fullName email username');
    
    res.json({
      success: true,
      count: submissions.length,
      submissions: submissions
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

// Download submission file
router.get('/download-submission/:submissionId', verifyToken, async (req, res) => {
  try {
    const { submissionId } = req.params;
    
    const Submission = require('../models/Submission');
    const submission = await Submission.findById(submissionId);
    
    if (!submission) {
      return res.status(404).json({
        success: false,
        error: 'Submission not found'
      });
    }

    // Verify access
    const user = req.user;
    const assignment = await File.findById(submission.assignmentId);
    
    // Check permissions: Educator can download if they uploaded the assignment
    // Student can download their own submission
    const isEducator = user.role === 'educator' && assignment.uploadedBy.toString() === user.id;
    const isStudentOwner = user.role === 'student' && submission.studentId.toString() === user.id;
    
    if (!isEducator && !isStudentOwner) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Get the file URL
    const { data: { publicUrl } } = supabase.storage
      .from('class-files')
      .getPublicUrl(submission.filePath);
    
    // Redirect to the download URL
    res.redirect(publicUrl);
  } catch (error) {
    console.error('Error downloading submission:', error);
    res.status(500).json({
      success: false,
      error: 'Error downloading submission',
      details: error.message
    });
  }
});

// Grade submission
router.post('/grade-submission/:submissionId', verifyToken, async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { grade, feedback } = req.body;
    
    if (grade === undefined || grade === null) {
      return res.status(400).json({
        success: false,
        error: 'Grade is required'
      });
    }

    const Submission = require('../models/Submission');
    const submission = await Submission.findById(submissionId);
    
    if (!submission) {
      return res.status(404).json({
        success: false,
        error: 'Submission not found'
      });
    }

    // Verify educator owns the assignment
    const assignment = await File.findById(submission.assignmentId);
    if (assignment.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'You can only grade submissions for your own assignments'
      });
    }

    // Update submission
    submission.grade = grade;
    submission.feedback = feedback || '';
    submission.status = 'graded';
    await submission.save();

    res.json({
      success: true,
      message: 'Submission graded successfully',
      submission: submission
    });
  } catch (error) {
    console.error('Error grading submission:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to grade submission',
      details: error.message
    });
  }
});

// Get student activities
router.get('/student-activities', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const Activity = require('../models/Activity');
    const activities = await Activity.find({
      studentId: userId
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('fileId', 'assignmentTitle');
    
    res.json({
      success: true,
      activities: activities.map(activity => ({
        type: activity.activityType,
        fileName: activity.fileId?.assignmentTitle || 'File',
        timestamp: activity.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching activities',
      details: error.message
    });
  }
});

// Log download activity
router.post('/log-download', verifyToken, async (req, res) => {
  try {
    const { fileId, studentId, studentName } = req.body;
    
    const Activity = require('../models/Activity');
    
    const activity = new Activity({
      fileId: fileId,
      studentId: studentId || req.user.id,
      studentName: studentName || req.user.fullName,
      activityType: 'download',
      createdAt: new Date()
    });
    
    await activity.save();
    
    res.json({
      success: true,
      message: 'Download logged'
    });
  } catch (error) {
    console.error('Error logging download:', error);
    res.status(500).json({
      success: false,
      error: 'Error logging download'
    });
  }
});

module.exports = router;