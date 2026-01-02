// backend/routes/feedback.js
const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const User = require('../models/User');

// Authentication middleware - copied from server.js to avoid import issues
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      toast: {
        show: true,
        message: 'No token provided',
        type: 'error'
      }
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = require('jsonwebtoken').verify(
      token, 
      process.env.JWT_SECRET || 'your-secret-key-change-this'
    );
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({
      toast: {
        show: true,
        message: 'Invalid or expired token',
        type: 'error'
      }
    });
  }
};

// Submit feedback
router.post('/submit', verifyToken, async (req, res) => {
  try {
    const { message, category, rating, classCode } = req.body;
    
    // Validate required fields
    if (!message || !rating) {
      return res.status(400).json({
        toast: {
          show: true,
          message: 'Message and rating are required',
          type: 'error'
        }
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        toast: {
          show: true,
          message: 'Rating must be between 1 and 5',
          type: 'error'
        }
      });
    }

    // Get user info
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        toast: {
          show: true,
          message: 'User not found',
          type: 'error'
        }
      });
    }

    // Create feedback
    const feedback = new Feedback({
      user: req.user.id,
      userName: user.fullName,
      userRole: user.role,
      userEmail: user.email,
      message,
      category: category || 'general',
      rating,
      school: user.school || '',
      classCode: classCode || ''
    });

    await feedback.save();

    res.status(201).json({
      toast: {
        show: true,
        message: 'Thank you for your feedback!',
        type: 'success'
      },
      feedback
    });
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({
      toast: {
        show: true,
        message: 'Server error submitting feedback',
        type: 'error'
      }
    });
  }
});

// Get user's feedback history
router.get('/my-feedback', verifyToken, async (req, res) => {
  try {
    const feedback = await Feedback.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      feedback,
      count: feedback.length
    });
  } catch (error) {
    console.error('Get my feedback error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error fetching feedback'
    });
  }
});

// Admin: Get all feedback
router.get('/all', verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { 
      status, 
      role, 
      category, 
      startDate, 
      endDate,
      page = 1, 
      limit = 20 
    } = req.query;

    const query = {};
    
    if (status && status !== 'all') query.status = status;
    if (role && role !== 'all') query.userRole = role;
    if (category && category !== 'all') query.category = category;
    
    // Date filtering
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;
    
    const [feedback, total] = await Promise.all([
      Feedback.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Feedback.countDocuments(query)
    ]);

    res.json({
      success: true,
      feedback,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get all feedback error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error fetching feedback'
    });
  }
});

// Admin: Update feedback status
router.put('/:id/status', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { status, adminResponse } = req.body;
    const feedbackId = req.params.id;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    const updateData = { status };
    
    // If admin is responding
    if (adminResponse) {
      updateData.adminResponse = {
        message: adminResponse,
        respondedBy: req.user.id,
        respondedAt: new Date()
      };
    }

    const feedback = await Feedback.findByIdAndUpdate(
      feedbackId,
      updateData,
      { new: true }
    );

    if (!feedback) {
      return res.status(404).json({
        success: false,
        error: 'Feedback not found'
      });
    }

    res.json({
      success: true,
      feedback,
      message: 'Feedback updated successfully'
    });
  } catch (error) {
    console.error('Update feedback error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error updating feedback'
    });
  }
});

// Admin: Get feedback statistics
router.get('/statistics', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    // Get total feedback count
    const total = await Feedback.countDocuments();
    
    // Get average rating
    const avgRatingResult = await Feedback.aggregate([
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' }
        }
      }
    ]);
    
    const avgRating = avgRatingResult.length > 0 ? Math.round(avgRatingResult[0].avgRating * 100) / 100 : 0;

    // Get feedback by status
    const byStatus = await Feedback.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          status: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);

    // Get feedback by role
    const byRole = await Feedback.aggregate([
      {
        $group: {
          _id: '$userRole',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          role: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);

    // Get feedback by category
    const byCategory = await Feedback.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          category: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);

    // Recent feedback (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentStats = await Feedback.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: { 
            $dateToString: { 
              format: '%Y-%m-%d', 
              date: '$createdAt' 
            } 
          },
          count: { $sum: 1 },
          avgRating: { $avg: '$rating' }
        }
      },
      { 
        $sort: { _id: 1 } 
      }
    ]);

    res.json({
      success: true,
      statistics: {
        total,
        avgRating,
        byStatus,
        byRole,
        byCategory
      },
      recentStats
    });
  } catch (error) {
    console.error('Feedback statistics error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error fetching statistics'
    });
  }
});

module.exports = router;