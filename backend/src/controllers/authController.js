const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const logAudit = require('../utils/auditLogger');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'balaji_dairy_secret_jwt_2026_secure_key_987', {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

// @desc    Auth user & get token (supports Email OR Phone)
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  const { phone, email, username, password } = req.body;
  const loginIdentifier = phone || email || username;

  try {
    if (!loginIdentifier || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email or phone and password' });
    }

    const trimmed = String(loginIdentifier).trim();

    // Check for user by phone OR email
    const user = await User.findOne({
      $or: [
        { phone: trimmed },
        { email: trimmed.toLowerCase() },
      ],
    }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. User not found.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Your account is deactivated. Contact the dairy owner.' });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid password. Please check and retry.' });
    }

    const token = generateToken(user._id);

    // Track login audit
    await logAudit(`${user.name} (${user.phone || user.email})`, 'USER_LOGIN', `User signed in`);

    res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        status: user.status,
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

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.matchPassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect old password' });
    }

    user.password = newPassword;
    await user.save();

    await logAudit(`${req.user.name} (${req.user.phone || req.user.email})`, 'PASSWORD_CHANGE', `User changed password`);

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Forgot Password / Request Reset Code
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  const { identifier } = req.body;

  try {
    if (!identifier) {
      return res.status(400).json({ success: false, message: 'Please provide your registered phone or email' });
    }

    const trimmed = String(identifier).trim();
    const user = await User.findOne({
      $or: [{ phone: trimmed }, { email: trimmed.toLowerCase() }],
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this phone or email' });
    }

    // Generate 6 digit reset token
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes
    await user.save({ validateBeforeSave: false });

    // In a real email/SMS setup we would send the token. For UI convenience we return success.
    res.status(200).json({
      success: true,
      message: 'Password reset code generated. In production, this is sent to your email/phone.',
      resetCode: resetToken, // Provided for easy self-recovery
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset password with reset code
// @route   PUT /api/auth/reset-password
// @access  Public
exports.resetPasswordWithCode = async (req, res) => {
  const { identifier, resetCode, newPassword } = req.body;

  try {
    if (!identifier || !resetCode || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide identifier, reset code, and new password' });
    }

    const hashedToken = crypto.createHash('sha256').update(String(resetCode)).digest('hex');
    const trimmed = String(identifier).trim();

    const user = await User.findOne({
      $or: [{ phone: trimmed }, { email: trimmed.toLowerCase() }],
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset code' });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({ success: true, message: 'Password has been reset successfully. You can now login.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
