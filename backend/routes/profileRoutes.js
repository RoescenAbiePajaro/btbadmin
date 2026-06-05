// backend/routes/profileRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const { supabase } = require('../config/supabase');
const { verifyToken } = require('../middleware/auth');

// Configure multer for memory storage (we'll upload directly to Supabase)
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
  
  // Get public URL
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

// =====================
// PROFILE PICTURE UPLOAD
// =====================

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
    
    // Get current user to check for existing profile picture
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
    
    // Upload new profile picture to Supabase
    const uploadResult = await uploadToSupabase(req.file, userId, userRole);
    
    // Update user profile
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
    console.error('Profile picture upload error:', error);
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
    
    // Delete from Supabase
    if (user.profilePicture && user.profilePicture.publicId) {
      await deleteOldProfilePicture(user.profilePicture.publicId);
    }
    
    // Reset profile picture
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
    console.error('Remove profile picture error:', error);
    return res.status(500).json({
      toast: {
        show: true,
        message: 'Failed to remove profile picture',
        type: 'error'
      }
    });
  }
});

// =====================
// EDUCATOR PROFILE UPDATE
// =====================

// Update educator profile (full profile including extra fields)
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
    
    const { fullName, email, username, school, homeAddress, cellphoneNumber, role } = req.body;
    const userId = req.user.id;
    
    // Build update object
    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (email !== undefined) updateData.email = email.toLowerCase();
    if (username !== undefined) updateData.username = username;
    if (school !== undefined) updateData.school = school;
    if (homeAddress !== undefined) updateData.homeAddress = homeAddress;
    if (cellphoneNumber !== undefined) updateData.cellphoneNumber = cellphoneNumber;
    if (role !== undefined) updateData.role = role;
    
    // Check if email or username already exists (excluding current user)
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
    console.error('Educator profile update error:', error);
    return res.status(500).json({
      toast: {
        show: true,
        message: 'Failed to update profile',
        type: 'error'
      }
    });
  }
});

// =====================
// STUDENT PROFILE UPDATE
// =====================

// Update student profile (limited fields)
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
    
    // Build update object
    const updateData = {};
    if (username !== undefined) updateData.username = username;
    if (school !== undefined) updateData.school = school;
    if (course !== undefined) updateData.course = course;
    if (year !== undefined) updateData.year = year;
    if (block !== undefined) updateData.block = block;
    
    // Check if username already exists (excluding current user)
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
    console.error('Student profile update error:', error);
    return res.status(500).json({
      toast: {
        show: true,
        message: 'Failed to update profile',
        type: 'error'
      }
    });
  }
});

// =====================
// GET PROFILE DATA
// =====================

// Get complete profile data
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