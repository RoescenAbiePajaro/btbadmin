// backend/server.js

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const User = require('./models/User');
const Class = require('./models/Class');
const AcademicSetting = require('./models/AcademicSetting');
const AccessCode = require('./models/AccessCode');
const Click = require('./models/Click');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:4173'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json());

// Connect to MongoDB
if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not set');
}

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Models are already imported at the top of the file

// =====================
// 🔧 HELPER FUNCTIONS
// =====================

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user._id, 
      username: user.username,
      email: user.email,
      role: user.role 
    },
    process.env.JWT_SECRET || 'your-secret-key-change-this',
    { expiresIn: '24h' }
  );
};

// Toast response helper
const createToastResponse = (res, statusCode, message, type = 'success', data = {}) => {
  return res.status(statusCode).json({
    toast: {
      show: true,
      message,
      type
    },
    data
  });
};

// Authentication middleware
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return createToastResponse(res, 401, 'No token provided', 'error');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-this');
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return createToastResponse(res, 401, 'Invalid or expired token', 'error');
  }
};

// Admin middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return createToastResponse(res, 403, 'Admin access required', 'error');
  }
  next();
};

// Educator middleware
const requireEducator = (req, res, next) => {
  if (req.user.role !== 'educator') {
    return createToastResponse(res, 403, 'Educator access required', 'error');
  }
  next();
};

// Student middleware
const requireStudent = (req, res, next) => {
  if (req.user.role !== 'student') {
    return createToastResponse(res, 403, 'Student access required', 'error');
  }
  next();
};

// =====================
// 📊 HEALTH CHECK
// =====================
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// =====================
// 🎯 ROLE SELECTION
// =====================
app.get('/api/auth/roles', (req, res) => {
  res.json({
    roles: [
      { id: 'student', name: 'Student', description: 'Join classes and participate in activities' },
      { id: 'educator', name: 'Educator', description: 'Create and manage classes' },
      { id: 'admin', name: 'Administrator', description: 'Manage system and users' }
    ]
  });
});

// =====================
// 📝 STUDENT REGISTRATION
// =====================
app.post('/api/auth/register/student', async (req, res) => {
  try {
    const { fullName, email, username, password, school, department, year, block, classCode } = req.body;

    // Validate required fields
    if (!fullName || !email || !username || !password || !classCode) {
      return createToastResponse(res, 400, 'Please fill all required fields', 'error');
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      const field = existingUser.email === email ? 'Email' : 'Username';
      return createToastResponse(res, 400, `${field} already exists`, 'error');
    }

    // Find class by code
    const classObj = await Class.findOne({ 
      classCode: classCode.toUpperCase(),
      isActive: true 
    });
    
    if (!classObj) {
      return createToastResponse(res, 400, 'Invalid class code', 'error');
    }

    // Create student
    const student = new User({
      fullName,
      email,
      username,
      password,
      role: 'student',
      school,
      department,
      year,
      block,
      enrolledClass: classObj._id
    });

    await student.save();

    // Add student to class
    classObj.students.push(student._id);
    await classObj.save();

    // Generate JWT token
    const token = generateToken(student);

    return createToastResponse(res, 201, 'Student registration successful!', 'success', {
      token,
      user: {
        id: student._id,
        fullName: student.fullName,
        email: student.email,
        username: student.username,
        role: student.role,
        school: student.school,
        department: student.department,
        year: student.year,
        block: student.block,
        enrolledClass: {
          id: classObj._id,
          classCode: classObj.classCode,
          className: classObj.className
        }
      }
    });

  } catch (error) {
    console.error('Student registration error:', error);
    return createToastResponse(res, 500, 'Server error during registration', 'error');
  }
});

