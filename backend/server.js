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
const FileActivity = require('./models/FileActivity');
const File = require('./models/File'); // Import File model
const { supabase, supabasePublic } = require('./config/supabase');
const fileRoutes = require('./routes/fileRoutes');
const dashboardRoutes = require('./routes/dashboard');
const analyticsRoutes = require('./routes/analytics');

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
.then(() => {
  console.log('Connected to MongoDB');
  
  // Auto-create indexes on startup (optional)
  if (process.env.CREATE_INDEXES === 'true') {
    console.log('Auto-creating indexes...');
    require('./scripts/createIndexesOnStartup')();
  }
})
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

// Helper function to get device type
function getDeviceType(userAgent) {
  if (!userAgent) return 'Unknown';
  const ua = userAgent.toLowerCase();
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobile))/i.test(ua)) {
    return 'Tablet';
  }
  if (/mobile|iphone|ipod|android|blackberry|opera mini|opera mobi|windows phone/i.test(ua)) {
    return 'Mobile';
  }
  if (/macintosh|mac os/i.test(ua)) {
    return 'Laptop';
  }
  return 'Desktop';
}

const getBrowserFromUA = (userAgent) => {
  if (!userAgent) return 'Unknown';
  const ua = userAgent.toLowerCase();
  if (ua.includes('chrome')) return 'Chrome';
  if (ua.includes('firefox')) return 'Firefox';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
  if (ua.includes('edge')) return 'Edge';
  if (ua.includes('opera')) return 'Opera';
  return 'Other';
};

const getOSFromUA = (userAgent) => {
  if (!userAgent) return 'Unknown';
  const ua = userAgent.toLowerCase();
  if (ua.includes('windows')) return 'Windows';
  if (ua.includes('mac os')) return 'macOS';
  if (ua.includes('linux')) return 'Linux';
  if (ua.includes('android')) return 'Android';
  if (ua.includes('ios') || ua.includes('iphone')) return 'iOS';
  return 'Other';
};

// Track login success
app.post('/api/analytics/login', verifyToken, async (req, res) => {
  try {
    const click = new Click({
      type: 'login',
      location: 'login_success',
      userId: req.user.id,
      userRole: req.user.role,
      userAgent: req.headers['user-agent'],
      ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      deviceType: getDeviceType(req.headers['user-agent']),
      metadata: {
        loginMethod: 'email',
        timestamp: new Date()
      }
    });
    
    await click.save();
    
    res.json({ success: true });
  } catch (error) {
    console.error('Login tracking error:', error);
    res.status(500).json({ error: 'Tracking failed' });
  }
});

// Track homepage download
app.post('/api/analytics/download-homepage', async (req, res) => {
  try {
    const click = new Click({
      type: 'download',
      location: 'homepage_pc_app',
      userAgent: req.headers['user-agent'],
      ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      deviceType: getDeviceType(req.headers['user-agent']),
      metadata: {
        downloadType: 'pc_app',
        source: 'homepage',
        timestamp: new Date()
      }
    });
    
    await click.save();
    
    res.json({ success: true });
  } catch (error) {
    console.error('Download tracking error:', error);
    res.status(500).json({ error: 'Tracking failed' });
  }
});

// Track file view/download (protected)
app.post('/api/analytics/file-activity', verifyToken, async (req, res) => {
  try {
    const { fileId, fileName, activityType, classCode, educatorId } = req.body;
    
    // Verify the student has access to this file
    const user = await User.findById(req.user.id);
    
    if (user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can track file activities' });
    }
    
    const activity = new FileActivity({
      fileId,
      fileName,
      studentId: req.user.id,
      studentName: user.fullName,
      activityType,
      classCode,
      educatorId,
      metadata: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        deviceType: getDeviceType(req.headers['user-agent']),
        timestamp: new Date()
      }
    });
    
    await activity.save();
    
    res.json({ success: true });
  } catch (error) {
    console.error('File activity tracking error:', error);
    res.status(500).json({ error: 'Tracking failed' });
  }
});

