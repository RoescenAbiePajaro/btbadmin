const { verifyToken } = require('./auth');

const requireAdmin = async (req, res, next) => {
  try {
    // First verify the token
    await verifyToken(req, res, () => {});
    
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
    
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    return res.status(401).json({
      toast: {
        show: true,
        message: 'Authentication required',
        type: 'error'
      }
    });
  }
};

module.exports = { requireAdmin };