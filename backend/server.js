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
const { supabase, supabasePublic } = require('./config/supabase');
const fileRoutes = require('./routes/fileRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Load environment variables
dotenv.config();

// Test if environment variables are loaded
console.log('🔧 Environment check:');
console.log('- ADMIN_EMAIL configured:', !!process.env.ADMIN_EMAIL);
console.log('- ADMIN_PASSWORD configured:', !!process.env.ADMIN_PASSWORD);

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

// Test endpoint to verify server is running
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    endpoints: {
      adminLogin: '/api/auth/admin/login',
      dashboard: '/api/admin/dashboard',
      test: '/api/test'
    }
  });
});

// Import the activity tracker
const { trackActivity, trackDownload } = require('./middleware/activityTracker');

// Use activity tracking middleware (add this before your routes)
app.use(trackActivity);

// Add a specific route for tracking downloads
app.post('/api/track/download', trackDownload, (req, res) => {
  res.json({ success: true, message: 'Download tracked' });
});

// Add a route to get site statistics
app.get('/api/stats/site', async (req, res) => {
  try {
    const { range = 'week' } = req.query;
    const Activity = require('./models/Activity');
    const stats = await Activity.getSiteStatistics(range);
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting site stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

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

// 👑 ADMIN LOGIN ROUTE
app.post('/api/auth/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Get credentials from environment variables
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    // Log for debugging (without showing actual values)
    console.log('🔐 Admin login attempt for email:', email ? 'provided' : 'not provided');
    
    // Check if environment variables are loaded
    if (!adminEmail || !adminPassword) {
      console.error('❌ Admin credentials not configured in environment variables');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error: Admin credentials not set'
      });
    }
    
    // Check if the provided email matches the admin email
    if (email !== adminEmail) {
      console.log('❌ Login attempt with non-admin email:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Find or create admin user
    let adminUser = await User.findOne({ 
      email: adminEmail,
      role: 'admin' 
    });
    
    // If admin user doesn't exist, create one with the password from environment
    if (!adminUser) {
      try {
        adminUser = new User({
          fullName: 'System Administrator',
          email: adminEmail,
          username: 'admin',
          password: adminPassword, // Will be hashed by pre-save hook
          role: 'admin'
        });
        await adminUser.save();
        console.log('✅ Created new admin user');
      } catch (createError) {
        console.error('❌ Error creating admin user:', createError);
        return res.status(500).json({
          success: false,
          message: 'Error setting up admin account'
        });
      }
    }
    
    // Validate credentials using the comparePassword method
    const isMatch = await adminUser.comparePassword(password);
    
    if (!isMatch) {
      console.log('❌ Invalid password for admin:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Generate token
    const token = generateToken(adminUser);
    
    console.log('✅ Admin login successful for:', email);
    
    return res.json({
      success: true,
      token,
      user: {
        id: adminUser._id,
        fullName: adminUser.fullName,
        email: adminUser.email,
        username: adminUser.username,
        role: adminUser.role
      }
    });
    
  } catch (error) {
    console.error('💥 Admin login error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during login. Please try again.'
    });
  }
});

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
    ]
  });
});

