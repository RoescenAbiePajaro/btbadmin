// backend/middleware/auth.js
const jwt = require('jsonwebtoken');

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

const verifyToken = (req, res, next) => {
  // Get token from header
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
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-this');
    // Add user from payload
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

const requireEducator = (req, res, next) => {
  if (req.user.role !== 'educator') {
    return res.status(403).json({
      toast: {
        show: true,
        message: 'Educator access required',
        type: 'error'
      }
    });
  }
  next();
};

const requireStudent = (req, res, next) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({
      toast: {
        show: true,
        message: 'Student access required',
        type: 'error'
      }
    });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      toast: {
        show: true,
        message: 'Admin access required',
        type: 'error'
      }
    });
  }
  next();
};

module.exports = {
  verifyToken,
  requireEducator,
  requireStudent,
  requireAdmin,
  createToastResponse
};