// Get device statistics
app.get('/api/analytics/device-stats', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const deviceStats = await Click.aggregate([
      {
        $group: {
          _id: '$deviceType',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    res.json({ success: true, data: deviceStats });
  } catch (error) {
    console.error('Device stats error:', error);
    res.status(500).json({ error: 'Failed to fetch device stats' });
  }
});

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
// 📝 STUDENT REGISTRATION (UPDATED - No class code required)
// =====================
app.post('/api/auth/register/student', async (req, res) => {
  try {
    const { fullName, email, username, password, school, course, year, block } = req.body;

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

    // Create student without enrolled class
    const student = new User({
      fullName,
      email,
      username,
      password,
      role: 'student',
      school: school || '',
      course: course || '',
      year: year || '',
      block: block || '',
      enrolledClass: null, // Student will join class later
      classes: [],
      classCodes: []
    });

    await student.save();

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
        enrolledClass: null,
        classes: [],
        classCodes: []
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
// 👨‍💼 ADMIN REGISTRATION (No access code needed)
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
// 🔐 LOGIN ENDPOINT (ALL ROLES)
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
      role: user.role,
      school: user.school,
      course: user.course,
      year: user.year,
      block: user.block,
      enrolledClass: user.enrolledClass,
      classes: user.classes,
      classCodes: user.classCodes
    };

    // Get all classes with details for the student
    if (user.role === 'student') {
      // Always get all classes the student is enrolled in
      if (user.classes && user.classes.length > 0) {
        const allClasses = await Class.find({ 
          _id: { $in: user.classes },
          isActive: true 
        }).populate('educator', 'fullName username');
        
        userData.allClasses = allClasses.map(cls => ({
          id: cls._id,
          classCode: cls.classCode,
          className: cls.className,
          educatorName: cls.educator?.fullName || cls.educator?.username,
          educatorId: cls.educator?._id
        }));
      } else {
        userData.allClasses = [];
      }
      
      // Add current enrolled class info if exists
      if (user.enrolledClass) {
        const classObj = await Class.findById(user.enrolledClass).populate('educator', 'fullName username');
        if (classObj) {
          userData.enrolledClassDetails = {
            classCode: classObj.classCode,
            className: classObj.className,
            educatorName: classObj.educator.fullName || classObj.educator.username,
            educatorId: classObj.educator._id
          };
        }
      }
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
      educatorName: classObj.educator.fullName || classObj.educator.username,
      academicData: {
        school: classObj.school || '',
        course: classObj.course || '',
        year: classObj.year || '',
        block: classObj.block || ''
      }
    });
  } catch (error) {
    console.error('Validate class code error:', error);
    res.status(500).json({
      valid: false,
      message: 'Server error validating class code'
    });
  }
});

// Get class by code (for student file sharing)
app.get('/api/classes/by-code/:code', verifyToken, async (req, res) => {
  try {
    const classCode = req.params.code.toUpperCase();
    
    const classObj = await Class.findOne({ 
      classCode,
      isActive: true 
    }).populate('educator', 'fullName username');
    
    if (!classObj) {
      return res.status(404).json({
        success: false,
        error: 'Class not found'
      });
    }
    
    // Check if user has access to this class
    const user = await User.findById(req.user.id);
    
    if (user.role === 'student') {
      // Student can only access their enrolled class
      if (!user.enrolledClass || user.enrolledClass.toString() !== classObj._id.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this class'
        });
      }
    } else if (user.role === 'educator') {
      // Educator can only access their own classes
      if (classObj.educator._id.toString() !== user._id.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this class'
        });
      }
    }
    
    return res.json({
      success: true,
      class: classObj
    });
  } catch (error) {
    console.error('Get class by code error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error fetching class'
    });
  }
});