// =====================
// 📝 STUDENT REGISTRATION
// =====================
app.post('/api/auth/register/student', async (req, res) => {
  try {
    const { fullName, email, username, password, school, course, year, block, classCode } = req.body;

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
      course,
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
        course: student.course,
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
        course: user.course,
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
// 🏫 CLASS MANAGEMENT
// =====================

// Validate class code (public)
app.get('/api/classes/validate/:code', async (req, res) => {
  try {
    const classCode = req.params.code.toUpperCase();
    
    const classObj = await Class.findOne({ 
      classCode,
      isActive: true 
    }).populate('educator', 'fullName username');
    
    if (!classObj) {
      return res.json({
        valid: false,
        message: 'Invalid class code'
      });
    }
    
    return res.json({
      valid: true,
      classCode: classObj.classCode,
      className: classObj.className,
      educatorId: classObj.educator._id,
      educatorName: classObj.educator.fullName || classObj.educator.username
    });
  } catch (error) {
    console.error('Validate class code error:', error);
    res.status(500).json({
      valid: false,
      message: 'Server error validating class code'
    });
  }
});

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
      .populate('students', 'fullName email username school course year block');

    return createToastResponse(res, 200, 'Classes fetched successfully', 'success', {
      classes
    });

  } catch (error) {
    console.error('Get classes error:', error);
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
    if (classData.educator._id.toString() !== userId && req.user.role !== 'educator') {
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

// Get class students
app.get('/api/classes/:classId/students', verifyToken, async (req, res) => {
  try {
    const { classId } = req.params;
    const educatorId = req.user.id;

    // Verify educator owns this class
    const classObj = await Class.findOne({
      _id: classId,
      educator: educatorId
    }).populate('students', 'fullName email username school course year block createdAt');

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

// Remove student from class - IMPROVED VERSION
app.delete('/api/classes/:classId/students/:studentId', verifyToken, requireEducator, async (req, res) => {
  try {
    const { classId, studentId } = req.params;
    const educatorId = req.user.id;

    console.log(`Delete attempt - Educator: ${educatorId}, Class: ${classId}, Student: ${studentId}`);

    // Verify educator owns this class
    const classObj = await Class.findOne({
      _id: classId,
      educator: educatorId
    });

    if (!classObj) {
      console.log('Class not found or educator mismatch');
      return createToastResponse(res, 404, 'Class not found or access denied', 'error');
    }

    // Check if student exists
    const student = await User.findById(studentId);
    if (!student) {
      console.log('Student not found');
      return createToastResponse(res, 404, 'Student not found', 'error');
    }

    // Check if student is enrolled in this class
    const isStudentInClass = classObj.students.some(id => id.toString() === studentId);
    if (!isStudentInClass) {
      console.log('Student not enrolled in this class');
      return createToastResponse(res, 404, 'Student not found in this class', 'error');
    }

    // Remove student from class array
    classObj.students = classObj.students.filter(id => id.toString() !== studentId);
    
    // Update student's enrolledClass to null
    student.enrolledClass = null;
    
    // Save both changes
    await Promise.all([
      classObj.save(),
      student.save()
    ]);

    console.log(`Student ${studentId} removed from class ${classId}`);

    return createToastResponse(res, 200, 'Student removed from class successfully', 'success', {
      class: {
        classCode: classObj.classCode,
        className: classObj.className,
        totalStudents: classObj.students.length
      },
      removedStudent: {
        id: student._id,
        fullName: student.fullName,
        email: student.email
      }
    });

  } catch (error) {
    console.error('Remove student error:', error);
    return createToastResponse(res, 500, 'Server error removing student', 'error');
  }
});

// =====================
// 📚 ACADEMIC SETTINGS
// =====================

// Get academic settings - Filtered by educator
app.get('/api/academic-settings/:type', verifyToken, requireEducator, async (req, res) => {
  try {
    const { type } = req.params;
    const educatorId = req.user.id;
    
    if (!['school', 'course', 'year', 'block'].includes(type)) {
      return createToastResponse(res, 400, 'Invalid academic setting type', 'error');
    }

    // Only return settings created by this educator
    const settings = await AcademicSetting.find({ 
      type: type,
      educator: educatorId
    }).sort({ name: 1 });

    res.json(settings);
  } catch (error) {
    console.error('Get academic settings error:', error);
    return createToastResponse(res, 500, 'Server error fetching settings', 'error');
  }
});

// Get academic settings by educator (public - for student registration)
app.get('/api/academic-settings/:type/educator/:educatorId', async (req, res) => {
  try {
    const { type, educatorId } = req.params;
    
    if (!['school', 'course', 'year', 'block'].includes(type)) {
      return res.status(400).json({ message: 'Invalid academic setting type' });
    }
    
    // Verify educator exists
    const educator = await User.findById(educatorId);
    if (!educator || educator.role !== 'educator') {
      return res.status(404).json({ message: 'Educator not found' });
    }
    
    // Get settings for this educator
    const settings = await AcademicSetting.find({ 
      type: type,
      educator: educatorId,
      isActive: true
    }).sort({ name: 1 });
    
    res.json(settings);
  } catch (error) {
    console.error('Get academic settings by educator error:', error);
    res.status(500).json({ message: 'Server error fetching settings' });
  }
});

// Create academic setting - Assign to educator
app.post('/api/academic-settings', verifyToken, requireEducator, async (req, res) => {
  try {
    const { name, type } = req.body;
    const educatorId = req.user.id;
    
    if (!name || !type || !['school', 'course', 'year', 'block'].includes(type)) {
      return res.status(400).json({
        toast: {
          message: 'Invalid data provided',
          type: 'error'
        }
      });
    }

    // Check if setting already exists for THIS EDUCATOR (case-insensitive)
    const existingSetting = await AcademicSetting.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      type,
      educator: educatorId
    });

    if (existingSetting) {
      return res.status(400).json({
        toast: {
          message: `${type.charAt(0).toUpperCase() + type.slice(1)} "${name}" already exists in your settings`,
          type: 'error'
        }
      });
    }

    const setting = new AcademicSetting({
      name,
      type,
      createdBy: educatorId,
      educator: educatorId,
      isActive: true,
      isDefault: false
    });

    await setting.save();

    return res.json({
      toast: {
        message: `${type.charAt(0).toUpperCase() + type.slice(1)} created successfully`,
        type: 'success'
      },
      setting
    });
  } catch (error) {
    console.error('Create academic setting error:', error);
    return res.status(500).json({
      toast: {
        message: 'Server error creating setting',
        type: 'error'
      }
    });
  }
});

// Update academic setting - Verify educator ownership
app.put('/api/academic-settings/:id', verifyToken, requireEducator, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const educatorId = req.user.id;
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        toast: {
          message: 'Name is required',
          type: 'error'
        }
      });
    }

    const trimmedName = name.trim();

    // Find the setting and verify ownership
    const setting = await AcademicSetting.findOne({
      _id: id,
      educator: educatorId
    });
    
    if (!setting) {
      return res.status(404).json({
        toast: {
          message: 'Setting not found or access denied',
          type: 'error'
        }
      });
    }

    // Check if name already exists for THIS EDUCATOR (case-insensitive)
    const existingSetting = await AcademicSetting.findOne({
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
      type: setting.type,
      educator: educatorId,
      _id: { $ne: id }
    });

    if (existingSetting) {
      return res.status(400).json({
        toast: {
          message: `${setting.type.charAt(0).toUpperCase() + setting.type.slice(1)} "${trimmedName}" already exists in your settings`,
          type: 'error'
        }
      });
    }

    setting.name = trimmedName;
    await setting.save();

    return res.json({
      toast: {
        message: `${setting.type.charAt(0).toUpperCase() + setting.type.slice(1)} updated successfully`,
        type: 'success'
      },
      setting
    });
  } catch (error) {
    console.error('Update academic setting error:', error);
    return res.status(500).json({
      toast: {
        message: 'Server error updating setting',
        type: 'error'
      }
    });
  }
});