// =====================
// 👨‍🏫 EDUCATOR REGISTRATION
// =====================
app.post('/api/auth/register/educator', async (req, res) => {
  try {
    const { fullName, email, username, password } = req.body;

    // Validate required fields
    if (!fullName || !email || !username || !password) {
      return createToastResponse(res, 400, 'Please fill all required fields', 'error');
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      const field = existingUser.email === email ? 'Email' : 'Username';
      return createToastResponse(res, 400, `${field} already exists`, 'error');
    }

    // Create educator
    const educator = new User({
      fullName,
      email,
      username,
      password,
      role: 'educator'
    });

    await educator.save();

    return createToastResponse(res, 201, 'Educator registration successful!', 'success', {
      user: {
        id: educator._id,
        fullName: educator.fullName,
        email: educator.email,
        username: educator.username,
        role: educator.role
      }
    });

  } catch (error) {
    console.error('Educator registration error:', error);
    return createToastResponse(res, 500, 'Server error during registration', 'error');
  }
});

// =====================
// 👑 ADMIN REGISTRATION
// =====================
app.post('/api/admin/register', async (req, res) => {
  try {
    const { firstName, lastName, username, password, accessCode } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !username || !password || !accessCode) {
      return createToastResponse(res, 400, 'All fields are required', 'error');
    }

    // Validate access code
    const code = accessCode.trim().toUpperCase();
    const accessCodeDoc = await AccessCode.findOne({ code });

    if (!accessCodeDoc || !accessCodeDoc.isActive) {
      return createToastResponse(res, 400, 'Invalid or inactive access code', 'error');
    }

    if (accessCodeDoc.currentUses >= accessCodeDoc.maxUses) {
      return createToastResponse(res, 400, 'Access code has reached maximum usage', 'error');
    }

    // Check if admin already exists
    const existingAdmin = await User.findOne({ 
      $or: [{ username: username.toLowerCase() }, { email: `${username}@admin.local` }] 
    });

    if (existingAdmin) {
      return createToastResponse(res, 400, 'Admin already exists', 'error');
    }

    // Create admin user
    const admin = new User({
      fullName: `${firstName} ${lastName}`,
      email: `${username}@admin.local`,
      username: username.toLowerCase(),
      password,
      role: 'admin'
    });

    await admin.save();

    // Increment access code usage
    await accessCodeDoc.incrementUsage();

    // Generate token
    const token = generateToken(admin);

    return createToastResponse(res, 201, 'Admin registration successful!', 'success', {
      token,
      admin: {
        id: admin._id,
        fullName: admin.fullName,
        username: admin.username,
        role: admin.role
      },
      accessCodeUsed: {
        code: accessCodeDoc.code,
        description: accessCodeDoc.description,
        remainingUses: accessCodeDoc.maxUses - accessCodeDoc.currentUses
      }
    });

  } catch (error) {
    console.error('Admin registration error:', error);
    return createToastResponse(res, 500, 'Server error during registration', 'error');
  }
});

// =====================
// 🔑 LOGIN ENDPOINT (ALL ROLES)
// =====================
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return createToastResponse(res, 400, 'Email and password are required', 'error');
    }

    // Find user
    const user = await User.findOne({ 
      $or: [{ email: email.toLowerCase() }, { username: email.toLowerCase() }] 
    });

    if (!user) {
      return createToastResponse(res, 401, 'Invalid credentials', 'error');
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return createToastResponse(res, 401, 'Invalid credentials', 'error');
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user);

    // Prepare user data based on role
    let userData = {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      username: user.username,
      role: user.role
    };

    // Add role-specific data
    if (user.role === 'student') {
      userData = {
        ...userData,
        school: user.school,
        department: user.department,
        year: user.year,
        block: user.block,
        enrolledClass: user.enrolledClass
      };
      
      // Populate class info if exists
      if (user.enrolledClass) {
        const classObj = await Class.findById(user.enrolledClass);
        if (classObj) {
          userData.enrolledClassDetails = {
            classCode: classObj.classCode,
            className: classObj.className
          };
        }
      }
    } else if (user.role === 'educator') {
      userData = {
        ...userData,
        // Email verification not required
      };
    }

    return createToastResponse(res, 200, 'Login successful!', 'success', {
      token,
      user: userData
    });

  } catch (error) {
    console.error('Login error:', error);
    return createToastResponse(res, 500, 'Server error during login', 'error');
  }
});

