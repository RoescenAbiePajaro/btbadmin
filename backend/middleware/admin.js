// backend/middleware/admin.js
const jwt = require('jsonwebtoken');

const requireAdmin = (req, res, next) => {
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-this');
    
    // Check if user is admin
    if (decoded.role !== 'admin') {
      return res.status(403).json({
        toast: {
          show: true,
          message: 'Admin access required',
          type: 'error'
        }
      });
    }
    
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

module.exports = { requireAdmin };