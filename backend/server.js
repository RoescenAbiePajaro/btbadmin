// server.js

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');

// Toast notification utility
const createToastResponse = (res, status, message, type = 'info', data = null) => {
  return res.status(status).json({
    toast: {
      message,
      type,
      show: true
    },
    ...(data && { data })
  });
};

// Error handler middleware with toast notifications
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  // Default error message and status
  const status = err.status || 500;
  const message = err.message || 'An unexpected error occurred';
  
  // Send error response with toast
  return createToastResponse(res, status, message, 'error');
};

require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// =====================
// 🧱 SCHEMAS & MODELS
// =====================

// Import AccessCode model
const AccessCode = require('./models/AccessCode');

// Admin Schema (untouched)
const adminSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  accessCode: { type: String, required: true }
});
const Admin = mongoose.model('Admin', adminSchema);

// ✅ NEW: Click Schema
const clickSchema = new mongoose.Schema({
  button: String,
  page: String,
  timestamp: { type: Date, default: Date.now },
});
const Click = mongoose.model('Click', clickSchema);



// =====================
// ⚙️ TEST ENDPOINT
// =====================
app.get('/api/test', (req, res) => {
  res.json({ message: 'Admin server is running' });
});

// =====================
// 🔐 JWT TOKEN UTILS
// =====================
const generateToken = (admin) => {
  return jwt.sign(
    { id: admin._id, username: admin.username },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// JWT Verification Middleware
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};



// =====================
// 📋 ADMIN LIST ENDPOINT
// =====================

// Get all admins (for admin list display)
app.get('/api/admins', verifyToken, async (req, res) => {
  try {
    const admins = await Admin.find()
      .select('-password -accessCode -__v') // Exclude sensitive fields
      .sort({ username: 1 });
    
    res.json(admins);
  } catch (error) {
    console.error('Error fetching admin list:', error);
    res.status(500).json({ message: 'Server error fetching admin list' });
  }
});

// =====================
// 👤 ADMIN AUTH ENDPOINTS
// =====================

// Admin Login
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ message: 'Username and password are required' });

  try {
    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(401).json({ message: 'Invalid username or password' });

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid)
      return res.status(401).json({ message: 'Invalid username or password' });

    const token = generateToken(admin);

    const adminData = admin.toObject();
    delete adminData.password;
    delete adminData.__v;

    res.json({
      message: 'Login successful',
      token,
      admin: adminData
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Admin Registration
app.post('/api/admin/register', async (req, res) => {
  const { firstName, lastName, username, password, accessCode } = req.body;

  if (!firstName || !lastName || !username || !password || !accessCode)
    return res.status(400).json({ message: 'All fields are required' });

  if (password.length < 6)
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });

  try {
    // Check if username already exists
    const existingAdmin = await Admin.findOne({ username });
    if (existingAdmin)
      return res.status(400).json({ message: 'Admin username already exists' });

    // Validate and consume the access code
    const code = accessCode.trim().toUpperCase();
    const accessCodeDoc = await AccessCode.findActiveByCode(code);
    
    if (!accessCodeDoc) {
      return res.status(400).json({ message: 'Invalid access code' });
    }

    if (!accessCodeDoc.canBeUsed()) {
      return res.status(400).json({ message: 'This access code cannot be used (inactive or max uses reached)' });
    }

    // Consume the access code
    await accessCodeDoc.incrementUsage();

    // Hash password and create admin
    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = new Admin({
      firstName,
      lastName,
      username,
      password: hashedPassword,
      accessCode: code // Store the validated code
    });

    await admin.save();
    
    res.status(201).json({ 
      message: 'Admin registration successful',
      accessCodeUsed: {
        code: accessCodeDoc.code,
        description: accessCodeDoc.description
      }
    });
  } catch (error) {
    console.error('Admin registration error:', error);
    res.status(500).json({ message: 'Server error during admin registration' });
  }
});

// =====================
// 📊 GUEST CLICK TRACKING ENDPOINTS
// =====================

// Log a click
app.post('/api/clicks', async (req, res) => {
  try {
    const { button, page } = req.body;

    if (!button || !page) {
      return res.status(400).json({ message: 'Button and page are required' });
    }

    const click = new Click({ button, page });
    await click.save();
    res.status(201).json({ message: 'Click logged successfully' });
  } catch (error) {
    console.error('Error logging click:', error);
    res.status(500).json({ message: 'Server error logging click' });
  }
});

// Get paginated click logs
app.get('/api/clicks', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, buttons } = req.query;
    
    // Build query object for filtering
    let query = {};
    if (buttons) {
      const buttonList = buttons.split(',');
      query.button = { $in: buttonList };
    }
    
    const clicks = await Click.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Click.countDocuments(query);

    res.json({ clicks, total });
  } catch (error) {
    console.error('Error fetching click logs:', error);
    res.status(500).json({ message: 'Server error fetching click logs' });
  }
});

// Delete a single click log
app.delete('/api/clicks/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const deletedClick = await Click.findByIdAndDelete(id);
    
    if (!deletedClick) {
      return res.status(404).json({ message: 'Click log not found' });
    }
    
    res.json({ message: 'Click log deleted successfully' });
  } catch (error) {
    console.error('Error deleting click log:', error);
    res.status(500).json({ message: 'Server error deleting click log' });
  }
});