// =====================
// 👑 ADMIN LOGIN
// =====================
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return createToastResponse(res, 400, 'Username and password are required', 'error');
    }

    // Find admin user
    const admin = await User.findOne({ 
      username: username.toLowerCase(),
      role: 'admin' 
    });

    if (!admin) {
      return createToastResponse(res, 401, 'Invalid credentials', 'error');
    }

    // Check password
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      return createToastResponse(res, 401, 'Invalid credentials', 'error');
    }

    // Generate token
    const token = generateToken(admin);

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    return createToastResponse(res, 200, 'Login successful!', 'success', {
      token,
      admin: {
        id: admin._id,
        fullName: admin.fullName,
        username: admin.username,
        role: admin.role,
        lastLogin: admin.lastLogin
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    return createToastResponse(res, 500, 'Server error during login', 'error');
  }
});

// =====================
// 🏫 CLASS MANAGEMENT
// =====================

// Generate class code
app.post('/api/classes/generate-code', verifyToken, requireEducator, async (req, res) => {
  try {
    const { className, description } = req.body;
    const educatorId = req.user.id;

    // Generate unique class code
    const generateUniqueCode = async () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code;
      let isUnique = false;
      
      while (!isUnique) {
        code = '';
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        const existingClass = await Class.findOne({ classCode: code });
        if (!existingClass) isUnique = true;
      }
      return code;
    };

    const classCode = await generateUniqueCode();

    // Create class
    const newClass = new Class({
      classCode,
      className: className || `Class ${classCode}`,
      description,
      educator: educatorId,
      students: []
    });

    await newClass.save();

    // Add class to educator's classes
    const educator = await User.findById(educatorId);
    educator.classes.push(newClass._id);
    await educator.save();

    return createToastResponse(res, 201, 'Class code generated successfully!', 'success', {
      class: newClass
    });

  } catch (error) {
    console.error('Generate class code error:', error);
    return createToastResponse(res, 500, 'Server error generating class code', 'error');
  }
});

// Get educator's classes
app.get('/api/classes/my-classes', verifyToken, requireEducator, async (req, res) => {
  try {
    const educatorId = req.user.id;

    const classes = await Class.find({ educator: educatorId })
      .sort({ createdAt: -1 })
      .populate('students', 'fullName email username school department year block');

    return createToastResponse(res, 200, 'Classes fetched successfully', 'success', {
      classes
    });

  } catch (error) {
    console.error('Get classes error:', error);
    return createToastResponse(res, 500, 'Server error fetching classes', 'error');
  }
});

// Get all classes (admin only)
app.get('/api/classes', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, isActive } = req.query;
    
    const query = {};
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const classes = await Class.find(query)
      .populate('educator', 'fullName email username')
      .populate('students', 'fullName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Class.countDocuments(query);

    res.json({
      classes,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Get all classes error:', error);
    return createToastResponse(res, 500, 'Server error fetching classes', 'error');
  }
});

// Get class by ID
app.get('/api/classes/:id', verifyToken, async (req, res) => {
  try {
    const classId = req.params.id;
    const userId = req.user.id;
    
    const classData = await Class.findById(classId)
      .populate('educator', 'username fullName')
      .populate('students', 'username fullName email');
      
    if (!classData) {
      return res.status(404).json({
        toast: {
          show: true,
          message: 'Class not found',
          type: 'error'
        }
      });
    }
    
    // Only the educator who created the class or an admin can view it
    if (classData.educator._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        toast: {
          show: true,
          message: 'Not authorized to view this class',
          type: 'error'
        }
      });
    }
    
    return res.json({
      toast: {
        show: true,
        message: 'Class retrieved successfully',
        type: 'success'
      },
      data: {
        class: classData
      }
    });
  } catch (error) {
    console.error('Error getting class:', error);
    return res.status(500).json({
      toast: {
        show: true,
        message: 'Server error',
        type: 'error'
      }
    });
  }
});

