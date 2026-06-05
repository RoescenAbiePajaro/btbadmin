// backend/routes/profileRoutes.js - Add explicit CORS headers
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const User = require('../models/User');
const { supabase } = require('../config/supabase');
const { verifyToken } = require('../middleware/auth');

// Add CORS headers middleware for this router
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://btbstatictest.onrender.com');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, Accept, cache-control, Origin');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
  }
});

// Helper function to upload to Supabase
async function uploadToSupabase(file, userId, role) {
  const fileExt = path.extname(file.originalname).toLowerCase();
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(7);
  const fileName = `profile-pictures/${role}s/${userId}/${timestamp}_${randomString}${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      cacheControl: '3600',
      upsert: true
    });
  
  if (error) {
    console.error('Supabase upload error:', error);
    throw new Error('Failed to upload image');
  }
  
  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName);
  
  return {
    url: publicUrl,
    publicId: fileName
  };
}

// Helper function to delete old profile picture
async function deleteOldProfilePicture(publicId) {
  if (!publicId) return;
  
  try {
    const { error } = await supabase.storage
      .from('avatars')
      .remove([publicId]);
    
    if (error) {
      console.error('Error deleting old profile picture:', error);
    }
  } catch (error) {
    console.error('Error deleting old profile picture:', error);
  }
}

// Upload profile picture
router.post('/upload-profile-picture', verifyToken, upload.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        toast: {
          show: true,
          message: 'No file uploaded',
          type: 'error'
        }
      });
    }
    
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        toast: {
          show: true,
          message: 'User not found',
          type: 'error'
        }
      });
    }
    
    // Delete old profile picture if exists
    if (user.profilePicture && user.profilePicture.publicId) {
      await deleteOldProfilePicture(user.profilePicture.publicId);
    }
    
    // Upload new profile picture
    const uploadResult = await uploadToSupabase(req.file, userId, userRole);
    
    // Update user
    user.profilePicture = {
      url: uploadResult.url,
      publicId: uploadResult.publicId,
      updatedAt: new Date()
    };
    
    await user.save();
    
    return res.json({
      toast: {
        show: true,
        message: 'Profile picture updated successfully!',
        type: 'success'
      },
      data: {
        profilePicture: user.profilePicture
      }
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      toast: {
        show: true,
        message: error.message || 'Failed to upload profile picture',
        type: 'error'
      }
    });
  }
});

// Remove profile picture
router.delete('/remove-profile-picture', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        toast: {
          show: true,
          message: 'User not found',
          type: 'error'
        }
      });
    }
    
    if (user.profilePicture && user.profilePicture.publicId) {
      await deleteOldProfilePicture(user.profilePicture.publicId);
    }
    
    user.profilePicture = {
      url: '',
      publicId: '',
      updatedAt: null
    };
    
    await user.save();
    
    return res.json({
      toast: {
        show: true,
        message: 'Profile picture removed successfully',
        type: 'success'
      }
    });
    
  } catch (error) {
    console.error('Remove error:', error);
    return res.status(500).json({
      toast: {
        show: true,
        message: 'Failed to remove profile picture',
        type: 'error'
      }
    });
  }
});

// Update educator profile
router.put('/educator/profile', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'educator') {
      return res.status(403).json({
        toast: {
          show: true,
          message: 'Access denied. Educator only.',
          type: 'error'
        }
      });
    }
    
    const { fullName, email, username, school, homeAddress, cellphoneNumber } = req.body;
    const userId = req.user.id;
    
    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (email !== undefined) updateData.email = email.toLowerCase();
    if (username !== undefined) updateData.username = username;
    if (school !== undefined) updateData.school = school;
    if (homeAddress !== undefined) updateData.homeAddress = homeAddress;
    if (cellphoneNumber !== undefined) updateData.cellphoneNumber = cellphoneNumber;
    
    // Check for duplicates
    if (email || username) {
      const existingUser = await User.findOne({
        $or: [
          ...(email ? [{ email: email.toLowerCase() }] : []),
          ...(username ? [{ username: username }] : [])
        ],
        _id: { $ne: userId }
      });
      
      if (existingUser) {
        const field = existingUser.email === email?.toLowerCase() ? 'Email' : 'Username';
        return res.status(400).json({
          toast: {
            show: true,
            message: `${field} already exists`,
            type: 'error'
          }
        });
      }
    }
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, select: '-password' }
    );
    
    return res.json({
      toast: {
        show: true,
        message: 'Profile updated successfully!',
        type: 'success'
      },
      data: {
        user: updatedUser
      }
    });
    
  } catch (error) {
    console.error('Update error:', error);
    return res.status(500).json({
      toast: {
        show: true,
        message: 'Failed to update profile',
        type: 'error'
      }
    });
  }
});

// Update student profile
router.put('/student/profile', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({
        toast: {
          show: true,
          message: 'Access denied. Student only.',
          type: 'error'
        }
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
      const existingUser = await User.findOne({
        username: username,
        _id: { $ne: userId }
      });
      
      if (existingUser) {
        return res.status(400).json({
          toast: {
            show: true,
            message: 'Username already exists',
            type: 'error'
          }
        });
      }
    }
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, select: '-password' }
    );
    
    return res.json({
      toast: {
        show: true,
        message: 'Profile updated successfully!',
        type: 'success'
      },
      data: {
        user: updatedUser
      }
    });
    
  } catch (error) {
    console.error('Update error:', error);
    return res.status(500).json({
      toast: {
        show: true,
        message: 'Failed to update profile',
        type: 'error'
      }
    });
  }
});

// Get profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({
        toast: {
          show: true,
          message: 'User not found',
          type: 'error'
        }
      });
    }
    
    return res.json({
      success: true,
      data: {
        user
      }
    });
    
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      toast: {
        show: true,
        message: 'Failed to fetch profile',
        type: 'error'
      }
    });
  }
});

module.exports = router;