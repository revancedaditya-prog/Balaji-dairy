const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getJwtSecret } = require('../config/auth');

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no valid bearer token provided' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
    }
    if (req.user.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Your account is deactivated' });
    }

    return next();
  } catch (error) {
    console.error('Authentication failed:', error.message);
    return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `User role '${req.user ? req.user.role : 'none'}' is not authorized to access this route`,
    });
  }
  return next();
};

module.exports = { protect, authorize };