// Student join class - UPDATED FOR MULTIPLE CLASSES
app.post('/api/classes/join', verifyToken, async (req, res) => {
  try {
    const { classCode } = req.body;
    const studentId = req.user.id;

    if (!classCode) {
      return createToastResponse(res, 400, 'Class code is required', 'error');
    }

    const upperClassCode = classCode.toUpperCase();
    
    // Find class
    const classObj = await Class.findOne({ 
      classCode: upperClassCode,
      isActive: true 
    }).populate('educator', 'fullName username');

    if (!classObj) {
      return createToastResponse(res, 404, 'Class not found', 'error');
    }

    // Get student
    const student = await User.findById(studentId);
    
    // Check if student is already in THIS SPECIFIC class
    const isAlreadyInThisClass = student.classes && student.classes.some(clsId => 
      clsId && clsId.toString() === classObj._id.toString()
    );

    if (isAlreadyInThisClass) {
      return createToastResponse(res, 400, 'You are already enrolled in this class', 'error');
    }

    // Initialize arrays if they don't exist
    if (!student.classes) student.classes = [];
    if (!student.classCodes) student.classCodes = [];
    
    // Add class to student's arrays
    student.classes.push(classObj._id);
    student.classCodes.push(upperClassCode);
    
    // Set this as current enrolled class (most recent)
    student.enrolledClass = classObj._id;
    
    // Save student
    await student.save();

    // Add student to class if not already there
    if (!classObj.students.includes(studentId)) {
      classObj.students.push(studentId);
      await classObj.save();
    }

    // Get ALL classes for the student with populated educator info
    const allClassPromises = student.classes.map(classId => 
      Class.findById(classId)
        .populate('educator', 'fullName username')
        .select('classCode className educator')
    );
    
    const allClasses = await Promise.all(allClassPromises);

    // Prepare response data
    const userData = {
      id: student._id,
      fullName: student.fullName,
      email: student.email,
      username: student.username,
      role: student.role,
      school: student.school,
      course: student.course,
      year: student.year,
      block: student.block,
      enrolledClass: student.enrolledClass,
      classes: student.classes,
      classCodes: student.classCodes
    };

    // Current enrolled class details
    if (student.enrolledClass) {
      const currentClass = allClasses.find(cls => 
        cls._id.toString() === student.enrolledClass.toString()
      );
      if (currentClass) {
        userData.enrolledClassDetails = {
          classCode: currentClass.classCode,
          className: currentClass.className,
          educatorName: currentClass.educator?.fullName || currentClass.educator?.username,
          educatorId: currentClass.educator?._id
        };
      }
    }

    // All enrolled classes details
    userData.allClasses = allClasses.map(cls => ({
      id: cls._id,
      classCode: cls.classCode,
      className: cls.className,
      educatorName: cls.educator?.fullName || cls.educator?.username,
      educatorId: cls.educator?._id
    }));

    return createToastResponse(res, 200, 'Successfully joined class!', 'success', {
      user: userData,
      class: {
        id: classObj._id,
        classCode: classObj.classCode,
        className: classObj.className,
        educatorName: classObj.educator.fullName || classObj.educator.username,
        educatorId: classObj.educator._id
      }
    });

  } catch (error) {
    console.error('Join class error:', error);
    return createToastResponse(res, 500, 'Server error joining class', 'error');
  }
});

