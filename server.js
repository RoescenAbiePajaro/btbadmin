const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const app = express();
const port = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/Beyond_The_Brush_Admin', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch((err) => console.error('MongoDB connection error:', err));

// Admin Schema
const adminSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  accessCode: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const Admin = mongoose.model('Admin', adminSchema);

// Test Endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running' });
});

// Registration Endpoint
app.post('/api/register', async (req, res) => {
  const { firstName, lastName, username, password, accessCode } = req.body;

  try {
    // Check if username already exists
    const existingAdmin = await Admin.findOne({ username });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Validate access code (example: predefined code)
    const validAccessCode = 'ADMIN123'; // Replace with your secure access code or logic
    if (accessCode !== validAccessCode) {
      return res.status(400).json({ message: 'Invalid access code' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new admin
    const newAdmin = new Admin({
      firstName,
      lastName,
      username,
      password: hashedPassword,
      accessCode,
    });

    // Save to MongoDB
    await newAdmin.save();

    res.status(201).json({ message: 'Registration successful' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});