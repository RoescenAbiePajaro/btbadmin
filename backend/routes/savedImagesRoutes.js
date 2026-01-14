// backend/routes/savedImagesRoutes.js - Add these routes

const express = require('express');
const router = express.Router();
const SavedImage = require('../models/SavedImage');
const auth = require('../middleware/auth');
const axios = require('axios'); // Add axios for fetching from Supabase
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

// @route   GET /api/saved-images/proxy/:imageId
// @desc    Proxy image from Supabase through backend (hides URL)
// @access  Private
router.get('/proxy/:imageId', auth, async (req, res) => {
  try {
    const user = req.user;
    const imageId = req.params.imageId;
    
    // Find the image
    const image = await SavedImage.findById(imageId);
    
    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }
    
    // Check permissions
    if (user.role === 'student' && image.user_email !== user.email.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Priority 1: Fetch from Supabase via backend
    if (image.storage_path) {
      try {
        const { data, error } = await supabase.storage
          .from(process.env.SUPABASE_BUCKET || 'class-files')
          .download(image.storage_path);
          
        if (error) throw error;
        
        // Convert to buffer
        const buffer = Buffer.from(await data.arrayBuffer());
        
        // Set appropriate headers
        res.set({
          'Content-Type': 'image/png',
          'Content-Length': buffer.length,
          'Cache-Control': 'public, max-age=31536000' // 1 year cache
        });
        
        return res.send(buffer);
      } catch (supabaseError) {
        console.error('Supabase fetch error:', supabaseError);
        // Fall through to next method
      }
    }
    
    // Priority 2: Serve base64 from MongoDB
    if (image.image_data) {
      const buffer = Buffer.from(image.image_data, 'base64');
      res.set({
        'Content-Type': 'image/png',
        'Content-Length': buffer.length,
        'Cache-Control': 'public, max-age=31536000'
      });
      return res.send(buffer);
    }
    
    // Priority 3: Serve placeholder
    const placeholder = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    res.set({
      'Content-Type': 'image/png',
      'Content-Length': placeholder.length,
      'Cache-Control': 'public, max-age=31536000'
    });
    res.send(placeholder);
    
  } catch (error) {
    console.error('Error proxying image:', error);
    res.status(500).send('Error loading image');
  }
});

// @route   GET /api/saved-images/thumbnail/:imageId
// @desc    Get optimized thumbnail (hides Supabase URL)
// @access  Private
router.get('/thumbnail/:imageId', auth, async (req, res) => {
  try {
    const user = req.user;
    const imageId = req.params.imageId;
    const { width = 300, height = 200, quality = 80 } = req.query;
    
    // Find the image
    const image = await SavedImage.findById(imageId);
    
    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }
    
    // Check permissions
    if (user.role === 'student' && image.user_email !== user.email.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Fetch original image
    let imageBuffer;
    
    if (image.storage_path) {
      try {
        const { data, error } = await supabase.storage
          .from(process.env.SUPABASE_BUCKET || 'class-files')
          .download(image.storage_path);
          
        if (error) throw error;
        imageBuffer = Buffer.from(await data.arrayBuffer());
      } catch (error) {
        console.error('Error fetching from Supabase:', error);
        // Fallback to base64
        if (image.image_data) {
          imageBuffer = Buffer.from(image.image_data, 'base64');
        }
      }
    } else if (image.image_data) {
      imageBuffer = Buffer.from(image.image_data, 'base64');
    }
    
    if (!imageBuffer) {
      // Serve placeholder
      const placeholder = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );
      res.set({
        'Content-Type': 'image/png',
        'Content-Length': placeholder.length,
        'Cache-Control': 'public, max-age=31536000'
      });
      return res.send(placeholder);
    }
    
    // In production, you might want to use a proper image processing library like sharp
    // For now, return the original image with resizing parameters in headers
    res.set({
      'Content-Type': 'image/png',
      'Content-Length': imageBuffer.length,
      'Cache-Control': 'public, max-age=31536000',
      'X-Thumbnail-Dimensions': `${width}x${height}`,
      'X-Thumbnail-Quality': quality
    });
    
    res.send(imageBuffer);
    
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    res.status(500).send('Error generating thumbnail');
  }
});

// @route   GET /api/saved-images/url/:imageId
// @desc    Get secure signed URL for temporary access (optional)
// @access  Private
router.get('/url/:imageId', auth, async (req, res) => {
  try {
    const user = req.user;
    const imageId = req.params.imageId;
    const expiresIn = 3600; // 1 hour
    
    // Find the image
    const image = await SavedImage.findById(imageId);
    
    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }
    
    // Check permissions
    if (user.role === 'student' && image.user_email !== user.email.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Generate signed URL for temporary access
    if (image.storage_path) {
      try {
        const { data, error } = await supabase.storage
          .from(process.env.SUPABASE_BUCKET || 'class-files')
          .createSignedUrl(image.storage_path, expiresIn);
          
        if (error) throw error;
        
        return res.json({
          success: true,
          signedUrl: data.signedUrl,
          expiresAt: Date.now() + (expiresIn * 1000)
        });
      } catch (error) {
        console.error('Error generating signed URL:', error);
      }
    }
    
    // Fallback to base64 data
    res.json({
      success: true,
      imageData: image.image_data || null
    });
    
  } catch (error) {
    console.error('Error getting image URL:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting image URL'
    });
  }
});

// Update the main image listing to use proxy URLs
router.get('/student', auth, async (req, res) => {
  try {
    const user = req.user;
    
    if (user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Students only.'
      });
    }

    // Get student's images with proxy URLs
    const images = await SavedImage.find({ 
      user_email: user.email.toLowerCase()
    })
    .sort({ created_at: -1 })
    .lean();

    // Replace Supabase URLs with backend proxy URLs
    const processedImages = images.map(img => ({
      ...img,
      id: img._id,
      // Use backend proxy URL instead of direct Supabase URL
      proxyUrl: `${process.env.API_BASE_URL || req.protocol + '://' + req.get('host')}/api/saved-images/proxy/${img._id}`,
      thumbnailUrl: `${process.env.API_BASE_URL || req.protocol + '://' + req.get('host')}/api/saved-images/thumbnail/${img._id}`,
      // Keep original data for reference
      hasSupabaseUrl: !!img.image_url,
      hasStoragePath: !!img.storage_path
    }));

    res.json({
      success: true,
      images: processedImages
    });
  } catch (error) {
    console.error('Error fetching student images:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching images'
    });
  }
});

// Similarly update the educator route
router.get('/educator', auth, async (req, res) => {
  try {
    const user = req.user;
    
    if (user.role !== 'educator') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Educators only.'
      });
    }

    let query = {};
    if (req.query.student_email) {
      query.user_email = req.query.student_email.toLowerCase();
    }

    const images = await SavedImage.find(query)
      .sort({ created_at: -1 })
      .lean();

    // Process images with proxy URLs
    const processedImages = images.map(img => ({
      ...img,
      id: img._id,
      proxyUrl: `${process.env.API_BASE_URL || req.protocol + '://' + req.get('host')}/api/saved-images/proxy/${img._id}`,
      thumbnailUrl: `${process.env.API_BASE_URL || req.protocol + '://' + req.get('host')}/api/saved-images/thumbnail/${img._id}`,
      hasSupabaseUrl: !!img.image_url,
      hasStoragePath: !!img.storage_path
    }));

    res.json({
      success: true,
      images: processedImages
    });
  } catch (error) {
    console.error('Error fetching educator images:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching images'
    });
  }
});