// Update class
app.put('/api/classes/:id', verifyToken, requireEducator, async (req, res) => {
  try {
    const { className, description, isActive } = req.body;
    const classId = req.params.id;
    const userId = req.user.id;

    // Find the class and verify ownership
    const classToUpdate = await Class.findOne({ _id: classId, educator: userId });
    
    if (!classToUpdate) {
      return res.status(404).json({
        toast: {
          show: true,
          message: 'Class not found or access denied',
          type: 'error'
        }
      });
    }

    // Update class fields
    if (className) classToUpdate.className = className;
    if (description !== undefined) classToUpdate.description = description;
    if (isActive !== undefined) classToUpdate.isActive = isActive;

    await classToUpdate.save();

    return res.json({
      toast: {
        show: true,
        message: 'Class updated successfully',
        type: 'success'
      },
      data: {
        class: classToUpdate
      }
    });
  } catch (error) {
    console.error('Error updating class:', error);
    return res.status(500).json({
      toast: {
        show: true,
        message: 'Failed to update class',
        type: 'error'
      }
    });
  }
});

// Delete class
app.delete('/api/classes/:id', verifyToken, requireEducator, async (req, res) => {
  try {
    const classId = req.params.id;
    const userId = req.user.id;

    // Find and delete the class if the user is the owner
    const deletedClass = await Class.findOneAndDelete({ 
      _id: classId, 
      educator: userId 
    });
    
    if (!deletedClass) {
      return res.status(404).json({
        toast: {
          show: true,
          message: 'Class not found or access denied',
          type: 'error'
        }
      });
    }

    return res.json({
      toast: {
        show: true,
        message: 'Class deleted successfully',
        type: 'success'
      },
      data: {
        class: deletedClass
      }
    });
  } catch (error) {
    console.error('Error deleting class:', error);
    return res.status(500).json({
      toast: {
        show: true,
        message: 'Failed to delete class',
        type: 'error'
      }
    });
  }
});

// =====================
// 👥 GET CLASS STUDENTS
// =====================
app.get('/api/classes/:classId/students', verifyToken, async (req, res) => {
  try {
    const { classId } = req.params;
    const educatorId = req.user.id;

    // Verify educator owns this class
    const classObj = await Class.findOne({
      _id: classId,
      educator: educatorId
    }).populate('students', 'fullName email username school department year block createdAt');

    if (!classObj) {
      return createToastResponse(res, 404, 'Class not found or access denied', 'error');
    }

    return createToastResponse(res, 200, 'Students fetched successfully', 'success', {
      students: classObj.students,
      class: {
        classCode: classObj.classCode,
        className: classObj.className,
        description: classObj.description,
        totalStudents: classObj.students.length
      }
    });

  } catch (error) {
    console.error('Get class students error:', error);
    return createToastResponse(res, 500, 'Server error fetching students', 'error');
  }
});

// =====================
// 📚 ACADEMIC SETTINGS
// =====================

// Get academic settings
app.get('/api/academic-settings/:type', verifyToken, requireEducator, async (req, res) => {
  try {
    const { type } = req.params;
    
    if (!['school','department', 'year', 'block'].includes(type)) {
      return createToastResponse(res, 400, 'Invalid academic setting type', 'error');
    }

    const settings = await AcademicSetting.find({ 
      type,
      $or: [
        { createdBy: req.user.id },
        { isActive: true }
      ]
    }).sort({ name: 1 });

    res.json(settings);

  } catch (error) {
    console.error('Get academic settings error:', error);
    return createToastResponse(res, 500, 'Server error fetching settings', 'error');
  }
});

// Create academic setting
app.post('/api/academic-settings', verifyToken, requireEducator, async (req, res) => {
  try {
    const { name, type } = req.body;
    
    if (!name || !type || !['school','department', 'year', 'block'].includes(type)) {
      return createToastResponse(res, 400, 'Invalid data provided', 'error');
    }

    // Check if setting already exists
    const existingSetting = await AcademicSetting.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      type,
      createdBy: req.user.id
    });

    if (existingSetting) {
      return createToastResponse(res, 400, `${type.charAt(0).toUpperCase() + type.slice(1)} already exists`, 'error');
    }

    const setting = new AcademicSetting({
      name,
      type,
      createdBy: req.user.id
    });

    await setting.save();

    return createToastResponse(res, 201, `${type} created successfully`, 'success', {
      setting
    });

  } catch (error) {
    console.error('Create academic setting error:', error);
    return createToastResponse(res, 500, 'Server error creating setting', 'error');
  }
});

// =====================
// 👑 ADMIN MANAGEMENT
// =====================

