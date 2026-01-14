// backend/routes/savedImagesRoutes.js
const express = require('express');
const router = express.Router();
const SavedImage = require('../models/SavedImage');
const User = require('../models/User');
const Class = require('../models/Class');
const { supabase } = require('../config/supabase');
const axios = require('axios');

// Middleware to verify token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  const jwt = require('jsonwebtoken');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-this');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};

// Get saved images for student
router.get('/student', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user || user.role !== 'student') {
      return res.status(403).json({ success: false, error: 'Student access required' });
    }

    const images = await SavedImage.find({
      user_email: user.email.toLowerCase(),
      user_role: 'student'
    }).sort({ created_at: -1 });

    res.json({
      success: true,
      images: images.map(img => ({
        ...img.toObject(),
        id: img._id,
        thumbnailUrl: `${process.env.REACT_APP_BACKEND_URL || ''}/api/saved-images/thumbnail/${img._id}`,
        proxyUrl: `${process.env.REACT_APP_BACKEND_URL || ''}/api/saved-images/proxy/${img._id}`
      }))
    });
  } catch (error) {
    console.error('Error fetching student images:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch images' });
  }
});

// Get saved images for educator
router.get('/educator', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user || user.role !== 'educator') {
      return res.status(403).json({ success: false, error: 'Educator access required' });
    }

    const images = await SavedImage.find({
      user_email: user.email.toLowerCase(),
      user_role: 'educator'
    }).sort({ created_at: -1 });

    res.json({
      success: true,
      images: images.map(img => ({
        ...img.toObject(),
        id: img._id,
        thumbnailUrl: `${process.env.REACT_APP_BACKEND_URL || ''}/api/saved-images/thumbnail/${img._id}`,
        proxyUrl: `${process.env.REACT_APP_BACKEND_URL || ''}/api/saved-images/proxy/${img._id}`
      }))
    });
  } catch (error) {
    console.error('Error fetching educator images:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch images' });
  }
});

// Get image thumbnail
router.get('/thumbnail/:id', async (req, res) => {
  try {
    const image = await SavedImage.findById(req.params.id);
    
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // If image has image_url (Supabase), redirect to it
    if (image.image_url) {
      return res.redirect(image.image_url);
    }

    // If image has base64 data, serve it
    if (image.image_data) {
      const base64Data = image.image_data.replace(/^data:image\/[a-z]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      res.set({
        'Content-Type': 'image/png',
        'Content-Length': buffer.length,
        'Cache-Control': 'public, max-age=3600'
      });
      return res.send(buffer);
    }

    // Fallback placeholder
    const placeholderUrl = `https://via.placeholder.com/300x200/1f2937/9ca3af?text=${encodeURIComponent(image.file_name || 'Image')}`;
    res.redirect(placeholderUrl);
  } catch (error) {
    console.error('Error serving thumbnail:', error);
    res.status(500).json({ error: 'Failed to serve thumbnail' });
  }
});

// Proxy image endpoint (for authenticated access)
router.get('/proxy/:id', verifyToken, async (req, res) => {
  try {
    const image = await SavedImage.findById(req.params.id);
    
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // If image has image_url (Supabase), fetch and serve it
    if (image.image_url) {
      try {
        const response = await axios.get(image.image_url, {
          responseType: 'stream',
          timeout: 10000
        });
        
        res.set({
          'Content-Type': response.headers['content-type'] || 'image/png',
          'Content-Length': response.headers['content-length'],
          'Cache-Control': 'public, max-age=3600'
        });
        
        return response.data.pipe(res);
      } catch (fetchError) {
        console.error('Error fetching from Supabase:', fetchError);
        // Continue to fallback
      }
    }

    // If image has base64 data, serve it
    if (image.image_data) {
      const base64Data = image.image_data.replace(/^data:image\/[a-z]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      res.set({
        'Content-Type': 'image/png',
        'Content-Length': buffer.length,
        'Cache-Control': 'public, max-age=3600'
      });
      return res.send(buffer);
    }

    // Fallback placeholder
    const placeholderUrl = `https://via.placeholder.com/800x600/1f2937/9ca3af?text=${encodeURIComponent(image.file_name || 'Image not available')}`;
    res.redirect(placeholderUrl);
  } catch (error) {
    console.error('Error serving proxy image:', error);
    res.status(500).json({ error: 'Failed to serve image' });
  }
});

// Delete saved image
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const image = await SavedImage.findById(req.params.id);
    
    if (!image) {
      return res.status(404).json({ success: false, error: 'Image not found' });
    }

    // Check if user owns this image
    if (image.user_email !== user.email.toLowerCase() || image.user_role !== user.role) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Delete from Supabase if it exists there
    if (image.storage_path && image.supabase_record_id) {
      try {
        const { error } = await supabase.storage
          .from(image.bucket_name || 'class-files')
          .remove([image.storage_path]);
        
        if (error) {
          console.warn('Failed to delete from Supabase:', error);
        }
      } catch (supabaseError) {
        console.warn('Supabase deletion error:', supabaseError);
      }
    }

    // Delete from MongoDB
    await SavedImage.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ success: false, error: 'Failed to delete image' });
  }
});

// Sync local images to cloud
router.post('/sync', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Find images without supabase_record_id (local only)
    const localImages = await SavedImage.find({
      user_email: user.email.toLowerCase(),
      user_role: user.role,
      supabase_record_id: { $exists: false }
    });

    let syncedCount = 0;
    const errors = [];

    for (const image of localImages) {
      try {
        if (image.image_data) {
          // Convert base64 to buffer for upload
          const base64Data = image.image_data.replace(/^data:image\/[a-z]+;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');
          
          // Generate unique filename
          const timestamp = Date.now();
          const randomSuffix = Math.random().toString(36).substring(7);
          const fileName = `${timestamp}_${randomSuffix}_${image.file_name}`;
          
          // Upload to Supabase
          const { data, error } = await supabase.storage
            .from('class-files')
            .upload(fileName, buffer, {
              contentType: 'image/png',
              cacheControl: '3600',
              upsert: false
            });
          
          if (error) throw error;
          
          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('class-files')
            .getPublicUrl(fileName);
          
          // Update image record
          await SavedImage.findByIdAndUpdate(image._id, {
            image_url: publicUrl,
            storage_path: fileName,
            supabase_record_id: data.id || timestamp.toString()
          });
          
          syncedCount++;
        }
      } catch (syncError) {
        console.error('Error syncing image:', syncError);
        errors.push(`${image.file_name}: ${syncError.message}`);
      }
    }

    res.json({
      success: true,
      message: `Synced ${syncedCount} images to cloud`,
      syncedCount,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error syncing images:', error);
    res.status(500).json({ success: false, error: 'Failed to sync images' });
  }
});

module.exports = router;
