// routes/savedImages.js
const express = require('express');
const router = express.Router();
const SavedImage = require('../models/SavedImage');
const { supabase, supabasePublic } = require('../config/supabase');

// Middleware to verify token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'No token provided'
    });
  }

  const token = authHeader.split(' ')[1];
  
  // In a real app, verify JWT token here
  // For now, we'll extract user info from token
  try {
    // Decode base64 token to get user info (simplified)
    const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// Get saved images for educator (can see all student images in their classes)
router.get('/educator', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'educator') {
      return res.status(403).json({
        success: false,
        message: 'Educator access required'
      });
    }

    // Get all images saved by students in educator's classes
    // First, get the educator's classes
    const educatorClasses = await Class.find({ educator: req.user.id });
    const classCodes = educatorClasses.map(cls => cls.classCode);
    
    // Get all students in these classes
    const students = await User.find({
      classes: { $in: educatorClasses.map(cls => cls._id) }
    });
    
    const studentEmails = students.map(student => student.email);
    
    // Get images from MongoDB
    const mongoImages = await SavedImage.find({
      user_email: { $in: studentEmails }
    }).sort({ created_at: -1 });
    
    // Get images from Supabase (if needed)
    let supabaseImages = [];
    try {
      const { data, error } = await supabase
        .from('saved_images')
        .select('*')
        .in('user_email', studentEmails)
        .order('created_at', { ascending: false });
      
      if (!error) {
        supabaseImages = data || [];
      }
    } catch (supabaseError) {
      console.error('Supabase fetch error:', supabaseError);
    }
    
    // Combine and deduplicate images
    const allImages = [...mongoImages, ...supabaseImages];
    const uniqueImages = allImages.filter((image, index, self) =>
      index === self.findIndex((img) => 
        img.file_name === image.file_name && 
        img.user_email === image.user_email &&
        Math.abs(new Date(img.created_at) - new Date(image.created_at)) < 1000
      )
    );
    
    // Add proxy URLs for secure access
    const imagesWithProxy = uniqueImages.map(image => {
      const imageObj = image.toObject ? image.toObject() : image;
      
      return {
        ...imageObj,
        proxyUrl: `/api/saved-images/proxy/${imageObj._id || imageObj.id}`,
        thumbnailUrl: imageObj.image_url ? `${imageObj.image_url}?width=300&height=200` : '',
        downloadUrl: `/api/saved-images/download/${imageObj._id || imageObj.id}`
      };
    });
    
    res.json({
      success: true,
      images: imagesWithProxy,
      count: imagesWithProxy.length
    });
    
  } catch (error) {
    console.error('Error fetching educator images:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching images'
    });
  }
});

// Get saved images for student (only their own images)
router.get('/student', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Student access required'
      });
    }

    const userEmail = req.user.email.toLowerCase();
    
    // Get images from MongoDB
    const mongoImages = await SavedImage.find({
      user_email: userEmail
    }).sort({ created_at: -1 });
    
    // Get images from Supabase
    let supabaseImages = [];
    try {
      const { data, error } = await supabase
        .from('saved_images')
        .select('*')
        .eq('user_email', userEmail)
        .order('created_at', { ascending: false });
      
      if (!error) {
        supabaseImages = data || [];
      }
    } catch (supabaseError) {
      console.error('Supabase fetch error:', supabaseError);
    }
    
    // Combine and deduplicate images
    const allImages = [...mongoImages, ...supabaseImages];
    const uniqueImages = allImages.filter((image, index, self) =>
      index === self.findIndex((img) => 
        img.file_name === image.file_name && 
        Math.abs(new Date(img.created_at) - new Date(image.created_at)) < 1000
      )
    );
    
    // Add proxy URLs for secure access
    const imagesWithProxy = uniqueImages.map(image => {
      const imageObj = image.toObject ? image.toObject() : image;
      
      return {
        ...imageObj,
        proxyUrl: `/api/saved-images/proxy/${imageObj._id || imageObj.id}`,
        thumbnailUrl: imageObj.image_url ? `${imageObj.image_url}?width=300&height=200` : '',
        downloadUrl: `/api/saved-images/download/${imageObj._id || imageObj.id}`
      };
    });
    
    res.json({
      success: true,
      images: imagesWithProxy,
      count: imagesWithProxy.length
    });
    
  } catch (error) {
    console.error('Error fetching student images:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching images'
    });
  }
});

// Proxy image through backend (for security)
router.get('/proxy/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Try MongoDB first
    let image = await SavedImage.findById(id);
    let imageUrl = null;
    
    if (image) {
      // If image_data is base64 in MongoDB
      if (image.image_data) {
        const buffer = Buffer.from(image.image_data, 'base64');
        res.set('Content-Type', 'image/png');
        res.set('Content-Disposition', `inline; filename="${image.file_name}"`);
        return res.send(buffer);
      }
      imageUrl = image.image_url;
    } else {
      // Try Supabase
      const { data, error } = await supabase
        .from('saved_images')
        .select('*')
        .eq('id', id)
        .single();
      
      if (!error && data) {
        imageUrl = data.image_url;
      }
    }
    
    if (!imageUrl) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }
    
    // Proxy the image from Supabase
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch image');
      }
      
      const buffer = await response.arrayBuffer();
      
      res.set('Content-Type', 'image/png');
      res.set('Content-Disposition', `inline; filename="${image?.file_name || 'image.png'}"`);
      res.set('Cache-Control', 'public, max-age=31536000'); // 1 year cache
      
      return res.send(Buffer.from(buffer));
    } catch (fetchError) {
      console.error('Error fetching image:', fetchError);
      return res.status(404).json({
        success: false,
        message: 'Could not retrieve image'
      });
    }
    
  } catch (error) {
    console.error('Proxy image error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error proxying image'
    });
  }
});

