const express = require('express');
const router = express.Router();
const SavedImage = require('../models/SavedImage');
const auth = require('../middleware/auth'); // Assuming you have auth middleware

// @route   GET /api/saved-images/student
// @desc    Get student's saved images
// @access  Private (Student only)
router.get('/student', auth, async (req, res) => {
  try {
    const user = req.user;
    
    // Only students can access their own images
    if (user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Students only.'
      });
    }

    // Get student's images
    const images = await SavedImage.find({ 
      user_email: user.email.toLowerCase()
    })
    .sort({ created_at: -1 })
    .select('-image_data') // Don't send base64 data to frontend
    .lean();

    res.json({
      success: true,
      images: images.map(img => ({
        ...img,
        id: img._id
      }))
    });
  } catch (error) {
    console.error('Error fetching student images:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching images'
    });
  }
});

// @route   GET /api/saved-images/educator
// @desc    Get educator's saved images (can see all students' images)
// @access  Private (Educator only)
router.get('/educator', auth, async (req, res) => {
  try {
    const user = req.user;
    
    // Check if user is educator
    if (user.role !== 'educator') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Educators only.'
      });
    }

    // Educators can see all images (their own and students')
    let query = {};
    
    // Optional: filter by specific student email if provided
    if (req.query.student_email) {
      query.user_email = req.query.student_email.toLowerCase();
    }
    
    // Optional: filter by current user email
    if (req.query.user_email) {
      query.user_email = req.query.user_email.toLowerCase();
    }

    const images = await SavedImage.find(query)
      .sort({ created_at: -1 })
      .select('-image_data') // Don't send base64 data to frontend
      .lean();

    res.json({
      success: true,
      images: images.map(img => ({
        ...img,
        id: img._id
      }))
    });
  } catch (error) {
    console.error('Error fetching educator images:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching images'
    });
  }
});

// @route   GET /api/saved-images/:id
// @desc    Get specific saved image
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const user = req.user;
    const imageId = req.params.id;

    const image = await SavedImage.findById(imageId).select('-image_data').lean();

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    // Check permissions
    // Educators can view any image, students can only view their own
    if (user.role === 'student' && image.user_email !== user.email.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own images.'
      });
    }

    res.json({
      success: true,
      image: {
        ...image,
        id: image._id
      }
    });
  } catch (error) {
    console.error('Error fetching image:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching image'
    });
  }
});

// @route   POST /api/saved-images
// @desc    Save a new image (from VirtualPainter)
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const user = req.user;
    const {
      file_name,
      file_size,
      image_data,
      image_type = 'template',
      image_url = '',
      storage_path = ''
    } = req.body;

    // Validate required fields
    if (!file_name || !file_size || !image_data) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Create new saved image
    const savedImage = new SavedImage({
      user_email: user.email.toLowerCase(),
      user_role: user.role,
      full_name: user.fullName || user.name || '',
      file_name,
      file_size,
      image_data, // base64 encoded
      image_type,
      image_url,
      storage_path,
      app_version: '1.0.0'
    });

    await savedImage.save();

    res.status(201).json({
      success: true,
      message: 'Image saved successfully',
      image: savedImage.toResponse()
    });
  } catch (error) {
    console.error('Error saving image:', error);
    res.status(500).json({
      success: false,
      message: 'Server error saving image'
    });
  }
});

// @route   DELETE /api/saved-images/:id
// @desc    Delete a saved image
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const user = req.user;
    const imageId = req.params.id;

    const image = await SavedImage.findById(imageId);

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    // Check permissions
    // Students can only delete their own images
    // Educators can delete any image
    if (user.role === 'student' && image.user_email !== user.email.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only delete your own images.'
      });
    }

    await image.deleteOne();

    res.json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting image'
    });
  }
});

// @route   GET /api/saved-images/stats/summary
// @desc    Get summary statistics (for educator dashboard)
// @access  Private (Educator only)
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const user = req.user;
    
    if (user.role !== 'educator') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Educators only.'
      });
    }

    const stats = await SavedImage.aggregate([
      {
        $group: {
          _id: null,
          totalImages: { $sum: 1 },
          totalFileSize: { $sum: '$file_size' },
          byType: {
            $push: {
              type: '$image_type',
              count: 1
            }
          },
          byUser: {
            $push: {
              email: '$user_email',
              count: 1
            }
          }
        }
      },
      {
        $project: {
          totalImages: 1,
          totalFileSize: 1,
          averageFileSize: { $divide: ['$totalFileSize', '$totalImages'] },
          imageTypes: {
            $reduce: {
              input: '$byType',
              initialValue: [],
              in: {
                $concatArrays: [
                  '$$value',
                  {
                    $cond: [
                      { $in: ['$$this.type', '$$value.type'] },
                      [],
                      [{
                        type: '$$this.type',
                        count: {
                          $sum: {
                            $map: {
                              input: '$byType',
                              as: 'item',
                              in: { $cond: [{ $eq: ['$$item.type', '$$this.type'] }, '$$item.count', 0] }
                            }
                          }
                        }
                      }]
                    ]
                  }
                ]
              }
            }
          },
          userStats: {
            $reduce: {
              input: '$byUser',
              initialValue: [],
              in: {
                $concatArrays: [
                  '$$value',
                  {
                    $cond: [
                      { $in: ['$$this.email', '$$value.email'] },
                      [],
                      [{
                        email: '$$this.email',
                        count: {
                          $sum: {
                            $map: {
                              input: '$byUser',
                              as: 'item',
                              in: { $cond: [{ $eq: ['$$item.email', '$$this.email'] }, '$$item.count', 0] }
                            }
                          }
                        }
                      }]
                    ]
                  }
                ]
              }
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      stats: stats[0] || {
        totalImages: 0,
        totalFileSize: 0,
        averageFileSize: 0,
        imageTypes: [],
        userStats: []
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching statistics'
    });
  }
});

module.exports = router;