// Switch current class
app.post('/api/student/switch-class', verifyToken, async (req, res) => {
  try {
    const { classCode } = req.body;
    const studentId = req.user.id;

    if (!classCode) {
      return createToastResponse(res, 400, 'Class code is required', 'error');
    }

    // Find class
    const classObj = await Class.findOne({ 
      classCode: classCode.toUpperCase(),
      isActive: true 
    });

    if (!classObj) {
      return createToastResponse(res, 404, 'Class not found', 'error');
    }

    // Get student
    const student = await User.findById(studentId);
    
    // Check if student is enrolled in this class
    const isEnrolled = student.classes && student.classes.some(clsId => 
      clsId && clsId.toString() === classObj._id.toString()
    );

    if (!isEnrolled) {
      return createToastResponse(res, 400, 'You are not enrolled in this class', 'error');
    }

    // Switch current class
    student.enrolledClass = classObj._id;
    await student.save();

    // Get ALL classes for the student with populated educator info
    const allClassPromises = student.classes.map(classId => 
      Class.findById(classId)
        .populate('educator', 'fullName username')
        .select('classCode className educator')
    );
    
    const allClasses = await Promise.all(allClassPromises);

    // Prepare response data
    const userData = {
      id: student._id,
      fullName: student.fullName,
      email: student.email,
      username: student.username,
      role: student.role,
      school: student.school,
      course: student.course,
      year: student.year,
      block: student.block,
      enrolledClass: student.enrolledClass,
      classes: student.classes,
      classCodes: student.classCodes
    };

    // Current enrolled class details
    if (student.enrolledClass) {
      const currentClass = allClasses.find(cls => 
        cls._id.toString() === student.enrolledClass.toString()
      );
      if (currentClass) {
        userData.enrolledClassDetails = {
          classCode: currentClass.classCode,
          className: currentClass.className,
          educatorName: currentClass.educator?.fullName || currentClass.educator?.username,
          educatorId: currentClass.educator?._id
        };
      }
    }

    // All enrolled classes details
    userData.allClasses = allClasses.map(cls => ({
      id: cls._id,
      classCode: cls.classCode,
      className: cls.className,
      educatorName: cls.educator?.fullName || cls.educator?.username,
      educatorId: cls.educator?._id
    }));

    return createToastResponse(res, 200, 'Class switched successfully!', 'success', {
      user: userData
    });

  } catch (error) {
    console.error('Switch class error:', error);
    return createToastResponse(res, 500, 'Server error switching class', 'error');
  }
});