// Delete academic setting - Verify educator ownership
app.delete('/api/academic-settings/:id', verifyToken, requireEducator, async (req, res) => {
  try {
    const { id } = req.params;
    const educatorId = req.user.id;
    
    // Find and verify ownership
    const setting = await AcademicSetting.findOne({
      _id: id,
      educator: educatorId
    });
    
    if (!setting) {
      return res.status(404).json({
        toast: {
          message: 'Setting not found or access denied',
          type: 'error'
        }
      });
    }

    await AcademicSetting.findByIdAndDelete(id);

    return res.json({
      toast: {
        message: 'Setting deleted successfully',
        type: 'success'
      }
    });
  } catch (error) {
    console.error('Delete academic setting error:', error);
    return res.status(500).json({
      toast: {
        message: 'Server error deleting setting',
        type: 'error'
      }
    });
  }
});

// Toggle academic setting - Verify educator ownership
app.put('/api/academic-settings/:id/toggle', verifyToken, requireEducator, async (req, res) => {
  try {
    const { id } = req.params;
    const educatorId = req.user.id;
    
    const setting = await AcademicSetting.findOne({
      _id: id,
      educator: educatorId
    });
    
    if (!setting) {
      return res.status(404).json({
        toast: {
          message: 'Setting not found',
          type: 'error'
        }
      });
    }

    // Check if user owns this setting
    if (setting.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        toast: {
          message: 'You can only toggle your own settings',
          type: 'error'
        }
      });
    }

    setting.isActive = !setting.isActive;
    await setting.save();

    return res.json({
      toast: {
        message: `Setting ${setting.isActive ? 'activated' : 'deactivated'} successfully`,
        type: 'success'
      },
      setting
    });

  } catch (error) {
    console.error('Toggle academic setting error:', error);
    return res.status(500).json({
      toast: {
        message: 'Server error toggling setting',
        type: 'error'
      }
    });
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
    const { fullName, school, course, year, block } = req.body;
    
    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (school) updateData.school = school;
    if (course) updateData.course = course;
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
    console.error('Admin login error:', error);
    return res.status(500).json({
      message: 'Server error during admin login',
      toast: {
        show: true,
        message: 'Server error during admin login',
        type: 'error'
      }
    });
  }
});