// Delete all click logs
app.delete('/api/clicks', verifyToken, async (req, res) => {
  try {
    await Click.deleteMany({});
    res.json({ message: 'All click logs deleted successfully' });
  } catch (error) {
    console.error('Error deleting all click logs:', error);
    res.status(500).json({ message: 'Server error deleting all click logs' });
  }
});

// =====================
// 🔑 ACCESS CODE ENDPOINTS
// =====================

// Public endpoint to validate access code (for registration)
app.get('/api/access-codes/validate/:code', async (req, res) => {
  try {
    const code = req.params.code.trim().toUpperCase();
    const accessCode = await AccessCode.findActiveByCode(code);

    if (!accessCode) {
      return res.status(404).json({ valid: false, message: 'Invalid access code' });
    }

    if (!accessCode.canBeUsed()) {
      return res.status(400).json({ valid: false, message: 'This access code cannot be used' });
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

// Public endpoint to consume access code (for registration)
app.post('/api/access-codes/use/:code', async (req, res) => {
  try {
    const code = req.params.code.trim().toUpperCase();
    const accessCode = await AccessCode.findActiveByCode(code);

    if (!accessCode) {
      return res.status(404).json({ success: false, message: 'Invalid access code' });
    }

    if (!accessCode.canBeUsed()) {
      return res.status(400).json({ success: false, message: 'This access code cannot be used' });
    }

    await accessCode.incrementUsage();

    res.json({
      success: true,
      message: 'Access code used successfully',
      code: accessCode.code,
      description: accessCode.description,
      remainingUses: accessCode.maxUses - accessCode.currentUses
    });
  } catch (error) {
    console.error('Error using access code:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get all access codes
app.get('/api/access-codes', verifyToken, async (req, res) => {
  try {
    const accessCodes = await AccessCode.find()
      .sort({ createdAt: -1 });
    
    res.json(accessCodes);
  } catch (error) {
    console.error('Error fetching access codes:', error);
    return createToastResponse(res, 500, 'Server error fetching access codes', 'error');
  }
});

// Create new access code
app.post('/api/access-codes', verifyToken, async (req, res) => {
  try {
    const { code, description, maxUses, isActive } = req.body;

    // Validate required fields
    if (!code || !code.trim()) {
      return createToastResponse(res, 400, 'Access code is required', 'error');
    }

    // Check for duplicate code
    const existingCode = await AccessCode.findOne({ code: code.trim().toUpperCase() });
    if (existingCode) {
      return createToastResponse(res, 400, 'Access code already exists', 'error');
    }

    // Create new access code
    const accessCode = new AccessCode({
      code: code.trim().toUpperCase(),
      description: description?.trim() || '',
      maxUses: parseInt(maxUses) || 1,
      isActive: isActive !== undefined ? isActive : true,
      currentUses: 0
    });

    await accessCode.save();
    
    return createToastResponse(res, 201, 'Access code created successfully', 'success', accessCode);
  } catch (error) {
    console.error('Error creating access code:', error);
    
    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return createToastResponse(res, 400, messages.join(', '), 'error');
    }
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return createToastResponse(res, 400, 'Access code already exists', 'error');
    }
    
    return createToastResponse(res, 500, 'Server error creating access code', 'error');
  }
});

// Update access code
app.put('/api/access-codes/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { code, description, maxUses, isActive } = req.body;

    // Validate required fields
    if (!code || !code.trim()) {
      return createToastResponse(res, 400, 'Access code is required', 'error');
    }

    // Check if access code exists
    const existingCode = await AccessCode.findById(id);
    if (!existingCode) {
      return createToastResponse(res, 404, 'Access code not found', 'error');
    }

    // Check for duplicate code (excluding current record)
    const duplicateCode = await AccessCode.findOne({ 
      code: code.trim().toUpperCase(),
      _id: { $ne: id }
    });
    if (duplicateCode) {
      return createToastResponse(res, 400, 'Access code already exists', 'error');
    }

    // Update access code
    const updatedCode = await AccessCode.findByIdAndUpdate(
      id,
      {
        code: code.trim().toUpperCase(),
        description: description?.trim() || '',
        maxUses: parseInt(maxUses) || 1,
        isActive: isActive !== undefined ? isActive : true
      },
      { new: true, runValidators: true }
    );

    return createToastResponse(res, 200, 'Access code updated successfully', 'success', updatedCode);
  } catch (error) {
    console.error('Error updating access code:', error);
    
    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return createToastResponse(res, 400, messages.join(', '), 'error');
    }
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return createToastResponse(res, 400, 'Access code already exists', 'error');
    }
    
    return createToastResponse(res, 500, 'Server error updating access code', 'error');
  }
});

// Delete access code
app.delete('/api/access-codes/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedCode = await AccessCode.findByIdAndDelete(id);
    if (!deletedCode) {
      return createToastResponse(res, 404, 'Access code not found', 'error');
    }
    
    return createToastResponse(res, 200, 'Access code deleted successfully', 'success');
  } catch (error) {
    console.error('Error deleting access code:', error);
    return createToastResponse(res, 500, 'Server error deleting access code', 'error');
  }
});

// =====================
// 🚀 START SERVER
// =====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Admin server running on port ${PORT}`);
});