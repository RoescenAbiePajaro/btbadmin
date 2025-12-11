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
const dashboardRoutes = require('./routes/dashboard');

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
// �‍💼 ADMIN REGISTRATION (No access code needed)
// =====================
app.post('/api/auth/register/admin', async (req, res) => {
  try {
    const { fullName, email, username, password, confirmPassword } = req.body;

    // Validate required fields
    if (!fullName || !email || !username || !password || !confirmPassword) {
      return createToastResponse(res, 400, 'Please fill all required fields', 'error');
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      return createToastResponse(res, 400, 'Passwords do not match', 'error');
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      const field = existingUser.email === email ? 'Email' : 'Username';
      return createToastResponse(res, 400, `${field} already exists`, 'error');
    }

    // Create admin user
    const admin = new User({
      fullName,
      email,
      username,
      password,
      role: 'admin',
      adminRegistration: true
    });

    await admin.save();

    // Generate JWT token
    const token = generateToken(admin);

    return createToastResponse(res, 201, 'Admin account created successfully!', 'success', {
      token,
      user: {
        id: admin._id,
        fullName: admin.fullName,
        email: admin.email,
        username: admin.username,
        role: admin.role
      }
    });

  } catch (error) {
    console.error('Admin registration error:', error);
    return createToastResponse(res, 500, 'Server error during registration', 'error');
  }
});

// =====================
// � LOGIN ENDPOINT (ALL ROLES)
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
    console.error('Update profile error:', error);
    return createToastResponse(res, 500, 'Server error updating profile', 'error');
  }
});

// =====================
// 🚀 SERVER START
// =====================
// 📁 ROUTES
// =====================
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/files', fileRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});