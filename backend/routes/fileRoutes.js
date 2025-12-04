// backend/routes/fileRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const File = require('../models/File');
const auth = require('../middleware/auth');
const Activity = require('../models/Activity');
const Submission = require('../models/Submission');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Upload file from educator
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    const { classCode, educatorId } = req.body;
    
    const file = new File({
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      uploadedBy: educatorId,
      classCode: classCode,
      uploadedAt: new Date()
    });

    await file.save();

    // Log activity
    const activity = new Activity({
      type: 'upload',
      fileName: req.file.originalname,
      fileId: file._id,
      educatorId: educatorId,
      classCode: classCode,
      timestamp: new Date()
    });

    await activity.save();

    res.json({ success: true, file });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ success: false, error: 'Error uploading file' });
  }
});

// Upload file from student
router.post('/student-upload', auth, upload.single('file'), async (req, res) => {
  try {
    const { classCode, studentId, studentName } = req.body;
    
    const file = new File({
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      uploadedBy: studentId,
      uploadedByName: studentName,
      classCode: classCode,
      uploadedAt: new Date(),
      isStudentUpload: true
    });

    await file.save();

    // Log activity
    const activity = new Activity({
      type: 'upload',
      fileName: req.file.originalname,
      fileId: file._id,
      studentId: studentId,
      studentName: studentName,
      classCode: classCode,
      timestamp: new Date()
    });

    await activity.save();

    res.json({ success: true, file });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ success: false, error: 'Error uploading file' });
  }
});

// Get files for educator
router.get('/educator', auth, async (req, res) => {
  try {
    const files = await File.find({ 
      uploadedBy: req.user._id,
      isStudentUpload: { $ne: true }
    }).sort({ uploadedAt: -1 });
    
    res.json({ success: true, files });
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ success: false, error: 'Error fetching files' });
  }
});

// Get files for student by class code
router.get('/student/:classCode', auth, async (req, res) => {
  try {
    const files = await File.find({ 
      classCode: req.params.classCode,
      isStudentUpload: { $ne: true }
    }).sort({ uploadedAt: -1 });
    
    res.json({ success: true, files });
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ success: false, error: 'Error fetching files' });
  }
});

// Get recent activities for educator
router.get('/recent', auth, async (req, res) => {
  try {
    const activities = await Activity.find({
      $or: [
        { educatorId: req.user._id },
        { classCode: { $in: req.user.classCodes || [] } }
      ]
    })
    .sort({ timestamp: -1 })
    .limit(10);
    
    res.json({ success: true, activities });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ success: false, error: 'Error fetching activities' });
  }
});

// Get student activities
router.get('/student-activities', auth, async (req, res) => {
  try {
    const activities = await Activity.find({
      studentId: req.user._id
    })
    .sort({ timestamp: -1 })
    .limit(10);
    
    res.json({ success: true, activities });
  } catch (error) {
    console.error('Error fetching student activities:', error);
    res.status(500).json({ success: false, error: 'Error fetching activities' });
  }
});

// Log download activity
router.post('/log-download', auth, async (req, res) => {
  try {
    const { fileId, studentId, studentName } = req.body;
    
    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    const activity = new Activity({
      type: 'download',
      fileName: file.fileName,
      fileId: fileId,
      studentId: studentId,
      studentName: studentName,
      classCode: file.classCode,
      timestamp: new Date()
    });

    await activity.save();
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error logging download:', error);
    res.status(500).json({ success: false, error: 'Error logging download' });
  }
});

// Download file
router.get('/download/:fileId', auth, async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.download(file.filePath, file.fileName);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: 'Error downloading file' });
  }
});

// Get student's uploaded files
router.get('/my-uploads', auth, async (req, res) => {
  try {
    const files = await File.find({ 
      uploadedBy: req.user._id,
      isStudentUpload: true
    }).sort({ uploadedAt: -1 });
    
    res.json({ success: true, files });
  } catch (error) {
    console.error('Error fetching student files:', error);
    res.status(500).json({ success: false, error: 'Error fetching files' });
  }
});

// Toggle share with educator status
router.put('/toggle-share/:fileId', auth, async (req, res) => {
  try {
    const { shareWithEducator } = req.body;
    const file = await File.findById(req.params.fileId);
    
    if (!file) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    // Check if user owns the file
    if (file.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    file.sharedWithEducator = shareWithEducator;
    await file.save();

    // Log share toggle activity
    const activity = new Activity({
      type: 'share_toggle',
      fileName: file.fileName,
      fileId: file._id,
      studentId: req.user._id,
      studentName: req.user.fullName,
      newStatus: shareWithEducator,
      timestamp: new Date()
    });

    await activity.save();

    res.json({ success: true, file });
  } catch (error) {
    console.error('Error toggling share status:', error);
    res.status(500).json({ success: false, error: 'Error updating share status' });
  }
});

// Delete file
router.delete('/delete/:fileId', auth, async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);
    
    if (!file) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    // Check if user owns the file or is educator for that class
    const isOwner = file.uploadedBy.toString() === req.user._id.toString();
    const isEducator = req.user.role === 'educator' && req.user.classCodes?.includes(file.classCode);
    
    if (!isOwner && !isEducator) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    // Delete file from filesystem
    const fs = require('fs');
    if (fs.existsSync(file.filePath)) {
      fs.unlinkSync(file.filePath);
    }

    // Log delete activity
    const activity = new Activity({
      type: 'delete',
      fileName: file.fileName,
      fileId: file._id,
      userId: req.user._id,
      userName: req.user.fullName,
      timestamp: new Date()
    });

    await activity.save();

    await file.deleteOne();

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ success: false, error: 'Error deleting file' });
  }
});

// Get educator visible student files
router.get('/educator-student-files/:classCode', auth, async (req, res) => {
  try {
    // Check if user is educator for this class
    if (req.user.role !== 'educator' || !req.user.classCodes?.includes(req.params.classCode)) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const files = await File.find({ 
      classCode: req.params.classCode,
      isStudentUpload: true,
      sharedWithEducator: true
    }).sort({ uploadedAt: -1 });
    
    res.json({ success: true, files });
  } catch (error) {
    console.error('Error fetching student files for educator:', error);
    res.status(500).json({ success: false, error: 'Error fetching files' });
  }
});

module.exports = router;