// Get all users (admin only)
app.get('/api/admin/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { role, page = 1, limit = 20 } = req.query;
    
    const query = {};
    if (role && ['student', 'educator', 'admin'].includes(role)) {
      query.role = role;
    }

    const users = await User.find(query)
      .select('-password -emailVerificationToken -emailVerificationExpires')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('enrolledClass', 'classCode className')
      .populate('classes', 'classCode className');

    const total = await User.countDocuments(query);

    res.json({
      users,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Get users error:', error);
    return createToastResponse(res, 500, 'Server error fetching users', 'error');
  }
});

// Get admin dashboard stats
app.get('/api/admin/stats', verifyToken, requireAdmin, async (req, res) => {
  try {
    const [
      totalUsers,
      totalStudents,
      totalEducators,
      totalAdmins,
      totalClasses,
      activeClasses,
      totalAccessCodes,
      activeAccessCodes,
      recentRegistrations
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'educator' }),
      User.countDocuments({ role: 'admin' }),
      Class.countDocuments(),
      Class.countDocuments({ isActive: true }),
      AccessCode.countDocuments(),
      AccessCode.countDocuments({ isActive: true }),
      User.find().sort({ createdAt: -1 }).limit(5)
        .select('fullName email role createdAt')
        .lean()
    ]);

    res.json({
      stats: {
        users: { total: totalUsers, students: totalStudents, educators: totalEducators, admins: totalAdmins },
        classes: { total: totalClasses, active: activeClasses },
        accessCodes: { total: totalAccessCodes, active: activeAccessCodes }
      },
      recentRegistrations
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    return createToastResponse(res, 500, 'Server error fetching stats', 'error');
  }
});

// Delete user (admin only)
app.delete('/api/admin/users/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Prevent admin from deleting themselves
    if (userId === req.user.id) {
      return createToastResponse(res, 400, 'You cannot delete your own account', 'error');
    }

    const user = await User.findById(userId);
    if (!user) {
      return createToastResponse(res, 404, 'User not found', 'error');
    }

    // If user is an educator, handle their classes
    if (user.role === 'educator') {
      await Class.updateMany(
        { educator: userId },
        { $set: { isActive: false, educator: null } }
      );
    }

    // If user is a student, remove from classes
    if (user.role === 'student') {
      await Class.updateMany(
        { students: userId },
        { $pull: { students: userId } }
      );
    }

    await User.findByIdAndDelete(userId);

    return createToastResponse(res, 200, 'User deleted successfully', 'success');
  } catch (error) {
    console.error('Delete user error:', error);
    return createToastResponse(res, 500, 'Server error deleting user', 'error');
  }
});

// =====================
// 🔑 ACCESS CODE ROUTES
// =====================

