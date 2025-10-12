const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
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
// 🧱 SCHEMAS
// =====================

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
    
  // Validate access code
  if (accessCode !== process.env.ADMIN_ACCESS_CODE) {
    return res.status(400).json({ message: 'Invalid access code' });
  }

  try {
    const existingAdmin = await Admin.findOne({ username });
    if (existingAdmin)
      return res.status(400).json({ message: 'Admin username already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = new Admin({
      firstName,
      lastName,
      username,
      password: hashedPassword,
      accessCode
    });

    await admin.save();
    res.status(201).json({ message: 'Admin registration successful' });
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
    const { page = 1, limit = 10 } = req.query;
    const clicks = await Click.find()
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Click.countDocuments();

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
// 🚀 START SERVER
// =====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Admin server running on port ${PORT}`);
});
