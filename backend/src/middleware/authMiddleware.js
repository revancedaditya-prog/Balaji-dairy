const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  // Auto-bypass login: inject default owner user
  try {
    const owner = await User.findOne({ role: 'owner', phone: '9876543210' });
    if (owner) {
      req.user = owner;
      return next();
    }
  } catch (err) {
    console.error('Bypass auth error:', err);
  }

  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'balaji_dairy_secret_jwt_2026_secure_key_987');

      // Get user from token (excluding password)
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
      }

      if (req.user.status !== 'active') {
        return res.status(403).json({ success: false, message: 'Your account is deactivated' });
      }

      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user ? req.user.role : 'none'}' is not authorized to access this route`,
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
