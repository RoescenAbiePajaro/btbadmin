const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Class = require('../models/Class');
const File = require('../models/File');
const jwt = require('jsonwebtoken');

// Simple middleware for admin verification
const verifyAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-this');
    
    // Check if user is admin
    const user = await User.findById(decoded.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

// ADMIN LOGIN ROUTE - SIMPLIFIED AND FIXED
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔐 Admin login attempt for email:', email);
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Use the static method from User model
    const validation = await User.validateAdminCredentials(email, password);
    
    if (!validation.isValid) {
      console.log('❌ Invalid admin credentials');
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    const adminUser = validation.user;
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: adminUser._id, 
        email: adminUser.email,
        role: adminUser.role,
        username: adminUser.username
      },
      process.env.JWT_SECRET || 'your-secret-key-change-this',
      { expiresIn: '24h' }
    );
    
    console.log('✅ Admin login successful for:', email);
    
    return res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: {
        id: adminUser._id,
        fullName: adminUser.fullName,
        email: adminUser.email,
        username: adminUser.username,
        role: adminUser.role,
        isFirstLogin: adminUser.isFirstLogin,
        lastLogin: adminUser.lastLogin
      }
    });
    
  } catch (error) {
    console.error('💥 Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during login. Please try again.'
    });
  }
});

// Get dashboard stats (protected)
router.get('/admin/dashboard', verifyAdmin, async (req, res) => {
  try {
    const { range = 'week', page = 1, limit = 10, search = '' } = req.query;
    const skip = (page - 1) * limit;

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch(range) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    // Get total counts
    const totalUsers = await User.countDocuments();
    const studentCount = await User.countDocuments({ role: 'student' });
    const educatorCount = await User.countDocuments({ role: 'educator' });
    const activeClasses = await Class.countDocuments({ isActive: true });
    const totalClasses = await Class.countDocuments();
    const totalMaterials = await File.countDocuments();
    const assignmentsCount = await File.countDocuments({ type: 'assignment' });

    // Get class stats with students
    const classesWithStudents = await Class.aggregate([
      { $match: { isActive: true } },
      {
        $project: {
          className: 1,
          classCode: 1,
          studentCount: { $size: "$students" }
        }
      },
      { $sort: { studentCount: -1 } }
    ]);

    const totalStudentsInClasses = classesWithStudents.reduce((sum, cls) => sum + cls.studentCount, 0);

    // Get user registration data
    const userRegistrations = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            role: "$role"
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.date": 1 } }
    ]);

    // Format user data for chart
    const usersData = [];
    const dateMap = new Map();
    
    userRegistrations.forEach(reg => {
      const date = reg._id.date;
      if (!dateMap.has(date)) {
        dateMap.set(date, { date, students: 0, educators: 0 });
      }
      const entry = dateMap.get(date);
      if (reg._id.role === 'student') {
        entry.students = reg.count;
      } else if (reg._id.role === 'educator') {
        entry.educators = reg.count;
      }
    });
    
    dateMap.forEach(value => usersData.push(value));

    // Get active classes
    const searchQuery = search ? {
      $or: [
        { className: { $regex: search, $options: 'i' } },
        { classCode: { $regex: search, $options: 'i' } }
      ]
    } : {};

    const activeClassesList = await Class.find({
      ...searchQuery,
      isActive: true
    })
    .populate('educator', 'fullName email')
    .populate('students')
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    const formattedClasses = activeClassesList.map(cls => ({
      className: cls.className,
      classCode: cls.classCode,
      educatorName: cls.educator?.fullName || 'Unknown',
      educatorEmail: cls.educator?.email || 'Unknown',
      studentCount: cls.students.length,
      lastActivity: cls.updatedAt
    }));

    res.json({
      success: true,
      message: 'Dashboard data fetched successfully',
      stats: {
        totalUsers,
        studentCount,
        educatorCount,
        activeClasses,
        totalClasses,
        totalMaterials,
        assignmentsCount,
        totalStudentsInClasses
      },
      usersData,
      activeClasses: formattedClasses,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalClasses / limit),
        totalItems: totalClasses
      }
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data'
    });
  }
});

// Get all users
router.get('/admin/users', verifyAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(query)
    ]);

    res.json({
      success: true,
      message: 'Users fetched successfully',
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
});

// Update user status
router.put('/admin/users/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, role } = req.body;

    const updateData = {};
    if (isActive !== undefined) updateData.isActive = isActive;
    if (role) updateData.role = role;

    const user = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, select: '-password' }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      user
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user'
    });
  }
});

// Delete user
router.delete('/admin/users/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user'
    });
  }
});

// Admin profile
router.get('/admin/profile', verifyAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    res.json({
      success: true,
      message: 'Profile fetched successfully',
      user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile'
    });
  }
});

module.exports = router;