// Get all access codes (admin only)
app.get('/api/access-codes', verifyToken, requireAdmin, async (req, res) => {
  try {
    const accessCodes = await AccessCode.find().sort({ createdAt: -1 });
    res.json(accessCodes);
  } catch (error) {
    console.error('Error fetching access codes:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create access code (admin only)
app.post('/api/access-codes', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { code, description, maxUses, isActive } = req.body;

    const formattedCode = code.trim().toUpperCase();

    const existing = await AccessCode.findOne({ code: formattedCode });
    if (existing) {
      return res.status(400).json({ message: 'Access code already exists' });
    }

    const newCode = new AccessCode({
      code: formattedCode,
      description: description || '',
      maxUses: Math.max(1, parseInt(maxUses) || 1),
      isActive: isActive !== false,
      currentUses: 0
    });

    const saved = await newCode.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error('Error creating access code:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Validate access code (public)
app.get('/api/access-codes/validate/:code', async (req, res) => {
  try {
    const code = req.params.code.trim().toUpperCase();
    const accessCode = await AccessCode.findOne({ code });

    if (!accessCode) {
      return res.status(404).json({ valid: false, message: 'Invalid access code' });
    }

    if (!accessCode.isActive) {
      return res.status(400).json({ valid: false, message: 'This access code is no longer active' });
    }

    if (accessCode.currentUses >= accessCode.maxUses) {
      return res.status(400).json({ valid: false, message: 'This access code has reached its maximum usage limit' });
    }

    res.json({
      valid: true,
      message: 'Access code is valid',
      code: accessCode.code,
      description: accessCode.description,
      remainingUses: accessCode.maxUses - accessCode.currentUses
    });
  } catch (error) {
    console.error('Error validating access code:', error);
    res.status(500).json({ valid: false, message: 'Server error' });
  }
});

// =====================
// 📊 CLICK TRACKING
// =====================

// Track click (public)
app.post('/api/clicks', async (req, res) => {
  try {
    const clickData = req.body;
    
    // Add IP address and device info
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';
    
    // Parse user agent
    const isMobile = /mobile/i.test(userAgent);
    const isTablet = /tablet/i.test(userAgent);
    const isDesktop = !isMobile && !isTablet;
    const isLaptop = isDesktop && /(windows|macintosh|linux)/i.test(userAgent);
    
    const click = new Click({
      ...clickData,
      ipAddress: ip,
      userAgent,
      deviceType: isMobile ? 'Mobile' : isTablet ? 'Tablet' : isLaptop ? 'Laptop' : 'Desktop',
      browser: getBrowserFromUA(userAgent),
      operatingSystem: getOSFromUA(userAgent),
      isMobile,
      isTablet,
      isDesktop,
      isLaptop
    });
    
    await click.save();
    res.status(201).json({ success: true, message: 'Click tracked successfully' });
  } catch (error) {
    console.error('Click tracking error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get clicks (admin only)
app.get('/api/clicks', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, button, startDate, endDate } = req.query;
    
    const query = {};
    
    if (button) {
      query.button = { $regex: button, $options: 'i' };
    }
    
    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const clicks = await Click.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await Click.countDocuments(query);
    
    res.json({
      clicks,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Get clicks error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete single click (admin only)
app.delete('/api/clicks/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    await Click.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Click deleted successfully' });
  } catch (error) {
    console.error('Delete click error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete all clicks (admin only)
app.delete('/api/clicks', verifyToken, requireAdmin, async (req, res) => {
  try {
    await Click.deleteMany({});
    res.json({ success: true, message: 'All clicks deleted successfully' });
  } catch (error) {
    console.error('Delete all clicks error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================
// 👤 USER PROFILE
// =====================

// Get current user profile
app.get('/api/auth/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -emailVerificationToken -emailVerificationExpires');

    if (!user) {
      return createToastResponse(res, 404, 'User not found', 'error');
    }

    return createToastResponse(res, 200, 'Profile fetched successfully', 'success', {
      user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return createToastResponse(res, 500, 'Server error fetching profile', 'error');
  }
});

// Update user profile
app.put('/api/auth/profile', verifyToken, async (req, res) => {
  try {
    const { fullName, school, department, year, block } = req.body;
    
    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (school) updateData.school = school;
    if (department) updateData.department = department;
    if (year) updateData.year = year;
    if (block) updateData.block = block;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, select: '-password -emailVerificationToken -emailVerificationExpires' }
    );

    return createToastResponse(res, 200, 'Profile updated successfully', 'success', {
      user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return createToastResponse(res, 500, 'Server error updating profile', 'error');
  }
});

// =====================
// 🔧 HELPER FUNCTIONS
// =====================

function getBrowserFromUA(userAgent) {
  if (/firefox/i.test(userAgent)) return 'Firefox';
  if (/chrome/i.test(userAgent)) return 'Chrome';
  if (/safari/i.test(userAgent)) return 'Safari';
  if (/edge/i.test(userAgent)) return 'Edge';
  if (/opera/i.test(userAgent)) return 'Opera';
  return 'Unknown';
}

function getOSFromUA(userAgent) {
  if (/windows/i.test(userAgent)) return 'Windows';
  if (/macintosh/i.test(userAgent)) return 'macOS';
  if (/linux/i.test(userAgent)) return 'Linux';
  if (/android/i.test(userAgent)) return 'Android';
  if (/ios|iphone|ipad/i.test(userAgent)) return 'iOS';
  return 'Unknown';
}

// =====================
// 🚀 SERVER START
// =====================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});