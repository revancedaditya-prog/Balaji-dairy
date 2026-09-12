const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logAudit = require('../utils/auditLogger');
const { getJwtSecret, getJwtExpiry } = require('../config/auth');

const generateToken = (id) => jwt.sign({ id }, getJwtSecret(), { expiresIn: getJwtExpiry() });

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  const phone = typeof req.body.phone === 'string' ? req.body.phone.trim() : String(req.body.phone || '').trim();
  const { password } = req.body;

  try {
    if (!phone || !password) {
      return res.status(400).json({ success: false, message: 'Please provide phone and password' });
    }

    const user = await User.findOne({ phone }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Account is inactive' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);
    await logAudit(`${user.name} (${user.phone})`, 'USER_LOGIN', `User Profile ${user.phone}`);

    return res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login failed:', error);
    return res.status(500).json({ success: false, message: 'Unable to login' });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  return res.status(200).json({ success: true, user: req.user });
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  try {
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide old and new passwords' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });
    }
    if (oldPassword === newPassword) {
      return res.status(400).json({ success: false, message: 'New password must be different from old password' });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await user.matchPassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect old password' });
    }

    user.password = newPassword;
    await user.save();

    await logAudit(`${req.user.name} (${req.user.phone})`, 'PASSWORD_CHANGE', `User Profile ${req.user.phone}`);
    return res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Password change failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to update password' });
  }
};
