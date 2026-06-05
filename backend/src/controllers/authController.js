const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logAudit = require('../utils/auditLogger');

// Generate Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'balaji_dairy_secret_jwt_2026_secure_key_987', {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  const { phone, password } = req.body;

  try {
    if (!phone || !password) {
      return res.status(400).json({ success: false, message: 'Please provide phone and password' });
    }

    // Check for user
    const user = await User.findOne({ phone }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Account is inactive' });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);

    // Track login audit
    await logAudit(`${user.name} (${user.phone})`, 'USER_LOGIN', `User Profile ${user.phone}`);

    res.status(200).json({
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
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
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

    // Fetch user with password
    const user = await User.findById(req.user._id).select('+password');

    // Verify old password
    const isMatch = await user.matchPassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect old password' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    await logAudit(`${req.user.name} (${req.user.phone})`, 'PASSWORD_CHANGE', `User Profile ${req.user.phone}`);

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
