// backend/routes/profileRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const User = require('../models/User');
const AcademicSetting = require('../models/AcademicSetting');
const { supabase } = require('../config/supabase');
const { verifyToken } = require('../middleware/auth');

const PROFILE_BUCKET = 'class-files';

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:4173',
  'https://btbstatictest.onrender.com',
  'https://btbtestservice.onrender.com'
];

router.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, Accept, cache-control, Origin');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
});

async function getEducatorSchoolName(educatorId) {
  const schoolSetting = await AcademicSetting.findOne({
    educator: educatorId,
    type: 'school',
    isActive: true
  }).sort({ createdAt: 1 });
  return schoolSetting?.name || '';
}

async function attachEducatorSchool(userObj) {
  if (userObj.role === 'educator') {
    userObj.educatorSchool = await getEducatorSchoolName(userObj._id);
    userObj.school = userObj.educatorSchool;
  }
  return userObj;
}

async function uploadToSupabase(file, userId, role) {
  const fileExt = path.extname(file.originalname).toLowerCase();
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(7);
  const fileName = `profile-pictures/${role}s/${userId}/${timestamp}_${randomString}${fileExt}`;

  const { error } = await supabase.storage
    .from(PROFILE_BUCKET)
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      cacheControl: '3600',
      upsert: true
    });

  if (error) {
    console.error('Supabase upload error:', error);
    throw new Error('Failed to upload image. Please try again.');
  }

  const { data: { publicUrl } } = supabase.storage
    .from(PROFILE_BUCKET)
    .getPublicUrl(fileName);

  return { url: publicUrl, publicId: fileName };
}

async function deleteOldProfilePicture(publicId) {
  if (!publicId) return;
  try {
    const { error } = await supabase.storage.from(PROFILE_BUCKET).remove([publicId]);
    if (error) console.error('Error deleting old profile picture:', error);
  } catch (error) {
    console.error('Error deleting old profile picture:', error);
  }
}

const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'File size must be less than 5MB'
      : err.message;
    return res.status(400).json({
      toast: { show: true, message, type: 'error' }
    });
  }
  if (err) {
    return res.status(400).json({
      toast: { show: true, message: err.message, type: 'error' }
    });
  }
  next();
};

router.post('/upload-profile-picture', verifyToken, upload.single('profilePicture'), handleMulterError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        toast: { show: true, message: 'No file uploaded', type: 'error' }
      });
    }

    const userId = req.user.id;
    const userRole = req.user.role;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        toast: { show: true, message: 'User not found', type: 'error' }
      });
    }

    if (user.profilePicture?.publicId) {
      await deleteOldProfilePicture(user.profilePicture.publicId);
    }

    const uploadResult = await uploadToSupabase(req.file, userId, userRole);

    user.profilePicture = {
      url: uploadResult.url,
      publicId: uploadResult.publicId,
      updatedAt: new Date()
    };
    await user.save();

    return res.json({
      toast: { show: true, message: 'Profile picture updated successfully!', type: 'success' },
      data: { profilePicture: user.profilePicture }
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      toast: { show: true, message: error.message || 'Failed to upload profile picture', type: 'error' }
    });
  }
});

router.delete('/remove-profile-picture', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        toast: { show: true, message: 'User not found', type: 'error' }
      });
    }

    if (user.profilePicture?.publicId) {
      await deleteOldProfilePicture(user.profilePicture.publicId);
    }

    user.profilePicture = { url: '', publicId: '', updatedAt: null };
    await user.save();

    return res.json({
      toast: { show: true, message: 'Profile picture removed successfully', type: 'success' }
    });
  } catch (error) {
    console.error('Remove error:', error);
    return res.status(500).json({
      toast: { show: true, message: 'Failed to remove profile picture', type: 'error' }
    });
  }
});

router.put('/educator/profile', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'educator') {
      return res.status(403).json({
        toast: { show: true, message: 'Access denied. Educator only.', type: 'error' }
      });
    }

    if (!req.body || typeof req.body !== 'object' || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        toast: { show: true, message: 'No profile data received', type: 'error' }
      });
    }

    const { fullName, email, username, homeAddress, cellphoneNumber } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        toast: { show: true, message: 'User not found', type: 'error' }
      });
    }

    if (email || username) {
      const existingUser = await User.findOne({
        $or: [
          ...(email ? [{ email: email.toLowerCase() }] : []),
          ...(username ? [{ username }] : [])
        ],
        _id: { $ne: userId }
      });

      if (existingUser) {
        const field = existingUser.email === email?.toLowerCase() ? 'Email' : 'Username';
        return res.status(400).json({
          toast: { show: true, message: `${field} already exists`, type: 'error' }
        });
      }
    }

    if (fullName !== undefined) user.fullName = fullName.trim();
    if (email !== undefined) user.email = email.toLowerCase().trim();
    if (username !== undefined) user.username = username.trim();
    if (homeAddress !== undefined) user.homeAddress = homeAddress;
    if (cellphoneNumber !== undefined) user.cellphoneNumber = cellphoneNumber;

    await user.save();

    const userData = user.toObject();
    delete userData.password;
    await attachEducatorSchool(userData);

    return res.json({
      toast: { show: true, message: 'Profile updated successfully!', type: 'success' },
      data: { user: userData }
    });
  } catch (error) {
    console.error('Update error:', error);
    return res.status(500).json({
      toast: { show: true, message: 'Failed to update profile', type: 'error' }
    });
  }
});

router.put('/student/profile', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({
        toast: { show: true, message: 'Access denied. Student only.', type: 'error' }
      });
    }

    const { username, school, course, year, block } = req.body;
    const userId = req.user.id;

    const updateData = {};
    if (username !== undefined) updateData.username = username;
    if (school !== undefined) updateData.school = school;
    if (course !== undefined) updateData.course = course;
    if (year !== undefined) updateData.year = year;
    if (block !== undefined) updateData.block = block;

    if (username) {
      const existingUser = await User.findOne({ username, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({
          toast: { show: true, message: 'Username already exists', type: 'error' }
        });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true, select: '-password' });

    return res.json({
      toast: { show: true, message: 'Profile updated successfully!', type: 'success' },
      data: { user: updatedUser }
    });
  } catch (error) {
    console.error('Update error:', error);
    return res.status(500).json({
      toast: { show: true, message: 'Failed to update profile', type: 'error' }
    });
  }
});

router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({
        toast: { show: true, message: 'User not found', type: 'error' }
      });
    }

    const userData = user.toObject();
    await attachEducatorSchool(userData);

    // If educator, fetch additional stats
    if (userData.role === 'educator') {
      const Class = require('../models/Class');
      const File = require('../models/File');

      // Fetch all classes created by this educator
      const createdClasses = await Class.find({ educator: req.user.id, isActive: true })
        .populate('students', 'fullName email username')
        .lean();

      // Fetch all files shared by this educator
      const sharedFiles = await File.find({ uploadedBy: req.user.id }).lean();

      userData.createdClasses = createdClasses;
      userData.sharedFiles = sharedFiles;
    }

    return res.json({
      success: true,
      data: { user: userData }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      toast: { show: true, message: 'Failed to fetch profile', type: 'error' }
    });
  }
});

module.exports = router;