// Get thumbnail image
router.get('/thumbnail/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    let imageUrl = null;
    
    // Try MongoDB first
    const mongoImage = await SavedImage.findById(id);
    if (mongoImage && mongoImage.image_url) {
      imageUrl = mongoImage.image_url;
    } else {
      // Try Supabase
      const { data, error } = await supabase
        .from('saved_images')
        .select('image_url')
        .eq('id', id)
        .single();
      
      if (!error && data) {
        imageUrl = data.image_url;
      }
    }
    
    if (!imageUrl) {
      // Return placeholder image
      return res.redirect('/placeholder.png');
    }
    
    // Redirect to Supabase with resize parameters
    const thumbnailUrl = `${imageUrl}?width=300&height=200&resize=fit`;
    return res.redirect(thumbnailUrl);
    
  } catch (error) {
    console.error('Thumbnail error:', error);
    res.redirect('/placeholder.png');
  }
});

// Delete saved image
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userEmail = req.user.email.toLowerCase();
    const userRole = req.user.role;
    
    // Find image first
    let image = await SavedImage.findById(id);
    
    // Check permissions
    if (userRole === 'student') {
      // Students can only delete their own images
      if (!image || image.user_email !== userEmail) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own images'
        });
      }
    } else if (userRole === 'educator') {
      // Educators can delete images from their students
      if (image) {
        // Check if student is in educator's class
        const student = await User.findOne({ email: image.user_email });
        const educatorClasses = await Class.find({ educator: req.user.id });
        
        const isStudentInClass = student && educatorClasses.some(cls => 
          cls.students.includes(student._id)
        );
        
        if (!isStudentInClass) {
          return res.status(403).json({
            success: false,
            message: 'You can only delete images from your students'
          });
        }
      }
    }
    
    // Delete from MongoDB
    if (image) {
      await SavedImage.findByIdAndDelete(id);
    }
    
    // Also delete from Supabase if record exists
    try {
      const { data: supabaseImage } = await supabase
        .from('saved_images')
        .select('*')
        .eq('id', id)
        .single();
      
      if (supabaseImage) {
        // Delete from storage
        if (supabaseImage.storage_path) {
          await supabase.storage
            .from(supabaseImage.supabase_bucket || 'class-files')
            .remove([supabaseImage.storage_path]);
        }
        
        // Delete from database
        await supabase
          .from('saved_images')
          .delete()
          .eq('id', id);
      }
    } catch (supabaseError) {
      console.error('Supabase delete error:', supabaseError);
    }
    
    res.json({
      success: true,
      message: 'Image deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting image'
    });
  }
});

// Sync images between MongoDB and Supabase
router.post('/sync', verifyToken, async (req, res) => {
  try {
    const userEmail = req.user.email.toLowerCase();
    
    // Get unsynced MongoDB images
    const unsyncedMongoImages = await SavedImage.find({
      user_email: userEmail,
      is_synced: false,
      image_data: { $ne: '' }
    });
    
    let syncedCount = 0;
    
    // Sync each image to Supabase
    for (const mongoImage of unsyncedMongoImages) {
      try {
        const imageBuffer = Buffer.from(mongoImage.image_data, 'base64');
        
        // Upload to Supabase storage
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(7);
        const fileName = `${timestamp}_${randomSuffix}_${mongoImage.image_type}_${userEmail.replace(/[@.]/g, '_')}.png`;
        
        const { error: uploadError } = await supabase.storage
          .from('class-files')
          .upload(fileName, imageBuffer, {
            contentType: 'image/png',
            upsert: true
          });
        
        if (uploadError) throw uploadError;
        
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('class-files')
          .getPublicUrl(fileName);
        
        // Save metadata to Supabase database
        const { error: dbError } = await supabase
          .from('saved_images')
          .insert({
            user_email: userEmail,
            user_role: mongoImage.user_role,
            file_name: fileName,
            original_path: mongoImage.file_path,
            storage_path: fileName,
            image_url: urlData.publicUrl,
            image_type: mongoImage.image_type,
            file_size: mongoImage.file_size,
            created_at: new Date().toISOString(),
            app_version: mongoImage.app_version
          });
        
        if (dbError) throw dbError;
        
        // Mark as synced in MongoDB
        mongoImage.is_synced = true;
        mongoImage.image_url = urlData.publicUrl;
        mongoImage.storage_path = fileName;
        await mongoImage.save();
        
        syncedCount++;
        
      } catch (syncError) {
        console.error('Sync error for image:', mongoImage.file_name, syncError);
      }
    }
    
    res.json({
      success: true,
      message: `Synced ${syncedCount} images to Supabase`,
      syncedCount
    });
    
  } catch (error) {
    console.error('Sync images error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error syncing images'
    });
  }
});

module.exports = router;