// Student leave class - UPDATED FOR MULTIPLE CLASSES
app.post('/api/classes/leave', verifyToken, requireStudent, async (req, res) => {
  try {
    const studentId = req.user.id;
    const { classCode } = req.body;
    
    if (!classCode) {
      return createToastResponse(res, 400, 'Class code is required', 'error');
    }
    
    // Find the class
    const classObj = await Class.findOne({ 
      classCode: classCode.toUpperCase(),
      isActive: true 
    });
    
    if (!classObj) {
      return createToastResponse(res, 404, 'Class not found', 'error');
    }
    
    // Get student
    const student = await User.findById(studentId);
    
    // Check if student is enrolled in this class
    const isInClass = student.classes && student.classes.some(clsId => 
      clsId && clsId.toString() === classObj._id.toString()
    );
    
    if (!isInClass) {
      return createToastResponse(res, 400, 'You are not enrolled in this class', 'error');
    }
    
    // Remove class from student's arrays
    student.classes = student.classes.filter(clsId => 
      clsId.toString() !== classObj._id.toString()
    );
    student.classCodes = student.classCodes.filter(code => 
      code !== classObj.classCode
    );
    
    // If leaving current enrolled class, set enrolledClass to another class or null
    if (student.enrolledClass && student.enrolledClass.toString() === classObj._id.toString()) {
      student.enrolledClass = student.classes.length > 0 ? student.classes[0] : null;
    }
    
    await student.save();
    
    // Remove student from class
    classObj.students = classObj.students.filter(id => id.toString() !== studentId);
    await classObj.save();
    
    // Get ALL classes for the student with populated educator info
    const allClassPromises = student.classes.map(classId => 
      Class.findById(classId)
        .populate('educator', 'fullName username')
        .select('classCode className educator')
    );
    
    const allClasses = await Promise.all(allClassPromises);

    // Prepare response data
    const userData = {
      id: student._id,
      fullName: student.fullName,
      email: student.email,
      username: student.username,
      role: student.role,
      school: student.school,
      course: student.course,
      year: student.year,
      block: student.block,
      enrolledClass: student.enrolledClass,
      classes: student.classes,
      classCodes: student.classCodes
    };

    // Current enrolled class details
    if (student.enrolledClass) {
      const currentClass = allClasses.find(cls => 
        cls._id.toString() === student.enrolledClass.toString()
      );
      if (currentClass) {
        userData.enrolledClassDetails = {
          classCode: currentClass.classCode,
          className: currentClass.className,
          educatorName: currentClass.educator?.fullName || currentClass.educator?.username,
          educatorId: currentClass.educator?._id
        };
      }
    }

    // All enrolled classes details
    userData.allClasses = allClasses.map(cls => ({
      id: cls._id,
      classCode: cls.classCode,
      className: cls.className,
      educatorName: cls.educator?.fullName || cls.educator?.username,
      educatorId: cls.educator?._id
    }));

    return createToastResponse(res, 200, 'Successfully left class', 'success', {
      user: userData
    });
    
  } catch (error) {
    console.error('Leave class error:', error);
    return createToastResponse(res, 500, 'Server error leaving class', 'error');
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
      students: [],
      school: req.body.school,
      course: req.body.course,
      year: req.body.year,
      block: req.body.block
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
    if (req.body.school !== undefined) classToUpdate.school = req.body.school;
    if (req.body.course !== undefined) classToUpdate.course = req.body.course;
    if (req.body.year !== undefined) classToUpdate.year = req.body.year;
    if (req.body.block !== undefined) classToUpdate.block = req.body.block;

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

    // Verify educator owns this class
    const classObj = await Class.findOne({
      _id: classId,
      educator: educatorId
    });

    if (!classObj) {
      return createToastResponse(res, 404, 'Class not found or access denied', 'error');
    }

    // Check if student exists
    const student = await User.findById(studentId);
    if (!student) {
      return createToastResponse(res, 404, 'Student not found', 'error');
    }

    // Check if student is enrolled in this class
    const isStudentInClass = classObj.students.some(id => id.toString() === studentId);
    if (!isStudentInClass) {
      return createToastResponse(res, 404, 'Student not found in this class', 'error');
    }

    // Remove student from class array
    classObj.students = classObj.students.filter(id => id.toString() !== studentId);
    
    // Remove class from student's classes array
    if (student.classes) {
      student.classes = student.classes.filter(clsId => 
        clsId.toString() !== classId
      );
    }
    
    // Remove class code from student's classCodes array
    if (student.classCodes) {
      student.classCodes = student.classCodes.filter(code => 
        code !== classObj.classCode
      );
    }
    
    // If student's current enrolled class is this class, set to null
    if (student.enrolledClass && student.enrolledClass.toString() === classId) {
      student.enrolledClass = null;
    }
    
    // Save both changes
    await Promise.all([
      classObj.save(),
      student.save()
    ]);

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

// Get all enrolled classes for student
app.get('/api/student/classes', verifyToken, requireStudent, async (req, res) => {
  try {
    const studentId = req.user.id;
    
    const student = await User.findById(studentId)
      .select('classes enrolledClass')
      .populate({
        path: 'classes',
        select: 'classCode className educator',
        populate: {
          path: 'educator',
          select: 'fullName username'
        }
      })
      .populate({
        path: 'enrolledClass',
        select: 'classCode className educator',
        populate: {
          path: 'educator',
          select: 'fullName username'
        }
      });

    if (!student) {
      return createToastResponse(res, 404, 'Student not found', 'error');
    }

    const allClasses = student.classes.map(cls => ({
      id: cls._id,
      classCode: cls.classCode,
      className: cls.className,
      educatorName: cls.educator?.fullName || cls.educator?.username,
      educatorId: cls.educator?._id,
      isCurrent: student.enrolledClass && student.enrolledClass._id.toString() === cls._id.toString()
    }));

    return createToastResponse(res, 200, 'Classes fetched successfully', 'success', {
      classes: allClasses,
      currentClass: student.enrolledClass ? {
        id: student.enrolledClass._id,
        classCode: student.enrolledClass.classCode,
        className: student.enrolledClass.className,
        educatorName: student.enrolledClass.educator?.fullName || student.enrolledClass.educator?.username,
        educatorId: student.enrolledClass.educator?._id
      } : null
    });

  } catch (error) {
    console.error('Get student classes error:', error);
    return createToastResponse(res, 500, 'Server error fetching classes', 'error');
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

// Get current user profile - UPDATED FOR MULTIPLE CLASSES
app.get('/api/auth/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password');

    if (!user) {
      return createToastResponse(res, 404, 'User not found', 'error');
    }

    // Get ALL classes for the student
    let allClasses = [];
    if (user.classes && user.classes.length > 0) {
      allClasses = await Class.find({ 
        _id: { $in: user.classes },
        isActive: true 
      }).populate('educator', 'fullName username');
    }

    // Prepare user data with class details
    const userData = user.toObject();
    
    // Current enrolled class details (if any)
    if (user.enrolledClass) {
      const currentClass = await Class.findById(user.enrolledClass)
        .populate('educator', 'fullName username');
      if (currentClass) {
        userData.enrolledClassDetails = {
          classCode: currentClass.classCode,
          className: currentClass.className,
          educatorName: currentClass.educator?.fullName || currentClass.educator?.username,
          educatorId: currentClass.educator?._id
        };
      }
    }

    // All enrolled classes details
    userData.allClasses = allClasses.map(cls => ({
      id: cls._id,
      classCode: cls.classCode,
      className: cls.className,
      educatorName: cls.educator?.fullName || cls.educator?.username,
      educatorId: cls.educator?._id
    }));

    return createToastResponse(res, 200, 'Profile fetched successfully', 'success', {
      user: userData
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
      { new: true, select: '-password' }
    );

    // Get ALL classes for the student
    let allClasses = [];
    if (user.classes && user.classes.length > 0) {
      allClasses = await Class.find({ 
        _id: { $in: user.classes },
        isActive: true 
      }).populate('educator', 'fullName username');
    }

    // Prepare user data with class details
    const userData = user.toObject();
    
    // Current enrolled class details (if any)
    if (user.enrolledClass) {
      const currentClass = await Class.findById(user.enrolledClass)
        .populate('educator', 'fullName username');
      if (currentClass) {
        userData.enrolledClassDetails = {
          classCode: currentClass.classCode,
          className: currentClass.className,
          educatorName: currentClass.educator?.fullName || currentClass.educator?.username,
          educatorId: currentClass.educator?._id
        };
      }
    }

    // All enrolled classes details
    userData.allClasses = allClasses.map(cls => ({
      id: cls._id,
      classCode: cls.classCode,
      className: cls.className,
      educatorName: cls.educator?.fullName || cls.educator?.username,
      educatorId: cls.educator?._id
    }));

    return createToastResponse(res, 200, 'Profile updated successfully', 'success', {
      user: userData
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return createToastResponse(res, 500, 'Server error updating profile', 'error');
  }
});

// =====================
// 📁 FILE MANAGEMENT ENDPOINTS (UPDATED FOR MULTIPLE CLASSES)
// =====================

// Get files with proper student filtering - UPDATED
app.get('/api/files/list', verifyToken, async (req, res) => {
  try {
    const { classCode } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let query = {};
    
    console.log('Files list request:', { userId, userRole, classCode });
    
    // If user is student, they should only see files from their CURRENT enrolled class
    if (userRole === 'student') {
      const user = await User.findById(userId);
      
      if (!user.enrolledClass) {
        return res.json({
          success: true,
          files: [],
          message: 'You are not enrolled in any class'
        });
      }
      
      // Get the current class
      const currentClass = await Class.findById(user.enrolledClass);
      if (!currentClass) {
        return res.json({
          success: true,
          files: [],
          message: 'Your current class was not found'
        });
      }
      
      // Always filter by student's CURRENT enrolled class
      query.classCode = currentClass.classCode;
      console.log('Student query:', query);
    }
    // If user is educator, show only their uploaded files
    else if (userRole === 'educator') {
      query.uploadedBy = userId;
      
      // If classCode is provided, also filter by it
      if (classCode) {
        query.classCode = classCode.toUpperCase();
      }
    }
    
    const files = await File.find(query)
      .sort({ createdAt: -1 })
      .populate('uploadedBy', 'username fullName');
    
    console.log(`Found ${files.length} files for query:`, query);
    
    res.status(200).json({
      success: true,
      count: files.length,
      files: files
    });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({
      success: false,
      error: 'Error listing files',
      details: error.message
    });
  }
});

// Get files by class with access control - UPDATED
app.get('/api/files/class/:classCode', verifyToken, async (req, res) => {
  try {
    const { classCode } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    console.log('Files by class request:', { userId, userRole, classCode });
    
    // Verify user has access to this class
    if (userRole === 'educator') {
      const educatorClasses = await Class.find({ educator: userId });
      const hasAccess = educatorClasses.some(c => c.classCode === classCode.toUpperCase());
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this class'
        });
      }
    } else if (userRole === 'student') {
      const user = await User.findById(userId);
      
      // Student must be enrolled in this class
      const classObj = await Class.findOne({ classCode: classCode.toUpperCase() });
      if (!classObj) {
        return res.status(404).json({
          success: false,
          error: 'Class not found'
        });
      }
      
      // Check if student is enrolled in this class
      const isEnrolled = user.classes && user.classes.some(clsId => 
        clsId && clsId.toString() === classObj._id.toString()
      );
      
      if (!isEnrolled) {
        return res.status(403).json({
          success: false,
          error: 'You are not enrolled in this class'
        });
      }
    }
    
    const files = await File.find({ 
      classCode: classCode.toUpperCase()
    })
    .sort({ createdAt: -1 })
    .populate('uploadedBy', 'username fullName');
    
    console.log(`Found ${files.length} files for class: ${classCode}`);
    
    res.json({ 
      success: true, 
      count: files.length,
      files: files 
    });
  } catch (error) {
    console.error('Error fetching files by class:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Error fetching files' 
    });
  }
});

// Get files from all enrolled classes (student only)
app.get('/api/files/all-classes', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    if (userRole !== 'student') {
      return res.status(403).json({
        success: false,
        error: 'Only students can access this endpoint'
      });
    }
    
    const user = await User.findById(userId);
    
    if (!user.classes || user.classes.length === 0) {
      return res.json({
        success: true,
        files: [],
        message: 'You are not enrolled in any classes'
      });
    }
    
    // Get all class codes from user's enrolled classes
    const classObjs = await Class.find({ 
      _id: { $in: user.classes },
      isActive: true 
    });
    
    const classCodes = classObjs.map(cls => cls.classCode);
    
    // Get files from all enrolled classes
    const files = await File.find({ 
      classCode: { $in: classCodes }
    })
    .sort({ createdAt: -1 })
    .populate('uploadedBy', 'username fullName');
    
    // Group files by class code
    const filesByClass = {};
    classCodes.forEach(classCode => {
      filesByClass[classCode] = files.filter(file => file.classCode === classCode);
    });
    
    res.json({
      success: true,
      count: files.length,
      filesByClass: filesByClass,
      allFiles: files,
      enrolledClasses: classObjs.map(cls => ({
        classCode: cls.classCode,
        className: cls.className,
        educator: cls.educator
      }))
    });
  } catch (error) {
    console.error('Error fetching files from all classes:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error fetching files'
    });
  }
});

// =====================
// 📁 ROUTES
// =====================
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/analytics', analyticsRoutes);

// =====================
// 🚀 SERVER START
// =====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('File sharing endpoints available:');
  console.log('  GET  /api/files/list - Get files (shows current class files for students)');
  console.log('  GET  /api/files/class/:classCode - Get files by class');
  console.log('  GET  /api/files/all-classes - Get files from all enrolled classes (students only)');
  console.log('  POST /api/classes/join - Join class endpoint (multiple classes supported)');
  console.log('  POST /api/student/switch-class - Switch current class');
  console.log('  GET  /api/auth/profile - Get user profile with all class info');
  console.log('  GET  /api/student/classes - Get all enrolled classes for student');
});