// Admin dashboard data route
app.get('/api/admin/dashboard', verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        toast: {
          show: true,
          message: 'Admin access required',
          type: 'error'
        }
      });
    }
    
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

    // Get user registration data over time
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
      {
        $sort: { "_id.date": 1 }
      }
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

    // Get materials data over time
    const materialsAggregation = await File.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            period: range === 'day' 
              ? { $dateToString: { format: "%H:00", date: "$createdAt" } }
              : { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            type: "$type"
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { "_id.period": 1 }
      }
    ]);

    // Format materials data for chart
    const materialsData = [];
    const periodMap = new Map();
    
    materialsAggregation.forEach(mat => {
      const period = mat._id.period;
      if (!periodMap.has(period)) {
        periodMap.set(period, { period, materials: 0, assignments: 0 });
      }
      const entry = periodMap.get(period);
      if (mat._id.type === 'material') {
        entry.materials = mat.count;
      } else if (mat._id.type === 'assignment') {
        entry.assignments = mat.count;
      }
    });
    
    periodMap.forEach(value => materialsData.push(value));

    // Get active classes with search filter
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
      materialCount: 0, // You can populate this with actual file counts
      lastActivity: cls.updatedAt
    }));

    // Get site visits from Activity model (if available)
    let siteVisits = 0;
    let downloadCount = 0;
    
    try {
      const Activity = require('./models/Activity');
      siteVisits = await Activity.countDocuments({
        activityType: { $in: ['site_visit', 'page_view'] },
        createdAt: { $gte: startDate }
      });
      
      downloadCount = await Activity.countDocuments({
        activityType: 'download',
        createdAt: { $gte: startDate }
      });
    } catch (activityError) {
      console.log('Activity model not available for stats');
    }

    res.json({
      toast: {
        show: true,
        message: 'Dashboard data fetched successfully',
        type: 'success'
      },
      stats: {
        totalUsers,
        studentCount,
        educatorCount,
        activeClasses,
        totalClasses,
        totalMaterials,
        assignmentsCount,
        totalStudentsInClasses,
        siteVisits,
        downloadCount
      },
      usersData,
      materialsData,
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
      toast: {
        show: true,
        message: 'Error fetching dashboard data',
        type: 'error'
      }
    });
  }
});

// Admin export route
app.get('/api/admin/export/:type', verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        toast: {
          show: true,
          message: 'Admin access required',
          type: 'error'
        }
      });
    }
    
    const { type } = req.params;
    const { range = 'all' } = req.query;

    let data = [];
    let filename = '';

    switch(type) {
      case 'users':
        const users = await User.find().select('-password').lean();
        data = users.map(user => ({
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          username: user.username,
          role: user.role,
          school: user.school || '',
          course: user.course || '',
          year: user.year || '',
          block: user.block || '',
          lastLogin: user.lastLogin ? new Date(user.lastLogin).toISOString() : '',
          createdAt: new Date(user.createdAt).toISOString(),
          isActive: user.isActive
        }));
        filename = 'users-report';
        break;

      case 'classes':
        const classes = await Class.find()
          .populate('educator', 'fullName email')
          .populate('students', 'fullName email')
          .lean();
        
        data = classes.map(cls => ({
          id: cls._id,
          classCode: cls.classCode,
          className: cls.className,
          description: cls.description || '',
          educatorName: cls.educator?.fullName || '',
          educatorEmail: cls.educator?.email || '',
          studentCount: cls.students.length,
          studentNames: cls.students.map(s => s.fullName).join('; '),
          studentEmails: cls.students.map(s => s.email).join('; '),
          isActive: cls.isActive,
          createdAt: new Date(cls.createdAt).toISOString(),
          updatedAt: new Date(cls.updatedAt).toISOString()
        }));
        filename = 'classes-report';
        break;

      case 'materials':
        const materials = await File.find()
          .populate('uploadedBy', 'fullName email')
          .lean();
        
        data = materials.map(file => ({
          id: file._id,
          name: file.name,
          originalName: file.originalName,
          type: file.type,
          assignmentTitle: file.assignmentTitle || '',
          assignmentDescription: file.assignmentDescription || '',
          classCode: file.classCode,
          size: file.size,
          mimeType: file.mimeType,
          uploadedBy: file.uploadedBy?.fullName || '',
          uploaderEmail: file.uploadedBy?.email || '',
          submissionCount: file.submissionCount,
          createdAt: new Date(file.createdAt).toISOString(),
          url: file.url
        }));
        filename = 'materials-report';
        break;

      default:
        return res.status(400).json({
          toast: {
            show: true,
            message: 'Invalid export type',
            type: 'error'
          }
        });
    }

    // Convert to CSV
    const csvData = convertToCSV(data);
    
    // Set response headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}-${new Date().toISOString().split('T')[0]}.csv`);
    
    res.send(csvData);

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      toast: {
        show: true,
        message: 'Error exporting data',
        type: 'error'
      }
    });
  }
});

// Helper function to convert array of objects to CSV
function convertToCSV(data) {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [];
  
  // Add headers
  csvRows.push(headers.join(','));
  
  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      // Handle values that might contain commas or quotes
      if (typeof value === 'string') {
        const escaped = value.replace(/"/g, '""');
        return `"${escaped}"`;
      }
      return value;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

// =====================
// 🚀 SERVER START
// =====================
// 📁 FILE ROUTES
// =====================
app.use('/api/files', fileRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});